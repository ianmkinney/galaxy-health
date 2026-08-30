import type { GalaxyStore, PlanetId } from "./galaxy-types";
import { todayKey } from "./utils";

export type DayPoint = {
  day: string;
  calories: number;
  protein: number;
  burn: number;
  minutes: number;
  mood: number;
  focus: number;
  sleep: number;
  markers: number;
};

function dayList(days: number) {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function seriesLastDays(store: GalaxyStore, days = 14): DayPoint[] {
  return dayList(days).map((day) => {
    const meals = store.meals.filter((m) => m.logged_on === day);
    const workouts = store.workouts.filter((w) => w.logged_on === day);
    const checkins = store.checkins.filter((c) => c.logged_on === day);
    const markers = store.markers.filter((m) => m.collected_on === day);
    const mood =
      checkins.reduce((s, c) => s + c.mood, 0) / (checkins.length || 1);
    const focus =
      checkins.reduce((s, c) => s + c.focus, 0) / (checkins.length || 1);
    const sleep =
      checkins.reduce((s, c) => s + c.sleep_hours, 0) / (checkins.length || 1);
    return {
      day,
      calories: meals.reduce((s, m) => s + m.calories, 0),
      protein: meals.reduce((s, m) => s + m.protein, 0),
      burn: workouts.reduce((s, w) => s + w.burn, 0),
      minutes: workouts.reduce((s, w) => s + w.minutes, 0),
      mood: checkins.length ? mood : 0,
      focus: checkins.length ? focus : 0,
      sleep: checkins.length ? sleep : 0,
      markers: markers.length,
    };
  });
}

/** 0–100 civilization vitality from recent habit coverage. */
export function civilizationScore(store: GalaxyStore) {
  const series = seriesLastDays(store, 7);
  let score = 0;
  for (const d of series) {
    if (d.calories > 0) score += 8;
    if (d.minutes > 0) score += 8;
    if (d.sleep > 0) score += 8;
    if (d.markers > 0) score += 4;
  }
  score += Math.min(20, store.recipes.length * 2);
  score += Math.min(10, store.pantry.length);
  return Math.min(100, Math.round(score));
}

export function planetChartTitle(id: PlanetId) {
  if (id === "galley") return "Fuel intake (14d)";
  if (id === "atlas") return "Training load (14d)";
  if (id === "lumen") return "Recovery signals (14d)";
  return "Assays filed (14d)";
}

export function shortDay(day: string) {
  return day.slice(5);
}

void todayKey;
