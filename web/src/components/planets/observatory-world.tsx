"use client";

import { useState } from "react";
import { PlanetHabitat } from "@/components/planets/planet-habitat";
import { AiDock } from "@/components/ai-dock";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { uid, type Signal } from "@/lib/galaxy-types";
import { todayKey } from "@/lib/utils";

const TABS = [
  { id: "assays", label: "Assays" },
  { id: "interpret", label: "AI interpret" },
];

export function ObservatoryWorld() {
  const { store, update, planetName, saving } = useGalaxy();
  const [tab, setTab] = useState("assays");
  const [form, setForm] = useState({
    marker: "",
    value: "",
    unit: "",
    ref_low: "",
    ref_high: "",
    panel: "General",
    notes: "",
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
      notes: form.notes.trim(),
      collected_on: todayKey(),
      created_at: Date.now(),
    };
    const signal: Signal = {
      id: uid(),
      from: "observatory",
      to: "lumen",
      kind: "observatory.marker.logged",
      payload: { marker: row.marker },
      payload_ref: `markers:${row.id}`,
      seen: false,
      delivered_at: null,
      created_at: Date.now(),
    };
    await update((d) => {
      d.markers.unshift(row);
      d.signals.unshift(signal);
      return d;
    });
    setForm({
      marker: "",
      value: "",
      unit: "",
      ref_low: "",
      ref_high: "",
      panel: "General",
      notes: "",
    });
  };

  return (
    <PlanetHabitat
      id="observatory"
      title={planetName("observatory")}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
    >
      {tab === "assays" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="File assay" accent="#A98BFF" index={0}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Marker" value={form.marker} onChange={(marker) => setForm((f) => ({ ...f, marker }))} />
              <Field label="Value" value={form.value} onChange={(value) => setForm((f) => ({ ...f, value }))} />
              <Field label="Unit" value={form.unit} onChange={(unit) => setForm((f) => ({ ...f, unit }))} />
              <Field label="Panel" value={form.panel} onChange={(panel) => setForm((f) => ({ ...f, panel }))} />
              <Field label="Ref low" value={form.ref_low} onChange={(ref_low) => setForm((f) => ({ ...f, ref_low }))} />
              <Field label="Ref high" value={form.ref_high} onChange={(ref_high) => setForm((f) => ({ ...f, ref_high }))} />
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
              <ShimmerButton tone="#A98BFF" disabled={saving} onClick={log}>
                File & ping Lumen
              </ShimmerButton>
            </div>
            <p className="mt-3 text-xs text-white/35">
              Not medical advice. Values stay in your Google Drive app data.
            </p>
          </GlassPanel>
          <GlassPanel title="Ledger" meta={`${store.markers.length}`} accent="#A98BFF" index={1}>
            <ul className="max-h-[520px] space-y-2 overflow-y-auto text-sm">
              {store.markers.map((m) => {
                const low = m.ref_low;
                const high = m.ref_high;
                const out =
                  (low != null && m.value < low) || (high != null && m.value > high);
                return (
                  <li
                    key={m.id}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                    style={out ? { borderColor: "rgba(255,77,109,0.45)" } : undefined}
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-white">{m.marker}</span>
                      <span className={out ? "text-rose-300" : "text-violet-200"}>
                        {m.value}
                        {m.unit ? ` ${m.unit}` : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/40">
                      {m.panel} · {m.collected_on}
                      {low != null || high != null
                        ? ` · ref ${low ?? "—"}–${high ?? "—"}`
                        : ""}
                      {out ? " · out of range" : ""}
                    </div>
                  </li>
                );
              })}
              {store.markers.length === 0 ? (
                <li className="text-white/40">No assays filed.</li>
              ) : null}
            </ul>
          </GlassPanel>
        </div>
      ) : null}

      {tab === "interpret" ? (
        <AiDock
          accent="#A98BFF"
          title="Panel interpreter"
          placeholder="Paste panel text or ask about a marker trend. Always confirm with a clinician."
          action="observatory.interpret"
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
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/40"
      />
    </label>
  );
}
