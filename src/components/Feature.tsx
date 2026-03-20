"use client";
import { useEffect, useRef } from 'react';
import ServicesIcon from '../assets/icons/servicesIcon.svg';
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

export const Feature = ({ title, description }: { title: string, description: string }) => {

  const offsetX = useMotionValue(-100);
  const offsetY = useMotionValue(-100);
  const maskImage = useMotionTemplate`radial-gradient(150px 150px at ${offsetX}px ${offsetY}px, black, transparent)`;
  const border = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      if (!border.current) return;
      const borderRect = border.current?.getBoundingClientRect();
      offsetX.set(e.x - borderRect?.x);
      offsetY.set(e.y - borderRect?.y);
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, [offsetX, offsetY]);

  return (
    <div className="relative px-5 py-6 h-full group panel transition-all duration-300"
      style={{ boxShadow: 'var(--shadow)', background: 'var(--panel)' }}>
      {/* Mouse-follow accent border */}
      <motion.div
        className="absolute inset-0 border-2"
        style={{
          borderColor: 'var(--accent)',
          WebkitMaskImage: maskImage,
          maskImage,
        }}
        ref={border}
      />
      <div className="relative z-10">
        {/* Icon + Title row */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 inline-flex h-12 w-12 justify-center items-center border"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)', background: 'var(--panel-strong)' }}>
            <ServicesIcon className="h-6 w-6" style={{ fill: 'var(--accent)' }} />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text-bright)' }}>{title}</h3>
        </div>
        {/* Description below */}
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
    </div>
  );
}