import type { GalaxyStore } from "./galaxy-types";
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
      ingredients: "lentils\nonion\nstock\nspinach",
      instructions: "Simmer 25 min. Season.",
      tags: "test,healthy",
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
      day: daysAgo(2),
    },
    {
      type: "marker",
      marker: "Vitamin D",
      value: 42,
      unit: "ng/mL",
      ref_low: 30,
      ref_high: 80,
      panel: "Micronutrients",
      day: daysAgo(2),
    },
    {
      type: "marker",
      marker: "HDL",
      value: 58,
      unit: "mg/dL",
      ref_low: 40,
      ref_high: null,
      panel: "Lipids",
      day: daysAgo(2),
    }
  );

  return ops;
}

export function seedHealthyTestData(store: GalaxyStore): GalaxyStore {
  const { store: next } = applyIngestOps(store, buildHealthyTestOps(), "test");
  return next;
}

type MaybeSourced = { source?: string; tags?: string };

export function stripTestData(store: GalaxyStore): GalaxyStore {
  const next = structuredClone(store);
  const keep = <T extends MaybeSourced>(rows: T[]) =>
    rows.filter((row) => row.source !== "test" && !String(row.tags || "").includes("test"));

  next.meals = keep(next.meals as MaybeSourced[]) as typeof next.meals;
  next.workouts = keep(next.workouts as MaybeSourced[]) as typeof next.workouts;
  next.checkins = keep(next.checkins as MaybeSourced[]) as typeof next.checkins;
  next.markers = keep(next.markers as MaybeSourced[]) as typeof next.markers;
  next.recipes = keep(next.recipes as MaybeSourced[]) as typeof next.recipes;
  next.pantry = keep(next.pantry as MaybeSourced[]) as typeof next.pantry;
  next.grocery = keep(next.grocery as MaybeSourced[]) as typeof next.grocery;
  next.mealPlans = keep(next.mealPlans as MaybeSourced[]) as typeof next.mealPlans;
  next.signals = keep(next.signals as MaybeSourced[]) as typeof next.signals;
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
    store.signals,
  ] as MaybeSourced[][];
  return bags.reduce(
    (n, rows) => n + rows.filter((r) => r.source === "test" || String(r.tags || "").includes("test")).length,
    0
  );
}
