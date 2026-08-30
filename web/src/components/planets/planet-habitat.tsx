"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { PlanetCanvas } from "@/components/three/planet-canvas";
import { useGalaxy } from "@/components/galaxy-provider";
import { planetView, type PlanetId } from "@/lib/galaxy-types";
import { planetColony } from "@/lib/civilization";
import { cn } from "@/lib/utils";

export function PlanetHabitat({
  id,
  title,
  children,
  tabs,
  activeTab,
  onTab,
}: {
  id: PlanetId;
  title: string;
  children: React.ReactNode;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTab: (id: string) => void;
}) {
  const { store } = useGalaxy();
  const meta = planetView(store, id);
  const colony = planetColony(store, id);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          id === "galley"
            ? "radial-gradient(ellipse at 20% 0%, rgba(255,138,61,0.22), transparent 50%), linear-gradient(180deg,#1a0f08 0%,#05070F 45%)"
            : id === "atlas"
              ? "radial-gradient(ellipse at 80% 10%, rgba(255,77,109,0.25), transparent 45%), linear-gradient(160deg,#14060c 0%,#05070F 50%)"
              : id === "lumen"
                ? "radial-gradient(ellipse at 50% 0%, rgba(76,224,255,0.2), transparent 55%), linear-gradient(180deg,#061018 0%,#05070F 50%)"
                : id === "observatory"
                  ? "radial-gradient(ellipse at 70% 0%, rgba(169,139,255,0.22), transparent 50%), linear-gradient(200deg,#0c0818 0%,#05070F 48%)"
                  : `radial-gradient(ellipse at 50% 0%, ${meta.accent}38, transparent 50%), linear-gradient(180deg,#05070F 0%,#05070F 50%)`,
      }}
    >
      <div className="pointer-events-auto absolute inset-x-0 top-0 h-[46vh] opacity-95">
        <PlanetCanvas
          key={`${id}-${store.updated_at}`}
          planet={id}
          view="surface"
          store={store}
          className="h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05070F]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Link
          href="/bridge"
          className="text-[11px] uppercase tracking-[0.28em] text-white/50 hover:text-white/80"
        >
          ← Bridge
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="mt-8 max-w-2xl"
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: meta.accent }}
          >
            {meta.domain} · {meta.cadence}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-white/50">{meta.vibe}</p>
          {meta.description ? (
            <p className="mt-1 text-xs text-white/35">{meta.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-white/40">
            Pop {colony.population} · {colony.buildings.length} buildings · {colony.inputs} inputs ·{" "}
            {colony.files} files · {colony.systems} systems
          </p>
        </motion.div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTab(tab.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                activeTab === tab.id
                  ? "border-transparent text-slate-950"
                  : "border-white/15 bg-white/5 text-white/70 hover:border-white/30"
              )}
              style={activeTab === tab.id ? { backgroundColor: meta.accent } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
