import type { GalaxyStore, PlanetId } from "./galaxy-types";
import { PLANET_META, totalsForDay } from "./galaxy-types";
import { civilizationScore } from "./chart-series";
import { todayKey } from "./utils";

export type BuildingKind =
  | "archive"
  | "silo"
  | "hall"
  | "forge"
  | "track"
  | "sanctuary"
  | "lab"
  | "market"
  | "kitchen"
  | "spire";

export type ColonyBuilding = {
  id: string;
  kind: BuildingKind;
  name: string;
  why: string;
  scale: number;
};

export type ColonyCitizen = {
  id: string;
  label: string;
  doing: string;
};

export type PlanetColony = {
  id: PlanetId;
  population: number;
  inputs: number;
  files: number;
  systems: number;
  vitality: number;
  buildings: ColonyBuilding[];
  citizens: ColonyCitizen[];
  headline: string;
  stats: { label: string; value: string }[];
};

function hasAi(store: GalaxyStore) {
  return Object.values(store.ai.keys).some(Boolean);
}

function hasAgent(store: GalaxyStore) {
  return Boolean(store.agent.token);
}

export function planetColony(store: GalaxyStore, id: PlanetId): PlanetColony {
  const day = todayKey();
  const totals = totalsForDay(store, day);
  const vitality = civilizationScore(store);
  const buildings: ColonyBuilding[] = [];
  const citizens: ColonyCitizen[] = [];

  if (id === "galley") {
    const inputs = store.meals.length;
    const files = store.recipes.length + store.pantry.length + store.grocery.length + store.mealPlans.length;
    const systems =
      Number(store.recipes.length > 0) +
      Number(store.pantry.length > 0) +
      Number(store.mealPlans.length > 0) +
      Number(hasAi(store));
    if (store.meals.length) {
      buildings.push({
        id: "fuel-depot",
        kind: "kitchen",
        name: "Fuel depot",
        why: `${store.meals.length} meals logged`,
        scale: Math.min(1.6, 0.7 + store.meals.length * 0.04),
      });
    }
    if (store.recipes.length) {
      buildings.push({
        id: "recipe-archive",
        kind: "archive",
        name: "Recipe archive",
        why: `${store.recipes.length} files in the book`,
        scale: Math.min(1.8, 0.8 + store.recipes.length * 0.08),
      });
    }
    if (store.pantry.length) {
      buildings.push({
        id: "pantry-silos",
        kind: "silo",
        name: "Pantry silos",
        why: `${store.pantry.length} stores on hand`,
        scale: Math.min(1.5, 0.7 + store.pantry.length * 0.05),
      });
    }
    if (store.mealPlans.length) {
      buildings.push({
        id: "meal-hall",
        kind: "hall",
        name: "Meal hall",
        why: `${store.mealPlans.length} planned sittings`,
        scale: 1.1,
      });
    }
    if (store.grocery.length) {
      buildings.push({
        id: "market",
        kind: "market",
        name: "Night market",
        why: `${store.grocery.filter((g) => !g.checked).length} open list items`,
        scale: 0.95,
      });
    }
    if (hasAi(store)) {
      buildings.push({
        id: "chef-ai",
        kind: "spire",
        name: "AI Chef spire",
        why: "BYOK kitchen intelligence online",
        scale: 1.25,
      });
    }
    for (const meal of store.meals.slice(0, 6)) {
      citizens.push({
        id: meal.id,
        label: meal.name,
        doing: `Plating ${meal.slot} · ${Math.round(meal.calories)} kcal`,
      });
    }
    const population = Math.round(inputs * 3 + files * 2 + systems * 14);
    return {
      id,
      population,
      inputs,
      files,
      systems,
      vitality,
      buildings,
      citizens,
      headline:
        population > 0
          ? `${population} souls keep the kitchens turning.`
          : "Uninhabited — log a meal, stow a file, or stand up a system.",
      stats: [
        { label: "Today fuel", value: `${Math.round(totals.galley.calories)} kcal` },
        { label: "Protein", value: `${Math.round(totals.galley.protein)} g` },
        { label: "Recipes", value: String(store.recipes.length) },
        { label: "Pantry", value: String(store.pantry.length) },
        { label: "Plan slots", value: String(store.mealPlans.length) },
      ],
    };
  }

  if (id === "atlas") {
    const inputs = store.workouts.length;
    const files = store.programs.length;
    const systems = Number(store.programs.length > 0) + Number(hasAi(store));
    if (store.workouts.length) {
      buildings.push({
        id: "forge",
        kind: "forge",
        name: "Load forge",
        why: `${store.workouts.length} sessions filed`,
        scale: Math.min(1.7, 0.8 + store.workouts.length * 0.05),
      });
    }
    if (store.workouts.some((w) => /run|cardio|walk/i.test(w.modality))) {
      buildings.push({
        id: "track",
        kind: "track",
        name: "Orbital track",
        why: "Cardio traffic on the ring",
        scale: 1.05,
      });
    }
    if (store.programs.length) {
      buildings.push({
        id: "program-hall",
        kind: "hall",
        name: "Program hall",
        why: `${store.programs.length} cycles stored`,
        scale: 1.2,
      });
    }
    if (hasAi(store)) {
      buildings.push({
        id: "coach-spire",
        kind: "spire",
        name: "Coach spire",
        why: "Training intelligence online",
        scale: 1.1,
      });
    }
    for (const w of store.workouts.slice(0, 6)) {
      citizens.push({
        id: w.id,
        label: w.name,
        doing: `${w.minutes}m ${w.modality} · intensity ${w.intensity}`,
      });
    }
    const population = Math.round(inputs * 4 + files * 16 + systems * 12);
    return {
      id,
      population,
      inputs,
      files,
      systems,
      vitality,
      buildings,
      citizens,
      headline:
        population > 0
          ? `${population} movers keep the forge lit.`
          : "Empty yards — log a session or save a program.",
      stats: [
        { label: "Today load", value: `${Math.round(totals.atlas.minutes)} min` },
        { label: "Burn", value: `${Math.round(totals.atlas.burn)} kcal` },
        { label: "Sessions", value: String(store.workouts.length) },
        { label: "Programs", value: String(store.programs.length) },
      ],
    };
  }

  if (id === "lumen") {
    const inputs = store.checkins.length;
    const files = store.rituals.length;
    const systems = Number(store.rituals.length > 0) + Number(hasAi(store));
    if (store.checkins.length) {
      buildings.push({
        id: "sanctuary",
        kind: "sanctuary",
        name: "Clarity sanctuary",
        why: `${store.checkins.length} check-ins`,
        scale: Math.min(1.6, 0.8 + store.checkins.length * 0.06),
      });
    }
    if (store.checkins.some((c) => c.sleep_hours >= 6)) {
      buildings.push({
        id: "sleep-halls",
        kind: "hall",
        name: "Sleep halls",
        why: "Recovery nights on record",
        scale: 1.15,
      });
    }
    if (store.rituals.length) {
      buildings.push({
        id: "ritual-garden",
        kind: "sanctuary",
        name: "Ritual gardens",
        why: `${store.rituals.length} practices stored`,
        scale: 1.05,
      });
    }
    if (hasAi(store)) {
      buildings.push({
        id: "recovery-ai",
        kind: "spire",
        name: "Recovery spire",
        why: "Coach online",
        scale: 1.1,
      });
    }
    for (const c of store.checkins.slice(0, 6)) {
      citizens.push({
        id: c.id,
        label: c.note || "Check-in",
        doing: `Mood ${c.mood} · focus ${c.focus} · ${c.sleep_hours}h sleep`,
      });
    }
    const population = Math.round(inputs * 5 + files * 8 + systems * 12);
    return {
      id,
      population,
      inputs,
      files,
      systems,
      vitality,
      buildings,
      citizens,
      headline:
        population > 0
          ? `${population} keepers tend the light.`
          : "Dark gardens — log a check-in or start a ritual.",
      stats: [
        { label: "Mood", value: totals.lumen.entries ? totals.lumen.mood.toFixed(1) : "—" },
        { label: "Focus", value: totals.lumen.entries ? totals.lumen.focus.toFixed(1) : "—" },
        { label: "Sleep", value: totals.lumen.entries ? `${totals.lumen.sleep.toFixed(1)}h` : "—" },
        { label: "Rituals", value: String(store.rituals.length) },
      ],
    };
  }

  const inputs = store.markers.length;
  const files = new Set(store.markers.map((m) => m.panel)).size;
  const systems = Number(store.markers.length > 0) + Number(hasAi(store)) + Number(hasAgent(store));
  if (store.markers.length) {
    buildings.push({
      id: "assay-lab",
      kind: "lab",
      name: "Assay lab",
      why: `${store.markers.length} markers filed`,
      scale: Math.min(1.6, 0.75 + store.markers.length * 0.06),
    });
  }
  if (files > 1) {
    buildings.push({
      id: "panel-spire",
      kind: "spire",
      name: "Panel spire",
      why: `${files} panels on file`,
      scale: 1.2,
    });
  }
  if (hasAgent(store)) {
    buildings.push({
      id: "uplink",
      kind: "spire",
      name: "Agent uplink",
      why: "External instruments can write the ledger",
      scale: 1.05,
    });
  }
  for (const m of store.markers.slice(0, 6)) {
    citizens.push({
      id: m.id,
      label: m.marker,
      doing: `Reading ${m.value}${m.unit ? ` ${m.unit}` : ""} · ${m.panel}`,
    });
  }
  const population = Math.round(inputs * 3 + files * 10 + systems * 12);
  return {
    id,
    population,
    inputs,
    files,
    systems,
    vitality,
    buildings,
    citizens,
    headline:
      population > 0
        ? `${population} observers staff the rings.`
        : "Quiet glass — file an assay to light the station.",
    stats: [
      { label: "Assays", value: String(store.markers.length) },
      { label: "Panels", value: String(files) },
      { label: "Cadence", value: PLANET_META.observatory.cadence },
    ],
  };
}

export function allColonies(store: GalaxyStore) {
  return (["galley", "atlas", "lumen", "observatory"] as const).map((id) =>
    planetColony(store, id)
  );
}

export function galaxyPopulation(store: GalaxyStore) {
  return allColonies(store).reduce((n, c) => n + c.population, 0);
}
