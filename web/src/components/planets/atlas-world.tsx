"use client";

import { useMemo, useState } from "react";
import { PlanetHabitat } from "@/components/planets/planet-habitat";
import { PlanetCharts } from "@/components/charts/planet-charts";
import { ColonyPanel } from "@/components/planets/colony-panel";
import { AiDock } from "@/components/ai-dock";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Field, Metric } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Signal, type TrainingProgram } from "@/lib/galaxy-types";
import { planetColony } from "@/lib/civilization";
import { SystemsLedger } from "@/components/planets/systems-ledger";
import { atlasStats, relativeDay } from "@/lib/planet-ops";
import { round, todayKey } from "@/lib/utils";

const TABS = [
  { id: "colony", label: "Colony" },
  { id: "systems", label: "Systems" },
  { id: "charts", label: "Charts" },
  { id: "sessions", label: "Sessions" },
  { id: "programs", label: "Programs" },
  { id: "coach", label: "AI Coach" },
];

const MODALITIES = ["strength", "cardio", "mobility", "walk", "mixed"];

function parseProgram(text: string, goal: string): TrainingProgram {
  const days = text
    .split(/\n(?=Day |\*\*Day )/i)
    .map((block) => block.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((block, i) => {
      const name = block.match(/Day\s*\d+[^\n]*/i)?.[0] || `Day ${i + 1}`;
      return { name, focus: goal || "training", movements: block.slice(0, 800) };
    });
  return {
    id: uid(),
    name: goal.trim() || "Microcycle",
    focus: goal.trim() || "general",
    days: days.length ? days : [{ name: "Day 1", focus: "full", movements: text.slice(0, 800) }],
    created_at: Date.now(),
    source: "user",
  };
}

export function AtlasWorld() {
  const { store, update, planetName, totals, saving } = useGalaxy();
  const [tab, setTab] = useState("colony");
  const [filter, setFilter] = useState("all");
  const day = todayKey();
  const stats = atlasStats(store);
  const rows = store.workouts.filter((w) => w.logged_on === day);
  const history = useMemo(() => {
    if (filter === "all") return store.workouts.slice(0, 30);
    return store.workouts.filter((w) => w.modality === filter).slice(0, 30);
  }, [store.workouts, filter]);
  const [form, setForm] = useState({
    name: "",
    modality: "strength",
    minutes: "",
    intensity: "3",
    notes: "",
  });
  const colony = planetColony(store, "atlas");

  const log = async () => {
    const minutes = Number(form.minutes) || 0;
    const intensity = Number(form.intensity) || 3;
    if (!form.name.trim() || !minutes) return;
    const burn = Math.round(minutes * (4 + intensity));
    const workout = {
      id: uid(),
      name: form.name.trim(),
      modality: form.modality,
      minutes,
      intensity,
      burn,
      notes: form.notes,
      logged_on: day,
      created_at: Date.now(),
      source: "user" as const,
    };
    const signals: Signal[] = [
      {
        id: uid(),
        from: "atlas",
        to: "galley",
        kind: "atlas.burn.logged",
        payload: { name: workout.name, burn, minutes },
        payload_ref: `workouts:${workout.id}`,
        seen: false,
        delivered_at: null,
        created_at: Date.now(),
      },
      {
        id: uid(),
        from: "atlas",
        to: "lumen",
        kind: "atlas.load.logged",
        payload: { name: workout.name, load: minutes * intensity },
        payload_ref: `workouts:${workout.id}`,
        seen: false,
        delivered_at: null,
        created_at: Date.now(),
      },
    ];
    await update((d) => {
      d.workouts.unshift(workout);
      d.signals.unshift(...signals);
      return d;
    });
    setForm({ name: "", modality: "strength", minutes: "", intensity: "3", notes: "" });
  };

  return (
    <PlanetHabitat id="atlas" title={planetName("atlas")} tabs={TABS} activeTab={tab} onTab={setTab}>
      {tab === "colony" ? <ColonyPanel colony={colony} /> : null}
      {tab === "systems" ? <SystemsLedger planetId="atlas" /> : null}
      {tab === "charts" ? <PlanetCharts store={store} planet="atlas" /> : null}
      {tab === "sessions" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Load board" accent="#FF4D6D" index={0}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Today min" value={`${round(totals.atlas.minutes)}`} tone="#FF8FA3" />
              <Metric label="7d volume" value={`${round(stats.volume7d)}m`} tone="#FF8FA3" />
              <Metric label="Streak" value={`${stats.streak}d`} tone="#FF8FA3" />
              <Metric label="Sessions" value={stats.sessions} tone="#FF8FA3" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#FF4D6D] transition-all"
                style={{ width: `${Math.min(100, (totals.atlas.minutes / 60) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-white/35">
              Daily load meter · 60 min · top: {stats.topExercise?.name ?? "—"}
            </p>
          </GlassPanel>
          <GlassPanel title="Log session" accent="#FF4D6D" index={1}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field accent="rose" label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
              <label className="block text-xs text-white/50">
                Modality
                <select
                  value={form.modality}
                  onChange={(e) => setForm((f) => ({ ...f, modality: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  {MODALITIES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <Field accent="rose" label="Minutes" value={form.minutes} onChange={(minutes) => setForm((f) => ({ ...f, minutes }))} />
              <Field
                accent="rose"
                label="Intensity 1–5"
                value={form.intensity}
                onChange={(intensity) => setForm((f) => ({ ...f, intensity }))}
              />
            </div>
            <label className="mt-3 block text-xs text-white/50">
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="mt-4">
              <ShimmerButton tone="#FF4D6D" disabled={saving} onClick={log}>
                Log & transmit
              </ShimmerButton>
            </div>
          </GlassPanel>
          <GlassPanel title="Today" meta={`${rows.length}`} accent="#FF4D6D" index={2} className="lg:col-span-2">
            <ul className="space-y-2 text-sm text-white/80">
              {rows.map((w) => (
                <li key={w.id} className="flex justify-between border-b border-white/5 py-2">
                  <span>
                    {w.name} <span className="text-white/40">· {w.modality}</span>
                  </span>
                  <span className="text-white/45">
                    {w.minutes}m · {w.burn} kcal
                  </span>
                </li>
              ))}
              {rows.length === 0 ? <li className="text-white/40">No sessions yet.</li> : null}
            </ul>
          </GlassPanel>
          <GlassPanel title="Ledger" meta={`${history.length}`} accent="#FF4D6D" index={3} className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap gap-2">
              {["all", ...MODALITIES].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilter(m)}
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                    filter === m ? "border-rose-300/50 bg-rose-300/15 text-rose-100" : "border-white/10 text-white/45"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
              {history.map((w) => (
                <li key={w.id} className="flex items-center justify-between border-b border-white/5 py-1.5">
                  <span className="text-white/80">
                    {w.name} <span className="text-white/35">· {w.modality}</span>
                  </span>
                  <span className="flex items-center gap-3 text-white/40">
                    {relativeDay(w.logged_on)} · {w.minutes}m
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-wider text-white/25 hover:text-rose-300"
                      onClick={() =>
                        update((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== w.id) }))
                      }
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      ) : null}

      {tab === "programs" ? (
        <div className="grid gap-4">
          <AiDock
            accent="#FF8FA3"
            title="Draft a 4-day microcycle"
            placeholder="Goal: hypertrophy / strength / conditioning…"
            action="atlas.program"
            onResult={async (text) => {
              const program = parseProgram(text, "AI microcycle");
              await update((d) => {
                d.programs.unshift(program);
                return d;
              });
            }}
          />
          <GlassPanel title="Saved programs" meta={`${store.programs.length}`} accent="#FF4D6D" index={1}>
            {store.programs.length === 0 ? (
              <p className="text-sm text-white/45">
                Ask the coach for a cycle and it lands here as a building on Atlas.
              </p>
            ) : (
              <ul className="space-y-3">
                {store.programs.map((p) => (
                  <li key={p.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[11px] text-white/40">{p.focus} · {p.days.length} days</div>
                      </div>
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-wider text-white/30 hover:text-rose-300"
                        onClick={() =>
                          update((d) => ({ ...d, programs: d.programs.filter((x) => x.id !== p.id) }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-white/55">
                      {p.days.map((dayRow) => `${dayRow.name}\n${dayRow.movements}`).join("\n\n")}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      ) : null}

      {tab === "coach" ? (
        <AiDock
          accent="#FF4D6D"
          title="Atlas coach"
          placeholder="Should I push legs today? Deload? Swap for equipment limits…"
          action="atlas.coach"
        />
      ) : null}
    </PlanetHabitat>
  );
}
