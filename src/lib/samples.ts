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

export function uploadToS3(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

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
  return data;
}

export async function deleteSample(sampleId: string): Promise<{ sampleCount: number }> {
  const res = await fetch(`/api/samples/${sampleId}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete sample");
  return data;
}

export async function submitQpadm(body: {
  dataset: string;
  sources: string[];
  references: string[];
  target: string;
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

export async function pollQpadmResult(
  runId: string,
  signal?: AbortSignal,
): Promise<{ status: string; result?: string }> {
  const res = await fetch(`/api/samples/qpadm/${runId}`, { signal });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to poll result");
  return data;
}

const POLL_INTERVAL = 10_000;
const POLL_TIMEOUT = 600_000;

export async function runQpadm(
  body: { dataset: string; sources: string[]; references: string[]; target: string },
  signal?: AbortSignal,
): Promise<{ result: string; runId: string }> {
  const { runId } = await submitQpadm(body);

  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT) {
    if (signal?.aborted) throw new Error("Run terminated");

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    if (signal?.aborted) throw new Error("Run terminated");

    const poll = await pollQpadmResult(runId, signal);
    if (poll.status === "completed" && poll.result) {
      return { result: poll.result, runId };
    }
  }

  throw new Error("qpAdm run timed out. Check History for results.");
}

export async function fetchDatasetLabels(dataset: string): Promise<string[]> {
  const res = await fetch(`/api/samples/labels?dataset=${dataset}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch labels");
  return data.labels;
}
