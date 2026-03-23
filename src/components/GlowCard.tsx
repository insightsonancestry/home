"use client";
import { motion } from "framer-motion";
import { useMouseGlow } from "@/hooks/useMouseGlow";

interface GlowCardProps {
  children: React.ReactNode;
  delay?: number;
  animate?: boolean;
  className?: string;
}

export function GlowCard({ children, delay = 0, animate = true, className = "" }: GlowCardProps) {
  const { ref, maskImage } = useMouseGlow(180);
  const { ref: glowRef, maskImage: glowMask } = useMouseGlow(250);

  const content = (
    <div className={`relative h-full group ${className}`}>
      <div
        className="absolute top-0 left-0 right-0 h-[1px] opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent), transparent)",
        }}
      />
      <motion.div
        ref={ref}
        className="absolute inset-0 border rounded-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ borderColor: "var(--accent)", WebkitMaskImage: maskImage, maskImage }}
      />
      <motion.div
        ref={glowRef}
        className="absolute inset-0 rounded-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle, rgba(var(--accent-rgb), 0.03), transparent 70%)",
          WebkitMaskImage: glowMask,
          maskImage: glowMask,
        }}
      />
      <div
        className="relative h-full flex flex-col rounded-sm border transition-all duration-300"
        style={{
          background: "linear-gradient(to bottom, var(--panel), var(--bg))",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        {children}
      </div>
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="h-full"
    >
      {content}
    </motion.div>
  );
}
