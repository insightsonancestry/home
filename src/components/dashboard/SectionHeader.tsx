"use client";

import { motion } from "framer-motion";

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-start gap-4 px-4 py-3 rounded-sm"
      style={{ background: "linear-gradient(90deg, rgba(var(--accent-rgb), 0.05), transparent 60%)", borderLeft: "2px solid var(--accent)" }}
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight uppercase" style={{ color: "var(--text-bright)" }}>
          {title}
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}
