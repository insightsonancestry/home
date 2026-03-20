"use client";

export const Footer = () => {
  return (
    <div className="relative border-t-2" style={{ borderColor: 'var(--border-strong)', background: 'var(--panel)' }}>
      <footer>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--text-faint)' }}>
              © {new Date().getFullYear()} Insights on Ancestry, Inc.
            </div>
            <div className="flex gap-6">
              <a
                href="mailto:insightsonancestry@gmail.com"
                className="accent-link text-[10px] uppercase tracking-[2px]"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
