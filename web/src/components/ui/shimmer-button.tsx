"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type ShimmerButtonProps = {
  className?: string;
  tone?: string;
  variant?: "solid" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  href?: string;
};

/** Kokonut-style shimmer CTA with Motion press physics. */
export function ShimmerButton({
  className,
  tone = "#4CE0FF",
  variant = "solid",
  children,
  disabled,
  onClick,
  href,
}: ShimmerButtonProps) {
  const solid = variant === "solid";
  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40",
    solid ? "border border-transparent text-slate-950" : "border bg-transparent text-white/90",
    className
  );
  const style = solid
    ? { backgroundColor: tone }
    : { borderColor: `${tone}88`, color: tone };

  const inner = (
    <>
      {solid ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-16 -skew-x-12 bg-white/40 blur-[2px]"
          initial={{ left: "-20%" }}
          animate={{ left: "120%" }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </>
  );

  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
        <Link href={href} className={classes} style={style}>
          {inner}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      style={style}
    >
      {inner}
    </motion.button>
  );
}
