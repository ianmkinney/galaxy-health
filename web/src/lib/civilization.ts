import type { GalaxyStore, PlanetId, TrackingSystem } from "./galaxy-types";
import { isBuildingKind, planetView, totalsForDay } from "./galaxy-types";
import { civilizationScore } from "./chart-series";
import { todayKey } from "./utils";

export type { BuildingKind } from "./galaxy-types";
import type { BuildingKind } from "./galaxy-types";

export type BuildingCondition = "sound" | "weathering" | "crumbling";

export type ColonyBuilding = {
  id: string;
  kind: BuildingKind;
  name: string;
  why: string;
  scale: number;
  complexity: number;
  freshness: number;
  condition: BuildingCondition;
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

function latest(times: Array<number | string | null | undefined>) {
  let max = 0;
  for (const t of times) {
    if (t == null || t === "") continue;
    const n =
      typeof t === "number"
        ? t
        : Date.parse(String(t).length <= 10 ? `${t}T12:00:00` : String(t));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max || null;
}

export function infoFreshness(lastMs: number | null, halfLifeDays: number) {
  if (lastMs == null) return 0.12;
  const days = (Date.now() - lastMs) / 86_400_000;
  if (days <= 0.35) return 1;
  return Math.max(0.08, Math.exp((-Math.log(2) * days) / halfLifeDays));
}

function conditionOf(freshness: number): BuildingCondition {
  if (freshness >= 0.75) return "sound";
  if (freshness >= 0.4) return "weathering";
  return "crumbling";
}

/** 1–5 structural tiers from how much related information exists. */
export function complexityFromCount(n: number) {
  if (n <= 0) return 1;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 8) return 3;
  if (n <= 16) return 4;
  return 5;
}

/** Population tracks live row counts — removing logs drops this immediately. */
export function livePopulation(inputs: number, files: number, systems: number) {
  return Math.max(0, inputs + files + systems * 3);
}

function bldg(
  partial: Omit<ColonyBuilding, "freshness" | "condition">,
  last: number | null,
  halfLifeDays: number
): ColonyBuilding {
  const freshness = infoFreshness(last, halfLifeDays);
  return { ...partial, freshness, condition: conditionOf(freshness) };
}

function trackingFor(store: GalaxyStore, id: PlanetId) {
  const systems = (store.systems ?? []).filter((s) => s.planet_id === id);
  const entries = (store.entries ?? []).filter((e) => e.planet_id === id);
  return { systems, entries };
}

function buildingsFromSystems(store: GalaxyStore, id: PlanetId): ColonyBuilding[] {
  const { systems, entries } = trackingFor(store, id);
  return systems.map((sys: TrackingSystem) => {
    const rows = entries.filter((e) => e.system_id === sys.id);
    const kind: BuildingKind = isBuildingKind(sys.building_kind) ? sys.building_kind : "hall";
    return bldg(
      {
        id: `sys-${sys.id}`,
        kind,
        name: sys.building_name || sys.name,
        why: `${rows.length} logs · ${sys.name}`,
        scale: Math.min(1.65, 0.75 + rows.length * 0.05),
        complexity: complexityFromCount(Math.max(rows.length, 1)),
      },
      latest(rows.map((e) => e.logged_on)) ?? sys.created_at,
      7
    );
  });
}

function citizensFromEntries(store: GalaxyStore, id: PlanetId): ColonyCitizen[] {
  return trackingFor(store, id)
    .entries.slice(0, 6)
    .map((e) => {
      const sys = (store.systems ?? []).find((s) => s.id === e.system_id);
      const first = Object.values(e.values)[0];
      return {
        id: e.id,
        label: sys?.name ?? "Log",
        doing: e.notes || (first != null ? String(first) : e.logged_on),
      };
    });
}

function inhabitedHeadline(id: PlanetId, population: number, emptyHeadline: string, name?: string) {
  if (population <= 0) return emptyHeadline;
  if (id === "galley") return `${population} souls keep the kitchens turning.`;
  if (id === "atlas") return `${population} movers keep the forge lit.`;
  if (id === "lumen") return `${population} keepers tend the light.`;
  if (id === "observatory") return `${population} observers staff the rings.`;
  return `${population} keep ${name ?? "this world"} turning.`;
}

function finishColony(store: GalaxyStore, colony: PlanetColony): PlanetColony {
  const tracking = trackingFor(store, colony.id);
  const inputs = colony.inputs + tracking.entries.length;
  const systems = colony.systems + tracking.systems.length;
  const population = livePopulation(inputs, colony.files, systems);
  const view = planetView(store, colony.id);
  return {
    ...colony,
    inputs,
    systems,
    population,
    buildings: [...colony.buildings, ...buildingsFromSystems(store, colony.id)],
    citizens: [...colony.citizens, ...citizensFromEntries(store, colony.id)].slice(0, 8),
    headline: inhabitedHeadline(colony.id, population, colony.headline, view.name),
  };
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
      buildings.push(
        bldg(
          {
            id: "fuel-depot",
            kind: "kitchen",
            name: "Fuel depot",
            why: `${store.meals.length} meals logged`,
            scale: Math.min(1.6, 0.7 + store.meals.length * 0.04),
            complexity: complexityFromCount(store.meals.length),
          },
          latest(store.meals.map((m) => m.logged_on)),
          2.5
        )
      );
    }
    if (store.recipes.length) {
      buildings.push(
        bldg(
          {
            id: "recipe-archive",
            kind: "archive",
            name: "Recipe archive",
            why: `${store.recipes.length} files in the book`,
            scale: Math.min(1.8, 0.8 + store.recipes.length * 0.08),
            complexity: complexityFromCount(store.recipes.length),
          },
          latest(store.recipes.flatMap((r) => [r.last_cooked_on, r.created_at])),
          12
        )
      );
    }
    if (store.pantry.length) {
      buildings.push(
        bldg(
          {
            id: "pantry-silos",
            kind: "silo",
            name: "Pantry silos",
            why: `${store.pantry.length} stores on hand`,
            scale: Math.min(1.5, 0.7 + store.pantry.length * 0.05),
            complexity: complexityFromCount(store.pantry.length),
          },
          latest(store.pantry.map((p) => p.created_at)),
          8
        )
      );
    }
    if (store.mealPlans.length) {
      buildings.push(
        bldg(
          {
            id: "meal-hall",
            kind: "hall",
            name: "Meal hall",
            why: `${store.mealPlans.length} planned sittings`,
            scale: 1.1,
            complexity: complexityFromCount(store.mealPlans.length),
          },
          latest(store.mealPlans.flatMap((p) => [p.created_at, p.day])),
          7
        )
      );
    }
    if (store.grocery.length) {
      buildings.push(
        bldg(
          {
            id: "market",
            kind: "market",
            name: "Night market",
            why: `${store.grocery.filter((g) => !g.checked).length} open list items`,
            scale: 0.95,
            complexity: complexityFromCount(store.grocery.length),
          },
          latest(store.grocery.map((g) => g.created_at)),
          4
        )
      );
    }
    if (hasAi(store)) {
      buildings.push(
        bldg(
          {
            id: "chef-ai",
            kind: "spire",
            name: "AI Chef spire",
            why: "BYOK kitchen intelligence online",
            scale: 1.25,
            complexity: complexityFromCount(
              store.meals.length + store.recipes.length + store.mealPlans.length
            ),
          },
          latest([
            ...store.meals.map((m) => m.logged_on),
            ...store.recipes.map((r) => r.last_cooked_on),
          ]) ?? store.updated_at,
          14
        )
      );
    }
    for (const meal of store.meals.slice(0, 6)) {
      citizens.push({
        id: meal.id,
        label: meal.name,
        doing: `Plating ${meal.slot} · ${Math.round(meal.calories)} kcal`,
      });
    }
    const population = livePopulation(inputs, files, systems);
    return finishColony(store, {
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
    });
  }

  if (id === "atlas") {
    const inputs = store.workouts.length;
    const files = store.programs.length;
    const systems = Number(store.programs.length > 0) + Number(hasAi(store));
    if (store.workouts.length) {
      buildings.push(
        bldg(
          {
            id: "forge",
            kind: "forge",
            name: "Load forge",
            why: `${store.workouts.length} sessions filed`,
            scale: Math.min(1.7, 0.8 + store.workouts.length * 0.05),
            complexity: complexityFromCount(store.workouts.length),
          },
          latest(store.workouts.map((w) => w.logged_on)),
          4
        )
      );
    }
    if (store.workouts.some((w) => /run|cardio|walk/i.test(w.modality))) {
      buildings.push(
        bldg(
          {
            id: "track",
            kind: "track",
            name: "Orbital track",
            why: "Cardio traffic on the ring",
            scale: 1.05,
            complexity: complexityFromCount(
              store.workouts.filter((w) => /run|cardio|walk/i.test(w.modality)).length
            ),
          },
          latest(
            store.workouts.filter((w) => /run|cardio|walk/i.test(w.modality)).map((w) => w.logged_on)
          ),
          4
        )
      );
    }
    if (store.programs.length) {
      buildings.push(
        bldg(
          {
            id: "program-hall",
            kind: "hall",
            name: "Program hall",
            why: `${store.programs.length} cycles stored`,
            scale: 1.2,
            complexity: complexityFromCount(store.programs.length),
          },
          latest(store.programs.map((p) => p.created_at)),
          16
        )
      );
    }
    if (hasAi(store)) {
      buildings.push(
        bldg(
          {
            id: "coach-spire",
            kind: "spire",
            name: "Coach spire",
            why: "Training intelligence online",
            scale: 1.1,
            complexity: complexityFromCount(store.workouts.length + store.programs.length),
          },
          latest(store.workouts.map((w) => w.logged_on)) ?? store.updated_at,
          10
        )
      );
    }
    for (const w of store.workouts.slice(0, 6)) {
      citizens.push({
        id: w.id,
        label: w.name,
        doing: `${w.minutes}m ${w.modality} · intensity ${w.intensity}`,
      });
    }
    const population = livePopulation(inputs, files, systems);
    return finishColony(store, {
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
    });
  }

  if (id === "lumen") {
    const inputs = store.checkins.length;
    const files = store.rituals.length;
    const systems = Number(store.rituals.length > 0) + Number(hasAi(store));
    if (store.checkins.length) {
      buildings.push(
        bldg(
          {
            id: "sanctuary",
            kind: "sanctuary",
            name: "Clarity sanctuary",
            why: `${store.checkins.length} check-ins`,
            scale: Math.min(1.6, 0.8 + store.checkins.length * 0.06),
            complexity: complexityFromCount(store.checkins.length),
          },
          latest(store.checkins.map((c) => c.logged_on)),
          3.5
        )
      );
    }
    if (store.checkins.some((c) => c.sleep_hours >= 6)) {
      buildings.push(
        bldg(
          {
            id: "sleep-halls",
            kind: "hall",
            name: "Sleep halls",
            why: "Recovery nights on record",
            scale: 1.15,
            complexity: complexityFromCount(
              store.checkins.filter((c) => c.sleep_hours >= 6).length
            ),
          },
          latest(store.checkins.filter((c) => c.sleep_hours >= 6).map((c) => c.logged_on)),
          3.5
        )
      );
    }
    if (store.rituals.length) {
      buildings.push(
        bldg(
          {
            id: "ritual-garden",
            kind: "sanctuary",
            name: "Ritual gardens",
            why: `${store.rituals.length} practices stored`,
            scale: 1.05,
            complexity: complexityFromCount(store.rituals.length),
          },
          latest(store.rituals.map((r) => r.logged_on ?? r.created_at)),
          6
        )
      );
    }
    if (hasAi(store)) {
      buildings.push(
        bldg(
          {
            id: "recovery-ai",
            kind: "spire",
            name: "Recovery spire",
            why: "Coach online",
            scale: 1.1,
            complexity: complexityFromCount(store.checkins.length + store.rituals.length),
          },
          latest(store.checkins.map((c) => c.logged_on)) ?? store.updated_at,
          10
        )
      );
    }
    for (const c of store.checkins.slice(0, 6)) {
      citizens.push({
        id: c.id,
        label: c.note || "Check-in",
        doing: `Mood ${c.mood} · focus ${c.focus} · ${c.sleep_hours}h sleep`,
      });
    }
    const population = livePopulation(inputs, files, systems);
    return finishColony(store, {
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
    });
  }

  if (id === "observatory") {
  const inputs = store.markers.length;
  const files = new Set(store.markers.map((m) => m.panel)).size;
  const systems = Number(store.markers.length > 0) + Number(hasAi(store)) + Number(hasAgent(store));
  if (store.markers.length) {
    buildings.push(
      bldg(
        {
          id: "assay-lab",
          kind: "lab",
          name: "Assay lab",
          why: `${store.markers.length} markers filed`,
          scale: Math.min(1.6, 0.75 + store.markers.length * 0.06),
          complexity: complexityFromCount(store.markers.length),
        },
        latest(store.markers.map((m) => m.collected_on)),
        40
      )
    );
  }
  if (files > 1) {
    buildings.push(
      bldg(
        {
          id: "panel-spire",
          kind: "spire",
          name: "Panel spire",
          why: `${files} panels on file`,
          scale: 1.2,
          complexity: complexityFromCount(files),
        },
        latest(store.markers.map((m) => m.collected_on)),
        40
      )
    );
  }
  if (hasAgent(store)) {
    buildings.push(
      bldg(
        {
          id: "uplink",
          kind: "spire",
          name: "Agent uplink",
          why: "External instruments can write the ledger",
          scale: 1.05,
          complexity: complexityFromCount(store.markers.length),
        },
        store.agent.created_at ?? store.updated_at,
        21
      )
    );
  }
  for (const m of store.markers.slice(0, 6)) {
    citizens.push({
      id: m.id,
      label: m.marker,
      doing: `Reading ${m.value}${m.unit ? ` ${m.unit}` : ""} · ${m.panel}`,
    });
  }
  const population = livePopulation(inputs, files, systems);
  return finishColony(store, {
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
      { label: "Cadence", value: planetView(store, "observatory").cadence },
    ],
  });
  }

  const view = planetView(store, id);
  const tracking = trackingFor(store, id);
  const buildingsCustom = buildingsFromSystems(store, id);
  const citizensCustom = citizensFromEntries(store, id);
  const inputsCustom = tracking.entries.length;
  const systemsCustom = tracking.systems.length;
  const populationCustom = livePopulation(inputsCustom, 0, systemsCustom);
  return {
    id,
    population: populationCustom,
    inputs: inputsCustom,
    files: 0,
    systems: systemsCustom,
    vitality,
    buildings: buildingsCustom,
    citizens: citizensCustom,
    headline:
      populationCustom > 0
        ? `${populationCustom} keep ${view.name} turning.`
        : `Uninhabited — add a tracking system to raise a building on ${view.name}.`,
    stats: [
      { label: "Domain", value: view.domain },
      { label: "Systems", value: String(systemsCustom) },
      { label: "Logs", value: String(inputsCustom) },
      { label: "Cadence", value: view.cadence },
    ],
  };
}

export function allColonies(store: GalaxyStore) {
  return store.planets.map((planet) => planetColony(store, planet.id));
}

export function galaxyPopulation(store: GalaxyStore) {
  return allColonies(store).reduce((n, c) => n + c.population, 0);
}
