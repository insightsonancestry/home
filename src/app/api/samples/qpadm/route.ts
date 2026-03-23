import { NextRequest, NextResponse } from "next/server";
import { requireAuth, safeJson } from "@/lib/auth-verify";
import { isValidDataset, validatePopulationLabels, isValidPopulationLabel } from "@/lib/sanitize";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { randomUUID } from "crypto";
import { createRateLimiter } from "@/lib/rate-limit";

const lambda = new LambdaClient({ region: process.env.AWS_REGION || "us-east-1" });
const PROCESSING_FN = process.env.PROCESSING_FUNCTION_NAME || "ioa-processing";

const MAX_SOURCES = 10;
const MAX_REFERENCES = 15;
const MAX_CONCURRENT_RUNS = 2;

const qpadmLimiter = createRateLimiter({ windowMs: 600_000, max: 10 });
const activeRuns = new Map<string, Set<string>>();

interface QpadmBody {
  dataset: string;
  sources: string[];
  references: string[];
  target: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { allowed, retryAfterMs } = qpadmLimiter.check(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many model runs. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const body = await safeJson<QpadmBody>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { dataset, sources, references, target } = body;

  if (!dataset || !isValidDataset(dataset)) {
    return NextResponse.json({ error: "Invalid dataset" }, { status: 400 });
  }

  if (!Array.isArray(sources) || sources.length === 0 || sources.length > MAX_SOURCES) {
    return NextResponse.json({ error: `Sources must be 1-${MAX_SOURCES} populations` }, { status: 400 });
  }

  if (!Array.isArray(references) || references.length === 0 || references.length > MAX_REFERENCES) {
    return NextResponse.json({ error: `References must be 1-${MAX_REFERENCES} populations` }, { status: 400 });
  }

  if (!target || typeof target !== "string" || !isValidPopulationLabel(target)) {
    return NextResponse.json({ error: "Invalid target population" }, { status: 400 });
  }

  const sourcesError = validatePopulationLabels(sources);
  if (sourcesError) return NextResponse.json({ error: sourcesError }, { status: 400 });

  const refsError = validatePopulationLabels(references);
  if (refsError) return NextResponse.json({ error: refsError }, { status: 400 });

  const userRuns = activeRuns.get(auth.userId) || new Set();
  if (userRuns.size >= MAX_CONCURRENT_RUNS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_CONCURRENT_RUNS} concurrent runs allowed. Wait for a run to finish.` },
      { status: 429 },
    );
  }

  const runId = randomUUID().slice(0, 8);

  userRuns.add(runId);
  activeRuns.set(auth.userId, userRuns);

  try {
    await lambda.send(new InvokeCommand({
      FunctionName: PROCESSING_FN,
      InvocationType: "Event",
      Payload: JSON.stringify({
        action: "qpadm",
        userId: auth.userId,
        dataset,
        sources,
        references,
        target,
        runId,
      }),
    }));

    return NextResponse.json({ runId, status: "running" });
  } catch (err) {
    console.error("qpAdm submission error:", err);
    userRuns.delete(runId);
    return NextResponse.json({ error: "Failed to submit qpAdm job" }, { status: 500 });
  }
}
