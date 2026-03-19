"use client";

import Image from "next/image";
import logoImage from "@/assets/images/insightsonancestry-logo_test.png";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Icons ────────────────────────────────────────────────────────────────────

const IconDIY = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21a48.25 48.25 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
  </svg>
);

const IconAssisted = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
  </svg>
);

const IconLearn = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
);

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const IconHelp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
  </svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
  </svg>
);

// ── Sidebar nav items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "diy",       label: "DIY Modeling",       Icon: IconDIY },
  { id: "assisted",  label: "Assisted Modeling",   Icon: IconAssisted },
  { id: "learning",  label: "Learning Materials",  Icon: IconLearn },
];

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("diy");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg)", color: "var(--text-primary)" }}>

      {/* ── Top Navbar ───────────────────────────────────────────────────── */}
      <header
        className="relative z-40 flex items-center justify-between px-4 sm:px-6 h-14 shrink-0 border-b-2"
        style={{ borderColor: "var(--border-strong)", background: "rgba(10,10,10,0.95)" }}
      >
        {/* Left: Hamburger (mobile) + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="sm:hidden text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1 -ml-1"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <a href="/" className="flex items-center gap-2 sm:gap-3" aria-label="Back to home">
            <Image src={logoImage} alt="Logo" className="h-6 w-6 sm:h-7 sm:w-7" draggable="false" />
            <span className="text-[10px] sm:text-[11px] tracking-[4px] uppercase font-bold" style={{ color: "var(--text-bright)" }}>
              IOA
            </span>
          </a>
        </div>

        {/* Centre: Dashboard label */}
        <span
          className="absolute left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[3px] font-semibold hidden sm:block"
          style={{ color: "var(--text-muted)" }}
        >
          Dashboard
        </span>

        {/* Right: User */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <span className="hidden sm:block text-[11px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
            Username
          </span>
          <button
            id="user-menu-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-sm border transition-all duration-200"
            style={{
              borderColor: dropdownOpen ? "var(--accent)" : "var(--border-strong)",
              color: dropdownOpen ? "var(--accent)" : "var(--text-muted)",
              background: "transparent",
            }}
            aria-label="User menu"
          >
            <IconUser />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 sm:-right-6 top-[calc(50%+1.75rem)] w-48 panel-strong z-50 rounded-t-sm border-t"
              >
                <div className="py-1">
                  {[
                    { label: "User Settings", Icon: IconSettings },
                    { label: "Help",           Icon: IconHelp },
                  ].map(({ label, Icon }) => (
                    <button
                      key={label}
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] uppercase tracking-[2px] text-left transition-colors duration-150 hover:bg-white/5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Icon />
                      {label}
                    </button>
                  ))}
                  <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
                  <button
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] uppercase tracking-[2px] text-left transition-colors duration-150 hover:bg-white/5"
                    style={{ color: "rgba(239,68,68,0.7)" }}
                  >
                    <IconLogout />
                    Log Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Body: Sidebar + Content ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside
          className={`
            absolute inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
            sm:static sm:translate-x-0 sm:w-56 shrink-0 flex flex-col border-r-2 pt-4 pb-6
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          `}
          style={{ borderColor: "var(--border-strong)", background: "rgba(10,10,10,0.95)" }}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between px-4 mb-4 sm:hidden">
            <span className="text-[9px] tracking-[3px] uppercase font-bold" style={{ color: "var(--text-bright)" }}>
              Menu
            </span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="px-4 text-[9px] uppercase tracking-[3px] mb-3 hidden sm:block" style={{ color: "var(--text-faint)" }}>
            Tools
          </p>
          <nav className="flex flex-col gap-0.5 px-2">
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveSection(id);
                    if (window.innerWidth < 640) setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 text-[11px] uppercase tracking-[2px] text-left transition-all duration-150 rounded-sm"
                  style={{
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    background: active ? "rgba(83,189,227,0.08)" : "transparent",
                    borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <Icon />
                  {label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content area — empty for now */}
        <main className="flex-1 overflow-auto p-8 relative grid-bg">
          {/* Content will be added per section in future steps */}
        </main>

      </div>
    </div>
  );
}
