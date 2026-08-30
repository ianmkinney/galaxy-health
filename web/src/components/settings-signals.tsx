"use client";

import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { DEFAULT_PLANETS, type PlanetId } from "@/lib/galaxy-types";
import { PLANET_META } from "@/lib/galaxy-types";

export function SettingsPage() {
  const { store, update, saving } = useGalaxy();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/bridge" className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
        ← Bridge
      </Link>
      <h1 className="mt-3 text-3xl font-black text-white">Settings</h1>
      <p className="mt-1 text-sm text-white/50">
        Planet names sync to your Google Drive app data.
      </p>

      <div className="mt-6">
        <GlassPanel title="Planet registry" accent="#4CE0FF" index={0}>
          <div className="space-y-4">
            {store.planets.map((planet) => (
              <div key={planet.id} className="border-t border-white/10 pt-4 first:border-0 first:pt-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {PLANET_META[planet.id as PlanetId].domain}
                    </div>
                    <div className="text-[10px] text-white/40">id: {planet.id}</div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    Visible
                    <input
                      type="checkbox"
                      checked={planet.enabled}
                      onChange={async (e) => {
                        const enabled = e.target.checked;
                        await update((draft) => {
                          const row = draft.planets.find((p) => p.id === planet.id);
                          if (row) row.enabled = enabled;
                          return draft;
                        });
                      }}
                    />
                  </label>
                </div>
                <input
                  defaultValue={planet.name}
                  onBlur={async (e) => {
                    const name = e.target.value.trim().slice(0, 24) || planet.name;
                    if (name === planet.name) return;
                    await update((draft) => {
                      const row = draft.planets.find((p) => p.id === planet.id);
                      if (row) row.name = name;
                      return draft;
                    });
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <ShimmerButton
              variant="ghost"
              tone="#4CE0FF"
              disabled={saving}
              onClick={async () => {
                await update((draft) => {
                  draft.planets = DEFAULT_PLANETS.map((p) => ({ ...p }));
                  return draft;
                });
              }}
            >
              Restore default names
            </ShimmerButton>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

export function SignalsPage() {
  const { store, planetName } = useGalaxy();
  const signals = store.signals.slice(0, 60);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/bridge" className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
        ← Bridge
      </Link>
      <h1 className="mt-3 text-3xl font-black text-white">Signal log</h1>
      <p className="mt-1 text-sm text-white/50">Every transmission stored in Drive.</p>
      <div className="mt-6">
        <GlassPanel title="Comms" meta={`${signals.length}`} accent="#4CE0FF" index={0}>
          {signals.length === 0 ? (
            <p className="text-sm text-white/45">No signals yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {signals.map((s) => (
                <li key={s.id} className="border-b border-white/5 pb-3">
                  <div className="font-medium text-white">
                    {planetName(s.from)} → {planetName(s.to)}
                  </div>
                  <div className="text-white/45">
                    {s.kind} · {s.seen ? "delivered" : "in transit"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
