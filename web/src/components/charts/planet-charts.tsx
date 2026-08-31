"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GlassPanel } from "@/components/ui/glass-panel";
import { seriesLastDays, shortDay, type DayPoint } from "@/lib/chart-series";
import type { GalaxyStore, PlanetId } from "@/lib/galaxy-types";
import { planetView } from "@/lib/galaxy-types";

function useSeries(store: GalaxyStore) {
  return seriesLastDays(store, 14).map((d) => ({ ...d, label: shortDay(d.day) }));
}

export function PlanetCharts({
  store,
  planet,
}: {
  store: GalaxyStore;
  planet: PlanetId;
}) {
  const data = useSeries(store);
  const view = planetView(store, planet);
  const accent = view.accent;
  const soft = view.accentSoft;

  if (planet === "galley") {
    return (
      <GlassPanel title="Fuel charts" accent={accent} index={0}>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="galleyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="#ffffff55" tick={{ fontSize: 10 }} />
              <YAxis stroke="#ffffff55" tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{
                  background: "#0b1020",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="calories"
                name="kcal"
                stroke={accent}
                fill="url(#galleyFill)"
                strokeWidth={2}
              />
              <Line type="monotone" dataKey="protein" name="protein g" stroke={soft} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    );
  }

  if (planet === "atlas") {
    return (
      <GlassPanel title="Load charts" accent={accent} index={0}>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="#ffffff55" tick={{ fontSize: 10 }} />
              <YAxis stroke="#ffffff55" tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{
                  background: "#0b1020",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="minutes" name="minutes" fill={accent} radius={[6, 6, 0, 0]} />
              <Bar dataKey="burn" name="kcal burn" fill={soft} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    );
  }

  if (planet === "lumen") {
    return (
      <GlassPanel title="Clarity charts" accent={accent} index={0}>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="#ffffff55" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 8]} stroke="#ffffff55" tick={{ fontSize: 10 }} width={28} />
              <Tooltip
                contentStyle={{
                  background: "#0b1020",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Line type="monotone" dataKey="mood" stroke={accent} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="focus" stroke={soft} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sleep" stroke="#ffffff88" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    );
  }

  if (planet === "observatory") {
    return (
      <GlassPanel title="Assay charts" accent={accent} index={0}>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="#ffffff55" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} stroke="#ffffff55" tick={{ fontSize: 10 }} width={28} />
              <Tooltip
                contentStyle={{
                  background: "#0b1020",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="markers" name="assays" fill={accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <MarkerTrend store={store} accent={accent} />
      </GlassPanel>
    );
  }

  return (
    <GlassPanel title="System logs" accent={accent} index={0}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" stroke="#ffffff55" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} stroke="#ffffff55" tick={{ fontSize: 10 }} width={28} />
            <Tooltip
              contentStyle={{
                background: "#0b1020",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
              }}
            />
            <Bar dataKey="entries" name="logs" fill={accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassPanel>
  );
}

function MarkerTrend({ store, accent }: { store: GalaxyStore; accent: string }) {
  const latest = store.markers.slice(0, 8);
  if (!latest.length) return null;
  const max = Math.max(...latest.map((m) => Math.abs(m.value)), 1);
  return (
    <div className="mt-4 space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-white/40">Recent markers</div>
      {latest.map((m) => (
        <div key={m.id} className="flex items-center gap-3 text-xs text-white/70">
          <span className="w-28 truncate">{m.marker}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (Math.abs(m.value) / max) * 100)}%`,
                backgroundColor: accent,
              }}
            />
          </div>
          <span className="w-16 text-right">
            {m.value}
            {m.unit ? ` ${m.unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export type { DayPoint };
