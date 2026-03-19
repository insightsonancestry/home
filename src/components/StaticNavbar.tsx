"use client";
import Image from "next/image";
import logoImage from "../assets/images/insightsonancestry-logo_test.png";
import { motion } from "framer-motion";

export const StaticNavbar = () => {
  return (
    <div className="sticky top-0 z-50 px-3 sm:px-6 pt-3">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="border-2 backdrop-blur-md"
        style={{
          borderColor: "var(--border-strong)",
          background: "rgba(10,10,10,0.8)",
          boxShadow: "var(--shadow)",
          maxWidth: "1152px",
          margin: "0 auto",
        }}
      >
        <div className="px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo — navigates back to home */}
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

          {/* Desktop nav — no Login/Sign Up button */}
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
        </div>
      </motion.header>
    </div>
  );
};
