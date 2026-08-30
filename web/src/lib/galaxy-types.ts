export type PlanetId = "galley" | "atlas" | "lumen" | "observatory";

export type PlanetRecord = {
  id: PlanetId;
  name: string;
  enabled: boolean;
};

export type Meal = {
  id: string;
  name: string;
  slot: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_on: string;
  created_at: number;
};

export type Workout = {
  id: string;
  name: string;
  modality: string;
  minutes: number;
  intensity: number;
  burn: number;
  logged_on: string;
  created_at: number;
};

export type CheckIn = {
  id: string;
  mood: number;
  focus: number;
  sleep_hours: number;
  note: string;
  logged_on: string;
  created_at: number;
};

export type Marker = {
  id: string;
  marker: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  panel: string;
  collected_on: string;
  created_at: number;
};

export type Signal = {
  id: string;
  from: PlanetId;
  to: PlanetId;
  kind: string;
  payload: Record<string, unknown>;
  payload_ref: string | null;
  seen: boolean;
  delivered_at: number | null;
  created_at: number;
};

export type GalaxyStore = {
  version: 1;
  planets: PlanetRecord[];
  meals: Meal[];
  workouts: Workout[];
  checkins: CheckIn[];
  markers: Marker[];
  signals: Signal[];
  updated_at: number;
};

export const DEFAULT_PLANETS: PlanetRecord[] = [
  { id: "galley", name: "Galley", enabled: true },
  { id: "atlas", name: "Atlas", enabled: true },
  { id: "lumen", name: "Lumen", enabled: true },
  { id: "observatory", name: "Observatory", enabled: true },
];

export const PLANET_META: Record<
  PlanetId,
  { domain: string; accent: string; route: string }
> = {
  galley: { domain: "Food & fuel", accent: "#FF8A3D", route: "/galley" },
  atlas: { domain: "Strength & movement", accent: "#FF4D6D", route: "/atlas" },
  lumen: { domain: "Mind & recovery", accent: "#4CE0FF", route: "/lumen" },
  observatory: {
    domain: "Labs & biomarkers",
    accent: "#A98BFF",
    route: "/observatory",
  },
};

export function emptyStore(): GalaxyStore {
  return {
    version: 1,
    planets: DEFAULT_PLANETS.map((p) => ({ ...p })),
    meals: [],
    workouts: [],
    checkins: [],
    markers: [],
    signals: [],
    updated_at: Date.now(),
  };
}

export function totalsForDay(store: GalaxyStore, day: string) {
  const meals = store.meals.filter((m) => m.logged_on === day);
  const workouts = store.workouts.filter((w) => w.logged_on === day);
  const checkins = store.checkins.filter((c) => c.logged_on === day);

  const galley = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      entries: acc.entries + 1,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 }
  );

  const atlas = workouts.reduce(
    (acc, w) => ({
      minutes: acc.minutes + w.minutes,
      burn: acc.burn + w.burn,
      intensity: acc.intensity + w.intensity,
      entries: acc.entries + 1,
    }),
    { minutes: 0, burn: 0, intensity: 0, entries: 0 }
  );
  if (atlas.entries) atlas.intensity /= atlas.entries;

  const lumen = checkins.reduce(
    (acc, c) => ({
      mood: acc.mood + c.mood,
      focus: acc.focus + c.focus,
      sleep: acc.sleep + c.sleep_hours,
      entries: acc.entries + 1,
    }),
    { mood: 0, focus: 0, sleep: 0, entries: 0 }
  );
  if (lumen.entries) {
    lumen.mood /= lumen.entries;
    lumen.focus /= lumen.entries;
    lumen.sleep /= lumen.entries;
  }

  return {
    galley,
    atlas,
    lumen,
    observatory: { markers: store.markers.length },
  };
}
