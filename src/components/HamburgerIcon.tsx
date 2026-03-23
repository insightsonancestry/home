"use client";

import { motion } from "framer-motion";

export const HamburgerIcon = ({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) => (
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

export const menuVariants = {
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

export const itemVariants = {
  closed: { opacity: 0, y: -5, transition: { duration: 0.15 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
