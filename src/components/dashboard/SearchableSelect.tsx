"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClearButton } from "./buttons";
import { useClickOutside } from "@/hooks/useClickOutside";

export function SearchableSelect({ label, options, selected, onChange, multi = true }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  multi?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useClickOutside<HTMLDivElement>(useCallback(() => setOpen(false), []));

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o)
  );

  const handleSelect = (item: string) => {
    onChange(multi ? [...selected, item] : [item]);
    setQuery("");
    setHoveredIdx(-1);
    if (!multi) setOpen(false);
  };

  const handleRemove = (item: string) => {
    onChange(selected.filter((s) => s !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        return;
      }
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHoveredIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHoveredIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (hoveredIdx >= 0 && hoveredIdx < filtered.length) {
          handleSelect(filtered[hoveredIdx]);
        }
        break;
      case "Escape":
        setOpen(false);
        setHoveredIdx(-1);
        break;
      case "Backspace":
        if (query === "" && multi && selected.length > 0) {
          onChange(selected.slice(0, -1));
        }
        break;
    }
  };

  return (
    <div ref={containerRef}>
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <label className="block text-xs uppercase tracking-[2px] font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
        {selected.length > 0 && (
          <ClearButton onClick={() => onChange([])} />
        )}
      </div>

      <div className="relative">
        <div
          className="flex flex-wrap items-center gap-1.5 w-full min-h-[42px] px-2.5 py-1.5 rounded-sm border transition-all duration-200 cursor-text"
          style={{
            background: "var(--bg)",
            borderColor: open ? "var(--accent)" : "var(--border-strong)",
            boxShadow: open ? "0 0 12px var(--accent-faint)" : "var(--shadow-inset)",
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {multi && selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-[1px] border rounded-sm shrink-0"
              style={{
                borderColor: "var(--accent)",
                color: "var(--accent)",
                background: "var(--accent-subtle)",
              }}
            >
              {s}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(s); }}
                className="ml-0.5 hover:opacity-70 transition-opacity"
                style={{ color: "var(--accent)" }}
                aria-label={`Remove ${s}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={!multi && selected.length > 0 && !open ? selected[0] : query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHoveredIdx(-1);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              if (!multi && selected.length > 0) setQuery("");
            }}
            onKeyDown={handleKeyDown}
            placeholder={multi && selected.length > 0 ? "" : (multi ? "Search populations..." : (selected.length > 0 ? selected[0] : "Search populations..."))}
            className="flex-1 min-w-[80px] bg-transparent py-1 text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
          />
        </div>

        <AnimatePresence>
          {open && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 left-0 right-0 mt-1 max-h-40 overflow-y-auto border rounded-sm"
              style={{
                background: "var(--panel-strong)",
                borderColor: "var(--border-strong)",
                boxShadow: "var(--dropdown-shadow)",
              }}
              role="listbox"
            >
              {filtered.map((item, i) => (
                <button
                  key={item}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(-1)}
                  className="w-full text-left px-3 py-2 text-xs transition-colors duration-100"
                  style={{
                    color: hoveredIdx === i ? "var(--accent)" : "var(--text-muted)",
                    background: hoveredIdx === i ? "var(--accent-subtle)" : "transparent",
                  }}
                  role="option"
                  aria-selected={hoveredIdx === i}
                >
                  {item}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
