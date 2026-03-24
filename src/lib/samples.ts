import type { Sample } from "@/constants/dashboard";

interface PresignResponse {
  sampleId: string;
  uploadUrl: string;
  expiresIn: number;
}

interface SamplesResponse {
  samples: Sample[];
  sampleCount: number;
}

export async function presignUpload(body: {
  label: string;
  provider: string;
  fileName: string;
  fileSize?: number;
}): Promise<PresignResponse> {
  const res = await fetch("/api/samples/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to get upload URL");
  return data;
}

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 min

export function uploadToS3(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    });

    xhr.addEventListener("error", () => reject(new Error("S3 upload failed")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.send(file);
  });
}

export async function confirmUpload(sampleId: string): Promise<Sample> {
  const res = await fetch("/api/samples/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sampleId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to confirm upload");
  return data.sample;
}

export async function fetchSamples(): Promise<SamplesResponse> {
  const res = await fetch("/api/samples");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch samples");
  if (!Array.isArray(data.samples)) throw new Error("Invalid response format");
  return data;
}

export async function deleteSample(sampleId: string): Promise<{ sampleCount: number }> {
  const res = await fetch(`/api/samples/${encodeURIComponent(sampleId)}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete sample");
  return data;
}

export async function submitQpadm(body: {
  dataset: string;
  sources: string[];
  references: string[];
  target: string;
  userTarget?: boolean;
  allsnps?: boolean;
  individualSamples?: Record<string, string[]>;
}): Promise<{ runId: string }> {
  const res = await fetch("/api/samples/qpadm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "qpAdm submission failed");
  return { runId: data.runId };
}

export interface PollResult {
  status: string;
  result?: string;
  error?: string;
  stage?: string;
  durationMs?: number;
}

export async function pollQpadmResult(
  runId: string,
  signal?: AbortSignal,
): Promise<PollResult> {
  const res = await fetch(`/api/samples/qpadm/${runId}`, { signal });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to poll result");
  return data;
}

const POLL_INTERVAL = 5_000;
const POLL_TIMEOUT = 600_000;

export async function pollUntilDone(
  runId: string,
  startedAt: number,
  signal?: AbortSignal,
  onStageChange?: (stage: string, durationMs?: number) => void,
): Promise<string> {
  let lastStage = "";

  while (Date.now() - startedAt < POLL_TIMEOUT) {
    if (signal?.aborted) throw new Error("Run terminated");

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    if (signal?.aborted) throw new Error("Run terminated");

    const poll = await pollQpadmResult(runId, signal);

    if (poll.stage && poll.stage !== lastStage) {
      lastStage = poll.stage;
      onStageChange?.(poll.stage, poll.durationMs);
    }

    if (poll.status === "completed" && poll.result) {
      onStageChange?.("complete", poll.durationMs);
      return poll.result;
    }
    if (poll.status === "failed") throw new Error(poll.error || "Run failed");
  }

  throw new Error("qpAdm run timed out. Check History for results.");
}

export async function runQpadm(
  body: { dataset: string; sources: string[]; references: string[]; target: string; userTarget?: boolean },
  signal?: AbortSignal,
): Promise<{ result: string; runId: string }> {
  const { runId } = await submitQpadm(body);
  const result = await pollUntilDone(runId, Date.now(), signal);
  return { result, runId };
}

export interface ActiveRun {
  runId: string;
  createdAt: number;
  dataset: string;
  sources: string[];
  references: string[];
  target: string;
  userTarget?: boolean;
  stage?: string;
}

export async function cancelRun(runId: string): Promise<void> {
  const res = await fetch("/api/samples/qpadm/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to cancel run");
  }
}

export async function fetchActiveRuns(): Promise<ActiveRun[]> {
  try {
    const res = await fetch("/api/samples/qpadm/active");
    const data = await res.json();
    return data.runs || [];
  } catch {
    return [];
  }
}

export async function fetchDatasetLabels(dataset: string): Promise<string[]> {
  const res = await fetch(`/api/samples/labels?dataset=${encodeURIComponent(dataset)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch labels");
  if (!Array.isArray(data.labels)) throw new Error("Invalid response format");
  return data.labels;
}

export async function fetchLabelSamples(dataset: string, label: string): Promise<string[]> {
  const res = await fetch(`/api/samples/labels/samples?dataset=${encodeURIComponent(dataset)}&label=${encodeURIComponent(label)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch samples");
  if (!Array.isArray(data.samples)) throw new Error("Invalid response format");
  return data.samples;
}
