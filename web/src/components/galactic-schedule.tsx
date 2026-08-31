"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Area, Field } from "@/components/ui/fields";
import { useGalaxy } from "@/components/galaxy-provider";
import { planetView, type GalacticEventTone, type PlanetId } from "@/lib/galaxy-types";
import {
  CRAFT_META,
  TONE_META,
  applyEvent,
  coerceEventDraft,
  defaultDueAt,
  eventsForPlanet,
  formatDue,
  fromDatetimeLocal,
  heuristicEvent,
  openEvents,
  packEvent,
  toDatetimeLocal,
  type EventForgeDraft,
} from "@/lib/galactic-events";
import { cn } from "@/lib/utils";

const TONES: { value: GalacticEventTone | ""; label: string }[] = [
  { value: "", label: "Let AI choose" },
  { value: "deadline", label: "Deadline" },
  { value: "fun", label: "Fun" },
  { value: "exciting", label: "Exciting" },
];

export function GalacticSchedule({
  planetId,
  compact = false,
  index = 4,
}: {
  planetId?: PlanetId;
  compact?: boolean;
  index?: number;
}) {
  const { store, update, saving, planetName } = useGalaxy();
  const all = openEvents(store);
  const rows = planetId ? eventsForPlanet(store, planetId) : all;
  const enabled = store.planets.filter((p) => p.enabled);
  const [brief, setBrief] = useState("");
  const [due, setDue] = useState(() => toDatetimeLocal(defaultDueAt()));
  const [tone, setTone] = useState<GalacticEventTone | "">("");
  const [world, setWorld] = useState<string>(planetId ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [openForm, setOpenForm] = useState(!compact);

  const known = useMemo(() => enabled.map((p) => p.id), [enabled]);

  const hail = async () => {
    const description = brief.trim();
    if (!description) return;
    setBusy(true);
    setError("");
    setNotice("");
    const dueAt = fromDatetimeLocal(due);
    const hintPlanet = (world || planetId || null) as PlanetId | null;
    let draft: EventForgeDraft = heuristicEvent(description, {
      tone,
      planetId: hintPlanet,
      knownPlanets: known,
    });
    let via: "ai" | "local" = "local";
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forge.event",
          message: description,
          extra: { tone, planetId: hintPlanet, dueAt },
        }),
      });
      const data = await res.json();
      if (data.forge) {
        draft = coerceEventDraft(data.forge, description, {
          tone,
          planetId: hintPlanet,
          knownPlanets: known,
        });
        via = data.via === "ai" ? "ai" : "local";
      }
    } catch {
      via = "local";
    }
    try {
      const event = packEvent(draft, dueAt);
      await update((s) => applyEvent(s, event));
      setBrief("");
      setNotice(
        via === "ai"
          ? `${CRAFT_META[event.craft].label} parked in the galaxy: ${event.title}.`
          : `Local contact forged — add an API key in Settings for a richer briefing. ${event.title} is on the map.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not park this contact.");
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (id: string, status: "done" | "upcoming") => {
    await update((s) => ({
      ...s,
      events: (s.events ?? []).map((event) => (event.id === id ? { ...event, status } : event)),
    }));
  };

  const shown = compact ? rows.slice(0, 3) : rows;
  const accent = planetId ? planetView(store, planetId).accent : "#F5C542";
  const title = compact ? "World traffic" : "Galactic Schedule";
  const meta = compact
    ? `${rows.length} tagged here · ${all.length} system-wide`
    : `${all.length} contact${all.length === 1 ? "" : "s"}`;

  return (
    <GlassPanel title={title} meta={meta} accent={accent} index={index}>
      {shown.length === 0 ? (
        <p className="text-sm text-white/45">
          {compact
            ? "No contacts tagged to this world. Hail one below — it also lands on the Bridge schedule."
            : "No contacts on the map. Describe a deadline, a fun night, or something exciting — AI parks a warship, envoy, leviathan, or lost astronaut in the galaxy."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((event) => {
            const craft = CRAFT_META[event.craft];
            const worldName = event.planet_id ? planetName(event.planet_id) : "Deep space";
            return (
              <li
                key={event.id}
                className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                        style={{ color: craft.ink }}
                      >
                        {craft.label}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-widest"
                        style={{ color: TONE_META[event.tone].color }}
                      >
                        {TONE_META[event.tone].label}
                      </span>
                      {event.status === "missed" ? (
                        <span className="text-[10px] uppercase tracking-widest text-rose-300">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-white">{event.title}</div>
                    <p className="mt-1 text-[11px] text-white/50">{event.briefing}</p>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-white/35">
                      {worldName} · {formatDue(event.due_at)} · {craft.verb}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resolve(event.id, "done")}
                    disabled={saving}
                    className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 hover:border-white/30"
                  >
                    Clear
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {compact && all.length > rows.length ? (
        <p className="mt-3 text-[11px] text-white/40">
          {all.length - rows.length} more on other worlds —{" "}
          <Link href="/bridge" className="text-cyan-200/80 hover:text-cyan-100">
            full Galactic Schedule on the Bridge
          </Link>
        </p>
      ) : null}

      {compact && !openForm ? (
        <div className="mt-4">
          <ShimmerButton tone={accent} variant="ghost" onClick={() => setOpenForm(true)}>
            Hail a contact
          </ShimmerButton>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <Area
            label="What's coming?"
            value={brief}
            onChange={setBrief}
            rows={compact ? 2 : 3}
            accent="cyan"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Due" value={due} onChange={setDue} type="datetime-local" />
            <label className="block text-xs text-white/50">
              World
              <select
                value={world}
                onChange={(e) => setWorld(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
              >
                <option value="">Deep space</option>
                {enabled.map((planet) => (
                  <option key={planet.id} value={planet.id}>
                    {planet.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {TONES.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setTone(option.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider",
                  tone === option.value
                    ? "border-transparent text-slate-950"
                    : "border-white/15 bg-white/5 text-white/70"
                )}
                style={
                  tone === option.value
                    ? { backgroundColor: option.value ? TONE_META[option.value].color : accent }
                    : undefined
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <ShimmerButton tone={accent} disabled={busy || !brief.trim()} onClick={hail}>
            {busy ? "Forging…" : "Forge into the galaxy"}
          </ShimmerButton>
          {notice ? <p className="text-[11px] text-cyan-200/80">{notice}</p> : null}
          {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
        </div>
      )}
    </GlassPanel>
  );
}
