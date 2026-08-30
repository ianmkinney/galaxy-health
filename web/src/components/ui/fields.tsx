"use client";

import { cn } from "@/lib/utils";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  accent = "cyan",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  accent?: "cyan" | "orange" | "rose" | "violet";
}) {
  const ring =
    accent === "orange"
      ? "focus:border-orange-300/40"
      : accent === "rose"
        ? "focus:border-rose-300/40"
        : accent === "violet"
          ? "focus:border-violet-300/40"
          : "focus:border-cyan-300/40";
  return (
    <label className="block text-xs text-white/50">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none",
          ring
        )}
      />
    </label>
  );
}

export function Area({
  label,
  value,
  onChange,
  rows = 4,
  accent = "cyan",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  accent?: "cyan" | "orange" | "rose" | "violet";
}) {
  const ring =
    accent === "orange"
      ? "focus:border-orange-300/40"
      : accent === "rose"
        ? "focus:border-rose-300/40"
        : accent === "violet"
          ? "focus:border-violet-300/40"
          : "focus:border-cyan-300/40";
  return (
    <label className="block text-xs text-white/50">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={cn(
          "mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none",
          ring
        )}
      />
    </label>
  );
}

export function Metric({
  label,
  value,
  tone = "#9AF0FF",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-semibold" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}
