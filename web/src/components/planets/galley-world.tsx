"use client";

import { useState } from "react";
import { PlanetHabitat } from "@/components/planets/planet-habitat";
import { PlanetCharts } from "@/components/charts/planet-charts";
import { ColonyPanel } from "@/components/planets/colony-panel";
import { GalleyFuelLog } from "@/components/planets/galley/fuel-log";
import { GalleyRecipeBook } from "@/components/planets/galley/recipe-book";
import { GalleyPantry } from "@/components/planets/galley/pantry-hold";
import { GalleyGrocery } from "@/components/planets/galley/grocery-hold";
import { GalleyMealPlan } from "@/components/planets/galley/meal-plan";
import { GalleyChef } from "@/components/planets/galley/chef";
import { useGalaxy } from "@/components/galaxy-provider";
import { planetColony } from "@/lib/civilization";
import { SystemsLedger } from "@/components/planets/systems-ledger";

const TABS = [
  { id: "colony", label: "Colony" },
  { id: "systems", label: "Systems" },
  { id: "charts", label: "Charts" },
  { id: "fuel", label: "Fuel log" },
  { id: "recipes", label: "Recipe book" },
  { id: "pantry", label: "Pantry" },
  { id: "grocery", label: "Grocery" },
  { id: "plan", label: "Meal plan" },
  { id: "chef", label: "AI Chef" },
];

export function GalleyWorld() {
  const { store, planetName } = useGalaxy();
  const [tab, setTab] = useState("colony");
  const colony = planetColony(store, "galley");

  return (
    <PlanetHabitat
      id="galley"
      title={planetName("galley")}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
    >
      {tab === "colony" ? <ColonyPanel colony={colony} /> : null}
      {tab === "systems" ? <SystemsLedger planetId="galley" /> : null}
      {tab === "charts" ? <PlanetCharts store={store} planet="galley" /> : null}
      {tab === "fuel" ? <GalleyFuelLog /> : null}
      {tab === "recipes" ? <GalleyRecipeBook /> : null}
      {tab === "pantry" ? <GalleyPantry /> : null}
      {tab === "grocery" ? <GalleyGrocery /> : null}
      {tab === "plan" ? <GalleyMealPlan key="meal-plan-cells" /> : null}
      {tab === "chef" ? <GalleyChef /> : null}
    </PlanetHabitat>
  );
}
