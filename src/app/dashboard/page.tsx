"use client";

import Image from "next/image";
import logoImage from "@/assets/images/insightsonancestry-logo_test.png";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlowCard } from "@/components/GlowCard";


const IconDIY = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
  </svg>
);

const IconAssisted = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  </svg>
);

const IconLearn = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
);

const IconSamples = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
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


const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const IconWarning = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);


const PROVIDERS = [
  { id: "23andme",    label: "23andMe",     accept: ".txt" },
  { id: "ancestry",   label: "AncestryDNA", accept: ".txt" },
  { id: "ftdna",      label: "FTDNA",       accept: ".csv" },
  { id: "myheritage", label: "MyHeritage",  accept: ".csv" },
  { id: "livingdna",  label: "LivingDNA",   accept: ".csv,.txt" },
];


interface Sample {
  id: string;
  label: string;
  provider: string;
  snpCount: number;
  status: "uploading" | "converting" | "ready" | "error";
  uploadedAt: string;
}

const MAX_SAMPLES = 3;



function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const isHighlight = active || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-3 py-1.5 text-[11px] uppercase tracking-[1px] border rounded-sm transition-all duration-200"
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


function ActionButton({ onClick, disabled, children, variant = "accent" }: {
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
      bg: hovered ? "rgba(255,255,255,0.03)" : "transparent",
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
      className="w-full py-2.5 text-[11px] uppercase tracking-[2px] font-semibold border rounded-sm transition-all duration-200"
      style={{
        borderColor: c.border,
        color: c.color,
        background: c.bg,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}


function DownloadButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[1px] border rounded-sm transition-all duration-200"
      style={{
        borderColor: hovered ? "var(--accent)" : "var(--border-strong)",
        color: hovered ? "var(--accent)" : "var(--text-muted)",
        background: hovered ? "var(--accent-subtle)" : "transparent",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {children}
    </button>
  );
}


function OperationButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const isHighlight = active || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] uppercase tracking-[1px] text-left border rounded-sm transition-all duration-200"
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


function ManageSamplesBox({ samples }: { samples: Sample[] }) {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [sampleLabel, setSampleLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFull = samples.length >= MAX_SAMPLES;

  const providerObj = PROVIDERS.find((p) => p.id === selectedProvider);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleUpload = () => {
    if (!selectedFile || !selectedProvider || !sampleLabel.trim()) return;
    // TODO: integrate with backend presigned URL upload
    console.info(`Upload: ${sampleLabel} (${selectedProvider}) — ${selectedFile.name}`);
    setSelectedFile(null);
    setSelectedProvider("");
    setSampleLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <GlowCard delay={0}>
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-bright)" }}>
            Manage your samples
          </h3>
          <span
            className="text-[10px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm border"
            style={{
              borderColor: isFull ? "var(--error-border)" : "var(--border-strong)",
              color: isFull ? "var(--error-text)" : "var(--text-faint)",
              background: isFull ? "var(--error-subtle)" : "transparent",
            }}
          >
            {samples.length}/{MAX_SAMPLES}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5">
        {isFull ? (
          <div className="flex items-start gap-3 p-3 sm:p-4 rounded-sm border" style={{ borderColor: "var(--error-border)", background: "var(--error-subtle)" }}>
            <IconWarning />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--error-text)" }}>
                Sample limit reached
              </p>
              <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                You cannot upload more samples. Maximum allowed are {MAX_SAMPLES}. Delete an existing sample to free up a slot.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Sample label */}
            <div>
              <label className="block text-[10px] uppercase tracking-[2px] mb-1.5 sm:mb-2" style={{ color: "var(--text-faint)" }}>
                Sample label
              </label>
              <input
                type="text"
                value={sampleLabel}
                onChange={(e) => setSampleLabel(e.target.value)}
                placeholder="e.g. MySample_Italian"
                className="w-full px-3 py-2.5 text-sm rounded-sm border outline-none transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_12px_var(--accent-faint)]"
                style={{
                  background: "var(--panel-strong)",
                  borderColor: "var(--border-strong)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Provider select */}
            <div>
              <label className="block text-[10px] uppercase tracking-[2px] mb-1.5 sm:mb-2" style={{ color: "var(--text-faint)" }}>
                Provider
              </label>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((p) => (
                  <PillButton key={p.id} active={selectedProvider === p.id} onClick={() => setSelectedProvider(p.id)}>
                    {p.label}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div>
              <label className="block text-[10px] uppercase tracking-[2px] mb-1.5 sm:mb-2" style={{ color: "var(--text-faint)" }}>
                Raw file
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className="relative flex flex-col items-center justify-center gap-2 sm:gap-2.5 py-5 sm:py-8 px-4 sm:px-6 border-2 border-dashed rounded-sm cursor-pointer transition-all duration-300"
                style={{
                  borderColor: dragOver ? "var(--accent)" : "var(--border-strong)",
                  background: dragOver ? "var(--accent-faint)" : "rgba(255,255,255,0.01)",
                  boxShadow: dragOver ? "inset 0 0 30px var(--accent-faint)" : "none",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={providerObj?.accept || ".txt,.csv"}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <IconCheck />
                    <span className="text-xs" style={{ color: "var(--accent)" }}>{selectedFile.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="ml-1 p-0.5 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <IconX />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ color: "var(--text-faint)" }}><IconUpload /></div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Drag & drop or <span style={{ color: "var(--accent)" }}>browse</span>
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                      {providerObj ? `${providerObj.label} format (${providerObj.accept})` : "Select a provider first"}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Upload button */}
            <ActionButton
              onClick={handleUpload}
              disabled={!selectedFile || !selectedProvider || !sampleLabel.trim()}
            >
              Upload sample
            </ActionButton>
          </div>
        )}
      </div>
    </GlowCard>
  );
}


const NAV_ITEMS = [
  { id: "samples",   label: "Samples/Labels",       Icon: IconSamples },
  { id: "diy",       label: "DIY Modeling",       Icon: IconDIY },
  { id: "assisted",  label: "Assisted Modeling",   Icon: IconAssisted },
  { id: "learning",  label: "Learning Materials",  Icon: IconLearn },
];


const DATASETS = [
  { id: "user",    label: "Your Dataset" },
  { id: "ancient", label: "Ancient" },
  { id: "modern",  label: "Modern" },
];

const LABEL_OPERATIONS = [
  { id: "replace",       label: "Replace Labels" },
  { id: "edit_single",   label: "Edit Single Label" },
  { id: "edit_multiple", label: "Edit Multiple Labels" },
];

function EditLabelsBox() {
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [selectedOperation, setSelectedOperation] = useState<string>("");

  return (
    <GlowCard delay={0.1}>
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-bright)" }}>
          Edit your labels here
        </h3>
        <p className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>
          Modify population labels across datasets
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5">
        {/* Dataset select */}
        <div>
          <label className="block text-[10px] uppercase tracking-[2px] mb-2" style={{ color: "var(--text-faint)" }}>
            Dataset
          </label>
          <div className="flex flex-wrap gap-2">
            {DATASETS.map((d) => (
              <PillButton key={d.id} active={selectedDataset === d.id} onClick={() => setSelectedDataset(d.id)}>
                {d.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Operation select */}
        <AnimatePresence>
          {selectedDataset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <label className="block text-[10px] uppercase tracking-[2px] mb-2" style={{ color: "var(--text-faint)" }}>
                Operation
              </label>
              <div className="flex flex-col gap-2">
                {LABEL_OPERATIONS.map((op) => {
                  const active = selectedOperation === op.id;
                  return (
                    <OperationButton key={op.id} active={active} onClick={() => setSelectedOperation(op.id)}>
                      {op.label}
                    </OperationButton>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Proceed + Reset */}
        <AnimatePresence>
          {selectedDataset && selectedOperation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-2 pt-1"
            >
              <ActionButton variant="accent" onClick={() => console.info(`Proceed: ${selectedDataset} → ${selectedOperation}`)}>
                Proceed
              </ActionButton>
              <ActionButton variant="danger" onClick={() => { setSelectedDataset(""); setSelectedOperation(""); }}>
                Reset
              </ActionButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlowCard>
  );
}


function SamplesSection() {
  // Mock data — will be replaced with API calls
  const [samples] = useState<Sample[]>([
    // Example: uncomment to test "full" state
    // { id: "1", label: "MySample_Italian", provider: "23andme", snpCount: 620000, status: "ready", uploadedAt: "2025-03-15T10:00:00Z" },
    // { id: "2", label: "MySample_French", provider: "ancestry", snpCount: 580000, status: "ready", uploadedAt: "2025-03-16T10:00:00Z" },
    // { id: "3", label: "MySample_German", provider: "ftdna", snpCount: 610000, status: "ready", uploadedAt: "2025-03-17T10:00:00Z" },
  ]);

  return (
    <div className="mx-auto flex flex-col gap-4 sm:gap-6 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:flex-1 lg:min-h-0">
        {/* LHS — Manage / Upload */}
        <ManageSamplesBox samples={samples} />

        {/* RHS — Edit Labels */}
        <EditLabelsBox />
      </div>

      {/* Download .fam files */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative group"
      >
        {/* Gradient accent top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px] opacity-60 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent), transparent)",
          }}
        />
        <div
          className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border rounded-sm transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(83,189,227,0.06)]"
          style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        >
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-bright)" }}>
              Download .fam files
            </h3>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>
              View the sample and population labels in each dataset
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DATASETS.map((d) => (
              <DownloadButton key={d.id} onClick={() => console.info(`Download .fam for ${d.id}`)}>
                {d.label}
              </DownloadButton>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}


export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("samples");
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
            <span className="text-[9px] sm:text-[11px] tracking-[3px] uppercase font-bold" style={{ color: "var(--text-bright)" }}>
              InsightsOnAncestry
            </span>
          </div>
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
          <p className="px-4 text-[9px] uppercase tracking-[3px] mb-3 mt-1 sm:mt-0" style={{ color: "var(--text-faint)" }}>
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

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 relative grid-bg">
          {activeSection === "samples" && <SamplesSection />}
        </main>

      </div>
    </div>
  );
}
