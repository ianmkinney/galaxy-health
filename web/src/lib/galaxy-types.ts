export type PlanetId = "galley" | "atlas" | "lumen" | "observatory";

export type DataSource = "user" | "test" | "agent";

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
  notes?: string;
  recipe_id?: string;
  logged_on: string;
  created_at: number;
  source?: DataSource;
};

export type Recipe = {
  id: string;
  title: string;
  description?: string;
  ingredients: string;
  instructions: string;
  tags: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  prep_minutes?: number;
  cook_minutes?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  notes?: string;
  source_url?: string;
  cooked_count?: number;
  last_cooked_on?: string;
  created_at: number;
  source?: DataSource;
};

export type PantryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  category?: string;
  notes?: string;
  expires_on?: string;
  created_at: number;
  source?: DataSource;
};

export type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  category?: string;
  recipe_id?: string;
  recipe_name?: string;
  notes?: string;
  created_at: number;
  source?: DataSource;
};

export type MealPlanSlot = {
  id: string;
  day: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  recipe_id?: string;
  servings?: number;
  notes?: string;
  created_at: number;
  source?: DataSource;
};

export type Workout = {
  id: string;
  name: string;
  modality: string;
  minutes: number;
  intensity: number;
  burn: number;
  notes?: string;
  program_id?: string;
  logged_on: string;
  created_at: number;
  source?: DataSource;
};

export type TrainingProgram = {
  id: string;
  name: string;
  focus: string;
  days: { name: string; focus: string; movements: string }[];
  created_at: number;
  source?: DataSource;
};

export type CheckIn = {
  id: string;
  mood: number;
  focus: number;
  sleep_hours: number;
  note: string;
  logged_on: string;
  created_at: number;
  source?: DataSource;
};

export type Ritual = {
  id: string;
  name: string;
  kind: "breath" | "stretch" | "journal" | "walk" | "other";
  minutes: number;
  logged_on?: string;
  note?: string;
  created_at: number;
  source?: DataSource;
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
  source?: DataSource;
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
  source?: DataSource;
};

export type AiSettings = {
  provider: "anthropic" | "openai" | "xai" | "gemini";
  /** User BYOK — stored only in their private Drive appData */
  keys: Partial<Record<AiSettings["provider"], string>>;
  model: string;
};

export type AgentSettings = {
  /** Bearer token for /api/ingest — treat like a password */
  token: string | null;
  created_at: number | null;
};

export type GalaxyStore = {
  version: 3;
  planets: PlanetRecord[];
  meals: Meal[];
  recipes: Recipe[];
  pantry: PantryItem[];
  grocery: GroceryItem[];
  mealPlans: MealPlanSlot[];
  workouts: Workout[];
  programs: TrainingProgram[];
  checkins: CheckIn[];
  rituals: Ritual[];
  markers: Marker[];
  signals: Signal[];
  ai: AiSettings;
  agent: AgentSettings;
  updated_at: number;
};

export const DEFAULT_PLANETS: PlanetRecord[] = [
  { id: "galley", name: "Galley", enabled: true },
  { id: "atlas", name: "Atlas", enabled: true },
  { id: "lumen", name: "Lumen", enabled: true },
  { id: "observatory", name: "Observatory", enabled: true },
];

export type OrbitSpec = {
  /** Semi-major axis in scene units — inner worlds are logged more often. */
  a: number;
  /** Independent sidereal period in seconds (Kepler-ish: T ∝ a^1.5). */
  periodSec: number;
  inclination: number;
  phase: number;
  eccentricity: number;
  radius: number;
};

export const PLANET_META: Record<
  PlanetId,
  {
    domain: string;
    accent: string;
    accentSoft: string;
    route: string;
    vibe: string;
    cadence: string;
    orbit: OrbitSpec;
  }
> = {
  galley: {
    domain: "Food & fuel",
    accent: "#FF8A3D",
    accentSoft: "#FFB37A",
    route: "/galley",
    vibe: "Copper kitchens · steam vents · recipe archives",
    cadence: "Several times a day",
    orbit: {
      a: 2.15,
      periodSec: 18,
      inclination: 0.14,
      phase: 0.6,
      eccentricity: 0.05,
      radius: 0.38,
    },
  },
  atlas: {
    domain: "Strength & movement",
    accent: "#FF4D6D",
    accentSoft: "#FF8FA3",
    route: "/atlas",
    vibe: "Forge halls · load tracks · program towers",
    cadence: "Most days",
    orbit: {
      a: 3.05,
      periodSec: 31,
      inclination: 0.22,
      phase: 2.15,
      eccentricity: 0.07,
      radius: 0.34,
    },
  },
  lumen: {
    domain: "Mind & recovery",
    accent: "#4CE0FF",
    accentSoft: "#9AF0FF",
    route: "/lumen",
    vibe: "Aurora sanctuaries · breath gardens · sleep halls",
    cadence: "Daily recovery",
    orbit: {
      a: 4.15,
      periodSec: 48,
      inclination: 0.1,
      phase: 4.05,
      eccentricity: 0.04,
      radius: 0.4,
    },
  },
  observatory: {
    domain: "Labs & biomarkers",
    accent: "#A98BFF",
    accentSoft: "#D0C0FF",
    route: "/observatory",
    vibe: "Ringed station · assay spires · deep-field glass",
    cadence: "A few times a year",
    orbit: {
      a: 5.35,
      periodSec: 78,
      inclination: 0.28,
      phase: 5.35,
      eccentricity: 0.1,
      radius: 0.28,
    },
  },
};

/** The centre is you — a pulsing neural lattice, never a sun. */
export const CORE_META = {
  id: "core",
  name: "The Core",
  domain: "You",
  vibe: "A living equation of points and firing axons. Every log, file, and system you set up pulses through it.",
};

export const DEFAULT_AI: AiSettings = {
  provider: "gemini",
  keys: {},
  model: "gemini-2.0-flash",
};

export const DEFAULT_AGENT: AgentSettings = {
  token: null,
  created_at: null,
};

export function emptyStore(): GalaxyStore {
  return {
    version: 3,
    planets: DEFAULT_PLANETS.map((p) => ({ ...p })),
    meals: [],
    recipes: [],
    pantry: [],
    grocery: [],
    mealPlans: [],
    workouts: [],
    programs: [],
    checkins: [],
    rituals: [],
    markers: [],
    signals: [],
    ai: { ...DEFAULT_AI, keys: {} },
    agent: { ...DEFAULT_AGENT },
    updated_at: Date.now(),
  };
}

/** Migrate Drive blobs (and partial objects) up to v3. */
export function normalizeStore(raw: unknown): GalaxyStore {
  const base = emptyStore();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<GalaxyStore> & { version?: number };

  return {
    ...base,
    ...data,
    version: 3,
    planets: data.planets?.length ? data.planets : base.planets,
    meals: data.meals ?? [],
    recipes: data.recipes ?? [],
    pantry: data.pantry ?? [],
    grocery: data.grocery ?? [],
    mealPlans: data.mealPlans ?? [],
    workouts: data.workouts ?? [],
    programs: data.programs ?? [],
    checkins: data.checkins ?? [],
    rituals: data.rituals ?? [],
    markers: data.markers ?? [],
    signals: data.signals ?? [],
    ai: {
      provider: data.ai?.provider ?? DEFAULT_AI.provider,
      model: data.ai?.model ?? DEFAULT_AI.model,
      keys: { ...(data.ai?.keys ?? {}) },
    },
    agent: {
      token: data.agent?.token ?? null,
      created_at: data.agent?.created_at ?? null,
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
    programs: store.programs.length,
    rituals: store.rituals.length,
  };
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
