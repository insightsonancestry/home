"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SectionHeader } from "./SectionHeader";
import { ConfigureModelBox } from "./ConfigureModelBox";
import { ModelOutputBox } from "./ModelOutputBox";
import { submitQpadm, pollUntilDone, fetchActiveRuns, cancelRun } from "@/lib/samples";
const ACTIVE_RUN_KEY = "diy-active-run";

export interface RestoredConfig {
  dataset: string;
  sources: string[];
  references: string[];
  target: string;
}

export function DIYModelingSection({ sampleLabels }: { sampleLabels: string[] }) {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [lastReferences, setLastReferences] = useState<string[]>([]);
  const [stage, setStage] = useState<string | undefined>(undefined);
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const [isUserTarget, setIsUserTarget] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [restoredConfig, setRestoredConfig] = useState<RestoredConfig | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resumedRef = useRef(false);

  const handleStageChange = useCallback((newStage: string, newDurationMs?: number) => {
    setStage(newStage);
    if (newDurationMs !== undefined) setDurationMs(newDurationMs);
  }, []);

  // Resume an active run — check sessionStorage first (fast), then API (survives logout)
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;

    const startPolling = (runId: string, startedAt: number, config?: RestoredConfig, initialStage?: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsRunning(true);
      setActiveRunId(runId);
      if (initialStage) setStage(initialStage);
      if (config) {
        setRestoredConfig(config);
        setLastReferences(config.references);
      }

      pollUntilDone(runId, startedAt, controller.signal, handleStageChange)
        .then((result) => {
          setOutput(result);
          sessionStorage.removeItem(ACTIVE_RUN_KEY);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "qpAdm run failed");
          sessionStorage.removeItem(ACTIVE_RUN_KEY);
        })
        .finally(() => {
          abortRef.current = null;
          setIsRunning(false);
        });
    };

    // 1. Check sessionStorage (same-tab navigation)
    try {
      const raw = sessionStorage.getItem(ACTIVE_RUN_KEY);
      if (raw) {
        const { runId, startedAt } = JSON.parse(raw);
        if (Date.now() - startedAt < 600_000) {
          startPolling(runId, startedAt);
          return;
        }
        sessionStorage.removeItem(ACTIVE_RUN_KEY);
      }
    } catch {}

    // 2. Check API (survives logout/login, new tabs)
    fetchActiveRuns().then((runs) => {
      if (runs.length > 0 && !abortRef.current) {
        const run = runs[0];
        sessionStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({ runId: run.runId, startedAt: run.createdAt }));
        startPolling(run.runId, run.createdAt, {
          dataset: run.dataset,
          sources: run.sources,
          references: run.references,
          target: run.target,
        }, run.stage);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submittingRef = useRef(false);

  const handleRun = async (dataset: string, sources: string[], references: string[], target: string, userTarget?: boolean, allsnps?: boolean, individualSamples?: Record<string, string[]>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsRunning(true);
    setOutput("");
    setError("");
    setStage("downloading_ref");
    setDurationMs(undefined);
    setIsUserTarget(!!userTarget);
    setLastReferences(references);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { runId } = await submitQpadm({ dataset, sources, references, target, userTarget, allsnps, individualSamples });
      setActiveRunId(runId);
      const startedAt = Date.now();
      sessionStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({ runId, startedAt }));

      const result = await pollUntilDone(runId, startedAt, controller.signal, handleStageChange);
      setOutput(result);
      sessionStorage.removeItem(ACTIVE_RUN_KEY);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "qpAdm run failed");
      sessionStorage.removeItem(ACTIVE_RUN_KEY);
    } finally {
      abortRef.current = null;
      submittingRef.current = false;
      setIsRunning(false);
    }
  };

  const handleTerminate = () => {
    if (activeRunId) {
      cancelRun(activeRunId).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to cancel run on server");
      });
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    submittingRef.current = false;
    setIsRunning(false);
    setActiveRunId(null);
    setOutput("");
    setError("Run terminated by user.");
    setStage(undefined);
    setDurationMs(undefined);
    sessionStorage.removeItem(ACTIVE_RUN_KEY);
  };

  const handleClear = () => {
    setOutput("");
    setError("");
    setLastReferences([]);
    setStage(undefined);
    setDurationMs(undefined);
  };

  return (
    <div className="mx-auto flex flex-col gap-4 sm:gap-6 h-full">
      <SectionHeader title="DIY Modeling" description="Build and run your own ancestry models" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <ConfigureModelBox onRun={handleRun} onTerminate={handleTerminate} isRunning={isRunning} sampleLabels={sampleLabels} restoredConfig={restoredConfig} />
        <ModelOutputBox output={output} error={error} isRunning={isRunning} references={lastReferences} stage={stage} durationMs={durationMs} userTarget={isUserTarget} onClear={handleClear} />
      </div>
    </div>
  );
}
