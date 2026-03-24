import { NextRequest, NextResponse } from "next/server";
import { requireAuth, safeJson } from "@/lib/auth-verify";
import { isValidDataset, validatePopulationLabels, isValidPopulationLabel } from "@/lib/sanitize";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { randomUUID } from "crypto";
import { createRateLimiter } from "@/lib/rate-limit";
import { getActiveRunCount, registerRun, failRunRecord } from "./run-tracker";
import { getSamples } from "../store";

const lambda = new LambdaClient({ region: process.env.AWS_REGION || "us-east-1" });
const PROCESSING_FN = process.env.PROCESSING_FUNCTION_NAME || "ioa-processing";

const MAX_SOURCES = 10;
const MAX_REFERENCES = 15;
const MAX_CONCURRENT_RUNS = 2;

const qpadmLimiter = createRateLimiter({ name: "qpadm", windowMs: 600_000, max: 10 });

interface QpadmBody {
  dataset: string;
  sources: string[];
  references: string[];
  target: string;
  userTarget?: boolean;
  allsnps?: boolean;
  individualSamples?: Record<string, string[]>;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { allowed, retryAfterMs } = await qpadmLimiter.check(auth.userId);
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

  const { dataset, sources, references, target, userTarget, allsnps, individualSamples } = body;

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

  // Check for duplicates within sources/references
  if (new Set(sources).size !== sources.length) {
    return NextResponse.json({ error: "Duplicate entries in sources" }, { status: 400 });
  }
  if (new Set(references).size !== references.length) {
    return NextResponse.json({ error: "Duplicate entries in references" }, { status: 400 });
  }

  // Check for overlap between sources, references, and target
  const refSet = new Set(references);
  for (const s of sources) {
    if (refSet.has(s)) {
      return NextResponse.json({ error: `"${s}" cannot be in both sources and references` }, { status: 400 });
    }
  }
  if (!userTarget) {
    if (sources.includes(target) || refSet.has(target)) {
      return NextResponse.json({ error: "Target cannot also be a source or reference" }, { status: 400 });
    }
  }

  if (individualSamples) {
    if (typeof individualSamples !== "object" || Array.isArray(individualSamples)) {
      return NextResponse.json({ error: "Invalid individualSamples format" }, { status: 400 });
    }
    for (const [label, sampleIds] of Object.entries(individualSamples)) {
      if (!isValidPopulationLabel(label)) {
        return NextResponse.json({ error: `Invalid label in individualSamples: ${label}` }, { status: 400 });
      }
      if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
        return NextResponse.json({ error: `Invalid sample IDs for label: ${label}` }, { status: 400 });
      }
      for (const sid of sampleIds) {
        if (typeof sid !== "string" || !isValidPopulationLabel(sid)) {
          return NextResponse.json({ error: `Invalid sample ID: ${sid}` }, { status: 400 });
        }
      }
    }
  }

  const activeCount = await getActiveRunCount(auth.userId);
  if (activeCount >= MAX_CONCURRENT_RUNS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_CONCURRENT_RUNS} concurrent runs allowed. Wait for a run to finish.` },
      { status: 429 },
    );
  }

  // If userTarget, look up the sample's S3 key
  let targetS3Key: string | undefined;
  if (userTarget) {
    const samples = await getSamples(auth.userId);
    const match = samples.find((s) => s.label === target && s.status === "ready");
    if (!match || !match.finalFileName) {
      return NextResponse.json({ error: "Target sample not found or not ready" }, { status: 400 });
    }
    targetS3Key = `${auth.userId}/rawfiles/${match.finalFileName}`;
  }

  const runId = randomUUID().slice(0, 8);

  await registerRun(auth.userId, runId, { dataset, sources, references, target, userTarget: !!userTarget, allsnps: allsnps !== false });

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
        userTarget: !!userTarget,
        allsnps: allsnps !== false,
        ...(targetS3Key && { targetS3Key }),
        ...(individualSamples && { individualSamples }),
      }),
    }));

    return NextResponse.json({ runId, status: "running" });
  } catch (err) {
    console.error("qpAdm submission error:", err);
    await failRunRecord(auth.userId, runId, "Failed to invoke processing function").catch(() => {});
    return NextResponse.json({ error: "Failed to submit qpAdm job" }, { status: 500 });
  }
}
