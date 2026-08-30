"use client";

import { GlassPanel } from "@/components/ui/glass-panel";
import { Metric } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import type { PlanetColony } from "@/lib/civilization";
import { planetView } from "@/lib/galaxy-types";

export function ColonyPanel({ colony }: { colony: PlanetColony }) {
  const { store } = useGalaxy();
  const meta = planetView(store, colony.id);
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
          People arrive when you log. Population is the live count of inputs, files, and systems
          on this world — remove test data or a log and it drops immediately.
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
            {colony.buildings.map((b) => {
              const tone =
                b.condition === "sound"
                  ? meta.accentSoft
                  : b.condition === "weathering"
                    ? "#E8C36A"
                    : "#FF8A7A";
              return (
                <li
                  key={b.id}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{b.name}</div>
                      <div className="text-[11px] text-white/45">{b.why}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-white/30">
                        {b.kind} · tier {b.complexity}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: tone }}>
                        {b.condition}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round(b.freshness * 100)}%`, background: tone }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          Each building is a voxel stack that grows more elaborate as you add related logs and
          files. When that information goes stale, cubes weather off until you log something fresh.
        </p>
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
