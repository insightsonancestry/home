"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader } from "./SectionHeader";
import { DownloadButton } from "./buttons";
import { fetchRunHistory, fetchRunResultText, type HistoryRun } from "@/lib/samples";

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Single expandable run row ────────────────────────────────────────

function HistoryRow({ run, expanded, onToggle }: {
  run: HistoryRun;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [resultText, setResultText] = useState<string | null>(null);
  const fetchedResult = useRef(false);

  // Lazy-load resultText when expanding a completed run
  useEffect(() => {
    if (!expanded || run.status !== "completed" || fetchedResult.current) return;
    fetchedResult.current = true;
    fetchRunResultText(run.runId).then(setResultText);
  }, [expanded, run.status, run.runId]);

  const hasResult = run.status === "completed" && !!resultText;

  const downloadText = useCallback(() => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.target}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resultText, run.target]);

  const statusDot = run.status === "completed"
    ? (run.modelPass ? "#34d399" : "#f87171")
    : run.status === "cancelled" ? "#facc15"
    : run.status === "failed" ? "#f87171"
    : "var(--text-faint)";

  return (
    <div
      className="border rounded-sm transition-colors duration-200"
      style={{
        borderColor: expanded ? "var(--accent)" : "var(--border)",
        background: "var(--panel)",
      }}
    >
      {/* Collapsed header — always visible */}
      <button onClick={onToggle} className="w-full text-left px-4 sm:px-5 py-3.5 sm:py-4">
        {/* Row 1: status dot · target · meta */}
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: statusDot, boxShadow: run.status === "completed" ? `0 0 6px ${statusDot}50` : "none" }}
          />
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text-bright)" }}>
            {run.target}
          </span>
          {run.status === "completed" && run.modelPass !== undefined && (
            <span
              className="text-[9px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm border shrink-0 font-bold"
              style={run.modelPass
                ? { color: "#34d399", borderColor: "rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.08)" }
                : { color: "#f87171", borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)" }
              }
            >
              {run.modelPass ? "Pass" : "Fail"}
            </span>
          )}
          {run.status === "cancelled" && (
            <span
              className="text-[9px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm border shrink-0 font-bold"
              style={{ color: "#facc15", borderColor: "rgba(250,204,21,0.3)", background: "rgba(250,204,21,0.08)" }}
            >
              Terminated
            </span>
          )}
          {run.status === "failed" && (
            <span
              className="text-[9px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm border shrink-0 font-bold"
              style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)" }}
            >
              Failed
            </span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[9px] uppercase tracking-[2px] px-1.5 py-px rounded-sm border hidden sm:inline"
              style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}
            >
              {run.dataset}
            </span>
            <span className="text-[10px] tabular-nums" style={{ color: "var(--text-faint)" }}>
              {formatDate(run.createdAt)}
            </span>
            {run.durationMs && (
              <span className="text-[10px] tabular-nums hidden sm:inline" style={{ color: "var(--text-faint)" }}>
                {formatDuration(run.durationMs)}
              </span>
            )}
            {/* Chevron */}
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200"
              style={{ color: "var(--text-faint)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {!expanded && run.status === "failed" && run.error && (
          <p className="mt-1.5 text-[10px] truncate" style={{ color: "var(--error-text)" }}>
            {run.error}
          </p>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 sm:px-5 pb-5 sm:pb-6 flex flex-col gap-4">
              {/* Divider */}
              <div className="h-px" style={{ background: "var(--border)" }} />

              {/* Compact params */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: "var(--text-faint)" }}>Dataset</span>
                    <span className="text-xs" style={{ color: "var(--text-primary)" }}>{run.dataset}</span>
                  </div>
                  {run.durationMs && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: "var(--text-faint)" }}>Duration</span>
                      <span className="text-xs tabular-nums" style={{ color: "var(--text-primary)" }}>{formatDuration(run.durationMs)}</span>
                    </div>
                  )}
                  {run.allsnps && (
                    <span className="text-[9px] uppercase tracking-[2px] px-1.5 py-px rounded-sm border" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>allsnps</span>
                  )}
                  {run.userTarget && (
                    <span className="text-[9px] uppercase tracking-[2px] px-1.5 py-px rounded-sm border" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>user sample</span>
                  )}
                  {run.pValue !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: "var(--text-faint)" }}>p-value</span>
                      <span className="text-xs tabular-nums font-semibold" style={{ color: run.modelPass ? "#34d399" : "#f87171" }}>
                        {run.pValue < 0.001 ? run.pValue.toExponential(2) : run.pValue.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-1.5">
                  <span className="text-[9px] uppercase tracking-[2px] font-bold pt-0.5 shrink-0" style={{ color: "var(--text-faint)" }}>Sources</span>
                  <div className="flex flex-wrap gap-1">
                    {run.sources.map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-px rounded-sm" style={{ color: "var(--text-muted)", background: "var(--bg)" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <span className="text-[9px] uppercase tracking-[2px] font-bold pt-0.5 shrink-0" style={{ color: "var(--text-faint)" }}>Refs</span>
                  <div className="flex flex-wrap gap-1">
                    {run.references.map((r) => (
                      <span key={r} className="text-[10px] px-1.5 py-px rounded-sm" style={{ color: "var(--text-muted)", background: "var(--bg)" }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weights breakdown */}
              {run.weights && run.weights.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: "var(--text-faint)" }}>Results</span>
                  {run.weights.map((w) => (
                    <div key={w.source} className="flex items-center justify-between">
                      <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{w.source}</span>
                      <span className="text-xs tabular-nums shrink-0 pl-3" style={{ color: "var(--text-bright)" }}>
                        {w.pct.toFixed(1)}
                        {w.se !== undefined && ` ±${w.se.toFixed(1)}`}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Error for failed runs */}
              {run.status === "failed" && run.error && (
                <div className="px-3 py-2.5 border rounded-sm" style={{ borderColor: "var(--error-border)", background: "var(--error-subtle)" }}>
                  <p className="text-xs" style={{ color: "var(--error-text)" }}>{run.error}</p>
                </div>
              )}

              {/* Download for completed runs */}
              {hasResult && (
                <>
                  <div className="flex gap-2">
                    <DownloadButton onClick={downloadText}>Text</DownloadButton>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────

export function HistorySection({ visible }: { visible?: boolean }) {
  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const lastFetchRef = useRef(0);

  const loadHistory = useCallback(() => {
    lastFetchRef.current = Date.now();
    fetchRunHistory()
      .then(setRuns)
      .finally(() => setLoading(false));
  }, []);

  // Fetch when tab becomes visible (initial load + refresh with 30s cooldown)
  useEffect(() => {
    if (!visible) return;
    if (lastFetchRef.current === 0 || Date.now() - lastFetchRef.current > 30_000) {
      loadHistory();
    }
  }, [visible, loadHistory]);

  return (
    <div className="mx-auto flex flex-col gap-4 sm:gap-6 h-full">
      <SectionHeader title="History" description="View and manage all your past model runs and results" />

      {loading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-sm" style={{ background: "var(--border)" }} />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 flex items-center justify-center"
        >
          <div className="text-center py-16">
            <p className="text-xs uppercase tracking-[2px]" style={{ color: "var(--text-faint)" }}>
              No runs yet
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
              Completed model runs will appear here
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {runs.map((run, i) => (
            <motion.div
              key={run.runId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <HistoryRow
                run={run}
                expanded={expandedId === run.runId}
                onToggle={() => setExpandedId(expandedId === run.runId ? null : run.runId)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
