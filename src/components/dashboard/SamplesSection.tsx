"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";
import { DownloadButton } from "./buttons";
import { ManageSamplesBox } from "./ManageSamplesBox";
import { EditLabelsBox } from "./EditLabelsBox";
import { DATASETS, type Sample } from "@/constants/dashboard";

interface SamplesSectionProps {
  samples: Sample[];
  loading: boolean;
  onReload: () => void;
  onDelete: (sampleId: string) => Promise<void>;
}

export function SamplesSection({ samples, loading, onReload, onDelete }: SamplesSectionProps) {
  return (
    <div className="mx-auto flex flex-col gap-4 sm:gap-6 h-full">
      <SectionHeader title="Samples & Labels" description="Upload raw files and manage population labels" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <ManageSamplesBox samples={samples} loading={loading} onUploadComplete={onReload} onDelete={onDelete} />
        <EditLabelsBox />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative group"
      >
        <div
          className="absolute top-0 left-0 right-0 h-[1px] opacity-60 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent), transparent)",
          }}
        />
        <div
          className="px-5 sm:px-7 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border rounded-sm transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(83,189,227,0.06)]"
          style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)", boxShadow: "var(--accent-dot)" }} />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-bright)" }}>
                Download .fam files
              </h3>
            </div>
            <p className="text-xs mt-1.5 pl-4" style={{ color: "var(--text-muted)" }}>
              View the sample and population labels in each dataset
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DATASETS.map((d) => (
              <DownloadButton key={d.id} onClick={() => console.info(`Download .fam for ${d.id}`)}>
                {d.label}
              </DownloadButton>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
