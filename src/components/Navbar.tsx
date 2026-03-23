"use client";
import Image from "next/image";
import logoImage from '../assets/images/insightsonancestry-logo_test.png';
import ShopButton from './ShopButton';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { HamburgerIcon, itemVariants } from "./HamburgerIcon";
import { IconClose } from "./dashboard/icons";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const { scrollY } = useScroll();
  const heroBottomRef = useRef<number>(0);

  useEffect(() => {
    const heroEl = document.querySelector('.hero-section');
    if (heroEl) {
      heroBottomRef.current = heroEl.getBoundingClientRect().bottom + window.scrollY;
    }

    const handleResize = () => {
      const heroEl = document.querySelector('.hero-section');
      if (heroEl) {
        heroBottomRef.current = heroEl.getBoundingClientRect().bottom + window.scrollY;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setPastHero(heroBottomRef.current > 0 && latest > heroBottomRef.current);
  });

  const closeMenu = () => setIsOpen(false);

  return (
    <div>
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full backdrop-blur-md"
        style={{
          background: 'var(--overlay-bg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="px-4 sm:px-6 flex items-center justify-between h-14 max-w-7xl mx-auto">
            <a href="#" className="flex items-center gap-3" aria-label="Back to top">
              <Image
                src={logoImage}
                alt="Logo"
                className="h-8 w-8"
                draggable="false"
              />
              <span className="text-[10px] sm:text-xs tracking-[3px] uppercase font-bold leading-none" style={{ color: 'var(--text-bright)' }}>
                InsightsOnAncestry
              </span>
            </a>

            <nav className="hidden sm:flex items-center gap-5">
              <a href="#features" className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150" style={{ color: 'var(--text-muted)' }}>Services</a>
              <a href="#faqs" className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150" style={{ color: 'var(--text-muted)' }}>FAQ</a>
              <a href="mailto:insightsonancestry@gmail.com" className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150" style={{ color: 'var(--text-muted)' }}>Contact</a>
              <ShopButton />
            </nav>

            <HamburgerIcon isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />
          </div>
        </motion.header>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 z-50 h-full w-64 sm:hidden"
              style={{ background: 'var(--overlay-bg-solid)' }}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] uppercase tracking-[3px] font-bold" style={{ color: 'var(--text-bright)' }}>
                  Menu
                </span>
                <button onClick={closeMenu} className="p-1" style={{ color: 'var(--text-muted)' }}>
                  <IconClose />
                </button>
              </div>
              <nav className="flex flex-col px-4 py-4 gap-1">
                <motion.a variants={itemVariants} href="#features" onClick={closeMenu}
                  className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-[var(--muted-hover)]"
                  style={{ color: 'var(--text-muted)' }}>Services</motion.a>
                <motion.a variants={itemVariants} href="#faqs" onClick={closeMenu}
                  className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-[var(--muted-hover)]"
                  style={{ color: 'var(--text-muted)' }}>FAQ</motion.a>
                <motion.a variants={itemVariants} href="mailto:insightsonancestry@gmail.com" onClick={closeMenu}
                  className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-[var(--muted-hover)]"
                  style={{ color: 'var(--text-muted)' }}>Contact</motion.a>
                {pastHero && (
                  <motion.div variants={itemVariants} className="pt-2">
                    <ShopButton />
                  </motion.div>
                )}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
