import type { CheckIn, GalaxyStore, Marker, Workout } from "./galaxy-types";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(stamp: number) {
  const d = new Date(stamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function streakDays(dates: string[]) {
  const unique = [...new Set(dates)].sort().reverse();
  if (!unique.length) return 0;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (unique.includes(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (streak === 0 && unique[0] === new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

export function atlasStats(store: GalaxyStore) {
  const last7 = store.workouts.filter((w) => {
    const t = Date.parse(`${w.logged_on}T12:00:00`);
    return Number.isFinite(t) && Date.now() - t <= 7 * DAY_MS;
  });
  const byName = new Map<string, number>();
  for (const w of store.workouts) {
    byName.set(w.name, (byName.get(w.name) ?? 0) + 1);
  }
  let top: { name: string; count: number } | null = null;
  for (const [name, count] of byName) {
    if (!top || count > top.count) top = { name, count };
  }
  const volume7d = last7.reduce((n, w) => n + w.minutes, 0);
  const burn7d = last7.reduce((n, w) => n + w.burn, 0);
  const longest = store.workouts.reduce<Workout | null>(
    (best, w) => (!best || w.minutes > best.minutes ? w : best),
    null
  );
  return {
    sessions: store.workouts.length,
    sessions7d: last7.length,
    volume7d,
    burn7d,
    streak: streakDays(store.workouts.map((w) => w.logged_on)),
    topExercise: top,
    longest,
    avgIntensity:
      store.workouts.length === 0
        ? 0
        : store.workouts.reduce((n, w) => n + w.intensity, 0) / store.workouts.length,
  };
}

export function lumenStats(store: GalaxyStore) {
  const last7 = store.checkins.filter((c) => {
    const t = Date.parse(`${c.logged_on}T12:00:00`);
    return Number.isFinite(t) && Date.now() - t <= 7 * DAY_MS;
  });
  const avg = (key: keyof Pick<CheckIn, "mood" | "focus" | "sleep_hours">) =>
    last7.length ? last7.reduce((n, c) => n + Number(c[key]), 0) / last7.length : 0;
  return {
    entries: store.checkins.length,
    last7: last7.length,
    avgMood: avg("mood"),
    avgFocus: avg("focus"),
    avgSleep: avg("sleep_hours"),
    streak: streakDays(store.checkins.map((c) => c.logged_on)),
    ritualMinutes: store.rituals.reduce((n, r) => n + r.minutes, 0),
  };
}

export function markerFlag(m: Marker): "low" | "high" | "ok" | "none" {
  if (m.ref_low == null && m.ref_high == null) return "none";
  if (m.ref_low != null && m.value < m.ref_low) return "low";
  if (m.ref_high != null && m.value > m.ref_high) return "high";
  return "ok";
}

export function observatoryStats(store: GalaxyStore) {
  const flags = store.markers.map(markerFlag);
  const panels = new Set(store.markers.map((m) => m.panel || "General"));
  return {
    markers: store.markers.length,
    panels: panels.size,
    outOfRange: flags.filter((f) => f === "low" || f === "high").length,
    lastAt: store.markers[0]?.collected_on ?? null,
  };
}

export function markerHistory(store: GalaxyStore, name: string) {
  return store.markers
    .filter((m) => m.marker.toLowerCase() === name.toLowerCase())
    .slice()
    .sort((a, b) => a.collected_on.localeCompare(b.collected_on));
}

export function relativeDay(day: string) {
  const then = startOfDay(Date.parse(`${day}T12:00:00`));
  const now = startOfDay(Date.now());
  const days = Math.round((now - then) / DAY_MS);
  if (!Number.isFinite(days)) return day;
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return day;
}

void startOfDay;
