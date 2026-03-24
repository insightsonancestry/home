export const PROVIDERS = [
  { id: "23andme",    label: "23andMe",        accept: ".txt" },
  { id: "ancestry",   label: "AncestryDNA",    accept: ".txt" },
  { id: "ftdna",      label: "FTDNA",          accept: ".csv" },
  { id: "ftdna_old",  label: "FTDNA (Legacy)", accept: ".csv" },
  { id: "myheritage", label: "MyHeritage",     accept: ".csv" },
  { id: "livingdna",  label: "LivingDNA",      accept: ".csv,.txt" },
];

export interface Sample {
  id: string;
  label: string;
  provider: string;
  status: "uploading" | "ready" | "error";
  uploadedAt: string;
  fileSize: number;
  ogFileName?: string;
  finalFileName?: string;
  s3Key?: string;
}

export const MAX_SAMPLES = 3;
export const MAX_FILE_SIZE_MB = 50;

export const AADR_DATASETS = [
  { id: "1240K", label: "AADR_1240K" },
  { id: "HO",    label: "AADR_HO" },
];

export const PIE_COLORS = [
  "#53bde3", "#f472b6", "#facc15", "#34d399", "#a78bfa",
  "#fb923c", "#f87171", "#2dd4bf", "#a3e635", "#818cf8",
  "#e879f9", "#38bdf8", "#fbbf24", "#4ade80", "#c084fc",
  "#fb7185", "#22d3ee", "#a3e635", "#f97316", "#60a5fa",
];

export const PIE_COLORS_HEX = PIE_COLORS;

/** Deterministic shuffle based on a seed string — same seed = same order */
export function shuffledColors(seed: string): string[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const arr = [...PIE_COLORS];
  for (let i = arr.length - 1; i > 0; i--) {
    h = ((h << 5) - h + i) | 0;
    const j = ((h >>> 0) % (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const NAV_ITEMS = [
  { id: "samples",   label: "Samples/Labels" },
  { id: "diy",       label: "DIY Modeling" },
  { id: "assisted",  label: "Assisted Modeling" },
  { id: "learning",  label: "Learning Materials" },
  { id: "history",   label: "History" },
];

export const DATASETS = [
  { id: "user",    label: "Your Dataset" },
  { id: "ancient", label: "Ancient" },
  { id: "modern",  label: "Modern" },
];

export const LABEL_OPERATIONS = [
  { id: "pool",   label: "Pool Samples" },
  { id: "rename", label: "Change Label" },
  { id: "reset",  label: "Reset to Default" },
];
