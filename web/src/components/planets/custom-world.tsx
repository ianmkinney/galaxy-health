"use client";

import { useState } from "react";
import Link from "next/link";
import { PlanetHabitat } from "@/components/planets/planet-habitat";
import { ColonyPanel } from "@/components/planets/colony-panel";
import { SystemsLedger } from "@/components/planets/systems-ledger";
import { PlanetCharts } from "@/components/charts/planet-charts";
import { useGalaxy } from "@/components/galaxy-provider";
import { planetView, type PlanetId } from "@/lib/galaxy-types";
import { planetColony } from "@/lib/civilization";

const TABS = [
  { id: "colony", label: "Colony" },
  { id: "systems", label: "Systems" },
  { id: "charts", label: "Charts" },
];

export function CustomWorld({ id }: { id: PlanetId }) {
  const { store, planetName, loading } = useGalaxy();
  const [tab, setTab] = useState("colony");
  const view = planetView(store, id);
  const colony = planetColony(store, id);
  const exists =
    store.worlds.some((w) => w.id === id) || store.planets.some((p) => p.id === id);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03050B] text-sm uppercase tracking-[0.25em] text-cyan-200/60">
        Syncing canopy from Google Drive…
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-white/40">Unknown world</p>
        <h1 className="mt-3 text-3xl font-black text-white">{id}</h1>
        <p className="mt-2 text-sm text-white/50">This planet is not in your Drive store.</p>
        <Link href="/bridge" className="mt-6 inline-block text-sm text-cyan-300">
          ← Bridge
        </Link>
      </div>
    );
  }

  return (
    <PlanetHabitat
      id={id}
      title={planetName(id) || view.name}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
    >
      {tab === "colony" ? <ColonyPanel colony={colony} /> : null}
      {tab === "systems" ? <SystemsLedger planetId={id} /> : null}
      {tab === "charts" ? <PlanetCharts store={store} planet={id} /> : null}
    </PlanetHabitat>
  );
}
