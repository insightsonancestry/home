"use client";
import Image from "next/image";
import logoImage from '../assets/images/insightsonancestry-logo_test.png';
import ShopButton from './ShopButton';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const HamburgerIcon = ({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) => (
  <button
    onClick={toggle}
    className="sm:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-[5px] z-50 border border-[var(--border)] p-1"
    aria-label="Toggle menu"
  >
    <motion.span
      animate={isOpen ? { rotate: 45, y: 6.5 } : { rotate: 0, y: 0 }}
      transition={{ duration: 0.3 }}
      className="block w-4 h-[1.5px] bg-[var(--accent)]"
    />
    <motion.span
      animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.2 }}
      className="block w-4 h-[1.5px] bg-[var(--accent)]"
    />
    <motion.span
      animate={isOpen ? { rotate: -45, y: -6.5 } : { rotate: 0, y: 0 }}
      transition={{ duration: 0.3 }}
      className="block w-4 h-[1.5px] bg-[var(--accent)]"
    />
  </button>
);

const menuVariants = {
  closed: {
    height: 0,
    opacity: 0,
    transition: { height: { duration: 0.3, ease: "easeInOut" }, opacity: { duration: 0.2 } },
  },
  open: {
    height: "auto",
    opacity: 1,
    transition: { height: { duration: 0.3, ease: "easeInOut" }, opacity: { duration: 0.25, delay: 0.05 }, staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  closed: { opacity: 0, y: -5, transition: { duration: 0.15 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const faqsOffsetRef = useRef<number | null>(null);

  useEffect(() => {
    const faqsEl = document.getElementById("faqs");
    if (faqsEl) {
      faqsOffsetRef.current = faqsEl.offsetTop;
    }
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const faqsTop = faqsOffsetRef.current ?? Infinity;
    setScrolled(latest > 50 && latest < faqsTop);
  });

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="sticky top-0 z-50 relative">
      <div className="px-3 sm:px-6 pt-3">
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="border-2 backdrop-blur-md transition-all duration-500"
          style={{
            borderColor: 'var(--border-strong)',
            background: scrolled ? 'rgba(10,10,10,0.95)' : 'rgba(10,10,10,0.8)',
            boxShadow: 'var(--shadow)',
            maxWidth: scrolled ? '720px' : '1152px',
            margin: '0 auto',
          }}
        >
          <div className={`px-4 sm:px-6 flex items-center justify-between transition-all duration-500 ${scrolled ? 'h-11' : 'h-14'}`}>
            <div className="flex items-center gap-3">
              <Image
                src={logoImage}
                alt="Logo"
                className={`transition-all duration-500 ${scrolled ? 'h-6 w-6' : 'h-8 w-8'}`}
                draggable="false"
              />
              <span className="text-[11px] sm:text-[13px] tracking-[4px] uppercase font-bold leading-none" style={{ color: 'var(--text-bright)' }}>
                IOA
              </span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-5">
              <a href="#features" className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150" style={{ color: 'var(--text-muted)' }}>Services</a>
              <a href="#faqs" className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150" style={{ color: 'var(--text-muted)' }}>FAQ</a>
              <a href="mailto:insightsonancestry@gmail.com" className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150" style={{ color: 'var(--text-muted)' }}>Contact</a>
              <ShopButton />
            </nav>

            {/* Mobile hamburger */}
            <HamburgerIcon isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />
          </div>
        </motion.header>
      </div>

      {/* Mobile menu — absolutely positioned so it overlays content without scrolling */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="sm:hidden overflow-hidden mx-3 border-x-2 border-b-2 backdrop-blur-md absolute left-0 right-0"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'rgba(10,10,10,0.95)',
            }}
          >
            <nav className="flex flex-col px-4 py-4 gap-1">
              <motion.a variants={itemVariants} href="#features" onClick={closeMenu}
                className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}>[Services]</motion.a>
              <motion.a variants={itemVariants} href="#faqs" onClick={closeMenu}
                className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}>[FAQ]</motion.a>
              <motion.a variants={itemVariants} href="mailto:insightsonancestry@gmail.com" onClick={closeMenu}
                className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}>[Contact]</motion.a>
              <motion.div variants={itemVariants} className="pt-2 px-3">
                <ShopButton />
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
