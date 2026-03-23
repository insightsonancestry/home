"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/images/insightsonancestry-logo_test.png";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useAuth } from "@/contexts/AuthContext";
import { IconUser, IconSettings, IconHelp, IconLogout, IconSamples, IconDIY, IconAssisted, IconLearn, IconHistory } from "@/components/dashboard/icons";
import { NAV_ITEMS, type Sample } from "@/constants/dashboard";
import { fetchSamples, deleteSample } from "@/lib/samples";
import { SamplesSection } from "@/components/dashboard/SamplesSection";
import { DIYModelingSection } from "@/components/dashboard/DIYModelingSection";
import { ComingSoonSection } from "@/components/dashboard/ComingSoonSection";

const NAV_ICONS: Record<string, React.ComponentType> = {
  samples: IconSamples,
  diy: IconDIY,
  assisted: IconAssisted,
  learning: IconLearn,
  history: IconHistory,
};

const SECTIONS: Record<string, React.ReactNode> = {
  assisted: <ComingSoonSection title="Assisted Modeling" description="Run preset models from published genetics papers with curated source and reference configurations" icon={<IconAssisted />} />,
  learning: <ComingSoonSection title="Learning Materials" description="Tutorials, guides, and documentation for population genetics analysis" icon={<IconLearn />} />,
  history: <ComingSoonSection title="History" description="View and manage all your past model runs and results" icon={<IconHistory />} />,
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("samples");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(useCallback(() => setDropdownOpen(false), []));

  const [samples, setSamples] = useState<Sample[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const samplesFetched = useRef(false);

  const loadSamples = useCallback(async () => {
    try {
      const data = await fetchSamples();
      setSamples(data.samples);
    } catch {}
    finally { setSamplesLoading(false); }
  }, []);

  const handleDeleteSample = useCallback(async (sampleId: string) => {
    await deleteSample(sampleId);
    setSamples((prev) => prev.filter((s) => s.id !== sampleId));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/signup");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && !samplesFetched.current) {
      samplesFetched.current = true;
      loadSamples();
    }
  }, [user, loadSamples]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
        <span className="text-xs uppercase tracking-[3px]" style={{ color: "var(--text-faint)" }}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg)", color: "var(--text-primary)" }}>

      {/* Top Navbar */}
      <header
        className="relative z-40 flex items-center justify-between px-4 sm:px-6 h-14 shrink-0 border-b-2"
        style={{ borderColor: "var(--border-strong)", background: "var(--overlay-bg)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="sm:hidden relative w-6 h-6 p-1 -ml-1 z-[60]"
            aria-label="Toggle menu"
          >
            <motion.span
              className="absolute left-1/2 top-1/2 w-4 h-[1.5px]"
              style={{ x: "-50%", backgroundColor: "var(--accent)" }}
              animate={mobileMenuOpen ? { y: "-50%", rotate: 45 } : { y: "calc(-50% - 4px)", rotate: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute left-1/2 top-1/2 w-4 h-[1.5px]"
              style={{ x: "-50%", y: "-50%", backgroundColor: "var(--accent)" }}
              animate={mobileMenuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.span
              className="absolute left-1/2 top-1/2 w-4 h-[1.5px]"
              style={{ x: "-50%", backgroundColor: "var(--accent)" }}
              animate={mobileMenuOpen ? { y: "-50%", rotate: -45 } : { y: "calc(-50% + 4px)", rotate: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <Image src={logoImage} alt="Logo" className="h-6 w-6 sm:h-7 sm:w-7" draggable="false" />
            <span className="text-[9px] sm:text-xs tracking-[3px] uppercase font-bold" style={{ color: "var(--text-bright)" }}>
              InsightsOnAncestry
            </span>
          </div>
        </div>

        <span
          className="absolute left-1/2 -translate-x-1/2 text-xs uppercase tracking-[3px] font-semibold hidden sm:block"
          style={{ color: "var(--text-muted)" }}
        >
          Dashboard
        </span>

        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <span className="hidden sm:block text-xs uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
            {user.firstName}
          </span>
          <button
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
                    { label: "Help", Icon: IconHelp },
                  ].map(({ label, Icon }) => (
                    <button
                      key={label}
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-[2px] text-left transition-colors duration-150 hover:bg-[var(--muted-hover)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Icon />
                      {label}
                    </button>
                  ))}
                  <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
                  <button
                    onClick={() => { signOut(); router.push("/signup"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-[2px] text-left transition-colors duration-150 hover:bg-[var(--muted-hover)]"
                    style={{ color: "var(--error-text)" }}
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

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
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

        <aside
          className={`
            absolute inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
            sm:static sm:translate-x-0 sm:w-56 shrink-0 flex flex-col border-r-2 pt-4 pb-6
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          `}
          style={{ borderColor: "var(--border-strong)", background: "var(--overlay-bg)" }}
        >
          <p className="px-4 text-[9px] uppercase tracking-[3px] mb-3 mt-1 sm:mt-0" style={{ color: "var(--text-faint)" }}>
            Tools
          </p>
          <nav className="flex flex-col gap-0.5 px-2">
            {NAV_ITEMS.map(({ id, label }) => {
              const active = activeSection === id;
              const Icon = NAV_ICONS[id];
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveSection(id);
                    if (window.innerWidth < 640) setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-[2px] text-left transition-all duration-150 rounded-sm"
                  style={{
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    background: active ? "var(--accent-subtle)" : "transparent",
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

        <main className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 relative grid-bg">
          {activeSection === "samples" && <SamplesSection samples={samples} loading={samplesLoading} onReload={loadSamples} onDelete={handleDeleteSample} />}
          {activeSection === "diy" && <DIYModelingSection sampleLabels={samples.filter((s) => s.status === "ready").map((s) => s.label)} />}
          {(activeSection === "assisted" || activeSection === "learning" || activeSection === "history") && SECTIONS[activeSection]}
        </main>
      </div>
    </div>
  );
}
