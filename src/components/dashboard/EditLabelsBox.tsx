"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlowCard } from "@/components/GlowCard";
import { BoxHeader } from "./BoxHeader";
import { PillButton, ActionButton, OperationButton } from "./buttons";
import { SearchableSelect } from "./SearchableSelect";
import { AADR_DATASETS, LABEL_OPERATIONS } from "@/constants/dashboard";
import { fetchDatasetLabels, fetchLabelSamples, poolSamples, renameLabel, resetLabels } from "@/lib/samples";

type Operation = "pool" | "rename" | "reset" | "";

export function EditLabelsBox() {
  const [dataset, setDataset] = useState("");
  const [operation, setOperation] = useState<Operation>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  // Pool state
  const [poolLabel, setPoolLabel] = useState<string[]>([]);
  const [poolSamplesList, setPoolSamplesList] = useState<string[]>([]);
  const [poolSelected, setPoolSelected] = useState<string[]>([]);
  const [poolNewLabel, setPoolNewLabel] = useState("");
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [collected, setCollected] = useState<{ sampleId: string; fromLabel: string }[]>([]);

  // Rename state
  const [renameOld, setRenameOld] = useState<string[]>([]);
  const [renameNew, setRenameNew] = useState("");

  const clearState = useCallback(() => {
    setOperation("");
    setError("");
    setSuccess("");
    setPoolLabel([]);
    setPoolSamplesList([]);
    setPoolSelected([]);
    setPoolNewLabel("");
    setCollected([]);
    setRenameOld([]);
    setRenameNew("");
  }, []);

  const handleDatasetChange = useCallback((id: string) => {
    setDataset(id);
    clearState();
    setLabels([]);
    setLoadingLabels(true);
    fetchDatasetLabels(id)
      .then(setLabels)
      .catch(() => setLabels([]))
      .finally(() => setLoadingLabels(false));
  }, [clearState]);

  const handleOperationChange = useCallback((op: Operation) => {
    clearState();
    setOperation(op);
  }, [clearState]);

  // Pool: when user selects a label, load its samples
  const handlePoolLabelSelect = useCallback(async (selected: string[]) => {
    setPoolLabel(selected);
    if (selected.length === 0) {
      setPoolSamplesList([]);
      setPoolSelected([]);
      return;
    }
    const label = selected[0];
    setLoadingSamples(true);
    try {
      const samples = await fetchLabelSamples(dataset, label);
      setPoolSamplesList(samples);
      setPoolSelected([]);
    } catch {
      setPoolSamplesList([]);
    } finally {
      setLoadingSamples(false);
    }
  }, [dataset]);

  // Pool: add selected samples to collected list
  const handleAddToPool = useCallback(() => {
    if (poolSelected.length === 0 || poolLabel.length === 0) return;
    const fromLabel = poolLabel[0];
    const existing = new Set(collected.map((c) => c.sampleId));
    const newItems = poolSelected
      .filter((sid) => !existing.has(sid))
      .map((sampleId) => ({ sampleId, fromLabel }));
    setCollected((prev) => [...prev, ...newItems]);
    setPoolLabel([]);
    setPoolSamplesList([]);
    setPoolSelected([]);
  }, [poolSelected, poolLabel, collected]);

  const handleRemoveFromPool = useCallback((sampleId: string) => {
    setCollected((prev) => prev.filter((c) => c.sampleId !== sampleId));
  }, []);

  // Pool: submit
  const handlePoolSubmit = useCallback(async () => {
    if (collected.length === 0 || !poolNewLabel.trim()) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { changed } = await poolSamples(dataset, collected.map((c) => c.sampleId), poolNewLabel.trim());
      setSuccess(`Pooled ${changed} samples under "${poolNewLabel.trim()}"`);
      setCollected([]);
      setPoolNewLabel("");
      // Refresh labels
      const fresh = await fetchDatasetLabels(dataset);
      setLabels(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pool failed");
    } finally {
      setBusy(false);
    }
  }, [collected, poolNewLabel, dataset]);

  // Rename: submit
  const handleRenameSubmit = useCallback(async () => {
    if (renameOld.length === 0 || !renameNew.trim()) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { changed } = await renameLabel(dataset, renameOld[0], renameNew.trim());
      setSuccess(`Renamed ${changed} samples: "${renameOld[0]}" → "${renameNew.trim()}"`);
      setRenameOld([]);
      setRenameNew("");
      const fresh = await fetchDatasetLabels(dataset);
      setLabels(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }, [renameOld, renameNew, dataset]);

  // Reset: submit
  const handleResetSubmit = useCallback(async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await resetLabels(dataset);
      setSuccess("Labels reset to default");
      const fresh = await fetchDatasetLabels(dataset);
      setLabels(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }, [dataset]);

  return (
    <GlowCard delay={0.1}>
      <BoxHeader title="Edit labels" subtitle="Modify population labels in your dataset" />

      <div className="flex-1 px-5 sm:px-7 py-5 sm:py-6 flex flex-col gap-4 sm:gap-5">
        {/* Dataset selector */}
        <div>
          <label className="block text-xs uppercase tracking-[2px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>
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

        {/* Loading labels */}
        {loadingLabels && (
          <div className="flex items-center gap-2 py-2">
            <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>Loading labels...</span>
          </div>
        )}

        {/* Operation selector */}
        <AnimatePresence>
          {dataset && !loadingLabels && labels.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <label className="block text-xs uppercase tracking-[2px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                Operation
              </label>
              <div className="flex flex-col gap-2">
                {LABEL_OPERATIONS.map((op) => (
                  <OperationButton key={op.id} active={operation === op.id} onClick={() => handleOperationChange(op.id as Operation)}>
                    {op.label}
                  </OperationButton>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === POOL UI === */}
        <AnimatePresence>
          {operation === "pool" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              {/* Step 1: search label */}
              <SearchableSelect
                label="Search label"
                options={labels}
                selected={poolLabel}
                onChange={handlePoolLabelSelect}
                multi={false}
              />

              {/* Step 2: pick samples */}
              {loadingSamples && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>Loading samples...</span>
                </div>
              )}
              {poolSamplesList.length > 0 && (
                <div
                  className="border rounded-sm overflow-hidden"
                  style={{ borderColor: "var(--accent)", background: "var(--panel)" }}
                >
                  {/* Header */}
                  <div className="px-3 py-2 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[10px] uppercase tracking-[2px] font-medium truncate min-w-0" style={{ color: "var(--accent)" }}>
                      {poolLabel[0]}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <motion.button
                        onClick={() => setPoolSelected(poolSelected.length === poolSamplesList.length ? [] : [...poolSamplesList])}
                        className="text-xs uppercase tracking-[2px] px-3 py-1.5 rounded-sm border font-bold"
                        animate={{
                          color: poolSelected.length === poolSamplesList.length ? "#f87171" : "#53bde3",
                          borderColor: poolSelected.length === poolSamplesList.length ? "rgba(248,113,113,0.3)" : "rgba(83,189,227,0.3)",
                          background: poolSelected.length === poolSamplesList.length ? "rgba(248,113,113,0.08)" : "rgba(83,189,227,0.08)",
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {poolSelected.length === poolSamplesList.length ? "Deselect all" : "Select all"}
                      </motion.button>
                      <PillButton active={false} onClick={() => { setPoolLabel([]); setPoolSamplesList([]); setPoolSelected([]); }}>
                        Cancel
                      </PillButton>
                    </div>
                  </div>

                  {/* Sample list */}
                  <div className="max-h-48 overflow-y-auto px-1.5 py-1.5 flex flex-col gap-0.5">
                    {poolSamplesList.map((sid) => {
                      const checked = poolSelected.includes(sid);
                      return (
                        <button
                          key={sid}
                          onClick={() => setPoolSelected(checked ? poolSelected.filter((s) => s !== sid) : [...poolSelected, sid])}
                          className="w-full flex items-center gap-2 px-3 py-4 sm:py-2 rounded-sm text-xs transition-colors duration-100"
                          style={{ color: checked ? "var(--text-primary)" : "var(--text-faint)", background: checked ? "var(--accent-subtle)" : "transparent" }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors"
                            style={{ borderColor: checked ? "var(--accent)" : "var(--border-strong)", background: checked ? "var(--accent)" : "transparent" }}
                          >
                            {checked && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5L4 7L8 3" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {sid}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-3 py-2.5 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                      {poolSelected.length}/{poolSamplesList.length} selected
                    </span>
                    <PillButton active={poolSelected.length > 0} onClick={() => { if (poolSelected.length > 0) handleAddToPool(); }}>
                      Add to pool
                    </PillButton>
                  </div>
                </div>
              )}

              {/* Collected samples */}
              {collected.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[2px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Pooled samples ({collected.length})
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {collected.map((c) => (
                      <span
                        key={c.sampleId}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm border"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg)" }}
                      >
                        {c.sampleId}
                        <button
                          onClick={() => handleRemoveFromPool(c.sampleId)}
                          className="ml-0.5 leading-none"
                          style={{ color: "var(--text-faint)" }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[2px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                      New label for pooled samples
                    </label>
                    <input
                      type="text"
                      value={poolNewLabel}
                      onChange={(e) => setPoolNewLabel(e.target.value)}
                      placeholder="e.g. Custom_Group"
                      className="w-full px-3 py-2 text-sm rounded-sm border outline-none transition-all duration-200 focus:border-[var(--accent)]"
                      style={{ background: "var(--bg)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <ActionButton variant="accent" disabled={!poolNewLabel.trim() || busy} onClick={handlePoolSubmit}>
                    {busy ? "Saving..." : `Apply label to ${collected.length} samples`}
                  </ActionButton>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* === RENAME UI === */}
        <AnimatePresence>
          {operation === "rename" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <SearchableSelect
                label="Label to rename"
                options={labels}
                selected={renameOld}
                onChange={setRenameOld}
                multi={false}
              />
              {renameOld.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-[2px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                    New label name
                  </label>
                  <input
                    type="text"
                    value={renameNew}
                    onChange={(e) => setRenameNew(e.target.value)}
                    placeholder="Enter new label"
                    className="w-full px-3 py-2 text-sm rounded-sm border outline-none transition-all duration-200 focus:border-[var(--accent)]"
                    style={{ background: "var(--bg)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
                  />
                </div>
              )}
              <ActionButton
                variant="accent"
                disabled={renameOld.length === 0 || !renameNew.trim() || busy}
                onClick={handleRenameSubmit}
              >
                {busy ? "Saving..." : "Rename"}
              </ActionButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === RESET UI === */}
        <AnimatePresence>
          {operation === "reset" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-3"
            >
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                This will replace your <span className="font-semibold" style={{ color: "var(--text-bright)" }}>{dataset}</span> dataset labels with the original reference labels. Any custom labels will be lost.
              </p>
              <ActionButton variant="danger" disabled={busy} onClick={handleResetSubmit}>
                {busy ? "Resetting..." : "Reset to default"}
              </ActionButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback */}
        {error && (
          <p className="text-xs px-1" style={{ color: "var(--error-text)" }}>{error}</p>
        )}
        {success && (
          <p className="text-xs px-1" style={{ color: "#34d399" }}>{success}</p>
        )}
      </div>
    </GlowCard>
  );
}
