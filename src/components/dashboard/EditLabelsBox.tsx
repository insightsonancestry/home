"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlowCard } from "@/components/GlowCard";
import { BoxHeader } from "./BoxHeader";
import { PillButton, ActionButton, OperationButton } from "./buttons";
import { DATASETS, LABEL_OPERATIONS } from "@/constants/dashboard";

export function EditLabelsBox() {
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [selectedOperation, setSelectedOperation] = useState<string>("");

  return (
    <GlowCard delay={0.1}>
      <BoxHeader title="Edit your labels here" subtitle="Modify population labels across datasets" />

      <div className="flex-1 px-5 sm:px-7 py-5 sm:py-6 flex flex-col gap-4 sm:gap-5">
        <div>
          <label className="block text-xs uppercase tracking-[2px] mb-2" style={{ color: "var(--text-muted)" }}>
            Dataset
          </label>
          <div className="flex flex-wrap gap-2">
            {DATASETS.map((d) => (
              <PillButton key={d.id} active={selectedDataset === d.id} onClick={() => setSelectedDataset(d.id)}>
                {d.label}
              </PillButton>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {selectedDataset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <label className="block text-xs uppercase tracking-[2px] mb-2" style={{ color: "var(--text-muted)" }}>
                Operation
              </label>
              <div className="flex flex-col gap-2">
                {LABEL_OPERATIONS.map((op) => (
                  <OperationButton key={op.id} active={selectedOperation === op.id} onClick={() => setSelectedOperation(op.id)}>
                    {op.label}
                  </OperationButton>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedDataset && selectedOperation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-2 pt-1"
            >
              <ActionButton variant="accent" onClick={() => console.info(`Proceed: ${selectedDataset} → ${selectedOperation}`)}>
                Proceed
              </ActionButton>
              <ActionButton variant="danger" onClick={() => { setSelectedDataset(""); setSelectedOperation(""); }}>
                Reset
              </ActionButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlowCard>
  );
}
