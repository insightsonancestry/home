"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/images/insightsonancestry-logo_test.png";
import { GlowCard } from "@/components/GlowCard";
import { BoxHeader } from "./BoxHeader";
import { ActionButton, DownloadButton } from "./buttons";
import { PIE_COLORS, PIE_COLORS_HEX } from "@/constants/dashboard";
import { exportChartAsPng } from "@/utils/exportChart";

interface DonutSlice {
  d: string;
  color: string;
  colorHex: string;
  label: string;
  pct: number;
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

function buildDonutSlices(segments: { label: string; pct: number }[]): DonutSlice[] {
  const outerR = 44;
  const innerR = 27;
  const slices: DonutSlice[] = [];
  let cumulative = 0;

  for (let i = 0; i < segments.length; i++) {
    const frac = segments[i].pct / 100;
    const gap = 0.008;
    const startAngle = (cumulative + gap) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cumulative + frac - gap) * 2 * Math.PI - Math.PI / 2;
    const largeArc = (frac - gap * 2) > 0.5 ? 1 : 0;
    const ox1 = 50 + outerR * Math.cos(startAngle);
    const oy1 = 50 + outerR * Math.sin(startAngle);
    const ox2 = 50 + outerR * Math.cos(endAngle);
    const oy2 = 50 + outerR * Math.sin(endAngle);
    const ix1 = 50 + innerR * Math.cos(startAngle);
    const iy1 = 50 + innerR * Math.sin(startAngle);
    const ix2 = 50 + innerR * Math.cos(endAngle);
    const iy2 = 50 + innerR * Math.sin(endAngle);

    slices.push({
      d: `M${ox1},${oy1} A${outerR},${outerR} 0 ${largeArc},1 ${ox2},${oy2} L${ix2},${iy2} A${innerR},${innerR} 0 ${largeArc},0 ${ix1},${iy1} Z`,
      color: PIE_COLORS[i % PIE_COLORS.length],
      colorHex: PIE_COLORS_HEX[i % PIE_COLORS_HEX.length],
      label: segments[i].label,
      pct: segments[i].pct,
    });
    cumulative += frac;
  }

  return slices;
}

const INNER_R = 27;

export function ModelOutputBox({ output, error, isRunning, references }: {
  output: string;
  error?: string;
  isRunning: boolean;
  references: string[];
}) {
  const [showChart, setShowChart] = useState(false);

  const { segments, targetName, pValue } = output ? parseOutput(output) : { segments: [], targetName: "", pValue: "" };
  const pieSlices = buildDonutSlices(segments);

  return (
    <GlowCard delay={0.1}>
      <BoxHeader title="Model output" subtitle="View results as text or chart" />

      <div className="flex-1 px-5 sm:px-7 py-5 sm:py-6 flex flex-col gap-4 sm:gap-5">
        <AnimatePresence mode="wait">
          {!showChart ? (
            <motion.div
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-sm border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ background: "var(--panel-strong)", borderColor: "var(--border)" }}>
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--error)" }} />
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#facc15" }} />
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#34d399" }} />
                  <span className="ml-auto text-[9px] uppercase tracking-[2px]" style={{ color: "var(--text-faint)" }}>output</span>
                </div>
                <pre
                  className="font-mono text-xs leading-relaxed p-4 overflow-auto min-h-[180px] max-h-[340px]"
                  style={{
                    background: "var(--bg)",
                    color: output ? "var(--text-primary)" : "var(--text-faint)",
                    boxShadow: "var(--shadow-inset)",
                  }}
                >
                  {error ? `Error: ${error}` : output || (isRunning ? "Running model..." : "Run a model to see output here...")}
                </pre>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="rounded-sm border overflow-hidden"
              style={{ background: "#000000", borderColor: "var(--border)" }}
            >
              {/* Chart header */}
              <div className="flex flex-col gap-2 px-5 sm:px-6 pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <Image src={logoImage} alt="IoA" className="h-5 w-5 sm:h-6 sm:w-6 opacity-70" draggable="false" />
                  <span
                    className="text-[10px] uppercase tracking-[2px] px-2.5 py-1 rounded-sm border"
                    style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)", background: "var(--accent-subtle)" }}
                  >
                    p = {pValue}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)", boxShadow: "var(--accent-dot)" }} />
                  <span className="text-sm sm:text-base font-bold uppercase tracking-[3px]" style={{ color: "var(--text-bright)" }}>
                    {targetName}
                  </span>
                </div>
              </div>

              <div className="mx-5 sm:mx-6 h-px" style={{ background: "var(--border)" }} />

              {/* Sources + Donut */}
              <div className="flex flex-col md:flex-row items-center md:items-stretch px-5 sm:px-6 pt-5 gap-5 md:gap-0">
                <div className="w-full md:flex-1 md:pr-5 md:border-r order-2 md:order-1 md:py-2" style={{ borderColor: "var(--border)" }}>
                  <p className="text-[9px] uppercase tracking-[2px] mb-2.5" style={{ color: "var(--text-faint)" }}>Sources</p>
                  <ul className="flex flex-col gap-1">
                    {pieSlices.map((slice, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs"
                        style={{
                          borderLeft: `2px solid ${slice.color}`,
                          background: `linear-gradient(90deg, ${slice.colorHex}15 ${slice.pct}%, transparent ${slice.pct}%)`,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: slice.color, boxShadow: `0 0 6px ${slice.colorHex}40` }} />
                        <span style={{ color: "var(--text-primary)" }}>{slice.label}</span>
                        <span className="ml-auto pl-3 tabular-nums font-medium" style={{ color: slice.color }}>{slice.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="w-full md:flex-1 flex items-center justify-center order-1 md:order-2 relative py-2">
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb), 0.05), transparent 60%)" }} />
                  <svg viewBox="0 0 100 100" className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 relative z-10">
                    <defs>
                      <filter id="donut-glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      {pieSlices.map((slice, i) => (
                        <linearGradient key={i} id={`sg${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={slice.colorHex} stopOpacity="1" />
                          <stop offset="100%" stopColor={slice.colorHex} stopOpacity="0.7" />
                        </linearGradient>
                      ))}
                    </defs>
                    <circle cx="50" cy="50" r="46.5" fill="none" stroke="var(--border)" strokeWidth="0.3" />
                    {Array.from({ length: 36 }).map((_, i) => {
                      const a = (i / 36) * 2 * Math.PI - Math.PI / 2;
                      return <line key={i} x1={50 + 45.5 * Math.cos(a)} y1={50 + 45.5 * Math.sin(a)} x2={50 + 46.5 * Math.cos(a)} y2={50 + 46.5 * Math.sin(a)} stroke="var(--border-strong)" strokeWidth="0.3" />;
                    })}
                    {pieSlices.map((slice, i) => (
                      <path key={i} d={slice.d} fill={`url(#sg${i})`} filter="url(#donut-glow)" />
                    ))}
                    <circle cx="50" cy="50" r={INNER_R - 1} fill="none" stroke="var(--border)" strokeWidth="0.3" />
                    <circle cx="50" cy="50" r={INNER_R - 3} fill="#000000" fillOpacity="0.5" />
                    <text x="50" y="47" textAnchor="middle" fill="var(--text-bright)" fontSize="4" fontWeight="bold" letterSpacing="1.5" fontFamily="system-ui, sans-serif">{segments.length}</text>
                    <text x="50" y="53" textAnchor="middle" fill="var(--text-faint)" fontSize="2.5" letterSpacing="1" fontFamily="system-ui, sans-serif">SOURCES</text>
                  </svg>
                </div>
              </div>

              {/* References strip */}
              {references.length > 0 && (
                <div className="px-5 sm:px-6 pb-4 pt-2">
                  <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[9px] uppercase tracking-[2px] shrink-0" style={{ color: "var(--text-faint)" }}>Refs</span>
                      {references.map((ref) => (
                        <span key={ref} className="text-[10px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--accent)", opacity: 0.4 }} />
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <ActionButton variant="accent" disabled={!output} onClick={() => setShowChart((v) => !v)}>
          {showChart ? "Show text output" : "Convert to pie chart"}
        </ActionButton>

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
            onClick={() => exportChartAsPng(segments, targetName, pValue, references)}
          >
            Chart
          </DownloadButton>
        </div>
      </div>
    </GlowCard>
  );
}
