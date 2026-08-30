"use client";

import { GlassPanel } from "@/components/ui/glass-panel";
import { Metric } from "@/components/ui/fields";
import type { PlanetColony } from "@/lib/civilization";
import { PLANET_META } from "@/lib/galaxy-types";

export function ColonyPanel({ colony }: { colony: PlanetColony }) {
  const meta = PLANET_META[colony.id];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassPanel title="Colony" accent={meta.accent} index={0}>
        <p className="text-sm text-white/60">{colony.headline}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Population" value={colony.population} tone={meta.accentSoft} />
          <Metric label="Inputs" value={colony.inputs} tone={meta.accentSoft} />
          <Metric label="Files" value={colony.files} tone={meta.accentSoft} />
          <Metric label="Systems" value={colony.systems} tone={meta.accentSoft} />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          People arrive when you log. Buildings rise from files you store and systems you stand
          up — recipe books, programs, rituals, pantries, uplinks. This planet is only as alive as
          the health information you put on it.
        </p>
      </GlassPanel>
      <GlassPanel
        title="Buildings"
        meta={`${colony.buildings.length}`}
        accent={meta.accent}
        index={1}
      >
        {colony.buildings.length === 0 ? (
          <p className="text-sm text-white/45">No structures yet. Set up a system to raise one.</p>
        ) : (
          <ul className="space-y-2">
            {colony.buildings.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-white">{b.name}</div>
                  <div className="text-[11px] text-white/45">{b.why}</div>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-white/30">{b.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
      <GlassPanel
        title="On the surface"
        meta={`${colony.citizens.length} in view`}
        accent={meta.accent}
        index={2}
        className="lg:col-span-2"
      >
        {colony.citizens.length === 0 ? (
          <p className="text-sm text-white/45">Quiet streets. Land a log and people will appear.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {colony.citizens.map((c) => (
              <li key={c.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <div className="truncate text-sm text-white">{c.label}</div>
                <div className="text-[11px] text-white/45">{c.doing}</div>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
