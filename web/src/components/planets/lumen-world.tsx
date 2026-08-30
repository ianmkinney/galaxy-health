"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { PlanetHabitat } from "@/components/planets/planet-habitat";
import { PlanetCharts } from "@/components/charts/planet-charts";
import { AiDock } from "@/components/ai-dock";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Signal } from "@/lib/galaxy-types";
import { round, todayKey } from "@/lib/utils";

const TABS = [
  { id: "charts", label: "Charts" },
  { id: "checkin", label: "Check-in" },
  { id: "coach", label: "Recovery AI" },
];

export function LumenWorld() {
  const { store, update, planetName, totals, saving } = useGalaxy();
  const [tab, setTab] = useState("charts");
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
    const readiness =
      (checkin.mood + checkin.focus + Math.min(checkin.sleep_hours, 8) / 1.6) / 3;
    const signal: Signal = {
      id: uid(),
      from: "lumen",
      to: "atlas",
      kind: "lumen.readiness.logged",
      payload: { readiness, sleepHours: checkin.sleep_hours },
      payload_ref: `checkins:${checkin.id}`,
      seen: false,
      delivered_at: null,
      created_at: Date.now(),
    };
    await update((d) => {
      d.checkins.unshift(checkin);
      d.signals.unshift(signal);
      return d;
    });
  };

  return (
    <PlanetHabitat
      id="lumen"
      title={planetName("lumen")}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
    >
      {tab === "charts" ? <PlanetCharts store={store} planet="lumen" /> : null}
      {tab === "checkin" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Clarity field" accent="#4CE0FF" index={0}>
            <div className="grid grid-cols-3 gap-3">
              <Metric
                label="Mood"
                value={totals.lumen.entries ? round(totals.lumen.mood, 1) : "—"}
              />
              <Metric
                label="Focus"
                value={totals.lumen.entries ? round(totals.lumen.focus, 1) : "—"}
              />
              <Metric
                label="Sleep"
                value={totals.lumen.entries ? `${round(totals.lumen.sleep, 1)}h` : "—"}
              />
            </div>
            <div className="mt-6 flex justify-center gap-3">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-16 w-16 rounded-full border border-cyan-300/30 bg-cyan-400/10"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.9, 0.45] }}
                  transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.35 }}
                />
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.25em] text-cyan-100/40">
              Breath cadence
            </p>
          </GlassPanel>
          <GlassPanel title="Log check-in" accent="#4CE0FF" index={1}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Mood 1–5" value={form.mood} onChange={(mood) => setForm((f) => ({ ...f, mood }))} />
              <Field label="Focus 1–5" value={form.focus} onChange={(focus) => setForm((f) => ({ ...f, focus }))} />
              <Field label="Sleep hours" value={form.sleep} onChange={(sleep) => setForm((f) => ({ ...f, sleep }))} />
            </div>
            <label className="mt-3 block text-xs text-white/50">
              Note
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="mt-4">
              <ShimmerButton tone="#4CE0FF" disabled={saving} onClick={log}>
                Transmit readiness to Atlas
              </ShimmerButton>
            </div>
          </GlassPanel>
          <GlassPanel title="Today" meta={`${rows.length}`} accent="#4CE0FF" index={2} className="lg:col-span-2">
            <ul className="space-y-2 text-sm text-white/80">
              {rows.map((c) => (
                <li key={c.id} className="border-b border-white/5 py-2">
                  Mood {c.mood} · Focus {c.focus} · Sleep {c.sleep_hours}h
                  {c.note ? <span className="text-white/40"> — {c.note}</span> : null}
                </li>
              ))}
              {rows.length === 0 ? <li className="text-white/40">No check-ins yet.</li> : null}
            </ul>
          </GlassPanel>
        </div>
      ) : null}

      {tab === "coach" ? (
        <AiDock
          accent="#4CE0FF"
          title="Recovery coach"
          placeholder="Wired / flat / can't sleep / post heavy legs…"
          action="lumen.coach"
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
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-semibold text-[#9AF0FF]">{value}</div>
    </div>
  );
}
