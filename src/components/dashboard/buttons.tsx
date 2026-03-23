"use client";

import { useState } from "react";
import { IconDownload } from "./icons";

export function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const isHighlight = active || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-3 py-1.5 text-xs uppercase tracking-[1px] border rounded-sm transition-all duration-200"
      style={{
        borderColor: isHighlight ? "var(--accent)" : "var(--border-strong)",
        color: isHighlight ? "var(--accent)" : "var(--text-muted)",
        background: isHighlight ? "var(--accent-subtle)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

export function ActionButton({ onClick, disabled, children, variant = "accent" }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "accent" | "muted" | "danger";
}) {
  const [hovered, setHovered] = useState(false);

  const colors = {
    accent: {
      border: hovered ? "var(--accent)" : "var(--border-strong)",
      color: hovered ? "var(--accent)" : "var(--text-muted)",
      bg: hovered ? "var(--accent-subtle)" : "transparent",
    },
    muted: {
      border: hovered ? "var(--border-strong)" : "var(--border)",
      color: hovered ? "var(--text-primary)" : "var(--text-faint)",
      bg: hovered ? "var(--muted-hover)" : "transparent",
    },
    danger: {
      border: hovered ? "var(--error-border)" : "var(--border-strong)",
      color: hovered ? "var(--error-text)" : "var(--text-muted)",
      bg: hovered ? "var(--error-subtle)" : "transparent",
    },
  };

  const c = disabled ? {
    border: "var(--border)",
    color: "var(--text-faint)",
    bg: "transparent",
  } : colors[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full py-2.5 text-xs uppercase tracking-[2px] font-semibold border rounded-sm transition-all duration-200"
      style={{
        borderColor: c.border,
        color: c.color,
        background: c.bg,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: hovered && !disabled ? `0 0 20px ${variant === "danger" ? "var(--error-subtle)" : "var(--accent-faint)"}` : "none",
      }}
    >
      {children}
    </button>
  );
}

export function DownloadButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const isHover = hovered && !disabled;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[1px] border rounded-sm transition-all duration-200"
      style={{
        borderColor: disabled ? "var(--border)" : isHover ? "var(--accent)" : "var(--border-strong)",
        color: disabled ? "var(--text-faint)" : isHover ? "var(--accent)" : "var(--text-muted)",
        background: isHover ? "var(--accent-subtle)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <IconDownload />
      {children}
    </button>
  );
}

export function ClearButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-5 h-5 flex items-center justify-center rounded-full border transition-all duration-200"
      style={{
        borderColor: hovered ? "var(--error-border)" : "var(--border-strong)",
        color: hovered ? "var(--error-text)" : "var(--text-faint)",
        background: hovered ? "var(--error-subtle)" : "transparent",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

export function OperationButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const isHighlight = active || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-[1px] text-left border rounded-sm transition-all duration-200"
      style={{
        borderColor: isHighlight ? "var(--accent)" : "var(--border-strong)",
        color: isHighlight ? "var(--accent)" : "var(--text-muted)",
        background: isHighlight ? "var(--accent-subtle)" : "transparent",
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0 transition-all duration-200"
        style={{
          background: isHighlight ? "var(--accent)" : "var(--border-strong)",
          boxShadow: active ? "0 0 6px var(--accent)" : "none",
        }}
      />
      {children}
    </button>
  );
}
