"use client";
import Image from "next/image";
import logoImage from "../assets/images/insightsonancestry-logo_test.png";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const HamburgerIcon = ({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) => (
  <button
    onClick={toggle}
    className="sm:hidden relative w-8 h-8 z-50 flex items-center justify-center"
    aria-label="Toggle menu"
  >
    <motion.span
      className="absolute left-1/2 top-1/2 w-4 h-[1.5px] bg-[var(--accent)]"
      style={{ x: "-50%" }}
      animate={isOpen ? { y: "-50%", rotate: 45 } : { y: "calc(-50% - 5px)", rotate: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    />
    <motion.span
      className="absolute left-1/2 top-1/2 w-4 h-[1.5px] bg-[var(--accent)]"
      style={{ x: "-50%", y: "-50%" }}
      animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.15 }}
    />
    <motion.span
      className="absolute left-1/2 top-1/2 w-4 h-[1.5px] bg-[var(--accent)]"
      style={{ x: "-50%" }}
      animate={isOpen ? { y: "-50%", rotate: -45 } : { y: "calc(-50% + 5px)", rotate: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
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

export const StaticNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="sticky top-0 z-50">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full backdrop-blur-md"
        style={{
          background: "rgba(10,10,10,0.95)",
          borderBottom: "1px solid rgba(83,189,227,0.12)",
        }}
      >
        <div className="px-4 sm:px-6 flex items-center justify-between h-14 max-w-7xl mx-auto">
          <a href="/" className="flex items-center gap-3" aria-label="Back to home">
            <Image
              src={logoImage}
              alt="Logo"
              className="h-8 w-8"
              draggable="false"
            />
            <span
              className="text-[11px] sm:text-[13px] tracking-[4px] uppercase font-bold leading-none"
              style={{ color: "var(--text-bright)" }}
            >
              IOA
            </span>
          </a>

          <nav className="hidden sm:flex items-center gap-5">
            <a
              href="/#features"
              className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150"
              style={{ color: "var(--text-muted)" }}
            >
              Services
            </a>
            <a
              href="/#faqs"
              className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150"
              style={{ color: "var(--text-muted)" }}
            >
              FAQ
            </a>
            <a
              href="mailto:insightsonancestry@gmail.com"
              className="accent-link text-[10px] uppercase tracking-[2px] transition-colors duration-150"
              style={{ color: "var(--text-muted)" }}
            >
              Contact
            </a>
          </nav>

          <HamburgerIcon isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />
        </div>
      </motion.header>

      {/* Mobile menu — side drawer from right */}
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
              style={{ background: 'rgba(10,10,10,0.98)' }}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] uppercase tracking-[3px] font-bold" style={{ color: 'var(--text-bright)' }}>
                  Menu
                </span>
                <button onClick={closeMenu} className="p-1" style={{ color: 'var(--text-muted)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col px-4 py-4 gap-1">
                <motion.a variants={itemVariants} href="/" onClick={closeMenu}
                  className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}>Home</motion.a>
                <motion.a variants={itemVariants} href="/#features" onClick={closeMenu}
                  className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}>Services</motion.a>
                <motion.a variants={itemVariants} href="/#faqs" onClick={closeMenu}
                  className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}>FAQ</motion.a>
                <motion.a variants={itemVariants} href="mailto:insightsonancestry@gmail.com" onClick={closeMenu}
                  className="py-2.5 px-3 text-[10px] uppercase tracking-[2px] transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}>Contact</motion.a>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
