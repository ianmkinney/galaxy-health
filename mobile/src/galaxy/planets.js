// The planet registry.
//
// `id` is the contract. Every table, signal, migration, and route key uses the id.
// `defaultName` is only a seed value — the user renames planets in Settings and
// that rename lives in the `planets` table, never in code.

export const PLANET_IDS = {
  GALLEY: 'galley',
  ATLAS: 'atlas',
  LUMEN: 'lumen',
  OBSERVATORY: 'observatory',
};

export const CORE_PLANET_IDS = [
  PLANET_IDS.GALLEY,
  PLANET_IDS.ATLAS,
  PLANET_IDS.LUMEN,
  PLANET_IDS.OBSERVATORY,
];

export const isCorePlanet = (id) => CORE_PLANET_IDS.includes(id);

export const BUILDING_KINDS = [
  'hall',
  'track',
  'forge',
  'kitchen',
  'lab',
  'sanctuary',
  'market',
  'silo',
  'archive',
  'spire',
];

export const PLANETS = [
  {
    id: PLANET_IDS.GALLEY,
    defaultName: 'Galley',
    tagline: "The ship's kitchen",
    domain: 'Food & fuel',
    route: 'Galley',
    icon: 'flame',
    // Orbit: semi-major axis in scene units (1 = viewport half-width),
    // `revs` = whole revolutions per shared orbit loop, `phase` = start angle.
    orbit: { a: 0.40, revs: 12, phase: 0.6, eccentricity: 0.04 },
    body: { radius: 30, ring: false, moons: 0 },
  },
  {
    id: PLANET_IDS.ATLAS,
    defaultName: 'Atlas',
    tagline: 'Load bearer',
    domain: 'Strength & movement',
    route: 'Atlas',
    icon: 'barbell',
    orbit: { a: 0.60, revs: 8, phase: 2.4, eccentricity: 0.06 },
    body: { radius: 27, ring: false, moons: 1 },
  },
  {
    id: PLANET_IDS.LUMEN,
    defaultName: 'Lumen',
    tagline: 'Clarity and light',
    domain: 'Mind & recovery',
    route: 'Lumen',
    icon: 'sparkles',
    orbit: { a: 0.82, revs: 5, phase: 4.1, eccentricity: 0.03 },
    body: { radius: 33, ring: false, moons: 0 },
  },
  {
    id: PLANET_IDS.OBSERVATORY,
    defaultName: 'Observatory',
    tagline: 'Deep-field station',
    domain: 'Labs & biomarkers',
    route: 'Observatory',
    icon: 'planet',
    orbit: { a: 1.02, revs: 3, phase: 5.4, eccentricity: 0.08 },
    body: { radius: 22, ring: true, moons: 0 },
  },
];

export const PLANET_BY_ID = PLANETS.reduce((acc, planet) => {
  acc[planet.id] = planet;
  return acc;
}, {});

export const getPlanet = (id) => PLANET_BY_ID[id] ?? null;

// The core at the centre. Not a star — a neural lattice. The user is the nucleus.
export const STAR = {
  id: 'core',
  defaultName: 'First Mate',
  radius: 46,
};
