"use client";

import { useState } from "react";
import { PlanetHabitat } from "@/components/planets/planet-habitat";
import { AiDock } from "@/components/ai-dock";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Signal } from "@/lib/galaxy-types";
import { round, todayKey } from "@/lib/utils";

const TABS = [
  { id: "sessions", label: "Sessions" },
  { id: "coach", label: "AI Coach" },
  { id: "program", label: "Program" },
];

export function AtlasWorld() {
  const { store, update, planetName, totals, saving } = useGalaxy();
  const [tab, setTab] = useState("sessions");
  const day = todayKey();
  const rows = store.workouts.filter((w) => w.logged_on === day);
  const [form, setForm] = useState({
    name: "",
    modality: "strength",
    minutes: "",
    intensity: "3",
    notes: "",
  });

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
    <PlanetHabitat
      id="atlas"
      title={planetName("atlas")}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
    >
      {tab === "sessions" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Load board" accent="#FF4D6D" index={0}>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Minutes" value={`${round(totals.atlas.minutes)}`} />
              <Metric label="Burn" value={`${round(totals.atlas.burn)} kcal`} />
              <Metric label="Fuel in" value={`${round(totals.galley.calories)} kcal`} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#FF4D6D] transition-all"
                style={{
                  width: `${Math.min(100, (totals.atlas.minutes / 60) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-white/35">
              Daily load meter · 60 min target
            </p>
          </GlassPanel>
          <GlassPanel title="Log session" accent="#FF4D6D" index={1}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
              <Field label="Modality" value={form.modality} onChange={(modality) => setForm((f) => ({ ...f, modality }))} />
              <Field label="Minutes" value={form.minutes} onChange={(minutes) => setForm((f) => ({ ...f, minutes }))} />
              <Field label="Intensity 1–5" value={form.intensity} onChange={(intensity) => setForm((f) => ({ ...f, intensity }))} />
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
                    {w.name}{" "}
                    <span className="text-white/40">· {w.modality}</span>
                  </span>
                  <span className="text-white/45">
                    {w.minutes}m · {w.burn} kcal
                  </span>
                </li>
              ))}
              {rows.length === 0 ? <li className="text-white/40">No sessions yet.</li> : null}
            </ul>
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

      {tab === "program" ? (
        <AiDock
          accent="#FF8FA3"
          title="4-day microcycle"
          placeholder="Goal: hypertrophy / strength / conditioning…"
          action="atlas.program"
        />
      ) : null}
    </PlanetHabitat>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-rose-300/40"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-semibold text-[#FF8FA3]">{value}</div>
    </div>
  );
}
