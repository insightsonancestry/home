"use client";

import { useState, useRef } from "react";
import { SectionHeader } from "./SectionHeader";
import { ConfigureModelBox } from "./ConfigureModelBox";
import { ModelOutputBox } from "./ModelOutputBox";
import { runQpadm } from "@/lib/samples";

export function DIYModelingSection({ sampleLabels }: { sampleLabels: string[] }) {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [lastReferences, setLastReferences] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const handleRun = async (dataset: string, sources: string[], references: string[], target: string, _pValue: number) => {
    setIsRunning(true);
    setOutput("");
    setError("");
    setLastReferences(references);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await runQpadm({ dataset, sources, references, target }, controller.signal);
      setOutput(data.result);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "qpAdm run failed");
    } finally {
      abortRef.current = null;
      setIsRunning(false);
    }
  };

  const handleTerminate = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsRunning(false);
    setOutput("");
    setError("");
  };

  return (
    <div className="mx-auto flex flex-col gap-4 sm:gap-6 h-full">
      <SectionHeader title="DIY Modeling" description="Build and run your own ancestry models" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <ConfigureModelBox onRun={handleRun} onTerminate={handleTerminate} isRunning={isRunning} sampleLabels={sampleLabels} />
        <ModelOutputBox output={output} error={error} isRunning={isRunning} references={lastReferences} />
      </div>
    </div>
  );
}
