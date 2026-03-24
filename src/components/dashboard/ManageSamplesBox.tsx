"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GlowCard } from "@/components/GlowCard";
import { BoxHeader } from "./BoxHeader";
import { PillButton, ActionButton } from "./buttons";
import { IconUpload, IconWarning, IconCheck, IconX, IconTrash } from "./icons";
import { PROVIDERS, MAX_SAMPLES, MAX_FILE_SIZE_MB, type Sample } from "@/constants/dashboard";
import { presignUpload, uploadToS3, confirmUpload } from "@/lib/samples";

interface ManageSamplesBoxProps {
  samples: Sample[];
  loading?: boolean;
  onUploadComplete: () => void;
  onDelete: (sampleId: string) => Promise<void>;
}

function DeleteConfirmModal({ sample, onConfirm, onCancel }: {
  sample: Sample;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-sm p-5 sm:p-6 border rounded-sm"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-bright)" }}>
          Confirm deletion
        </p>
        <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          This will permanently remove <span className="font-semibold" style={{ color: "var(--text-bright)" }}>{sample.label}</span> and its associated files. This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-5">
          <ActionButton variant="muted" onClick={onCancel}>Cancel</ActionButton>
          <ActionButton variant="danger" onClick={onConfirm}>Delete</ActionButton>
        </div>
      </motion.div>
    </div>
  );
}

function SampleRow({ sample, onDelete }: { sample: Sample; onDelete: (id: string) => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const provider = PROVIDERS.find((p) => p.id === sample.provider);

  const fileSizeLabel = sample.fileSize
    ? sample.fileSize > 1024 * 1024
      ? `${(sample.fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(sample.fileSize / 1024).toFixed(0)} KB`
    : null;

  const handleDelete = async () => {
    setConfirmOpen(false);
    // Wait for modal exit animation to finish
    await new Promise((r) => setTimeout(r, 250));
    setDeleting(true);
    try {
      await onDelete(sample.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2.5 border rounded-sm transition-all duration-200${deleting ? " animate-pulse pointer-events-none" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderColor: deleting ? "var(--error-border)" : hovered ? "var(--border-strong)" : "var(--border)",
        background: deleting ? "var(--error-subtle)" : hovered ? "var(--bg)" : "transparent",
        opacity: deleting ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: sample.status === "ready" ? "var(--accent)" : sample.status === "error" ? "var(--error-text)" : "var(--text-faint)",
            boxShadow: sample.status === "ready" ? "var(--accent-dot)" : "none",
          }}
        />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold truncate" style={{ color: "var(--text-bright)" }}>
            {sample.label}
          </span>
          <span className="text-[10px] shrink-0" style={{ color: "var(--text-faint)" }}>
            {provider?.label || sample.provider}
            {fileSizeLabel && ` · ${fileSizeLabel}`}
          </span>
        </div>
      </div>

      <button
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
        className="shrink-0 p-1.5 rounded-sm border transition-all duration-200"
        style={{
          borderColor: deleting ? "var(--border)" : hovered ? "var(--error-border)" : "var(--border-strong)",
          color: deleting ? "var(--text-faint)" : hovered ? "var(--error-text)" : "var(--text-muted)",
          background: hovered && !deleting ? "var(--error-subtle)" : "transparent",
          cursor: deleting ? "not-allowed" : "pointer",
          opacity: deleting ? 0.5 : 1,
        }}
      >
        <IconTrash />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {confirmOpen && (
            <DeleteConfirmModal
              sample={sample}
              onConfirm={handleDelete}
              onCancel={() => setConfirmOpen(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

export function ManageSamplesBox({ samples, loading, onUploadComplete, onDelete }: ManageSamplesBoxProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [sampleLabel, setSampleLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleCount = samples.length;
  const isFull = sampleCount >= MAX_SAMPLES;
  const providerObj = PROVIDERS.find((p) => p.id === selectedProvider);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedProvider("");
    setSampleLabel("");
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedProvider || !sampleLabel.trim()) return;

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const { sampleId, uploadUrl } = await presignUpload({
        label: sampleLabel.trim(),
        provider: selectedProvider,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      await uploadToS3(uploadUrl, selectedFile, setUploadProgress);

      await confirmUpload(sampleId);

      resetForm();
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <GlowCard delay={0}>
      <BoxHeader
        title="Manage your samples"
        badge={loading ? (
          <span
            className="text-[10px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm border animate-pulse"
            style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
          >
            —/{MAX_SAMPLES}
          </span>
        ) : (
          <span
            className="text-[10px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm border"
            style={{
              borderColor: isFull ? "var(--error-border)" : "var(--border-strong)",
              color: isFull ? "var(--error-text)" : "var(--text-faint)",
              background: isFull ? "var(--error-subtle)" : "transparent",
            }}
          >
            {sampleCount}/{MAX_SAMPLES}
          </span>
        )}
      />

      <div className="flex-1 px-5 sm:px-7 py-5 sm:py-6">
        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-10 rounded-sm" style={{ background: "var(--border)" }} />
            <div className="h-10 rounded-sm" style={{ background: "var(--border)" }} />
            <div className="h-20 rounded-sm" style={{ background: "var(--border)" }} />
          </div>
        ) : isFull ? (
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex items-start gap-3 p-3 sm:p-4 rounded-sm border" style={{ borderColor: "var(--error-border)", background: "var(--error-subtle)" }}>
              <IconWarning />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--error-text)" }}>
                  Sample limit reached
                </p>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Delete an existing sample to free up a slot.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {samples.map((sample) => (
                  <motion.div
                    key={sample.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <SampleRow sample={sample} onDelete={onDelete} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-5">
            {samples.length > 0 && (
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {samples.map((sample) => (
                    <motion.div
                      key={sample.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <SampleRow sample={sample} onDelete={onDelete} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-[2px] font-medium mb-1.5 sm:mb-2" style={{ color: "var(--text-muted)" }}>
                Sample label
              </label>
              <input
                type="text"
                value={sampleLabel}
                onChange={(e) => setSampleLabel(e.target.value)}
                placeholder="e.g. MySample_Italian"
                disabled={uploading}
                className="w-full px-3 py-2.5 text-sm rounded-sm border outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_12px_var(--accent-faint)]"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border-strong)",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-inset)",
                  opacity: uploading ? 0.5 : 1,
                }}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[2px] font-medium mb-1.5 sm:mb-2" style={{ color: "var(--text-muted)" }}>
                Provider
              </label>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((p) => (
                  <PillButton key={p.id} active={selectedProvider === p.id} onClick={() => !uploading && setSelectedProvider(p.id)}>
                    {p.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[2px] font-medium mb-1.5 sm:mb-2" style={{ color: "var(--text-muted)" }}>
                Raw file
              </label>
              <div
                onDrop={uploading ? undefined : handleDrop}
                onDragOver={uploading ? undefined : (e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={uploading ? undefined : () => setDragOver(false)}
                onClick={uploading ? undefined : () => fileInputRef.current?.click()}
                className="relative flex flex-col items-center justify-center gap-2 sm:gap-2.5 py-6 sm:py-9 px-4 sm:px-6 border-2 border-dashed rounded-sm transition-all duration-300"
                style={{
                  borderColor: dragOver ? "var(--accent)" : "var(--border-strong)",
                  background: dragOver ? "var(--accent-faint)" : "var(--bg)",
                  boxShadow: dragOver ? "inset 0 0 30px var(--accent-faint)" : "var(--shadow-inset)",
                  cursor: uploading ? "default" : "pointer",
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={providerObj?.accept || ".txt,.csv"}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <IconCheck />
                    <span className="text-xs" style={{ color: "var(--accent)" }}>{selectedFile.name}</span>
                    {!uploading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="ml-1 p-0.5 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <IconX />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ color: "var(--text-faint)" }}><IconUpload /></div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Drag & drop or <span style={{ color: "var(--accent)" }}>browse</span>
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {providerObj ? `${providerObj.label} format (${providerObj.accept})` : "Select a provider first"}
                    </p>
                  </>
                )}
              </div>
            </div>

            {uploading && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>Uploading</span>
                  <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>{uploadProgress}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%`, background: "var(--accent)" }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs px-1" style={{ color: "var(--error-text)" }}>{error}</p>
            )}

            <ActionButton
              onClick={handleUpload}
              disabled={!selectedFile || !selectedProvider || !sampleLabel.trim() || uploading}
            >
              {uploading ? "Uploading..." : "Upload sample"}
            </ActionButton>
          </div>
        )}
      </div>
    </GlowCard>
  );
}
