"use client";
import { motion } from "framer-motion";

export const Banner = () => {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="py-2.5 text-center border-b"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-center items-center gap-2 text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--text-muted)' }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--accent)' }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--accent)' }} />
          </span>
          <span className="hidden sm:inline">Introducing a completely new service —</span>
          <span style={{ color: 'var(--accent)' }} className="font-bold">Insights on Ancestry</span>
        </div>
      </div>
    </motion.div>
  );
};