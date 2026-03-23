"use client";

import { useState, useEffect, useRef } from "react";
import { GlowCard } from "@/components/GlowCard";
import { BoxHeader } from "./BoxHeader";
import { PillButton, ActionButton } from "./buttons";
import { SearchableSelect } from "./SearchableSelect";
import { AADR_DATASETS } from "@/constants/dashboard";
import { fetchDatasetLabels } from "@/lib/samples";

export function ConfigureModelBox({ onRun, onTerminate, isRunning, sampleLabels }: {
  onRun: (dataset: string, sources: string[], references: string[], target: string, pValue: number) => void;
  onTerminate: () => void;
  isRunning: boolean;
  sampleLabels: string[];
}) {
  const [dataset, setDataset] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [target, setTarget] = useState<string[]>([]);
  const [pValue, setPValue] = useState("0.05");
  const labelCacheRef = useRef<Record<string, string[]>>({});

  useEffect(() => {
    if (!dataset) {
      setLabels([]);
      return;
    }

    setSources([]);
    setReferences([]);
    setTarget([]);

    // Use client cache if available
    if (labelCacheRef.current[dataset]) {
      setLabels(labelCacheRef.current[dataset]);
      return;
    }

    setLoadingLabels(true);

    fetchDatasetLabels(dataset)
      .then((fetched) => {
        labelCacheRef.current[dataset] = fetched;
        setLabels(fetched);
      })
      .catch(() => setLabels([]))
      .finally(() => setLoadingLabels(false));
  }, [dataset]);

  const targetOptions = [...sampleLabels, ...labels];
  const canRun = dataset && sources.length > 0 && references.length > 0 && target.length === 1 && !isRunning;

  return (
    <GlowCard delay={0}>
      <BoxHeader title="Configure model parameters" subtitle="Select dataset, source, reference, and target populations" />

      <div className="flex-1 px-5 sm:px-7 py-5 sm:py-6 flex flex-col gap-4 sm:gap-5">
        <div>
          <label className="block text-xs uppercase tracking-[2px] font-medium mb-1.5 sm:mb-2" style={{ color: "var(--text-muted)" }}>
            Dataset
          </label>
          <div className="flex flex-wrap gap-2">
            {AADR_DATASETS.map((d) => (
              <PillButton key={d.id} active={dataset === d.id} onClick={() => setDataset(d.id)}>
                {d.label}
              </PillButton>
            ))}
          </div>
        </div>

        {dataset && (
          <>
            {loadingLabels ? (
              <p className="text-xs animate-pulse" style={{ color: "var(--text-faint)" }}>Loading population labels...</p>
            ) : (
              <>
                <SearchableSelect label="Sources" options={labels} selected={sources} onChange={setSources} multi />
                <SearchableSelect label="References" options={labels} selected={references} onChange={setReferences} multi />
                <SearchableSelect label="Target" options={targetOptions} selected={target} onChange={setTarget} multi={false} />

                <div>
                  <label className="block text-xs uppercase tracking-[2px] font-medium mb-1.5 sm:mb-2" style={{ color: "var(--text-muted)" }}>
                    P-value threshold
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={pValue}
                    onChange={(e) => setPValue(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-sm border outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_12px_var(--accent-faint)]"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border-strong)",
                      color: "var(--text-primary)",
                      boxShadow: "var(--shadow-inset)",
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <ActionButton variant="accent" disabled={!canRun} onClick={() => onRun(dataset, sources, references, target[0], parseFloat(pValue) || 0.05)}>
                    Run
                  </ActionButton>
                  <ActionButton variant="danger" disabled={!isRunning} onClick={onTerminate}>
                    Terminate
                  </ActionButton>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </GlowCard>
  );
}
