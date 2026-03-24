# Plan: User Target + Live Stage Updates + Run History

## Three features in one bulk update:
**A.** User-uploaded sample as qpAdm target (merge flow)
**B.** Real-time stage updates in the terminal UI (DynamoDB progress tracking)
**C.** Persistent run history in DynamoDB (no more deleting runs after completion)

---

## A. User-Uploaded Sample as Target

### Current Flow
All populations (target + sources + refs) come from the 1240K/HO dataset.

### New Flow (when target is a user upload)
1. Frontend sends `userTarget: true`
2. API route looks up the sample's `finalFileName` from DynamoDB, passes S3 key to Lambda
3. Lambda extracts **only sources + refs** from the reference dataset
4. Downloads user's 23andMe file + `plink.snplist` from S3
5. Runs `merge_raw.py` → dataset2
6. Patches `dataset2.fam`: `FAM001` → user's label, `-9` → `1`
7. Runs qpAdm on dataset2
8. Writes output to S3, cleanWorkDir wipes temp files

### Decisions
- **plink2**: Removed from merge_raw.py. Plink1.9 only.
- **plink.snplist**: Static file. Upload to S3 at `tools/plink.snplist`.
- **Label collision**: Validate at upload time. Block if label matches any 1240K/HO .fam label.
- **File naming**: Strip `.txt` when passing to merge_raw.py.

---

## B. Live Stage Updates

### Terminal display

**Standard run** (target from reference dataset):
```
$ Downloading the dataset...
$ ✓ Downloading the dataset
$ Curating the dataset...
$ ✓ Curating the dataset
$ Running qpAdm...
$ ✓ Running qpAdm
$ Completed in 247s
```

**User target run** (target is an upload):
```
$ Downloading the dataset...
$ ✓ Downloading the dataset
$ Curating the dataset...
$ ✓ Curating the dataset
$ Merging the sample...
$ ✓ Merging the sample
$ Running qpAdm...
$ ✓ Running qpAdm
$ Completed in 312s
```

### Stages
- `downloading_ref` — downloading/caching reference .bed/.bim + .fam
- `curating` — PLINK extraction of selected populations
- `merging` — merge_raw.py (user target runs only)
- `running_qpadm` — R/qpAdm computation
- `complete` — done, `durationMs` set

### How it works
1. Lambda calls `updateStage(userId, runId, stage)` at each transition — writes to DynamoDB
2. Lambda records `startedAt` timestamp at the beginning, writes `durationMs` on completion
3. Polling endpoint returns `stage` and `durationMs` from the run item
4. Frontend polls every 5s (reduced from 10s for snappier updates), passes `stage` to terminal UI
5. Terminal shows checkmarks for completed steps, pulsing dot for active step, final line shows duration

---

## C. Persistent Run History

### Current behavior
- Run items are created in `ioa-samples` with `run#<runId>` key
- TTL set to 10 minutes — item auto-deleted
- `removeRun()` deletes item immediately when result is found
- **No history survives**

### New behavior
- Run items stay in DynamoDB permanently (no TTL, no deletion on completion)
- Lambda updates the item with: `stage`, `status` (running/completed/failed), `durationMs`
- On completion: `status = "completed"`, `durationMs = <elapsed>`
- On failure: `status = "failed"`, `error = <message>`
- `removeRun()` is removed — polling endpoint just reads status instead of deleting
- Active run detection: query for items where `status = "running"` instead of relying on TTL

### Run item schema (DynamoDB)
```
{
  userId: "f458f448-...",           // partition key
  sampleId: "run#a1b2c3d4",        // sort key
  createdAt: 1711234567890,         // epoch ms
  dataset: "1240K",
  sources: ["Pop_A", "Pop_B"],
  references: ["Ref_1", "Ref_2", ...],
  target: "MySample",
  userTarget: true,                 // NEW — was this a user upload target?
  status: "completed",              // NEW — running | completed | failed
  stage: "complete",                // NEW — current/final stage
  durationMs: 247123,               // NEW — total pipeline time
  error: null                       // NEW — error message if failed
}
```

---

## File Changes

### 1. Dockerfile
- Add `@aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb` to npm install

### 2. handler.mjs
**Stage updates:**
- Import DynamoDB client
- Create `updateStage(userId, runId, stage)` — UpdateCommand on `ioa-samples`
- Record `startedAt = Date.now()` at beginning of qpadm action
- Call `updateStage()` at each step
- On completion: update with `status: "completed"`, `stage: "complete"`, `durationMs`
- On failure: update with `status: "failed"`, `error: <message>`

**User target merge:**
- Inline simplified `merge_raw.py` as `MERGE_SCRIPT_SRC`
- Accept `userTarget: boolean`, `targetS3Key: string` in event
- If `userTarget`: extract only sources+refs, download user file + snplist, merge, patch .fam, run qpAdm on merged
- If not `userTarget`: existing flow unchanged

### 3. `run-tracker.ts`
- Remove `removeRun()` — runs are no longer deleted
- Remove TTL from `registerRun()` — runs persist
- Update `getRunItem()` to return `stage`, `status`, `durationMs`, `error`
- Update `getActiveRuns()` to filter by `status = "running"` instead of TTL
- Update `getActiveRunCount()` same way
- Add `getRunHistory(userId)` — returns all completed/failed runs for history page

### 4. `[runId]/route.ts` — polling endpoint
- Return `stage`, `durationMs` from the run item
- Check `status` field: if `"completed"` fetch result from S3; if `"failed"` return error
- No longer calls `removeRun()`

### 5. `qpadm/route.ts` — submit route
- Accept `userTarget: boolean` in request body
- Register run with `status: "running"`, `stage: "downloading_ref"`
- If `userTarget`: lookup sample in DynamoDB, resolve S3 key, pass to Lambda
- Store `userTarget` in the run item

### 6. `src/lib/samples.ts`
- Add `userTarget?: boolean` to `submitQpadm` body type
- `pollQpadmResult` return type: add `stage?: string`, `durationMs?: number`
- `pollUntilDone`: accept an `onStageChange` callback, call it when stage changes
- Reduce poll interval from 10s to 5s

### 7. `DIYModelingSection.tsx`
- Track `stage` in state
- Pass `onStageChange` callback to `pollUntilDone`
- Pass `stage` to `ModelOutputBox`

### 8. `ModelOutputBox.tsx`
- Update `STAGE_LABELS` to match new stage names:
  - `downloading_ref` → "Downloading the dataset..."
  - `curating` → "Curating the dataset..."
  - `merging` → "Merging the sample..."
  - `running_qpadm` → "Running qpAdm..."
  - `complete` → "Completed in Ns"
- Show `durationMs` in the final "Completed" line

### 9. `ConfigureModelBox.tsx`
- Detect if target matches one of `sampleLabels` (user uploads)
- If so, set `userTarget: true` in submit payload

### 10. `presign/route.ts`
- Label collision validation: check label against 1240K + HO .fam labels
- Cache label sets in memory (loaded once from S3 on cold start)
- Return error if collision found

### 11. `processing-stack.ts`
- Add `SAMPLES_TABLE` env var to Lambda
- Grant DynamoDB read/write on `ioa-samples` table

### 12. Upload static files to S3
- `plink.snplist` → `s3://ioa-reference-data/tools/plink.snplist`

---

## Implementation Order
1. Upload `plink.snplist` to S3
2. Update `run-tracker.ts` — persistent runs, stage/status/duration fields, remove TTL/deletion
3. Update `[runId]/route.ts` — return stage/duration, no deletion
4. Update `qpadm/route.ts` — accept userTarget, lookup sample, initial status/stage
5. Update `samples.ts` — stage callback, userTarget type, 5s polling
6. Update `DIYModelingSection.tsx` — track stage state
7. Update `ModelOutputBox.tsx` — new stage labels, duration display
8. Update `ConfigureModelBox.tsx` — detect user target
9. Add label collision validation to `presign/route.ts`
10. Update `handler.mjs` — stage updates + userTarget merge logic + inline merge_raw.py + duration tracking
11. Update `processing-stack.ts` — DynamoDB env/permissions
12. Update `Dockerfile` — add DynamoDB SDK packages
13. Rebuild Docker image + upload handler to S3 + CDK deploy
