"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlowCard } from "@/components/GlowCard";
import { BoxHeader } from "./BoxHeader";
import { PillButton, ActionButton } from "./buttons";
import { SearchableSelect } from "./SearchableSelect";
import { AADR_DATASETS } from "@/constants/dashboard";
import { fetchDatasetLabels, fetchLabelSamples } from "@/lib/samples";
import type { RestoredConfig } from "./DIYModelingSection";

type PickerContext = "sources" | "references" | "target" | null;

export function ConfigureModelBox({ onRun, onTerminate, isRunning, sampleLabels, restoredConfig }: {
  onRun: (dataset: string, sources: string[], references: string[], target: string, userTarget?: boolean, allsnps?: boolean, individualSamples?: Record<string, string[]>) => void;
  onTerminate: () => void;
  isRunning: boolean;
  sampleLabels: string[];
  restoredConfig?: RestoredConfig | null;
}) {
  const [dataset, setDataset] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [labelsError, setLabelsError] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [target, setTarget] = useState<string[]>([]);
  const [allsnps, setAllsnps] = useState(false);
  const [individualSelection, setIndividualSelection] = useState(false);
  const [individualSamples, setIndividualSamples] = useState<Record<string, string[]>>({});
  const [sampleTotals, setSampleTotals] = useState<Record<string, number>>({});
  const labelCacheRef = useRef<Record<string, string[]>>({});

  // Sample picker state
  const [pickerContext, setPickerContext] = useState<PickerContext>(null);
  const [pickerLabel, setPickerLabel] = useState("");
  const [pickerSamples, setPickerSamples] = useState<string[]>([]);
  const [pickerSelected, setPickerSelected] = useState<string[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => {
    if (!restoredConfig) return;
    setDataset(restoredConfig.dataset);
    setSources(restoredConfig.sources);
    setReferences(restoredConfig.references);
    setTarget([restoredConfig.target]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredConfig]);

  useEffect(() => {
    let stale = false;

    if (!dataset) {
      setLabels([]);
      return;
    }

    setLabelsError("");

    if (labelCacheRef.current[dataset]) {
      setLabels(labelCacheRef.current[dataset]);
      return;
    }

    setLoadingLabels(true);

    fetchDatasetLabels(dataset)
      .then((fetched) => {
        if (stale) return;
        labelCacheRef.current[dataset] = fetched;
        setLabels(fetched);
      })
      .catch((err) => {
        if (stale) return;
        setLabels([]);
        setLabelsError(err instanceof Error ? err.message : "Failed to load population labels");
      })
      .finally(() => {
        if (!stale) setLoadingLabels(false);
      });

    return () => { stale = true; };
  }, [dataset]);

  const targetOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const l of [...sampleLabels, ...labels]) {
      if (!seen.has(l)) { seen.add(l); result.push(l); }
    }
    return result;
  }, [sampleLabels, labels]);

  const canRun = dataset && sources.length > 0 && references.length > 0 && target.length === 1 && !isRunning;

  const runHint = isRunning ? "Model is running"
    : !dataset ? "Select a dataset"
    : sources.length === 0 ? "Add at least one source"
    : references.length === 0 ? "Add at least one reference"
    : target.length === 0 ? "Select a target" : "";

  // Open sample picker for a label
  const openPicker = useCallback(async (label: string, context: PickerContext) => {
    setPickerContext(context);
    setPickerLabel(label);
    setPickerLoading(true);
    setPickerSamples([]);
    setPickerSelected([]);

    try {
      const samples = await fetchLabelSamples(dataset, label);
      if (samples.length <= 1) {
        // Single sample — auto-select, skip picker
        const setter = context === "sources" ? setSources : context === "references" ? setReferences : setTarget;
        const current = context === "sources" ? sources : context === "references" ? references : target;
        if (context === "target") {
          setter([label]);
        } else {
          setter([...current, label]);
        }
        setSampleTotals((prev) => ({ ...prev, [label]: samples.length }));
        if (samples.length === 1) {
          setIndividualSamples((prev) => ({ ...prev, [label]: samples }));
        }
        closePicker();
        return;
      }
      setPickerSamples(samples);
      setPickerSelected([...samples]); // all checked by default
      setSampleTotals((prev) => ({ ...prev, [label]: samples.length }));
    } catch {
      // If fetch fails, fall back to adding the label without individual selection
      const setter = context === "sources" ? setSources : context === "references" ? setReferences : setTarget;
      const current = context === "sources" ? sources : context === "references" ? references : target;
      if (context === "target") {
        setter([label]);
      } else {
        setter([...current, label]);
      }
      closePicker();
    } finally {
      setPickerLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, sources, references, target]);

  const closePicker = useCallback(() => {
    setPickerContext(null);
    setPickerLabel("");
    setPickerSamples([]);
    setPickerSelected([]);
    setPickerLoading(false);
  }, []);

  const confirmPicker = useCallback(() => {
    if (!pickerContext || !pickerLabel || pickerSelected.length === 0) return;

    const setter = pickerContext === "sources" ? setSources : pickerContext === "references" ? setReferences : setTarget;
    const current = pickerContext === "sources" ? sources : pickerContext === "references" ? references : target;

    if (pickerContext === "target") {
      setter([pickerLabel]);
    } else {
      setter([...current, pickerLabel]);
    }

    setIndividualSamples((prev) => ({ ...prev, [pickerLabel]: pickerSelected }));
    closePicker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerContext, pickerLabel, pickerSelected, sources, references, target, closePicker]);

  const togglePickerSample = useCallback((sampleId: string) => {
    setPickerSelected((prev) =>
      prev.includes(sampleId)
        ? prev.filter((s) => s !== sampleId)
        : [...prev, sampleId]
    );
  }, []);

  const handleRemoveLabel = useCallback((label: string) => {
    setIndividualSamples((prev) => {
      const next = { ...prev };
      delete next[label];
      return next;
    });
    setSampleTotals((prev) => {
      const next = { ...prev };
      delete next[label];
      return next;
    });
  }, [setIndividualSamples, setSampleTotals]);

  const renderPill = useCallback((label: string) => {
    const selected = individualSamples[label];
    const total = sampleTotals[label];
    if (selected && total && selected.length < total) {
      return `${label} (${selected.length}/${total})`;
    }
    return label;
  }, [individualSamples, sampleTotals]);

  const handleLabelClick = useCallback((context: PickerContext) => {
    return (label: string) => openPicker(label, context);
  }, [openPicker]);

  // Clear individual samples when toggle turns off or dataset changes
  const handleToggleIndividual = useCallback(() => {
    if (individualSelection) {
      setIndividualSamples({});
      setSampleTotals({});
    }
    setIndividualSelection(!individualSelection);
    closePicker();
  }, [individualSelection, setIndividualSelection, setIndividualSamples, setSampleTotals, closePicker]);

  const handleDatasetChange = useCallback((id: string) => {
    if (id !== dataset) {
      setSources([]);
      setReferences([]);
      setTarget([]);
      setIndividualSamples({});
      setSampleTotals({});
      closePicker();
    }
    setDataset(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, closePicker]);

  // Inline sample picker panel
  const pickerPanel = pickerContext && (pickerLoading || pickerSamples.length > 0) && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="border rounded-sm overflow-hidden"
      style={{ borderColor: "var(--accent)", background: "var(--panel)" }}
    >
      <div className="px-3 py-2 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] uppercase tracking-[2px] font-medium truncate min-w-0" style={{ color: "var(--accent)" }}>
          {pickerLabel}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {!pickerLoading && pickerSamples.length > 0 && (
            <motion.button
              onClick={() => setPickerSelected(
                pickerSelected.length === pickerSamples.length ? [] : [...pickerSamples]
              )}
              className="text-xs uppercase tracking-[2px] px-3 py-1.5 rounded-sm border font-bold"
              animate={{
                color: pickerSelected.length === pickerSamples.length ? "#f87171" : "#53bde3",
                borderColor: pickerSelected.length === pickerSamples.length ? "rgba(248,113,113,0.3)" : "rgba(83,189,227,0.3)",
                background: pickerSelected.length === pickerSamples.length ? "rgba(248,113,113,0.08)" : "rgba(83,189,227,0.08)",
              }}
              transition={{ duration: 0.3 }}
            >
              {pickerSelected.length === pickerSamples.length ? "Deselect all" : "Select all"}
            </motion.button>
          )}
          <PillButton active={false} onClick={closePicker}>
            Cancel
          </PillButton>
        </div>
      </div>

      {pickerLoading ? (
        <div className="px-3 py-4 flex items-center gap-2">
          <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>Loading samples...</span>
        </div>
      ) : (
        <>
          <div className="max-h-48 overflow-y-auto px-1.5 py-1.5 flex flex-col gap-0.5">
            {pickerSamples.map((sampleId) => {
              const checked = pickerSelected.includes(sampleId);
              return (
                <button
                  key={sampleId}
                  onClick={() => togglePickerSample(sampleId)}
                  className="w-full flex items-center gap-2 px-3 py-4 sm:py-2 rounded-sm text-xs transition-colors duration-100"
                  style={{
                    color: checked ? "var(--text-primary)" : "var(--text-faint)",
                    background: checked ? "var(--accent-subtle)" : "transparent",
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      borderColor: checked ? "var(--accent)" : "var(--border-strong)",
                      background: checked ? "var(--accent)" : "transparent",
                    }}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {sampleId}
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2.5 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
              {pickerSelected.length}/{pickerSamples.length} selected
            </span>
            <PillButton
              active={pickerSelected.length > 0}
              onClick={() => { if (pickerSelected.length > 0) confirmPicker(); }}
            >
              Confirm
            </PillButton>
          </div>
        </>
      )}
    </motion.div>
  );

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
              <PillButton key={d.id} active={dataset === d.id} onClick={() => handleDatasetChange(d.id)}>
                {d.label}
              </PillButton>
            ))}
          </div>
        </div>

        {dataset && (
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-[2px] font-medium" style={{ color: "var(--text-muted)" }}>
              Select samples individually
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={individualSelection}
              onClick={handleToggleIndividual}
              className="relative w-9 h-5 rounded-full transition-colors duration-200"
              style={{ background: individualSelection ? "var(--accent)" : "var(--border-strong)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                style={{ background: "var(--text-bright)", transform: individualSelection ? "translateX(16px)" : "translateX(0)" }}
              />
            </button>
          </div>
        )}

        {dataset && (
          <>
            {loadingLabels ? (
              <div className="flex flex-col gap-4 sm:gap-5 animate-pulse">
                {["Sources", "References", "Target"].map((l) => (
                  <div key={l}>
                    <span className="block text-xs uppercase tracking-[2px] font-medium mb-1.5 sm:mb-2" style={{ color: "var(--text-faint)" }}>{l}</span>
                    <div className="h-[42px] rounded-sm" style={{ background: "var(--border)" }} />
                  </div>
                ))}
              </div>
            ) : labelsError ? (
              <div className="flex items-center gap-3 p-3 rounded-sm border" style={{ borderColor: "var(--error-border)", background: "var(--error-subtle)" }}>
                <p className="text-xs" style={{ color: "var(--error-text)" }}>{labelsError}</p>
                <button onClick={() => { setLabelsError(""); setDataset(""); }} className="text-xs underline shrink-0" style={{ color: "var(--error-text)" }}>Retry</button>
              </div>
            ) : (
              <>
                <SearchableSelect
                  label="Sources"
                  options={labels}
                  selected={sources}
                  onChange={setSources}
                  multi
                  onLabelClick={individualSelection ? handleLabelClick("sources") : undefined}
                  renderPill={individualSelection ? renderPill : undefined}
                  onRemove={individualSelection ? handleRemoveLabel : undefined}
                />
                <AnimatePresence>{pickerContext === "sources" && pickerPanel}</AnimatePresence>

                <SearchableSelect
                  label="References"
                  options={labels}
                  selected={references}
                  onChange={setReferences}
                  multi
                  onLabelClick={individualSelection ? handleLabelClick("references") : undefined}
                  renderPill={individualSelection ? renderPill : undefined}
                  onRemove={individualSelection ? handleRemoveLabel : undefined}
                />
                <AnimatePresence>{pickerContext === "references" && pickerPanel}</AnimatePresence>

                <SearchableSelect
                  label="Target"
                  options={targetOptions}
                  selected={target}
                  onChange={setTarget}
                  multi={false}
                  onLabelClick={individualSelection ? handleLabelClick("target") : undefined}
                  renderPill={individualSelection ? renderPill : undefined}
                  onRemove={individualSelection ? handleRemoveLabel : undefined}
                />
                <AnimatePresence>{pickerContext === "target" && pickerPanel}</AnimatePresence>

                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-[2px] font-medium" style={{ color: "var(--text-muted)" }}>
                    allsnps
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allsnps}
                    onClick={() => setAllsnps(!allsnps)}
                    className="relative w-9 h-5 rounded-full transition-colors duration-200"
                    style={{ background: allsnps ? "var(--accent)" : "var(--border-strong)" }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                      style={{ background: "var(--text-bright)", transform: allsnps ? "translateX(16px)" : "translateX(0)" }}
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <ActionButton variant="accent" disabled={!canRun} title={runHint} onClick={() => {
                    const isUserTarget = sampleLabels.includes(target[0]);
                    const indivSamples = individualSelection && Object.keys(individualSamples).length > 0
                      ? individualSamples
                      : undefined;
                    onRun(dataset, sources, references, target[0], isUserTarget || undefined, allsnps, indivSamples);
                  }}>
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
