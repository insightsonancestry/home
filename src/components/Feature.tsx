"use client";
import ServicesIcon from '../assets/icons/servicesIcon.svg';
import { motion } from "framer-motion";
import { useMouseGlow } from "@/hooks/useMouseGlow";

export const Feature = ({ title, description }: { title: string; description: string }) => {
  const { ref, maskImage } = useMouseGlow(150);

  return (
    <div className="relative px-5 py-6 h-full group panel transition-all duration-300"
      style={{ boxShadow: 'var(--shadow)', background: 'var(--panel)' }}>
      <motion.div
        className="absolute inset-0 border-2"
        style={{ borderColor: 'var(--accent)', WebkitMaskImage: maskImage, maskImage }}
        ref={ref}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 inline-flex h-12 w-12 justify-center items-center border"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)', background: 'var(--panel-strong)' }}>
            <ServicesIcon className="h-6 w-6" style={{ fill: 'var(--accent)' }} />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text-bright)' }}>{title}</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
    </div>
  );
}
