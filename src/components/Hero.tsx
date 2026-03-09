"use client";
import ArrowIcon from '../assets/icons/arrow-w.svg';
import Image from "next/image";
import cursorImage from '../assets/images/cursor.png';
import dnaImage from '../assets/images/dna.png';
import { motion } from 'framer-motion';
import BuyButton from './BuyButton';

export const Hero = () => {
  return (
    <div className="relative overflow-clip">

      {/* Subtle grid background */}
      {/* Subtle accent glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(83,189,227,0.06),transparent_70%)]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 py-16 sm:py-24">
        {/* Tag line pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center"
        >
          <a href="#features" className="inline-flex flex-col sm:flex-row gap-3 border px-3 py-1.5 text-[10px] uppercase tracking-wider group transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent)' }}>Affordable ancestry modelling is here</span>
            <span className="inline-flex items-center gap-1 justify-center sm:justify-start">
              <span>Read more</span>
              <ArrowIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
        </motion.div>

        {/* Main heading */}
        <div className="flex justify-center mt-10">
          <div className="inline-flex relative">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter text-center uppercase leading-none"
              style={{ color: 'var(--text-bright)' }}
            >
              Decode your<br /><span style={{ color: 'var(--text-faint)' }}>ancestry</span>
            </motion.h1>
            {/* Cursor image - left side */}
            <motion.div
              className="absolute right-[98%] top-[60%] -translate-y-1/2 hidden lg:block"
              drag dragSnapToOrigin
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              <div className="animate-float">
                <Image src={cursorImage} alt="" height="180" width="180" className="max-w-none opacity-70 w-[80px] h-[80px] sm:w-[120px] sm:h-[120px] lg:w-[180px] lg:h-[180px]" draggable="false" />
              </div>
            </motion.div>
            {/* DNA image - right side */}
            <motion.div
              className="absolute left-[98%] top-[10%] hidden lg:block"
              drag dragSnapToOrigin
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1.1 }}
            >
              <div className="animate-float" style={{ animationDelay: '2s' }}>
                <Image src={dnaImage} alt="" height="350" width="260" className="max-w-none opacity-70 w-[100px] h-auto sm:w-[160px] lg:w-[260px]" draggable="false" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex justify-center"
        >
          <p className="text-center text-[15px] mt-8 max-w-md leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Unlock the secrets of your ancestry with our affordable DNA analysis services. We specialize in connecting your DNA to ancient populations, offering you a unique insight into your genetic heritage.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="flex justify-center mt-8"
        >
          <BuyButton />
        </motion.div>
      </div>

{/* spacer */}
    </div>
  );
};