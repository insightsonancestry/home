"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";

export function ComingSoonSection({ title, description, icon }: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex flex-col gap-4 sm:gap-6 h-full">
      <SectionHeader title={title} description={description} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="flex-1 flex items-center justify-center"
      >
        <div className="relative flex flex-col items-center gap-6 py-16 sm:py-24 w-full max-w-md">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(var(--accent-rgb), 0.04), transparent 70%)" }}
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="relative flex items-center justify-center w-20 h-20 rounded-full border"
            style={{
              borderColor: "var(--border-strong)",
              background: "linear-gradient(to bottom, var(--panel-strong), var(--bg))",
              boxShadow: "var(--accent-shadow)",
            }}
          >
            <div className="w-8 h-8" style={{ color: "var(--accent)" }}>
              {icon}
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: "var(--accent)" }}
              animate={{ scale: [1, 1.3, 1.3], opacity: [0.3, 0, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            />
          </motion.div>

          <div className="relative text-center flex flex-col items-center gap-3">
            <span
              className="text-[10px] uppercase tracking-[3px] px-3 py-1 rounded-sm border"
              style={{
                borderColor: "var(--accent)",
                color: "var(--accent)",
                background: "var(--accent-subtle)",
              }}
            >
              Coming soon
            </span>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--text-muted)" }}>
              We&apos;re building something great. This feature will be available in a future update.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
