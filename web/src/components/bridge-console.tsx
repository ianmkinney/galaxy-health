"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/auth-buttons";
import { SolarCanvas } from "@/components/solar-canvas";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useGalaxy } from "@/components/galaxy-provider";
import { PLANET_META, type PlanetId } from "@/lib/galaxy-types";
import { round } from "@/lib/utils";

export function BridgeConsole({ userName }: { userName?: string | null }) {
  const { store, loading, error, totals, inFlight, planetName, saving } =
    useGalaxy();

  const net = round(totals.galley.calories - totals.atlas.burn);
  const enabled = store.planets.filter((p) => p.enabled);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm uppercase tracking-[0.25em] text-cyan-200/60">
        Syncing from Google Drive…
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">
              The Bridge
            </p>
            <h1 className="mt-1 text-3xl font-black text-white">Galaxy Health</h1>
            <p className="mt-1 text-sm text-white/50">
              {userName ? `Signed in as ${userName}` : "Signed in with Google"}
              {saving ? " · saving…" : ""}
            </p>
          </div>
          <SignOutButton />
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <SolarCanvas planets={store.planets} inFlightCount={inFlight.length} />
      </div>

      <div className="flex flex-col gap-4">
        <GlassPanel title="Vitals — today" accent="#4CE0FF" index={0}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Fuel in" value={round(totals.galley.calories)} unit="kcal" tone="#FF8A3D" />
            <Stat label="Burned" value={round(totals.atlas.burn)} unit="kcal" tone="#FF4D6D" />
            <Stat
              label="Net"
              value={net > 0 ? `+${net}` : `${net}`}
              unit="kcal"
              tone={net > 0 ? "#F5C542" : "#3DDC97"}
            />
            <Stat
              label="Clarity"
              value={totals.lumen.entries ? round(totals.lumen.focus, 1) : "—"}
              unit={totals.lumen.entries ? "/5" : undefined}
              tone="#4CE0FF"
            />
          </div>
        </GlassPanel>

        <GlassPanel title="Nav dock" accent="#A98BFF" index={1}>
          <div className="grid grid-cols-2 gap-3">
            {enabled.map((planet) => {
              const meta = PLANET_META[planet.id as PlanetId];
              return (
                <Link
                  key={planet.id}
                  href={meta.route}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/25 hover:bg-white/[0.06]"
                  style={{ borderColor: `${meta.accent}55` }}
                >
                  <span
                    className="mb-2 inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: meta.accent }}
                  />
                  <div className="font-semibold text-white">{planetName(planet.id)}</div>
                  <div className="text-[11px] text-white/45">{meta.domain}</div>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ShimmerButton href="/settings" tone="#A98BFF" variant="ghost">
              Settings
            </ShimmerButton>
            <ShimmerButton href="/signals" tone="#4CE0FF" variant="ghost">
              Signal log
            </ShimmerButton>
          </div>
        </GlassPanel>

        {inFlight.length > 0 ? (
          <GlassPanel
            title="In transit"
            meta={`${inFlight.length} queued`}
            accent="#FF4D6D"
            index={2}
          >
            <ul className="space-y-2 text-sm text-white/70">
              {inFlight.slice(0, 5).map((signal) => (
                <li key={signal.id}>
                  {planetName(signal.from)} → {planetName(signal.to)} · {signal.kind}
                </li>
              ))}
            </ul>
          </GlassPanel>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: tone }}>
        {value}
        {unit ? <span className="ml-1 text-xs font-medium text-white/40">{unit}</span> : null}
      </div>
    </div>
  );
}
