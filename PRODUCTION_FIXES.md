# Production Fixes Plan

## How to use this file
Each fix has: what's wrong, why it matters, exact file + lines, and the exact code change needed. Work through CRITICAL first, then HIGH, then MEDIUM. Check off as you go.

---

## CRITICAL

### Fix 1: Rate limiter must fail closed
**File:** `src/lib/rate-limit.ts` lines 59-61
**Problem:** On DynamoDB error, rate limiter returns `allowed: true` — attackers get unlimited requests during outages.
**Fix:** Change the catch block to deny requests on error:
```ts
// BEFORE (line 59-61):
catch (err) {
  console.error("Rate limit check failed, allowing request:", err);
  return { allowed: true, remaining: config.max, retryAfterMs: 0 };
}

// AFTER:
catch (err) {
  console.error("Rate limit check failed, blocking request:", err);
  return { allowed: false, remaining: 0, retryAfterMs: 5000 };
}
```

---

### Fix 2: Await Lambda invocation in confirm route
**File:** `src/app/api/samples/confirm/route.ts` lines 46-60
**Problem:** Lambda invoke is fire-and-forget. User gets "success" even if Lambda fails to start. Sample stuck in "processing" forever.
**Fix:** Await the invocation and return error to user if it fails:
```ts
// BEFORE (lines 48-60):
lambda.send(new InvokeCommand({
  FunctionName: PROCESSING_FN,
  InvocationType: "Event",
  Payload: JSON.stringify({ ... }),
})).catch(async (err) => {
  console.error("Failed to trigger processing Lambda:", err);
  await updateSampleStatus(auth.userId, body.sampleId, "error").catch(() => {});
});

return NextResponse.json({ sample: { ... } });

// AFTER:
try {
  await lambda.send(new InvokeCommand({
    FunctionName: PROCESSING_FN,
    InvocationType: "Event",
    Payload: JSON.stringify({
      userId: auth.userId,
      sampleId: body.sampleId,
      provider: sample.provider,
      action: sample.provider === "23andme" ? "plink" : "convert",
    }),
  }));
} catch (err) {
  console.error("Failed to trigger processing Lambda:", err);
  await updateSampleStatus(auth.userId, body.sampleId, "error").catch(() => {});
  return NextResponse.json({ error: "Failed to start processing" }, { status: 500 });
}

return NextResponse.json({ sample: { ... } });
```

---

### Fix 3: Remove unsafe-eval and unsafe-inline from CSP
**File:** `src/middleware.ts` lines 24-25
**Problem:** `unsafe-eval` and `unsafe-inline` in script-src/style-src completely defeat CSP's XSS protection.
**Fix:** Next.js needs `unsafe-inline` for styles (no way around it without nonce), but `unsafe-eval` in script-src must go:
```ts
// BEFORE:
"script-src 'self' 'unsafe-eval' 'unsafe-inline'",
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

// AFTER:
"script-src 'self' 'unsafe-inline'",
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
```
Note: `unsafe-inline` for scripts is needed by Next.js in dev mode. For production, investigate nonce-based CSP with `next.config.mjs` headers. Remove `unsafe-eval` immediately — it allows `eval()` which is never needed.

---

### Fix 4: Move run tracker from in-memory to DynamoDB
**File:** `src/app/api/samples/qpadm/run-tracker.ts` (full rewrite)
**Problem:** `activeRuns` and `runSubmissions` are in-memory Maps. Each serverless instance has its own copy. User can bypass "max 2 concurrent runs" by hitting different instances.
**Fix:** Replace the entire file. Use DynamoDB with TTL:
```ts
// New run-tracker.ts — uses DynamoDB instead of in-memory Maps

import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }),
);
const TABLE = process.env.SAMPLES_TABLE || "ioa-samples";

// Store runs as items in ioa-samples table with SK = "run#<runId>"
// TTL auto-expires after 10 minutes

export async function getActiveRunCount(userId: string): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const result = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "userId = :uid AND begins_with(sampleId, :prefix)",
    ExpressionAttributeValues: { ":uid": userId, ":prefix": "run#" },
  }));
  // Filter out expired runs (TTL deletion is eventually consistent)
  return (result.Items || []).filter((item) => (item.ttl || 0) > now).length;
}

export async function registerRun(userId: string, runId: string): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 600; // 10 min TTL
  await client.send(new PutCommand({
    TableName: TABLE,
    Item: { userId, sampleId: `run#${runId}`, ttl, createdAt: Date.now() },
  }));
}

export async function removeRun(userId: string, runId: string): Promise<void> {
  await client.send(new DeleteCommand({
    TableName: TABLE,
    Key: { userId, sampleId: `run#${runId}` },
  }));
}

export function getRunSubmissionTime(runId: string): number | undefined {
  // For polling endpoint — read from DynamoDB instead of in-memory map
  // The polling endpoint should query DynamoDB directly
  return undefined;
}
```
Then update `src/app/api/samples/qpadm/route.ts` to use `getActiveRunCount()` and `registerRun()` instead of `getActiveRuns()` and `userRuns.set()`.

Also update the polling endpoint `src/app/api/samples/qpadm/[runId]/route.ts` to check DynamoDB for run existence instead of `runSubmissions` Map.

Note: This reuses the existing `ioa-samples` table (PK: userId, SK: sampleId) by using `sampleId = "run#<runId>"` as the sort key. The TTL attribute on the table needs to be enabled — add `timeToLiveAttribute: "ttl"` to the samples table in `infra/lib/database-stack.ts`.

---

### Fix 5: Lambda /tmp cleanup on error
**File:** `infra/docker/admixtools/handler.mjs` — the handler function
**Problem:** If PLINK or R crashes, orphaned files stay in `/tmp/work/`. Over warm invocations, `/tmp` fills up (10GB limit).
**Fix:** Wrap each action in try/finally that always cleans up:
```js
// In the handler, wrap the convert and qpadm blocks:

// BEFORE:
if (action === "convert") {
  // ... code that can throw ...
  return { status: "success", action: "convert" };
}

// AFTER:
if (action === "convert") {
  try {
    // ... code that can throw ...
    return { status: "success", action: "convert" };
  } catch (err) {
    console.error("Convert failed:", err);
    throw err;
  } finally {
    cleanWorkDir();
  }
}
```
Do the same for the `qpadm` block. The `cleanWorkDir()` at the start of handler (line 398) creates a fresh dir, and the finally block ensures it's cleaned up even on errors.

Also wrap the `execFileSync` calls individually with descriptive errors:
```js
// BEFORE:
execFileSync("python3", [EXTRACT_SCRIPT, ...], { ... });

// AFTER:
try {
  execFileSync("python3", [EXTRACT_SCRIPT, ...], { ... });
} catch (err) {
  throw new Error(`PLINK extraction failed: ${err.message}`);
}
```

---

## HIGH

### Fix 6: S3 presigned URL — enforce content-length limit
**File:** `src/lib/s3.ts` lines 41-50
**Problem:** Presigned URL has no size restriction. User can upload 50GB directly to S3 before the confirm route checks size.
**Fix:** Add `ContentLength` conditions to the presigned URL:
```ts
// In createPresignedUploadUrl, add Conditions to limit upload size:
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

// Replace getSignedUrl approach with createPresignedPost which supports conditions:
// OR simpler: validate Content-Length header in the PutObjectCommand:
const command = new PutObjectCommand({
  Bucket: bucket,
  Key: s3Key,
  ContentType: "text/plain",
  // S3 will reject uploads exceeding this:
  ContentLength: MAX_FILE_SIZE,
});
```
Note: `ContentLength` in PutObjectCommand with presigned URL doesn't actually limit uploads. The proper fix is to switch to `createPresignedPost` with a `content-length-range` condition, or add an S3 bucket policy that rejects objects over 50MB. The simplest approach is a bucket policy:
```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::ioa-reference-data/*/rawfiles/*",
  "Condition": {
    "NumericGreaterThan": { "s3:content-length-bytes": "52428800" }
  }
}
```
Add this to `infra/lib/storage-stack.ts` using `bucket.addToResourcePolicy()`.

---

### Fix 7: Restrict S3 CORS headers
**File:** `infra/lib/storage-stack.ts` line 22
**Problem:** `allowedHeaders: ["*"]` allows any header in CORS preflight.
**Fix:**
```ts
// BEFORE:
allowedHeaders: ["*"],

// AFTER:
allowedHeaders: ["Content-Type", "x-amz-content-sha256"],
```
Also: remove localhost origins before deploying to production. Use environment-based CORS config:
```ts
allowedOrigins: process.env.NODE_ENV === "production"
  ? ["https://insightsonancestry.com", "https://www.insightsonancestry.com"]
  : ["http://localhost:3000", "http://localhost:3001", "https://insightsonancestry.com"],
```

---

### Fix 8: Delete DB record before S3 files
**File:** `src/app/api/samples/[id]/route.ts` lines 39-47
**Problem:** S3 files are deleted first. If DynamoDB deletion fails, files are gone but record persists (orphaned record pointing to deleted files).
**Fix:** Swap the order — delete DB record first, then clean up S3:
```ts
// BEFORE:
for (const key of filesToDelete) {
  await deleteObject(key).catch(() => {});
}
try {
  await removeSample(auth.userId, sampleId);
} catch { ... }

// AFTER:
try {
  await removeSample(auth.userId, sampleId);
} catch {
  return NextResponse.json({ error: "Failed to delete sample" }, { status: 500 });
}
// DB record gone — now clean up S3 (best-effort, orphaned files are cheaper than orphaned records)
for (const key of filesToDelete) {
  await deleteObject(key).catch(() => {});
}
```

---

### Fix 9: Add error boundary to dashboard
**File:** Create `src/components/dashboard/ErrorBoundary.tsx` (new file)
**Problem:** Any component crash in the dashboard = blank page. No recovery.
**Fix:** Create a class component error boundary:
```tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Dashboard error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Something went wrong.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs uppercase tracking-[2px] px-4 py-2 border rounded-sm"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```
Then wrap the `<main>` content in `src/app/dashboard/page.tsx`:
```tsx
<main className="flex-1 overflow-auto ...">
  <DashboardErrorBoundary>
    {/* existing section divs */}
  </DashboardErrorBoundary>
</main>
```

---

### Fix 10: Wrap auth signIn in try-catch
**File:** `src/contexts/AuthContext.tsx` — the `signIn` callback
**Problem:** If server returns non-JSON response (e.g. 502 gateway error), `res.json()` throws and crashes the app.
**Fix:** The `signIn` function should already be called inside a try-catch by the signup page. But the function itself should handle non-JSON responses:
```ts
const signIn = useCallback(async (email: string, password: string) => {
  const res = await fetch("/api/auth/login", { ... });
  if (!res.ok) {
    const text = await res.text();
    let msg = "Login failed";
    try { msg = JSON.parse(text).error || msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  setUser(data.user);
}, []);
```

---

### Fix 11: Lambda execFileSync error handling
**File:** `infra/docker/admixtools/handler.mjs` — lines where execFileSync is called
**Problem:** If Python or R process exits non-zero, `execFileSync` throws but the error message is just "Command failed". No useful info.
**Fix:** Wrap each call and rethrow with context:
```js
try {
  execFileSync("python3", [EXTRACT_SCRIPT, ...], {
    encoding: "utf-8", timeout: 240_000,
  });
} catch (err) {
  const stderr = err.stderr || err.message;
  console.error("PLINK extraction failed:", stderr);
  throw new Error(`PLINK extraction failed: ${stderr.slice(0, 500)}`);
}

try {
  execFileSync("Rscript", [QPADM_SCRIPT, ...], {
    encoding: "utf-8", timeout: 540_000,
  });
} catch (err) {
  const stderr = err.stderr || err.message;
  console.error("qpAdm computation failed:", stderr);
  throw new Error(`qpAdm computation failed: ${stderr.slice(0, 500)}`);
}
```

---

## MEDIUM

### Fix 12: Deduplicate JWT verification
**Files:** `src/middleware.ts`, `src/lib/auth-verify.ts`, `src/app/api/auth/session/route.ts`
**Problem:** JWKS fetching + JWT verification logic is copy-pasted in 3 files. If one is updated, others drift.
**Fix:** Move all JWT logic to `src/lib/auth-verify.ts`. Export a `verifyIdToken(token: string)` function. Import it in middleware and session route. Delete duplicated JWKS/verify code from the other two files.

---

### Fix 13: Rate limiter race condition
**File:** `src/lib/rate-limit.ts` lines 36-43
**Problem:** DynamoDB `ADD` increments first, then checks count. Two concurrent requests can both increment past the limit.
**Fix:** Add a condition expression to reject the increment if already at limit:
```ts
const result = await client.send(new UpdateCommand({
  TableName: TABLE,
  Key: { pk },
  UpdateExpression: "ADD #count :inc SET #ttl = :ttl",
  ConditionExpression: "attribute_not_exists(#count) OR #count < :max",
  ExpressionAttributeNames: { "#count": "count", "#ttl": "ttl" },
  ExpressionAttributeValues: { ":inc": 1, ":ttl": ttl, ":max": config.max },
  ReturnValues: "ALL_NEW",
}));
```
Catch `ConditionalCheckFailedException` and return `allowed: false`.

---

### Fix 14: Add fetch timeout to auth context
**File:** `src/contexts/AuthContext.tsx` — `fetchSession` and the refresh interval
**Problem:** If `/api/auth/session` hangs, auth context hangs forever.
**Fix:** Add AbortSignal with timeout:
```ts
const res = await fetch("/api/auth/session", {
  signal: AbortSignal.timeout(10_000), // 10s timeout
});
```

---

### Fix 15: XHR upload abort handler
**File:** `src/lib/samples.ts` lines 31-56
**Problem:** If network drops during upload, promise hangs forever. Only `load`, `error`, `timeout` are handled.
**Fix:** Add `abort` listener:
```ts
xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));
```

---

### Fix 16: Remove localhost from production CORS/CSP
**File:** `src/middleware.ts` line 38-39 and `infra/lib/storage-stack.ts` line 20
**Problem:** Localhost origins allowed in production.
**Fix:** Use environment variable to conditionally include localhost:
```ts
// middleware.ts
const ALLOWED_ORIGINS = new Set([
  "https://insightsonancestry.com",
  "https://www.insightsonancestry.com",
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://localhost:3001"] : []),
]);
```

---

### Fix 17: Timeout cascade alignment
**Files:** `infra/lib/processing-stack.ts`, `handler.mjs`, `src/lib/samples.ts`
**Problem:** Lambda timeout (10min), execFileSync timeout (9min), and frontend polling timeout (10min) are all ~10min. Race conditions possible.
**Fix:** Cascade properly:
- R execFileSync: 480s (8 min)
- Python execFileSync: 180s (3 min)
- Lambda timeout: 570s (9.5 min) — gives 30s buffer after longest exec
- Frontend polling: 600s (10 min) — gives 30s buffer after Lambda timeout

Update `processing-stack.ts`:
```ts
timeout: cdk.Duration.seconds(570),
```
Update `handler.mjs`:
```js
// R qpAdm
execFileSync("Rscript", [...], { timeout: 480_000 });
// Python extract
execFileSync("python3", [...], { timeout: 180_000 });
```

---

## Checklist

- [ ] Fix 1: Rate limiter fail-closed
- [ ] Fix 2: Await Lambda invocation
- [ ] Fix 3: Remove unsafe-eval from CSP
- [ ] Fix 4: Run tracker to DynamoDB (+ enable TTL on samples table)
- [ ] Fix 5: Lambda /tmp cleanup + execFileSync try/catch
- [ ] Fix 6: S3 upload size limit (bucket policy)
- [ ] Fix 7: Restrict CORS headers
- [ ] Fix 8: DB delete before S3 delete
- [ ] Fix 9: Dashboard error boundary
- [ ] Fix 10: Auth signIn try-catch
- [ ] Fix 11: Lambda execFileSync error messages
- [ ] Fix 12: Deduplicate JWT verification
- [ ] Fix 13: Rate limiter condition expression
- [ ] Fix 14: Auth fetch timeout
- [ ] Fix 15: XHR abort handler
- [ ] Fix 16: Remove localhost from production
- [ ] Fix 17: Timeout cascade alignment
