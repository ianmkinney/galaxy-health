"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Area, Field } from "@/components/ui/fields";
import { AddSystemPanel } from "@/components/planets/add-system-panel";
import { useGalaxy } from "@/components/galaxy-provider";
import {
  planetView,
  uid,
  type PlanetId,
  type TrackingEntry,
  type TrackingField,
  type TrackingSystem,
} from "@/lib/galaxy-types";
import { todayKey } from "@/lib/utils";
import {
  applyReviseSystem,
  coerceSystemDraft,
  draftFromSystem,
} from "@/lib/world-forge";

function emptyValues(fields: TrackingField[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.id, f.kind === "boolean" ? "false" : ""]));
}

function parseValue(field: TrackingField, raw: string): string | number | boolean {
  if (field.kind === "boolean") return raw === "true" || raw === "on" || raw === "1";
  if (field.kind === "number" || field.kind === "scale" || field.kind === "duration") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return raw;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TrackingField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <label className="flex items-center gap-2 text-xs text-white/60">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        />
        {field.label}
      </label>
    );
  }
  if (field.kind === "scale") {
    const min = field.min ?? 1;
    const max = field.max ?? 5;
    return (
      <label className="block text-xs text-white/50">
        {field.label} ({value || min}–{max})
        <input
          type="range"
          min={min}
          max={max}
          value={value || String(min)}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full"
        />
      </label>
    );
  }
  return (
    <Field
      label={field.unit ? `${field.label} (${field.unit})` : field.label}
      value={value}
      onChange={onChange}
      type={field.kind === "text" ? "text" : "number"}
    />
  );
}

function fieldSummary(field: TrackingField) {
  const how =
    field.kind === "scale"
      ? `${field.min ?? 1}–${field.max ?? 5}`
      : field.unit
        ? `${field.kind} ${field.unit}`
        : field.kind;
  return `${field.label} (${how})`;
}

function SystemCard({ system, planetId }: { system: TrackingSystem; planetId: PlanetId }) {
  const { store, update, saving } = useGalaxy();
  const view = planetView(store, planetId);
  const logs = (store.entries ?? []).filter((e) => e.system_id === system.id);
  const [values, setValues] = useState(() => emptyValues(system.fields));
  const [notes, setNotes] = useState("");
  const [reviseBrief, setReviseBrief] = useState("");
  const [revising, setRevising] = useState(false);
  const [reviseNotice, setReviseNotice] = useState("");
  const [reviseError, setReviseError] = useState("");

  const fieldKey = system.fields.map((f) => `${f.id}:${f.kind}:${f.label}`).join("|");
  useEffect(() => {
    setValues(emptyValues(system.fields));
    // Reset log inputs only when the schema changes, not on every store save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey]);

  const log = async () => {
    const entry: TrackingEntry = {
      id: uid(),
      system_id: system.id,
      planet_id: planetId,
      values: Object.fromEntries(
        system.fields.map((f) => [f.id, parseValue(f, values[f.id] ?? "")])
      ),
      notes: notes.trim() || undefined,
      logged_on: todayKey(),
      created_at: Date.now(),
      source: "user",
    };
    await update((d) => {
      d.entries = [entry, ...(d.entries ?? [])];
      return d;
    });
    setValues(emptyValues(system.fields));
    setNotes("");
  };

  const revise = async () => {
    const instruction = reviseBrief.trim();
    if (!instruction) return;
    setRevising(true);
    setReviseError("");
    setReviseNotice("");
    const current = draftFromSystem(system);
    let draft = current;
    let via: "ai" | "local" = "local";
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forge.revise",
          message: instruction,
          extra: {
            planetId,
            planetName: view.name,
            domain: view.domain,
            system: current,
          },
        }),
      });
      const data = await res.json();
      if (data.forge) {
        draft = coerceSystemDraft(data.forge, instruction);
        via = data.via === "ai" ? "ai" : "local";
      }
      if (data.error && !data.forge) {
        throw new Error(data.error);
      }
    } catch (error) {
      setReviseError(error instanceof Error ? error.message : "Could not revise this system.");
      setRevising(false);
      return;
    }
    try {
      await update((d) => applyReviseSystem(d, system.id, draft).store);
      setReviseBrief("");
      setReviseNotice(
        via === "ai"
          ? "System updated. What you log and how you log it now match this revision."
          : "System updated locally. Add an API key in Settings for a richer AI revision."
      );
    } catch (error) {
      setReviseError(error instanceof Error ? error.message : "Could not save this revision.");
    } finally {
      setRevising(false);
    }
  };

  return (
    <GlassPanel
      title={system.name}
      meta={system.building_name}
      accent={view.accent}
      index={1}
    >
      <p className="text-sm text-white/50">{system.description}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Tracks · {system.fields.map(fieldSummary).join(" · ") || "no fields"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {system.fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id] ?? ""}
            onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
          />
        ))}
      </div>
      <div className="mt-3">
        <Field label="Notes" value={notes} onChange={setNotes} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ShimmerButton tone={view.accent} disabled={saving} onClick={log}>
          Log entry
        </ShimmerButton>
        <ShimmerButton
          tone={view.accent}
          variant="ghost"
          disabled={saving}
          onClick={() =>
            update((d) => ({
              ...d,
              systems: d.systems.filter((s) => s.id !== system.id),
              entries: d.entries.filter((e) => e.system_id !== system.id),
            }))
          }
        >
          Remove system
        </ShimmerButton>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Revise with AI
        </p>
        <p className="mt-1 text-sm text-white/50">
          Change what this building tracks or how each field is logged. The revision is saved to
          this system — past entries keep matching field ids.
        </p>
        <div className="mt-3">
          <Area
            label="How should this system change?"
            value={reviseBrief}
            onChange={setReviseBrief}
            rows={3}
          />
        </div>
        <div className="mt-3">
          <ShimmerButton
            tone={view.accent}
            variant="ghost"
            disabled={revising || saving || !reviseBrief.trim()}
            onClick={revise}
          >
            {revising ? "Revising…" : "Save revision"}
          </ShimmerButton>
        </div>
        {reviseNotice ? <p className="mt-3 text-sm text-white/70">{reviseNotice}</p> : null}
        {reviseError ? <p className="mt-3 text-sm text-rose-300">{reviseError}</p> : null}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {logs.slice(0, 8).map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
            <div>
              <div className="text-white/80">{row.logged_on}</div>
              <div className="text-[11px] text-white/45">
                {system.fields
                  .map((f) => `${f.label} ${String(row.values[f.id] ?? "—")}`)
                  .join(" · ")}
                {row.notes ? ` · ${row.notes}` : ""}
              </div>
            </div>
            <button
              type="button"
              className="text-[10px] uppercase tracking-wider text-white/30 hover:text-rose-300"
              onClick={() =>
                update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== row.id) }))
              }
            >
              Remove
            </button>
          </li>
        ))}
        {logs.length === 0 ? <li className="text-white/40">No logs yet — this building stays simple until you file one.</li> : null}
      </ul>
    </GlassPanel>
  );
}

export function SystemsLedger({ planetId }: { planetId: PlanetId }) {
  const { store } = useGalaxy();
  const view = planetView(store, planetId);
  const systems = useMemo(
    () => (store.systems ?? []).filter((s) => s.planet_id === planetId),
    [store.systems, planetId]
  );

  return (
    <div className="grid gap-4">
      <AddSystemPanel planetId={planetId} />
      {systems.length === 0 ? (
        <GlassPanel title="Systems" accent={view.accent} index={1}>
          <p className="text-sm text-white/45">
            No custom systems on {view.name} yet. Raise one and a voxel building appears in orbit and
            on the surface.
          </p>
        </GlassPanel>
      ) : (
        systems.map((system) => <SystemCard key={system.id} system={system} planetId={planetId} />)
      )}
    </div>
  );
}
