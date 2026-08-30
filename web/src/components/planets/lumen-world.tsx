"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { PlanetHabitat } from "@/components/planets/planet-habitat";
import { PlanetCharts } from "@/components/charts/planet-charts";
import { ColonyPanel } from "@/components/planets/colony-panel";
import { AiDock } from "@/components/ai-dock";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Field, Metric } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Ritual, type Signal } from "@/lib/galaxy-types";
import { planetColony } from "@/lib/civilization";
import { lumenStats, relativeDay } from "@/lib/planet-ops";
import { round, todayKey } from "@/lib/utils";

const TABS = [
  { id: "colony", label: "Colony" },
  { id: "charts", label: "Charts" },
  { id: "checkin", label: "Check-in" },
  { id: "rituals", label: "Rituals" },
  { id: "coach", label: "Recovery AI" },
];

const KINDS: Ritual["kind"][] = ["breath", "stretch", "journal", "walk", "other"];

export function LumenWorld() {
  const { store, update, planetName, totals, saving } = useGalaxy();
  const [tab, setTab] = useState("colony");
  const [form, setForm] = useState({ mood: "3", focus: "3", sleep: "7", note: "" });
  const [ritual, setRitual] = useState({ name: "", kind: "breath" as Ritual["kind"], minutes: "10" });
  const day = todayKey();
  const rows = store.checkins.filter((c) => c.logged_on === day);
  const stats = lumenStats(store);
  const colony = planetColony(store, "lumen");

  const log = async () => {
    const checkin = {
      id: uid(),
      mood: Number(form.mood) || 3,
      focus: Number(form.focus) || 3,
      sleep_hours: Number(form.sleep) || 0,
      note: form.note.trim(),
      logged_on: day,
      created_at: Date.now(),
      source: "user" as const,
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
    <PlanetHabitat id="lumen" title={planetName("lumen")} tabs={TABS} activeTab={tab} onTab={setTab}>
      {tab === "colony" ? <ColonyPanel colony={colony} /> : null}
      {tab === "charts" ? <PlanetCharts store={store} planet="lumen" /> : null}
      {tab === "checkin" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Clarity field" accent="#4CE0FF" index={0}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric
                label="Mood"
                value={totals.lumen.entries ? round(totals.lumen.mood, 1) : "—"}
                tone="#9AF0FF"
              />
              <Metric
                label="Focus"
                value={totals.lumen.entries ? round(totals.lumen.focus, 1) : "—"}
                tone="#9AF0FF"
              />
              <Metric
                label="Sleep"
                value={totals.lumen.entries ? `${round(totals.lumen.sleep, 1)}h` : "—"}
                tone="#9AF0FF"
              />
              <Metric label="Streak" value={`${stats.streak}d`} tone="#9AF0FF" />
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
              7d mood {stats.last7 ? stats.avgMood.toFixed(1) : "—"} · sleep{" "}
              {stats.last7 ? stats.avgSleep.toFixed(1) : "—"}h
            </p>
          </GlassPanel>
          <GlassPanel title="Log check-in" accent="#4CE0FF" index={1}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Mood 1–5" value={form.mood} onChange={(mood) => setForm((f) => ({ ...f, mood }))} />
              <Field label="Focus 1–5" value={form.focus} onChange={(focus) => setForm((f) => ({ ...f, focus }))} />
              <Field label="Sleep hours" value={form.sleep} onChange={(sleep) => setForm((f) => ({ ...f, sleep }))} />
            </div>
            <label className="mt-3 block text-xs text-white/50">
              Note / journal
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
          <GlassPanel title="History" accent="#4CE0FF" index={3} className="lg:col-span-2">
            <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
              {store.checkins.slice(0, 24).map((c) => (
                <li key={c.id} className="flex justify-between border-b border-white/5 py-1.5 text-white/75">
                  <span>
                    {c.mood}/{c.focus}/{c.sleep_hours}h
                    {c.note ? ` · ${c.note}` : ""}
                  </span>
                  <span className="flex gap-3 text-white/35">
                    {relativeDay(c.logged_on)}
                    <button
                      type="button"
                      className="uppercase tracking-wider hover:text-rose-300"
                      onClick={() =>
                        update((d) => ({ ...d, checkins: d.checkins.filter((x) => x.id !== c.id) }))
                      }
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      ) : null}

      {tab === "rituals" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="New ritual" accent="#4CE0FF" index={0}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={ritual.name} onChange={(name) => setRitual((f) => ({ ...f, name }))} />
              <Field
                label="Minutes"
                value={ritual.minutes}
                onChange={(minutes) => setRitual((f) => ({ ...f, minutes }))}
              />
              <label className="block text-xs text-white/50 sm:col-span-2">
                Kind
                <select
                  value={ritual.kind}
                  onChange={(e) => setRitual((f) => ({ ...f, kind: e.target.value as Ritual["kind"] }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4">
              <ShimmerButton
                tone="#4CE0FF"
                disabled={saving}
                onClick={async () => {
                  if (!ritual.name.trim()) return;
                  await update((d) => {
                    d.rituals.unshift({
                      id: uid(),
                      name: ritual.name.trim(),
                      kind: ritual.kind,
                      minutes: Number(ritual.minutes) || 10,
                      logged_on: day,
                      created_at: Date.now(),
                      source: "user",
                    });
                    return d;
                  });
                  setRitual({ name: "", kind: "breath", minutes: "10" });
                }}
              >
                Log ritual
              </ShimmerButton>
            </div>
            <p className="mt-3 text-[11px] text-white/40">
              Rituals are systems on Lumen — they raise buildings and keep people in the gardens.
            </p>
          </GlassPanel>
          <GlassPanel title="Practices" meta={`${store.rituals.length}`} accent="#4CE0FF" index={1}>
            <ul className="space-y-2 text-sm">
              {store.rituals.map((r) => (
                <li key={r.id} className="flex justify-between rounded-xl border border-white/10 px-3 py-2">
                  <span className="text-white">
                    {r.name} <span className="text-white/40">· {r.kind} · {r.minutes}m</span>
                  </span>
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-wider text-white/30 hover:text-rose-300"
                    onClick={() => update((d) => ({ ...d, rituals: d.rituals.filter((x) => x.id !== r.id) }))}
                  >
                    Remove
                  </button>
                </li>
              ))}
              {store.rituals.length === 0 ? <li className="text-white/40">No rituals stored.</li> : null}
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
