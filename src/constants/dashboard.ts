export const PROVIDERS = [
  { id: "23andme",    label: "23andMe",     accept: ".txt" },
  { id: "ancestry",   label: "AncestryDNA", accept: ".txt" },
  { id: "ftdna",      label: "FTDNA",       accept: ".csv" },
  { id: "myheritage", label: "MyHeritage",  accept: ".csv" },
  { id: "livingdna",  label: "LivingDNA",   accept: ".csv,.txt" },
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
];

export const PIE_COLORS_HEX = [
  "#53bde3", "#f472b6", "#facc15", "#34d399", "#a78bfa",
  "#fb923c", "#f87171", "#2dd4bf", "#a3e635", "#818cf8",
];

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
  { id: "replace",       label: "Replace Labels" },
  { id: "edit_single",   label: "Edit Single Label" },
  { id: "edit_multiple", label: "Edit Multiple Labels" },
];
