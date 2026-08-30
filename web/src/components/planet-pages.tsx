"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import type { PlanetId, Signal } from "@/lib/galaxy-types";
import { todayKey, round } from "@/lib/utils";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function GalleyPage() {
  const { store, update, planetName, totals, saving } = useGalaxy();
  const [form, setForm] = useState({
    name: "",
    slot: "lunch",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const day = todayKey();
  const meals = store.meals.filter((m) => m.logged_on === day);

  const log = async () => {
    const calories = Number(form.calories) || 0;
    const protein = Number(form.protein) || 0;
    const carbs = Number(form.carbs) || 0;
    const fat = Number(form.fat) || 0;
    if (!form.name.trim() || !calories) return;

    const meal = {
      id: uid(),
      name: form.name.trim(),
      slot: form.slot,
      calories,
      protein,
      carbs,
      fat,
      logged_on: day,
      created_at: Date.now(),
    };

    const signal: Signal = {
      id: uid(),
      from: "galley",
      to: "atlas",
      kind: "galley.macros.logged",
      payload: { name: meal.name, calories, protein },
      payload_ref: `meals:${meal.id}`,
      seen: false,
      delivered_at: null,
      created_at: Date.now(),
    };

    await update((draft) => {
      draft.meals.unshift(meal);
      draft.signals.unshift(signal);
      return draft;
    });
    setForm({ name: "", slot: "lunch", calories: "", protein: "", carbs: "", fat: "" });
  };

  return (
    <PlanetShell id="galley" title={planetName("galley")} tagline="Fuel logged to Google Drive.">
      <GlassPanel title="Today" accent="#FF8A3D" index={0}>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Metric label="In" value={`${round(totals.galley.calories)} kcal`} />
          <Metric label="Burned" value={`${round(totals.atlas.burn)} kcal`} />
          <Metric
            label="Net"
            value={`${round(totals.galley.calories - totals.atlas.burn)} kcal`}
          />
        </div>
      </GlassPanel>

      <GlassPanel title="Log fuel" accent="#FF8A3D" index={1}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
          <Field label="Calories" value={form.calories} onChange={(calories) => setForm((f) => ({ ...f, calories }))} />
          <Field label="Protein" value={form.protein} onChange={(protein) => setForm((f) => ({ ...f, protein }))} />
          <Field label="Carbs" value={form.carbs} onChange={(carbs) => setForm((f) => ({ ...f, carbs }))} />
          <Field label="Fat" value={form.fat} onChange={(fat) => setForm((f) => ({ ...f, fat }))} />
        </div>
        <div className="mt-4">
          <ShimmerButton tone="#FF8A3D" disabled={saving} onClick={log}>
            {saving ? "Saving…" : "Log & transmit to Atlas"}
          </ShimmerButton>
        </div>
      </GlassPanel>

      <GlassPanel title="Manifest" meta={`${meals.length}`} accent="#FF8A3D" index={2}>
        {meals.length === 0 ? (
          <p className="text-sm text-white/45">Nothing logged today.</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/80">
            {meals.map((m) => (
              <li key={m.id} className="flex justify-between border-b border-white/5 py-2">
                <span>{m.name}</span>
                <span className="text-white/45">{round(m.calories)} kcal</span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </PlanetShell>
  );
}

export function AtlasPage() {
  const { store, update, planetName, totals, saving } = useGalaxy();
  const [form, setForm] = useState({
    name: "",
    modality: "strength",
    minutes: "",
    intensity: "3",
  });
  const day = todayKey();
  const rows = store.workouts.filter((w) => w.logged_on === day);

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
      logged_on: day,
      created_at: Date.now(),
    };
    await update((draft) => {
      draft.workouts.unshift(workout);
      draft.signals.unshift(
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
        }
      );
      return draft;
    });
    setForm({ name: "", modality: "strength", minutes: "", intensity: "3" });
  };

  return (
    <PlanetShell id="atlas" title={planetName("atlas")} tagline="Load bearing sessions.">
      <GlassPanel title="Today" accent="#FF4D6D" index={0}>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Metric label="Minutes" value={`${round(totals.atlas.minutes)}`} />
          <Metric label="Burn" value={`${round(totals.atlas.burn)} kcal`} />
          <Metric label="Fuel in" value={`${round(totals.galley.calories)} kcal`} />
        </div>
      </GlassPanel>
      <GlassPanel title="Log session" accent="#FF4D6D" index={1}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
          <Field label="Minutes" value={form.minutes} onChange={(minutes) => setForm((f) => ({ ...f, minutes }))} />
          <Field label="Intensity 1–5" value={form.intensity} onChange={(intensity) => setForm((f) => ({ ...f, intensity }))} />
        </div>
        <div className="mt-4">
          <ShimmerButton tone="#FF4D6D" disabled={saving} onClick={log}>
            {saving ? "Saving…" : "Log & transmit"}
          </ShimmerButton>
        </div>
      </GlassPanel>
      <GlassPanel title="Sessions" meta={`${rows.length}`} accent="#FF4D6D" index={2}>
        {rows.length === 0 ? (
          <p className="text-sm text-white/45">No sessions today.</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/80">
            {rows.map((w) => (
              <li key={w.id} className="flex justify-between border-b border-white/5 py-2">
                <span>{w.name}</span>
                <span className="text-white/45">
                  {w.minutes}m · {w.burn} kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </PlanetShell>
  );
}

export function LumenPage() {
  const { store, update, planetName, totals, saving } = useGalaxy();
  const [form, setForm] = useState({ mood: "3", focus: "3", sleep: "7", note: "" });
  const day = todayKey();
  const rows = store.checkins.filter((c) => c.logged_on === day);

  const log = async () => {
    const checkin = {
      id: uid(),
      mood: Number(form.mood) || 3,
      focus: Number(form.focus) || 3,
      sleep_hours: Number(form.sleep) || 0,
      note: form.note.trim(),
      logged_on: day,
      created_at: Date.now(),
    };
    const readiness = (checkin.mood + checkin.focus + Math.min(checkin.sleep_hours, 8) / 1.6) / 3;
    await update((draft) => {
      draft.checkins.unshift(checkin);
      draft.signals.unshift({
        id: uid(),
        from: "lumen",
        to: "atlas",
        kind: "lumen.readiness.logged",
        payload: { readiness, sleepHours: checkin.sleep_hours },
        payload_ref: `checkins:${checkin.id}`,
        seen: false,
        delivered_at: null,
        created_at: Date.now(),
      });
      return draft;
    });
  };

  return (
    <PlanetShell id="lumen" title={planetName("lumen")} tagline="Clarity and recovery.">
      <GlassPanel title="Today" accent="#4CE0FF" index={0}>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Metric label="Mood" value={totals.lumen.entries ? round(totals.lumen.mood, 1) : "—"} />
          <Metric label="Focus" value={totals.lumen.entries ? round(totals.lumen.focus, 1) : "—"} />
          <Metric label="Sleep" value={totals.lumen.entries ? `${round(totals.lumen.sleep, 1)}h` : "—"} />
        </div>
      </GlassPanel>
      <GlassPanel title="Check-in" accent="#4CE0FF" index={1}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Mood 1–5" value={form.mood} onChange={(mood) => setForm((f) => ({ ...f, mood }))} />
          <Field label="Focus 1–5" value={form.focus} onChange={(focus) => setForm((f) => ({ ...f, focus }))} />
          <Field label="Sleep hours" value={form.sleep} onChange={(sleep) => setForm((f) => ({ ...f, sleep }))} />
        </div>
        <div className="mt-4">
          <ShimmerButton tone="#4CE0FF" disabled={saving} onClick={log}>
            {saving ? "Saving…" : "Log readiness"}
          </ShimmerButton>
        </div>
      </GlassPanel>
      <GlassPanel title="Check-ins" meta={`${rows.length}`} accent="#4CE0FF" index={2}>
        {rows.length === 0 ? (
          <p className="text-sm text-white/45">No check-ins today.</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/80">
            {rows.map((c) => (
              <li key={c.id} className="border-b border-white/5 py-2">
                Mood {c.mood} · Focus {c.focus} · Sleep {c.sleep_hours}h
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </PlanetShell>
  );
}

export function ObservatoryPage() {
  const { store, update, planetName, saving } = useGalaxy();
  const [form, setForm] = useState({
    marker: "",
    value: "",
    unit: "",
    ref_low: "",
    ref_high: "",
    panel: "General",
  });

  const log = async () => {
    const value = Number(form.value);
    if (!form.marker.trim() || Number.isNaN(value)) return;
    const row = {
      id: uid(),
      marker: form.marker.trim(),
      value,
      unit: form.unit.trim(),
      ref_low: form.ref_low ? Number(form.ref_low) : null,
      ref_high: form.ref_high ? Number(form.ref_high) : null,
      panel: form.panel.trim() || "General",
      collected_on: todayKey(),
      created_at: Date.now(),
    };
    await update((draft) => {
      draft.markers.unshift(row);
      draft.signals.unshift({
        id: uid(),
        from: "observatory",
        to: "lumen",
        kind: "observatory.marker.logged",
        payload: { marker: row.marker },
        payload_ref: `markers:${row.id}`,
        seen: false,
        delivered_at: null,
        created_at: Date.now(),
      });
      return draft;
    });
    setForm({ marker: "", value: "", unit: "", ref_low: "", ref_high: "", panel: "General" });
  };

  return (
    <PlanetShell id="observatory" title={planetName("observatory")} tagline="Assays stored in your Drive.">
      <GlassPanel title="Log marker" accent="#A98BFF" index={0}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Marker" value={form.marker} onChange={(marker) => setForm((f) => ({ ...f, marker }))} />
          <Field label="Value" value={form.value} onChange={(value) => setForm((f) => ({ ...f, value }))} />
          <Field label="Unit" value={form.unit} onChange={(unit) => setForm((f) => ({ ...f, unit }))} />
          <Field label="Panel" value={form.panel} onChange={(panel) => setForm((f) => ({ ...f, panel }))} />
        </div>
        <div className="mt-4">
          <ShimmerButton tone="#A98BFF" disabled={saving} onClick={log}>
            {saving ? "Saving…" : "File assay"}
          </ShimmerButton>
        </div>
      </GlassPanel>
      <GlassPanel title="Assays" meta={`${store.markers.length}`} accent="#A98BFF" index={1}>
        {store.markers.length === 0 ? (
          <p className="text-sm text-white/45">No markers yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/80">
            {store.markers.slice(0, 20).map((m) => (
              <li key={m.id} className="flex justify-between border-b border-white/5 py-2">
                <span>{m.marker}</span>
                <span className="text-white/45">
                  {m.value}
                  {m.unit ? ` ${m.unit}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </PlanetShell>
  );
}

function PlanetShell({
  id,
  title,
  tagline,
  children,
}: {
  id: PlanetId;
  title: string;
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/bridge" className="text-xs uppercase tracking-[0.25em] text-cyan-300/70 hover:text-cyan-200">
        ← Bridge
      </Link>
      <h1 className="mt-3 text-3xl font-black text-white">{title}</h1>
      <p className="mt-1 text-sm text-white/50">{tagline}</p>
      <div className="mt-6 flex flex-col gap-4">{children}</div>
      <p className="mt-8 text-[10px] uppercase tracking-widest text-white/25">planet id: {id}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  );
}
