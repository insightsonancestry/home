import { PROVIDERS } from "@/constants/dashboard";

const VALID_PROVIDER_IDS = new Set(PROVIDERS.map((p) => p.id));
const MAX_LABEL_LENGTH = 50;
const MAX_FILENAME_LENGTH = 100;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function sanitizeFileName(name: string): string | null {
  // Strip path separators and dangerous characters
  const cleaned = name
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\.\./g, "")
    .trim();

  if (!cleaned || cleaned.length > MAX_FILENAME_LENGTH) return null;
  return cleaned;
}

export function sanitizeLabel(label: string): string | null {
  // Allow alphanumeric, underscores, hyphens, spaces, dots
  const cleaned = label.replace(/[<>"'&]/g, "").trim();
  if (!cleaned || cleaned.length > MAX_LABEL_LENGTH) return null;
  return cleaned;
}

export function isValidProvider(provider: string): boolean {
  return VALID_PROVIDER_IDS.has(provider);
}

// sampleId format: {8 hex chars}_{1-3} e.g. "f458f448_1"
const SAMPLE_ID_RE = /^[a-f0-9]{8}_[1-3]$/;

export function isValidSampleId(sampleId: string): boolean {
  return typeof sampleId === "string" && SAMPLE_ID_RE.test(sampleId);
}

const VALID_DATASETS = new Set(["1240K", "HO"]);

export function isValidDataset(dataset: string): boolean {
  return typeof dataset === "string" && VALID_DATASETS.has(dataset);
}

// Population labels: alphanumeric, underscores, hyphens, dots, colons only.
// Prevents shell injection when labels are passed to PLINK/R via execSync.
const POPULATION_LABEL_RE = /^[a-zA-Z0-9_.\-:]+$/;
const MAX_POPULATION_LABEL_LENGTH = 100;

export function isValidPopulationLabel(label: string): boolean {
  return (
    typeof label === "string" &&
    label.length > 0 &&
    label.length <= MAX_POPULATION_LABEL_LENGTH &&
    POPULATION_LABEL_RE.test(label)
  );
}

export function validatePopulationLabels(labels: string[]): string | null {
  for (const label of labels) {
    if (!isValidPopulationLabel(label)) {
      return `Invalid population label: "${label}"`;
    }
  }
  return null;
}

export { MAX_FILE_SIZE };
