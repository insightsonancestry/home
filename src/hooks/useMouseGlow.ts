"use client";
import { useEffect, useRef } from "react";
import { useMotionValue, useMotionTemplate, MotionValue } from "framer-motion";

export function useMouseGlow(radius = 180) {
  const offsetX = useMotionValue(-100);
  const offsetY = useMotionValue(-100);
  const maskImage = useMotionTemplate`radial-gradient(${radius}px ${radius}px at ${offsetX}px ${offsetY}px, black, transparent)`;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      offsetX.set(e.clientX - rect.x);
      offsetY.set(e.clientY - rect.y);
    };
    window.addEventListener("mousemove", update);
    return () => window.removeEventListener("mousemove", update);
  }, [offsetX, offsetY]);

  return { ref, maskImage };
}
