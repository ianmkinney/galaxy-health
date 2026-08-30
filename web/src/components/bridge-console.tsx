"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { SignOutButton } from "@/components/auth-buttons";
import { PlanetCanvas } from "@/components/three/planet-canvas";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AiDock } from "@/components/ai-dock";
import { IngestPanel } from "@/components/ingest-panel";
import { useGalaxy } from "@/components/galaxy-provider";
import { PLANET_META, type PlanetId } from "@/lib/galaxy-types";
import { civilizationScore } from "@/lib/chart-series";
import { round } from "@/lib/utils";

export function BridgeConsole({ userName }: { userName?: string | null }) {
  const { store, loading, error, totals, inFlight, planetName, saving } = useGalaxy();
  const net = round(totals.galley.calories - totals.atlas.burn);
  const enabled = store.planets.filter((p) => p.enabled);
  const civ = civilizationScore(store);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03050B] text-sm uppercase tracking-[0.25em] text-cyan-200/60">
        Syncing canopy from Google Drive…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03050B]">
      {/* Cockpit canopy */}
      <div className="relative h-[58vh] min-h-[360px] overflow-hidden">
        <PlanetCanvas planet="bridge" className="absolute inset-0 h-full w-full" />

        {/* Glass reflection crawl */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ left: "-30%" }}
          animate={{ left: "110%" }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* A-pillars + canopy lip */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-[8%] bg-gradient-to-r from-[#05070F] via-[#05070F]/90 to-transparent" />
          <div className="absolute right-0 top-0 h-full w-[8%] bg-gradient-to-l from-[#05070F] via-[#05070F]/90 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute inset-x-[12%] top-3 h-px bg-cyan-300/30" />
          <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/25">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-200/20" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan-200/20" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#03050B] to-transparent" />
        </div>

        <div className="absolute left-6 top-6 z-10 max-w-md">
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">The Bridge</p>
          <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Galaxy Health</h1>
          <p className="mt-1 text-sm text-white/50">
            {userName ? `Pilot ${userName}` : "Google session active"}
            {saving ? " · writing Drive…" : ""}
            {inFlight.length
              ? ` · ${inFlight.length} ship${inFlight.length === 1 ? "" : "s"} in transit`
              : " · all systems nominal"}
          </p>
        </div>

        <div className="absolute right-6 top-6 z-10">
          <SignOutButton />
        </div>
      </div>

      {/* Console */}
      <div className="relative z-10 mx-auto grid max-w-6xl gap-4 px-4 pb-12 lg:grid-cols-2">
        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 lg:col-span-2">
            {error}
          </div>
        ) : null}

        <GlassPanel title="Vitals — today" accent="#4CE0FF" index={0}>
          <div className="mb-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  Civilization vitality
                </div>
                <div className="text-3xl font-black text-cyan-200">{civ}</div>
              </div>
              <div className="text-right text-[11px] text-white/40">
                Grows as habits land across planets
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 transition-all"
                style={{ width: `${civ}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Fuel in" value={round(totals.galley.calories)} unit="kcal" tone="#FF8A3D" />
            <Stat label="Burned" value={round(totals.atlas.burn)} unit="kcal" tone="#FF4D6D" />
            <Stat
              label="Net"
              value={net > 0 ? `+${net}` : `${net}`}
              unit="kcal"
              tone={net > 0 ? "#F5C542" : "#3DDC97"}
            />
            <Stat
              label="Clarity"
              value={totals.lumen.entries ? round(totals.lumen.focus, 1) : "—"}
              unit={totals.lumen.entries ? "/5" : undefined}
              tone="#4CE0FF"
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-[11px] text-white/45">
            <span>Protein {round(totals.galley.protein)}g</span>
            <span>Active {round(totals.atlas.minutes)}m</span>
            <span>Sleep {totals.lumen.entries ? `${round(totals.lumen.sleep, 1)}h` : "—"}</span>
            <span>Assays {totals.observatory.markers}</span>
          </div>
        </GlassPanel>

        <GlassPanel title="Nav dock" accent="#A98BFF" index={1}>
          <div className="grid grid-cols-2 gap-3">
            {enabled.map((planet) => {
              const meta = PLANET_META[planet.id as PlanetId];
              const inbound = inFlight.filter((s) => s.to === planet.id).length;
              return (
                <Link
                  key={planet.id}
                  href={meta.route}
                  className="group relative overflow-hidden rounded-2xl border bg-white/[0.03] p-4 transition hover:bg-white/[0.07]"
                  style={{ borderColor: `${meta.accent}66` }}
                >
                  <span
                    className="mb-3 block h-10 w-10 rounded-full shadow-lg"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${meta.accentSoft}, ${meta.accent})`,
                      boxShadow: `0 0 24px ${meta.accent}88`,
                    }}
                  />
                  <div className="font-semibold text-white">{planetName(planet.id)}</div>
                  <div className="text-[11px] text-white/45">{meta.domain}</div>
                  <div className="mt-1 text-[10px] text-white/30">{meta.vibe}</div>
                  {inbound > 0 ? (
                    <span
                      className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-950"
                      style={{ backgroundColor: meta.accent }}
                    >
                      {inbound}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ShimmerButton href="/settings" tone="#A98BFF" variant="ghost">
              Settings & AI keys
            </ShimmerButton>
            <ShimmerButton href="/signals" tone="#4CE0FF" variant="ghost">
              Signal log
            </ShimmerButton>
          </div>
        </GlassPanel>

        {inFlight.length > 0 ? (
          <GlassPanel
            title="In transit"
            meta={`${inFlight.length} queued`}
            accent="#FF4D6D"
            index={2}
          >
            <ul className="space-y-2 text-sm text-white/70">
              {inFlight.slice(0, 6).map((signal) => (
                <li key={signal.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: PLANET_META[signal.from].accent }}
                  />
                  {planetName(signal.from)} → {planetName(signal.to)} · {signal.kind}
                </li>
              ))}
            </ul>
          </GlassPanel>
        ) : null}

        <div className="lg:col-span-2">
          <IngestPanel />
        </div>

        <div className="lg:col-span-2">
          <AiDock
            accent="#4CE0FF"
            title="Bridge synthesis"
            placeholder="Optional focus: energy, recovery, labs…"
            action="bridge.synthesize"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: tone }}>
        {value}
        {unit ? <span className="ml-1 text-xs font-medium text-white/40">{unit}</span> : null}
      </div>
    </div>
  );
}
