"use client";

export function BoxHeader({ title, subtitle, badge }: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <>
      <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 sm:pb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)", boxShadow: "var(--accent-dot)" }} />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-bright)" }}>
            {title}
          </h3>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs mt-1.5 pl-4" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="mx-5 sm:mx-7 h-px" style={{ background: "var(--border)" }} />
    </>
  );
}
