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

export type Recipe = {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  tags: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  prep_minutes?: number;
  created_at: number;
};

export type PantryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  expires_on?: string;
  created_at: number;
};

export type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  created_at: number;
};

export type MealPlanSlot = {
  id: string;
  day: string; // YYYY-MM-DD
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  recipe_id?: string;
  created_at: number;
};

export type Workout = {
  id: string;
  name: string;
  modality: string;
  minutes: number;
  intensity: number;
  burn: number;
  notes?: string;
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
  notes?: string;
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

export type AiSettings = {
  provider: "anthropic" | "openai" | "xai" | "gemini";
  /** User BYOK — stored only in their private Drive appData */
  keys: Partial<Record<AiSettings["provider"], string>>;
  model: string;
};

export type GalaxyStore = {
  version: 2;
  planets: PlanetRecord[];
  meals: Meal[];
  recipes: Recipe[];
  pantry: PantryItem[];
  grocery: GroceryItem[];
  mealPlans: MealPlanSlot[];
  workouts: Workout[];
  checkins: CheckIn[];
  markers: Marker[];
  signals: Signal[];
  ai: AiSettings;
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
  {
    domain: string;
    accent: string;
    accentSoft: string;
    route: string;
    vibe: string;
  }
> = {
  galley: {
    domain: "Food & fuel",
    accent: "#FF8A3D",
    accentSoft: "#FFB37A",
    route: "/galley",
    vibe: "Copper kitchen · warm steam · amber plasma",
  },
  atlas: {
    domain: "Strength & movement",
    accent: "#FF4D6D",
    accentSoft: "#FF8FA3",
    route: "/atlas",
    vibe: "Forge load · crimson arcs · tectonic force",
  },
  lumen: {
    domain: "Mind & recovery",
    accent: "#4CE0FF",
    accentSoft: "#9AF0FF",
    route: "/lumen",
    vibe: "Soft aurora · breath cycles · clear light",
  },
  observatory: {
    domain: "Labs & biomarkers",
    accent: "#A98BFF",
    accentSoft: "#D0C0FF",
    route: "/observatory",
    vibe: "Ringed station · scan lines · violet glass",
  },
};

export const DEFAULT_AI: AiSettings = {
  provider: "gemini",
  keys: {},
  model: "gemini-2.0-flash",
};

export function emptyStore(): GalaxyStore {
  return {
    version: 2,
    planets: DEFAULT_PLANETS.map((p) => ({ ...p })),
    meals: [],
    recipes: [],
    pantry: [],
    grocery: [],
    mealPlans: [],
    workouts: [],
    checkins: [],
    markers: [],
    signals: [],
    ai: { ...DEFAULT_AI, keys: {} },
    updated_at: Date.now(),
  };
}

/** Migrate v1 Drive blobs (and partial objects) up to v2. */
export function normalizeStore(raw: unknown): GalaxyStore {
  const base = emptyStore();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<GalaxyStore> & { version?: number };

  return {
    ...base,
    ...data,
    version: 2,
    planets: data.planets?.length ? data.planets : base.planets,
    meals: data.meals ?? [],
    recipes: data.recipes ?? [],
    pantry: data.pantry ?? [],
    grocery: data.grocery ?? [],
    mealPlans: data.mealPlans ?? [],
    workouts: data.workouts ?? [],
    checkins: data.checkins ?? [],
    markers: data.markers ?? [],
    signals: data.signals ?? [],
    ai: {
      provider: data.ai?.provider ?? DEFAULT_AI.provider,
      model: data.ai?.model ?? DEFAULT_AI.model,
      keys: { ...(data.ai?.keys ?? {}) },
    },
    updated_at: data.updated_at ?? Date.now(),
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
    recipes: store.recipes.length,
    pantry: store.pantry.length,
    groceryOpen: store.grocery.filter((g) => !g.checked).length,
  };
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
