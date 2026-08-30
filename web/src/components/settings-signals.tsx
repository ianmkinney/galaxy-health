"use client";

import Link from "next/link";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AgentAccessPanel, DriveStoragePanel, TestDataPanel } from "@/components/settings-panels";
import { useGalaxy } from "@/components/galaxy-provider";
import {
  DEFAULT_AI,
  DEFAULT_PLANETS,
  isCorePlanet,
  planetView,
  type AiSettings,
} from "@/lib/galaxy-types";

export function SettingsPage() {
  const { store, update, saving } = useGalaxy();
  const [provider, setProvider] = useState<AiSettings["provider"]>(store.ai.provider);
  const [model, setModel] = useState(store.ai.model);
  const [keyDraft, setKeyDraft] = useState("");
  const [status, setStatus] = useState("");

  const hasKey = Boolean(store.ai.keys[provider]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/bridge" className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
        ← Bridge
      </Link>
      <h1 className="mt-3 text-3xl font-black text-white">Settings</h1>
      <p className="mt-1 text-sm text-white/50">
        Planet names + BYOK keys + agent uplink sync into your private Drive app data.
      </p>

      <div className="mt-6 space-y-4">
        <GlassPanel title="Bring your own key" accent="#4CE0FF" index={0}>
          <p className="text-sm text-white/55">
            Same idea as Food Dude: your Claude / OpenAI / Grok / Gemini key stays in{" "}
            <em>your</em> Google Drive app folder. Galaxy Health has no key server. A key also powers
            intelligent agent routing.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["anthropic", "openai", "xai", "gemini"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setProvider(id)}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${
                  provider === id
                    ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                    : "border-white/15 text-white/60"
                }`}
              >
                {id}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/40">
            {hasKey ? `Key on file for ${provider}.` : `No key saved for ${provider} yet.`}
          </p>
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="Paste API key"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model id"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <ShimmerButton
              tone="#4CE0FF"
              disabled={saving || !keyDraft.trim()}
              onClick={async () => {
                await update((d) => {
                  d.ai.provider = provider;
                  d.ai.model = model || DEFAULT_AI.model;
                  d.ai.keys[provider] = keyDraft.trim();
                  return d;
                });
                setKeyDraft("");
                setStatus("Key saved to Drive app data.");
              }}
            >
              Save key
            </ShimmerButton>
            <ShimmerButton
              tone="#4CE0FF"
              variant="ghost"
              disabled={saving}
              onClick={async () => {
                await update((d) => {
                  d.ai.provider = provider;
                  d.ai.model = model || DEFAULT_AI.model;
                  return d;
                });
                setStatus("Provider / model updated.");
              }}
            >
              Set provider
            </ShimmerButton>
            {hasKey ? (
              <ShimmerButton
                tone="#FF4D6D"
                variant="ghost"
                onClick={async () => {
                  await update((d) => {
                    delete d.ai.keys[provider];
                    return d;
                  });
                  setStatus("Key cleared.");
                }}
              >
                Clear key
              </ShimmerButton>
            ) : null}
          </div>
          {status ? <p className="mt-3 text-sm text-white/50">{status}</p> : null}
        </GlassPanel>

        <AgentAccessPanel />
        <DriveStoragePanel />
        <TestDataPanel />

        <GlassPanel title="Planet registry" accent="#4CE0FF" index={1}>
          <div className="space-y-4">
            {store.planets.map((planet) => {
              const view = planetView(store, planet.id);
              return (
              <div key={planet.id} className="border-t border-white/10 pt-4 first:border-0 first:pt-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {view.domain}
                    </div>
                    <div className="text-[10px] text-white/40">id: {planet.id}{view.custom ? " · custom" : ""}</div>
                  </div>
                  <div className="flex items-center gap-3">
                  {view.custom ? (
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-wider text-white/30 hover:text-rose-300"
                      onClick={async () => {
                        await update((d) => ({
                          ...d,
                          planets: d.planets.filter((p) => p.id !== planet.id),
                          worlds: d.worlds.filter((w) => w.id !== planet.id),
                          systems: d.systems.filter((s) => s.planet_id !== planet.id),
                          entries: d.entries.filter((e) => e.planet_id !== planet.id),
                        }));
                      }}
                    >
                      Unmake
                    </button>
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
                          const world = d.worlds.find((w) => w.id === planet.id);
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
                      const world = d.worlds.find((w) => w.id === planet.id);
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
          <div className="mt-4">
            <ShimmerButton
              variant="ghost"
              tone="#4CE0FF"
              disabled={saving}
              onClick={async () => {
                await update((d) => {
                  const custom = d.planets.filter((p) => !isCorePlanet(p.id));
                  d.planets = [...DEFAULT_PLANETS.map((p) => ({ ...p })), ...custom];
                  return d;
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
