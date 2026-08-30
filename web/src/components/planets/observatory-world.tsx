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
import { uid, type Signal } from "@/lib/galaxy-types";
import { planetColony } from "@/lib/civilization";
import { markerFlag, markerHistory, observatoryStats } from "@/lib/planet-ops";
import { todayKey } from "@/lib/utils";

const TABS = [
  { id: "colony", label: "Colony" },
  { id: "charts", label: "Charts" },
  { id: "assays", label: "Assays" },
  { id: "interpret", label: "AI interpret" },
];

export function ObservatoryWorld() {
  const { store, update, planetName, saving } = useGalaxy();
  const [tab, setTab] = useState("colony");
  const [query, setQuery] = useState("");
  const [panelFilter, setPanelFilter] = useState("all");
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({
    marker: "",
    value: "",
    unit: "",
    ref_low: "",
    ref_high: "",
    panel: "General",
    notes: "",
  });
  const stats = observatoryStats(store);
  const colony = planetColony(store, "observatory");
  const panels = useMemo(
    () => ["all", ...new Set(store.markers.map((m) => m.panel || "General"))],
    [store.markers]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.markers.filter((m) => {
      if (panelFilter !== "all" && (m.panel || "General") !== panelFilter) return false;
      if (!q) return true;
      return `${m.marker} ${m.panel} ${m.notes ?? ""}`.toLowerCase().includes(q);
    });
  }, [store.markers, query, panelFilter]);

  const trend = selected ? markerHistory(store, selected) : [];

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
      source: "user" as const,
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
      {tab === "colony" ? <ColonyPanel colony={colony} /> : null}
      {tab === "charts" ? <PlanetCharts store={store} planet="observatory" /> : null}
      {tab === "assays" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel title="Station board" accent="#A98BFF" index={0}>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Assays" value={stats.markers} tone="#D0C0FF" />
              <Metric label="Panels" value={stats.panels} tone="#D0C0FF" />
              <Metric label="Out of range" value={stats.outOfRange} tone="#FF8FA3" />
            </div>
            <p className="mt-3 text-[11px] text-white/40">
              Last filing {stats.lastAt ?? "—"}. Not medical advice — values stay in your Drive.
            </p>
          </GlassPanel>
          <GlassPanel title="File assay" accent="#A98BFF" index={1}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field accent="violet" label="Marker" value={form.marker} onChange={(marker) => setForm((f) => ({ ...f, marker }))} />
              <Field accent="violet" label="Value" value={form.value} onChange={(value) => setForm((f) => ({ ...f, value }))} />
              <Field accent="violet" label="Unit" value={form.unit} onChange={(unit) => setForm((f) => ({ ...f, unit }))} />
              <Field accent="violet" label="Panel" value={form.panel} onChange={(panel) => setForm((f) => ({ ...f, panel }))} />
              <Field accent="violet" label="Ref low" value={form.ref_low} onChange={(ref_low) => setForm((f) => ({ ...f, ref_low }))} />
              <Field accent="violet" label="Ref high" value={form.ref_high} onChange={(ref_high) => setForm((f) => ({ ...f, ref_high }))} />
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
          </GlassPanel>
          <GlassPanel title="Ledger" meta={`${rows.length}`} accent="#A98BFF" index={2} className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markers…"
                className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/40"
              />
              {panels.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPanelFilter(p)}
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                    panelFilter === p
                      ? "border-violet-300/50 bg-violet-300/15 text-violet-100"
                      : "border-white/10 text-white/45"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <ul className="max-h-[420px] space-y-2 overflow-y-auto text-sm">
              {rows.map((m) => {
                const flag = markerFlag(m);
                const out = flag === "low" || flag === "high";
                return (
                  <li
                    key={m.id}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                    style={out ? { borderColor: "rgba(255,77,109,0.45)" } : undefined}
                  >
                    <div className="flex justify-between gap-3">
                      <button
                        type="button"
                        className="font-medium text-white hover:text-violet-200"
                        onClick={() => setSelected(m.marker)}
                      >
                        {m.marker}
                      </button>
                      <span className={out ? "text-rose-300" : "text-violet-200"}>
                        {m.value}
                        {m.unit ? ` ${m.unit}` : ""}
                        {flag === "low" ? " · low" : flag === "high" ? " · high" : ""}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-white/40">
                      <span>
                        {m.panel} · {m.collected_on}
                        {m.ref_low != null || m.ref_high != null
                          ? ` · ref ${m.ref_low ?? "—"}–${m.ref_high ?? "—"}`
                          : ""}
                      </span>
                      <button
                        type="button"
                        className="uppercase tracking-wider hover:text-rose-300"
                        onClick={() =>
                          update((d) => ({ ...d, markers: d.markers.filter((x) => x.id !== m.id) }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
              {rows.length === 0 ? <li className="text-white/40">No assays filed.</li> : null}
            </ul>
            {trend.length > 1 ? (
              <div className="mt-4 text-xs text-white/50">
                Trend for {selected}: {trend.map((t) => t.value).join(" → ")}
              </div>
            ) : null}
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
