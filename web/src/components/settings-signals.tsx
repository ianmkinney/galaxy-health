"use client";

import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AgentAccessPanel, DriveStoragePanel, FirstMatePanel, TestDataPanel } from "@/components/settings-panels";
import { ForgePlanetPanel } from "@/components/planets/forge-planet-panel";
import { ByokPanel } from "@/components/settings-byok";
import { useGalaxy } from "@/components/galaxy-provider";
import { isCorePlanet, planetView } from "@/lib/galaxy-types";
import { restoreCoreWorlds, unmakePlanet } from "@/lib/world-forge";

export function SettingsPage() {
  const { store, update, saving } = useGalaxy();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/bridge" className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
        ← Bridge
      </Link>
      <h1 className="mt-3 text-3xl font-black text-white">Settings</h1>
      <p className="mt-1 text-sm text-white/50">
        Add or remove worlds, rename planets, and keep BYOK keys in your private Drive app data.
      </p>

      <div className="mt-6 space-y-4">
        <ForgePlanetPanel index={0} />

        <GlassPanel title="Planet registry" accent="#4CE0FF" index={1}>
          <p className="text-sm text-white/55">
            Remove a core world to hide it from the canopy — restore it later. Unmake a custom world
            to delete its systems and logs.
          </p>
          <div className="mt-4 space-y-4">
            {store.planets.map((planet) => {
              const view = planetView(store, planet.id);
              return (
              <div key={planet.id} className="border-t border-white/10 pt-4 first:border-0 first:pt-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {view.domain}
                    </div>
                    <div className="text-[10px] text-white/40">
                      id: {planet.id}
                      {view.custom ? " · custom" : " · core"}
                      {planet.enabled ? "" : " · off canopy"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                  {planet.enabled ? (
                    <ShimmerButton
                      tone="#FF4D6D"
                      variant="ghost"
                      disabled={saving}
                      onClick={async () => {
                        const ok = view.custom
                          ? window.confirm(
                              `Unmake ${planet.name}? Systems and logs on this world are deleted.`
                            )
                          : window.confirm(
                              `Remove ${planet.name} from the canopy? You can restore core worlds later.`
                            );
                        if (!ok) return;
                        await update((d) => unmakePlanet(d, planet.id));
                      }}
                    >
                      {view.custom ? "Unmake" : "Remove"}
                    </ShimmerButton>
                  ) : isCorePlanet(planet.id) ? (
                    <ShimmerButton
                      tone="#4CE0FF"
                      variant="ghost"
                      disabled={saving}
                      onClick={async () => {
                        await update((d) => {
                          const row = d.planets.find((p) => p.id === planet.id);
                          if (row) row.enabled = true;
                          return d;
                        });
                      }}
                    >
                      Restore
                    </ShimmerButton>
                  ) : null}
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    Visible
                    <input
                      type="checkbox"
                      checked={planet.enabled}
                      onChange={async (e) => {
                        const enabled = e.target.checked;
                        await update((d) => {
                          const row = d.planets.find((p) => p.id === planet.id);
                          if (row) row.enabled = enabled;
                          const world = (d.worlds ?? []).find((w) => w.id === planet.id);
                          if (world) world.enabled = enabled;
                          return d;
                        });
                      }}
                    />
                  </label>
                  </div>
                </div>
                <input
                  defaultValue={planet.name}
                  onBlur={async (e) => {
                    const name = e.target.value.trim().slice(0, 24) || planet.name;
                    if (name === planet.name) return;
                    await update((d) => {
                      const row = d.planets.find((p) => p.id === planet.id);
                      if (row) row.name = name;
                      const world = (d.worlds ?? []).find((w) => w.id === planet.id);
                      if (world) world.name = name;
                      return d;
                    });
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ShimmerButton
              variant="ghost"
              tone="#4CE0FF"
              disabled={saving}
              onClick={async () => {
                await update((d) => restoreCoreWorlds(d));
              }}
            >
              Restore core worlds
            </ShimmerButton>
          </div>
        </GlassPanel>
        <ByokPanel index={2} />

        <FirstMatePanel />
        <AgentAccessPanel />
        <DriveStoragePanel />
        <TestDataPanel />
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
