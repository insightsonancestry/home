"use client";
import Image from "next/image";
import infographic from "../assets/images/Screenshot 2024-07-27 at 7.13.38 PM.png";
import donutChart from "../assets/images/qpAdm_Distal_donut-chart.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export const ProductShowcase = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [25, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.25, 1]);

  return (
    <div className="relative py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="mb-10 text-center">
          <span className="text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent)' }}>⧬</span> Showcase
          </span>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold tracking-tighter mt-3 uppercase"
            style={{ color: 'var(--text-bright)' }}
          >
            Simple infographics
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-sm mt-3 max-w-lg mx-auto leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            Our analytical tools for raw files are complex, so we use infographics to present the results in a more accessible manner for our customers.
          </motion.p>
        </div>
        <motion.div
          ref={containerRef}
          style={{ opacity, rotateX, transformPerspective: "800px" }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="panel-strong overflow-hidden">
            <Image
              src={infographic}
              alt="qpAdm infographic"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="panel-strong overflow-hidden">
            <Image
              src={donutChart}
              alt="qpAdm Distal donut chart"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
