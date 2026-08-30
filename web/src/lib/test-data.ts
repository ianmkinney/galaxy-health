import type { GalaxyStore } from "./galaxy-types";
import { isCorePlanet } from "./galaxy-types";
import { applyIngestOps, type IngestOp } from "./ingest-router";
import { todayKey } from "./utils";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Healthy 7-day civilization seed marked source=test for easy removal. */
export function buildHealthyTestOps(): IngestOp[] {
  const ops: IngestOp[] = [];
  const meals = [
    ["Oat bowl + berries", "breakfast", 420, 18],
    ["Chicken grain bowl", "lunch", 620, 42],
    ["Salmon + greens", "dinner", 580, 38],
    ["Greek yogurt", "snack", 180, 16],
  ] as const;
  const workouts = [
    ["Zone 2 run", "cardio", 35, 3],
    ["Full-body strength", "strength", 45, 4],
    ["Mobility flow", "mobility", 25, 2],
    ["Evening walk", "walk", 30, 2],
  ] as const;

  for (let i = 0; i < 7; i++) {
    const day = daysAgo(6 - i);
    const meal = meals[i % meals.length];
    ops.push({
      type: "meal",
      name: meal[0],
      slot: meal[1],
      calories: meal[2],
      protein: meal[3],
      carbs: Math.round(meal[2] * 0.1),
      fat: Math.round(meal[2] * 0.04),
      day,
    });
    // second meal most days
    if (i % 2 === 0) {
      const m2 = meals[(i + 1) % meals.length];
      ops.push({
        type: "meal",
        name: m2[0],
        slot: m2[1],
        calories: m2[2],
        protein: m2[3],
        day,
      });
    }
    const w = workouts[i % workouts.length];
    ops.push({
      type: "workout",
      name: w[0],
      modality: w[1],
      minutes: w[2],
      intensity: w[3],
      day,
    });
    ops.push({
      type: "checkin",
      mood: 3 + (i % 3 === 0 ? 1 : 0),
      focus: 3 + (i % 2),
      sleep_hours: 7 + (i % 3) * 0.3,
      note: "Test check-in — steady recovery",
      day,
    });
  }

  ops.push(
    {
      type: "recipe",
      title: "Test: Lentil power soup",
      ingredients: "1 cup lentils\n1 onion\n4 cups stock\n2 cups spinach\n1 tbsp olive oil",
      instructions: "Sauté onion. Add lentils and stock. Simmer 25 min. Fold in spinach.",
      tags: "test,healthy",
    },
    {
      type: "recipe",
      title: "Test: Overnight oats",
      ingredients: "80 g oats\n200 g Greek yogurt\n1 handful blueberries\n1 tbsp chia",
      instructions: "Mix, rest overnight, top with berries.",
      tags: "test,breakfast",
    },
    {
      type: "pantry",
      name: "Eggs",
      quantity: 12,
      unit: "ct",
      location: "fridge",
    },
    {
      type: "pantry",
      name: "Oats",
      quantity: 1,
      unit: "kg",
      location: "pantry",
    },
    {
      type: "grocery",
      name: "Blueberries",
      quantity: 1,
      unit: "pint",
    },
    {
      type: "meal_plan",
      title: "Salmon + greens",
      slot: "dinner",
      day: todayKey(),
    },
    {
      type: "marker",
      marker: "Fasting glucose",
      value: 88,
      unit: "mg/dL",
      ref_low: 70,
      ref_high: 99,
      panel: "Metabolic",
      day: daysAgo(48),
    },
    {
      type: "marker",
      marker: "Vitamin D",
      value: 42,
      unit: "ng/mL",
      ref_low: 30,
      ref_high: 80,
      panel: "Micronutrients",
      day: daysAgo(48),
    },
    {
      type: "marker",
      marker: "HDL",
      value: 58,
      unit: "mg/dL",
      ref_low: 40,
      ref_high: null,
      panel: "Lipids",
      day: daysAgo(48),
    }
  );

  return ops;
}

type MaybeSourced = {
  source?: string;
  tags?: string;
  name?: string;
  title?: string;
  notes?: string;
  note?: string;
};

export function isTestRow(row: MaybeSourced) {
  if (row.source === "test") return true;
  if (String(row.tags || "").toLowerCase().includes("test")) return true;
  const blob = `${row.notes ?? ""} ${row.note ?? ""}`;
  if (blob.includes("[galaxy-test]")) return true;
  if (/^test:/i.test(String(row.name || row.title || "").trim())) return true;
  return false;
}

function stampTestNotes<T extends MaybeSourced>(rows: T[]) {
  for (const row of rows) {
    if (row.source !== "test") continue;
    const mark = (s?: string) =>
      s?.includes("[galaxy-test]") ? s : [s, "[galaxy-test]"].filter(Boolean).join(" ");
    if ("note" in row) row.note = mark(row.note);
    else row.notes = mark(row.notes);
  }
}

export function seedHealthyTestData(store: GalaxyStore): GalaxyStore {
  const { store: next } = applyIngestOps(store, buildHealthyTestOps(), "test");
  const soup = next.recipes.find((r) => r.title.includes("Lentil"));
  if (soup) {
    const plan = next.mealPlans.find((p) => p.title.includes("Salmon"));
    if (plan) {
      plan.recipe_id = soup.id;
      plan.title = soup.title;
    }
  }
  const eggs = next.pantry.find((p) => p.name === "Eggs");
  if (eggs) eggs.expires_on = daysAgo(-4);
  next.programs.unshift({
    id: `${Date.now()}-testprog`,
    name: "Test: Foundational strength",
    focus: "strength",
    days: [
      { name: "Day 1", focus: "lower", movements: "Squat 3x5 · RDL 3x8 · split squat 3x10" },
      { name: "Day 2", focus: "upper", movements: "Press 3x5 · row 4x8 · pull-up 3xAMRAP" },
    ],
    created_at: Date.now(),
    source: "test",
  });
  next.rituals.unshift({
    id: `${Date.now()}-testrit`,
    name: "Test: Box breathing",
    kind: "breath",
    minutes: 8,
    logged_on: todayKey(),
    created_at: Date.now(),
    source: "test",
    note: "[galaxy-test]",
  });
  stampTestNotes(next.meals);
  stampTestNotes(next.workouts);
  stampTestNotes(next.checkins);
  stampTestNotes(next.markers);
  stampTestNotes(next.recipes);
  stampTestNotes(next.pantry);
  stampTestNotes(next.grocery);
  stampTestNotes(next.mealPlans);
  stampTestNotes(next.programs);
  stampTestNotes(next.rituals);
  stampTestNotes(next.signals);
  next.updated_at = Date.now();
  return next;
}

export function stripTestData(store: GalaxyStore): GalaxyStore {
  const next = structuredClone(store);
  const keep = <T extends MaybeSourced>(rows: T[]) => rows.filter((row) => !isTestRow(row));

  next.meals = keep(next.meals as MaybeSourced[]) as typeof next.meals;
  next.workouts = keep(next.workouts as MaybeSourced[]) as typeof next.workouts;
  next.checkins = keep(next.checkins as MaybeSourced[]) as typeof next.checkins;
  next.markers = keep(next.markers as MaybeSourced[]) as typeof next.markers;
  next.recipes = keep(next.recipes as MaybeSourced[]) as typeof next.recipes;
  next.pantry = keep(next.pantry as MaybeSourced[]) as typeof next.pantry;
  next.grocery = keep(next.grocery as MaybeSourced[]) as typeof next.grocery;
  next.mealPlans = keep(next.mealPlans as MaybeSourced[]) as typeof next.mealPlans;
  next.programs = keep(next.programs as MaybeSourced[]) as typeof next.programs;
  next.rituals = keep(next.rituals as MaybeSourced[]) as typeof next.rituals;
  next.signals = keep(next.signals as MaybeSourced[]) as typeof next.signals;
  next.worlds = keep(next.worlds as MaybeSourced[]) as typeof next.worlds;
  next.systems = keep(next.systems as MaybeSourced[]) as typeof next.systems;
  next.entries = keep(next.entries as MaybeSourced[]) as typeof next.entries;
  const worldIds = new Set(next.worlds.map((w) => w.id));
  next.systems = next.systems.filter((s) => isCorePlanet(s.planet_id) || worldIds.has(s.planet_id));
  next.entries = next.entries.filter((e) => next.systems.some((s) => s.id === e.system_id));
  next.planets = next.planets.filter((p) => isCorePlanet(p.id) || worldIds.has(p.id));
  next.updated_at = Date.now();
  return next;
}

export function countTestRows(store: GalaxyStore) {
  const bags = [
    store.meals,
    store.workouts,
    store.checkins,
    store.markers,
    store.recipes,
    store.pantry,
    store.grocery,
    store.mealPlans,
    store.programs,
    store.rituals,
    store.signals,
    store.worlds ?? [],
    store.systems ?? [],
    store.entries ?? [],
  ] as MaybeSourced[][];
  return bags.reduce((n, rows) => n + rows.filter(isTestRow).length, 0);
}
