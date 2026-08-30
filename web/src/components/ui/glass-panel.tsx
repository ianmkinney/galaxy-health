"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type GlassPanelProps = {
  title?: string;
  meta?: string;
  accent?: string;
  className?: string;
  children: React.ReactNode;
  index?: number;
};

/** Kokonut / liquid-glass inspired panel — Motion enter, frosted hull. */
export function GlassPanel({
  title,
  meta,
  accent = "#4CE0FF",
  className,
  children,
  index = 0,
}: GlassPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.06 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_40px_rgba(76,224,255,0.06)] backdrop-blur-xl",
        className
      )}
      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      {(title || meta) && (
        <header className="mb-4 flex items-baseline justify-between gap-3">
          {title ? (
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {meta ? (
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {meta}
            </span>
          ) : null}
        </header>
      )}
      {children}
    </motion.section>
  );
}
