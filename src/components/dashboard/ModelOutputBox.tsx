"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import logoImage from "@/assets/images/insightsonancestry-logo_test.png";
import { GlowCard } from "@/components/GlowCard";
import { BoxHeader } from "./BoxHeader";
import { ActionButton, DownloadButton } from "./buttons";
import { PIE_COLORS_HEX } from "@/constants/dashboard";

interface BarSegment {
  label: string;
  pct: number;
  colorHex: string;
}

function parseOutput(output: string) {
  const segments = output
    .split("\n")
    .filter((l) => l.startsWith("source:"))
    .map((l) => {
      const match = l.match(/^source:\s+(.+?)\s+([\d.]+)%/);
      return match ? { label: match[1], pct: parseFloat(match[2]) } : null;
    })
    .filter(Boolean) as { label: string; pct: number }[];

  const targetMatch = output.match(/^target:\s*(.+)$/m);
  const targetName = targetMatch ? targetMatch[1].trim() : "";

  const pValueMatch = output.match(/^p-value:\s*([\d.]+)/m);
  const pValue = pValueMatch ? pValueMatch[1] : "";

  return { segments, targetName, pValue };
}

function buildBars(segments: { label: string; pct: number }[]): BarSegment[] {
  return segments.map((s, i) => ({
    label: s.label,
    pct: s.pct,
    colorHex: PIE_COLORS_HEX[i % PIE_COLORS_HEX.length],
  }));
}

const STAGES_ORDER = ["downloading_ref", "curating", "merging", "running_qpadm", "complete"] as const;

const STAGE_DONE_LABELS: Record<string, string> = {
  downloading_ref: "Downloading the dataset",
  curating: "Curating the dataset",
  merging: "Merging the sample",
  running_qpadm: "Running qpAdm",
};

const STAGE_ACTIVE_LABELS: Record<string, string> = {
  downloading_ref: "Downloading the dataset...",
  curating: "Curating the dataset...",
  merging: "Merging the sample...",
  running_qpadm: "Running qpAdm...",
};

function stageIndex(s: string): number {
  return STAGES_ORDER.indexOf(s as typeof STAGES_ORDER[number]);
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export function ModelOutputBox({ output, error, isRunning, references, stage, durationMs, userTarget, onClear }: {
  output: string;
  error?: string;
  isRunning: boolean;
  references: string[];
  stage?: string;
  durationMs?: number;
  userTarget?: boolean;
  onClear?: () => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const { segments, targetName, pValue } = output ? parseOutput(output) : { segments: [], targetName: "", pValue: "" };
  const bars = buildBars(segments);
  const maxPct = 100;

  const downloadChart = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { pixelRatio: 3 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${targetName || "qpadm_model"}.png`;
      a.click();
    } catch {
      // fallback: do nothing
    }
  }, [targetName]);

  return (
    <GlowCard delay={0.1}>
      <BoxHeader title="Model output" subtitle="Run status and results" />

      <div className="flex-1 px-5 sm:px-7 py-5 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Terminal */}
        <div className="rounded-sm border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: "var(--panel-strong)", borderColor: "var(--border)" }}>
            <span className="w-[9px] h-[9px] rounded-full" style={{ background: "var(--error)" }} />
            <span className="w-[9px] h-[9px] rounded-full" style={{ background: "#facc15" }} />
            <span className="w-[9px] h-[9px] rounded-full" style={{ background: "#34d399" }} />
            <span className="ml-auto text-[9px] uppercase tracking-[2px]" style={{ color: "var(--text-faint)" }}>terminal</span>
          </div>
          <div
            className="p-3 sm:p-4 min-h-[80px] font-mono text-xs leading-relaxed flex flex-col gap-1"
            style={{ background: "var(--bg)" }}
          >
            {error ? (
              <p style={{ color: "var(--error-text)" }}>
                <span style={{ color: "var(--text-faint)" }}>$ </span>Error: {error}
              </p>
            ) : !isRunning && !output && !stage ? (
              <p style={{ color: "var(--text-faint)" }}>
                <span>$ </span>Waiting for model run...
              </p>
            ) : (
              <>
                {isRunning && !stage && (
                  <p style={{ color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--text-faint)" }}>$ </span>Initializing...
                  </p>
                )}
                {stage && STAGES_ORDER.filter((s) => s !== "complete" && STAGE_DONE_LABELS[s]).map((s) => {
                  if (s === "merging" && !userTarget) return null;
                  const current = stageIndex(stage);
                  const idx = stageIndex(s);
                  const isDone = current > idx || stage === "complete" || !!output;
                  const isActive = current === idx && isRunning;
                  if (!isDone && !isActive) return null;
                  return (
                    <p key={s} style={{ color: isDone ? "var(--text-muted)" : "var(--accent)" }}>
                      <span style={{ color: "var(--text-faint)" }}>$ </span>
                      {isDone ? (
                        <><span style={{ color: "#34d399" }}>&#10003;</span> {STAGE_DONE_LABELS[s]}</>
                      ) : (
                        <><span className="animate-pulse">&#9679;</span> {STAGE_ACTIVE_LABELS[s]}</>
                      )}
                    </p>
                  );
                })}
                {(stage === "complete" || output) && (
                  <p style={{ color: "#34d399" }}>
                    <span style={{ color: "var(--text-faint)" }}>$ </span>
                    Completed{durationMs ? ` in ${formatDuration(durationMs)}` : ""}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bar chart — always visible when there's output */}
        {output && bars.length > 0 && (
          <div
            ref={chartRef}
            className="relative rounded-sm overflow-hidden flex flex-col"
            style={{ background: "#000000", aspectRatio: "3 / 4" }}
          >
            {/* Header */}
            <div className="px-7 sm:px-9 pt-7 sm:pt-9 pb-5 sm:pb-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] tracking-[3px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>qpAdm</span>
                <span
                  className="text-[10px] tracking-[2px] px-3 py-1 rounded-sm border"
                  style={{ borderColor: "rgba(83,189,227,0.25)", color: "rgba(255,255,255,0.5)", background: "rgba(83,189,227,0.08)" }}
                >
                  p = {pValue}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2.5 mt-5 sm:mt-6">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#53bde3", boxShadow: "0 0 10px #53bde3" }} />
                <span className="text-lg sm:text-xl font-bold uppercase tracking-[5px]" style={{ color: "#ffffff" }}>
                  {targetName}
                </span>
              </div>
            </div>

            <div className="mx-7 sm:mx-9 h-px" style={{ background: "rgba(83,189,227,0.12)" }} />

            {/* Sources */}
            <div className="px-7 sm:px-9 pt-6 sm:pt-7 pb-4">
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <p className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>Sources</p>
                <p className="text-[9px] uppercase tracking-[2px] tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {segments.length} source{segments.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex flex-col gap-5 sm:gap-6">
                {bars.map((bar, i) => (
                  <motion.div
                    key={bar.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: bar.colorHex, boxShadow: `0 0 6px ${bar.colorHex}50` }}
                        />
                        <span className="text-sm truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                          {bar.label}
                        </span>
                      </div>
                      <span className="text-sm tabular-nums font-bold shrink-0 pl-3" style={{ color: bar.colorHex }}>
                        {bar.pct}%
                      </span>
                    </div>

                    <div
                      className="relative h-[20px] rounded overflow-hidden"
                      style={{ background: `${bar.colorHex}0c` }}
                    >
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded"
                        initial={{ width: 0 }}
                        animate={{ width: `${(bar.pct / maxPct) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.06 + 0.15, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                          background: `linear-gradient(90deg, ${bar.colorHex}, ${bar.colorHex}99)`,
                          boxShadow: `0 0 14px ${bar.colorHex}30`,
                        }}
                      />
                      <motion.div
                        className="absolute top-0 left-0 h-[1px] rounded"
                        initial={{ width: 0 }}
                        animate={{ width: `${(bar.pct / maxPct) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.06 + 0.15, ease: [0.4, 0, 0.2, 1] }}
                        style={{ background: `linear-gradient(90deg, ${bar.colorHex}30, transparent)` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Refs */}
            {references.length > 0 && (
              <div className="px-7 sm:px-9 pt-2 pb-1">
                <p className="text-[9px] uppercase tracking-[2px] font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Refs</p>
                <div className="flex items-start gap-1 flex-wrap">
                  {references.map((ref) => (
                    <span
                      key={ref}
                      className="text-[7px] px-1 py-px rounded-sm leading-tight"
                      style={{ color: "rgba(255,255,255,0.25)", background: "rgba(83,189,227,0.06)" }}
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer */}
            <div className="px-7 sm:px-9 pt-3 pb-6 sm:pb-7">
              <div className="flex items-center justify-end gap-2">
                <span className="text-[9px] tracking-[1px]" style={{ color: "rgba(255,255,255,0.3)" }}>powered by</span>
                <Image src={logoImage} alt="IoA" width={16} height={16} className="opacity-50" draggable="false" />
                <span className="text-[10px] tracking-[2px] font-bold uppercase" style={{ color: "rgba(83,189,227,0.5)" }}>
                  Insights on Ancestry
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Download + clear buttons */}
        {output && (
          <div className="flex gap-2">
            <DownloadButton
              disabled={!output}
              onClick={() => {
                const blob = new Blob([output], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${targetName || "model_output"}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Text
            </DownloadButton>
            <DownloadButton
              disabled={!output}
              onClick={downloadChart}
            >
              Chart
            </DownloadButton>
            {onClear && (
              <ActionButton variant="danger" onClick={onClear}>
                Clear
              </ActionButton>
            )}
          </div>
        )}
      </div>
    </GlowCard>
  );
}
