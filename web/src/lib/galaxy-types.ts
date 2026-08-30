export type CorePlanetId = "galley" | "atlas" | "lumen" | "observatory";
export type PlanetId = string;

export const CORE_PLANET_IDS: CorePlanetId[] = ["galley", "atlas", "lumen", "observatory"];

export function isCorePlanet(id: string): id is CorePlanetId {
  return (CORE_PLANET_IDS as string[]).includes(id);
}

export type DataSource = "user" | "test" | "agent";

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

export const BUILDING_KINDS: BuildingKind[] = [
  "archive",
  "silo",
  "hall",
  "forge",
  "track",
  "sanctuary",
  "lab",
  "market",
  "kitchen",
  "spire",
];

export function isBuildingKind(value: string): value is BuildingKind {
  return (BUILDING_KINDS as string[]).includes(value);
}

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

export type TrackingFieldKind = "number" | "scale" | "text" | "duration" | "boolean";

export type TrackingField = {
  id: string;
  label: string;
  kind: TrackingFieldKind;
  unit?: string;
  min?: number;
  max?: number;
};

export type TrackingSystem = {
  id: string;
  planet_id: PlanetId;
  name: string;
  description: string;
  building_kind: BuildingKind;
  building_name: string;
  fields: TrackingField[];
  created_at: number;
  source?: DataSource;
};

export type TrackingEntry = {
  id: string;
  system_id: string;
  planet_id: PlanetId;
  values: Record<string, string | number | boolean>;
  notes?: string;
  logged_on: string;
  created_at: number;
  source?: DataSource;
};

export type CustomWorld = {
  id: PlanetId;
  name: string;
  description: string;
  domain: string;
  accent: string;
  accentSoft: string;
  vibe: string;
  cadence: string;
  enabled: boolean;
  created_at: number;
  orbit: OrbitSpec;
  source?: DataSource;
};

export type GalaxyStore = {
  version: 4;
  planets: PlanetRecord[];
  worlds: CustomWorld[];
  systems: TrackingSystem[];
  entries: TrackingEntry[];
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
  CorePlanetId,
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

/** Outer orbits beyond Observatory. Index 0 sits just past the lab ring. */
export function outerOrbitForIndex(index: number): OrbitSpec {
  const a = 6.2 + Math.max(0, index) * 0.85;
  return {
    a,
    periodSec: Math.round(78 * Math.pow(a / 5.35, 1.5)),
    inclination: 0.08 + (index % 5) * 0.06,
    phase: ((index * 1.73) % (Math.PI * 2)),
    eccentricity: 0.04 + (index % 3) * 0.02,
    radius: 0.26 + (index % 4) * 0.03,
  };
}

export type PlanetView = {
  id: PlanetId;
  name: string;
  domain: string;
  accent: string;
  accentSoft: string;
  route: string;
  vibe: string;
  cadence: string;
  orbit: OrbitSpec;
  enabled: boolean;
  custom: boolean;
  description?: string;
};

export function planetView(store: GalaxyStore, id: PlanetId): PlanetView {
  const row = store.planets.find((p) => p.id === id);
  if (isCorePlanet(id)) {
    const meta = PLANET_META[id];
    return {
      id,
      name: row?.name ?? id,
      domain: meta.domain,
      accent: meta.accent,
      accentSoft: meta.accentSoft,
      route: meta.route,
      vibe: meta.vibe,
      cadence: meta.cadence,
      orbit: meta.orbit,
      enabled: row?.enabled !== false,
      custom: false,
    };
  }
  const world = (store.worlds ?? []).find((w) => w.id === id);
  const customIndex = Math.max(
    0,
    (store.worlds ?? []).findIndex((w) => w.id === id)
  );
  if (world) {
    return {
      id: world.id,
      name: row?.name ?? world.name,
      domain: world.domain,
      accent: world.accent,
      accentSoft: world.accentSoft,
      route: `/world/${world.id}`,
      vibe: world.vibe,
      cadence: world.cadence,
      orbit: world.orbit ?? outerOrbitForIndex(customIndex),
      enabled: row?.enabled !== false && world.enabled !== false,
      custom: true,
      description: world.description,
    };
  }
  return {
    id,
    name: row?.name ?? id,
    domain: "Custom world",
    accent: "#4CE0FF",
    accentSoft: "#9AF0FF",
    route: `/world/${id}`,
    vibe: "Newly forged",
    cadence: "As you log",
    orbit: outerOrbitForIndex(customIndex >= 0 ? customIndex : (store.worlds ?? []).length),
    enabled: row?.enabled !== false,
    custom: true,
  };
}

export function allPlanetViews(store: GalaxyStore): PlanetView[] {
  return store.planets.map((p) => planetView(store, p.id));
}

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
    version: 4,
    planets: DEFAULT_PLANETS.map((p) => ({ ...p })),
    worlds: [],
    systems: [],
    entries: [],
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

function mergePlanets(data: Partial<GalaxyStore>): PlanetRecord[] {
  const cores = DEFAULT_PLANETS.map((def) => {
    const existing = data.planets?.find((p) => p.id === def.id);
    return existing ? { id: def.id, name: existing.name || def.name, enabled: existing.enabled !== false } : { ...def };
  });
  const seen = new Set(cores.map((p) => p.id));
  const extras: PlanetRecord[] = [];
  for (const p of data.planets ?? []) {
    if (!isCorePlanet(p.id) && !seen.has(p.id)) {
      extras.push({ id: p.id, name: p.name, enabled: p.enabled !== false });
      seen.add(p.id);
    }
  }
  for (const world of data.worlds ?? []) {
    if (!seen.has(world.id)) {
      extras.push({ id: world.id, name: world.name, enabled: world.enabled !== false });
      seen.add(world.id);
    }
  }
  return [...cores, ...extras];
}

/** Migrate Drive blobs (and partial objects) up to v4. */
export function normalizeStore(raw: unknown): GalaxyStore {
  const base = emptyStore();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<GalaxyStore> & { version?: number };

  return {
    ...base,
    ...data,
    version: 4,
    planets: mergePlanets(data),
    worlds: data.worlds ?? [],
    systems: data.systems ?? [],
    entries: data.entries ?? [],
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
