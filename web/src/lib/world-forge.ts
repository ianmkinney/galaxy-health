import {
  BUILDING_KINDS,
  isBuildingKind,
  isCorePlanet,
  outerOrbitForIndex,
  uid,
  type BuildingKind,
  type CustomWorld,
  type DataSource,
  type GalaxyStore,
  type PlanetId,
  type TrackingField,
  type TrackingFieldKind,
  type TrackingSystem,
} from "./galaxy-types";

const FIELD_KINDS: TrackingFieldKind[] = ["number", "scale", "text", "duration", "boolean"];

const PALETTES = [
  { accent: "#3DDC97", accentSoft: "#9AF5C8" },
  { accent: "#F5C542", accentSoft: "#FFE08A" },
  { accent: "#FF6B9D", accentSoft: "#FFB0C8" },
  { accent: "#5B8CFF", accentSoft: "#A8C4FF" },
  { accent: "#E07A5F", accentSoft: "#F4B8A4" },
  { accent: "#81B29A", accentSoft: "#B8DBC8" },
  { accent: "#C77DFF", accentSoft: "#E0B0FF" },
  { accent: "#4ECDC4", accentSoft: "#A8F0EB" },
];

export type ForgeSystemDraft = {
  name: string;
  description: string;
  building_kind: BuildingKind;
  building_name: string;
  fields: TrackingField[];
};

export type ForgePlanetDraft = {
  name: string;
  domain: string;
  vibe: string;
  cadence: string;
  accent: string;
  accentSoft: string;
  systems: ForgeSystemDraft[];
};

export function slugifyWorld(name: string, taken: string[]): string {
  let base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "world";
  if (isCorePlanet(base) || taken.includes(base)) {
    let i = 2;
    let next = `${base}-${i}`;
    while (isCorePlanet(next) || taken.includes(next)) {
      i += 1;
      next = `${base}-${i}`;
    }
    return next;
  }
  return base;
}

function slugField(label: string, index: number, taken: string[]): string {
  let base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || `field_${index}`;
  if (taken.includes(base)) {
    let i = 2;
    let next = `${base}_${i}`;
    while (taken.includes(next)) {
      i += 1;
      next = `${base}_${i}`;
    }
    return next;
  }
  return base;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model response.");
  return JSON.parse(raw.slice(start, end + 1));
}

export function kindFromText(text: string): BuildingKind {
  const t = text.toLowerCase();
  if (/sleep|dream|rest|nap/.test(t)) return "hall";
  if (/run|cardio|walk|endurance|mile/.test(t)) return "track";
  if (/strength|gym|lift|weight|train/.test(t)) return "forge";
  if (/food|meal|diet|nutrition|cook|calorie/.test(t)) return "kitchen";
  if (/lab|blood|biomarker|assay|panel/.test(t)) return "lab";
  if (/meditat|breath|mind|mood|anxiety|journal/.test(t)) return "sanctuary";
  if (/shop|buy|grocery|spend/.test(t)) return "market";
  if (/store|pantry|supply|stock|inventory/.test(t)) return "silo";
  if (/book|recipe|note|log|ledger/.test(t)) return "archive";
  if (/ai|coach|intel|guide/.test(t)) return "spire";
  return "hall";
}

function defaultFields(kind: BuildingKind): TrackingField[] {
  if (kind === "forge" || kind === "track") {
    return [
      { id: "minutes", label: "Minutes", kind: "duration", unit: "min" },
      { id: "intensity", label: "Intensity", kind: "scale", min: 1, max: 5 },
      { id: "notes", label: "Notes", kind: "text" },
    ];
  }
  if (kind === "kitchen") {
    return [
      { id: "amount", label: "Amount", kind: "number" },
      { id: "notes", label: "Notes", kind: "text" },
    ];
  }
  if (kind === "lab") {
    return [
      { id: "value", label: "Value", kind: "number" },
      { id: "unit", label: "Unit", kind: "text" },
      { id: "notes", label: "Notes", kind: "text" },
    ];
  }
  if (kind === "sanctuary") {
    return [
      { id: "score", label: "Score", kind: "scale", min: 1, max: 5 },
      { id: "minutes", label: "Minutes", kind: "duration", unit: "min" },
      { id: "notes", label: "Notes", kind: "text" },
    ];
  }
  if (kind === "archive") {
    return [
      { id: "title", label: "Title", kind: "text" },
      { id: "notes", label: "Notes", kind: "text" },
    ];
  }
  return [
    { id: "value", label: "Value", kind: "number" },
    { id: "notes", label: "Notes", kind: "text" },
  ];
}

function normalizeField(raw: unknown, index: number, taken: string[]): TrackingField {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const label = String(obj.label ?? obj.name ?? obj.id ?? `Field ${index + 1}`).slice(0, 40);
  const kind = FIELD_KINDS.includes(obj.kind as TrackingFieldKind)
    ? (obj.kind as TrackingFieldKind)
    : "number";
  const id = slugField(String(obj.id ?? label), index, taken);
  taken.push(id);
  const field: TrackingField = { id, label, kind };
  if (typeof obj.unit === "string" && obj.unit.trim()) field.unit = obj.unit.trim().slice(0, 16);
  if (kind === "scale") {
    field.min = Number(obj.min) || 1;
    field.max = Number(obj.max) || 5;
  }
  return field;
}

function normalizeFields(raw: unknown, kind: BuildingKind): TrackingField[] {
  const list = Array.isArray(raw) ? raw : [];
  const taken: string[] = [];
  const fields = list.slice(0, 8).map((item, i) => normalizeField(item, i, taken));
  return fields.length ? fields : defaultFields(kind);
}

function titleCase(text: string) {
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 40);
}

function splitTopics(description: string): string[] {
  const parts = description
    .split(/[,;.]|\band\b|\bplus\b|\bwith\b/i)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3);
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.some((u) => u.toLowerCase() === part.toLowerCase())) unique.push(part);
    if (unique.length >= 4) break;
  }
  return unique.length ? unique : [description.trim() || "daily log"];
}

export function heuristicSystem(description: string): ForgeSystemDraft {
  const kind = kindFromText(description);
  const name = titleCase(description).slice(0, 36) || "Tracking system";
  return {
    name,
    description: description.trim().slice(0, 240) || `Log ${name.toLowerCase()}.`,
    building_kind: kind,
    building_name: `${name} ${kind === "hall" ? "hall" : kind === "track" ? "track" : "house"}`.slice(0, 40),
    fields: defaultFields(kind),
  };
}

export function heuristicPlanet(description: string): ForgePlanetDraft {
  const topics = splitTopics(description);
  const nameGuess =
    description
      .split(/[.!?]/)[0]
      ?.replace(/\b(i want to|track|tracking|planet|world|a place for)\b/gi, "")
      .trim() || topics[0];
  const name = titleCase(nameGuess).slice(0, 24).trim() || "New world";
  const palette = PALETTES[Math.abs(hash(description)) % PALETTES.length];
  const systems = topics.slice(0, 3).map((topic) => heuristicSystem(topic));
  if (!systems.some((s) => s.building_kind === "archive")) {
    systems.push(heuristicSystem("journal notes"));
  }
  return {
    name,
    domain: titleCase(topics[0] || "Custom tracking").slice(0, 40),
    vibe: `Custom world · ${topics.slice(0, 2).join(" · ") || "forged from your brief"}`.slice(0, 80),
    cadence: /daily|every day|each day/i.test(description)
      ? "Daily"
      : /week/i.test(description)
        ? "Weekly"
        : "As you log",
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    systems,
  };
}

function hash(text: string) {
  let n = 0;
  for (let i = 0; i < text.length; i++) n = (n * 31 + text.charCodeAt(i)) | 0;
  return n;
}

export function coerceSystemDraft(raw: unknown, fallback: string): ForgeSystemDraft {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name = String(obj.name ?? fallback).trim().slice(0, 40) || heuristicSystem(fallback).name;
  const kind = isBuildingKind(String(obj.building_kind ?? ""))
    ? (obj.building_kind as BuildingKind)
    : kindFromText(`${name} ${obj.description ?? fallback}`);
  const description = String(obj.description ?? fallback).trim().slice(0, 240);
  const building_name =
    String(obj.building_name ?? "").trim().slice(0, 40) || `${name} ${kind}`;
  return {
    name,
    description: description || `Track ${name.toLowerCase()}.`,
    building_kind: kind,
    building_name,
    fields: normalizeFields(obj.fields, kind),
  };
}

export function coercePlanetDraft(raw: unknown, description: string): ForgePlanetDraft {
  const fallback = heuristicPlanet(description);
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const systemsRaw = Array.isArray(obj.systems) ? obj.systems : [];
  const systems = systemsRaw.slice(0, 6).map((item, i) =>
    coerceSystemDraft(item, fallback.systems[i]?.name ?? description)
  );
  const palette =
    typeof obj.accent === "string" && obj.accent.startsWith("#")
      ? {
          accent: obj.accent.slice(0, 7),
          accentSoft:
            typeof obj.accentSoft === "string" && obj.accentSoft.startsWith("#")
              ? obj.accentSoft.slice(0, 7)
              : fallback.accentSoft,
        }
      : { accent: fallback.accent, accentSoft: fallback.accentSoft };
  return {
    name: String(obj.name ?? fallback.name).trim().slice(0, 24) || fallback.name,
    domain: String(obj.domain ?? fallback.domain).trim().slice(0, 40) || fallback.domain,
    vibe: String(obj.vibe ?? fallback.vibe).trim().slice(0, 80) || fallback.vibe,
    cadence: String(obj.cadence ?? fallback.cadence).trim().slice(0, 32) || fallback.cadence,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    systems: systems.length ? systems : fallback.systems,
  };
}

export function parseForgePlanet(text: string, description: string): ForgePlanetDraft {
  try {
    return coercePlanetDraft(extractJson(text), description);
  } catch {
    return heuristicPlanet(description);
  }
}

export function parseForgeSystem(text: string, description: string): ForgeSystemDraft {
  try {
    return coerceSystemDraft(extractJson(text), description);
  } catch {
    return heuristicSystem(description);
  }
}

export function planetForgePrompt(description: string) {
  return `You design a health-tracking planet for Galaxy Health.
Return ONLY JSON (no markdown) with this shape:
{
  "name": "short planet name",
  "domain": "what this world tracks",
  "vibe": "one atmospheric line",
  "cadence": "Daily | Weekly | As you log",
  "accent": "#RRGGBB",
  "accentSoft": "#RRGGBB",
  "systems": [
    {
      "name": "system name",
      "description": "what to log",
      "building_kind": one of ${BUILDING_KINDS.join("|")},
      "building_name": "building on the surface",
      "fields": [
        { "id": "snake_id", "label": "Label", "kind": "number|scale|text|duration|boolean", "unit": "optional", "min": 1, "max": 5 }
      ]
    }
  ]
}
Create 2–4 systems that cover the user's brief. building_kind must be one of the listed kinds.
User brief:
${description}`;
}

export function systemForgePrompt(planetName: string, domain: string, description: string) {
  return `You add ONE tracking system to the planet "${planetName}" (${domain}) in Galaxy Health.
Return ONLY JSON (no markdown):
{
  "name": "system name",
  "description": "what to log",
  "building_kind": one of ${BUILDING_KINDS.join("|")},
  "building_name": "building name",
  "fields": [
    { "id": "snake_id", "label": "Label", "kind": "number|scale|text|duration|boolean", "unit": "optional", "min": 1, "max": 5 }
  ]
}
User brief:
${description}`;
}

function systemFromDraft(
  planetId: PlanetId,
  draft: ForgeSystemDraft,
  source: DataSource
): TrackingSystem {
  return {
    id: uid(),
    planet_id: planetId,
    name: draft.name,
    description: draft.description,
    building_kind: draft.building_kind,
    building_name: draft.building_name,
    fields: draft.fields,
    created_at: Date.now(),
    source,
  };
}

export function applyForgePlanet(
  store: GalaxyStore,
  draft: ForgePlanetDraft,
  description: string,
  source: DataSource = "user"
): { store: GalaxyStore; id: PlanetId } {
  const worlds = store.worlds ?? [];
  const planets = store.planets ?? [];
  const existingSystems = store.systems ?? [];
  const taken = [...planets.map((p) => p.id), ...worlds.map((w) => w.id)];
  const id = slugifyWorld(draft.name, taken);
  const world: CustomWorld = {
    id,
    name: draft.name,
    description: description.trim().slice(0, 400),
    domain: draft.domain,
    accent: draft.accent,
    accentSoft: draft.accentSoft,
    vibe: draft.vibe,
    cadence: draft.cadence,
    enabled: true,
    created_at: Date.now(),
    orbit: outerOrbitForIndex(worlds.length),
    source,
  };
  const systems = draft.systems.map((s) => systemFromDraft(id, s, source));
  return {
    id,
    store: {
      ...store,
      worlds: [world, ...worlds],
      planets: [...planets, { id, name: draft.name, enabled: true }],
      systems: [...systems, ...existingSystems],
      updated_at: Date.now(),
    },
  };
}

export function applyForgeSystem(
  store: GalaxyStore,
  planetId: PlanetId,
  draft: ForgeSystemDraft,
  source: DataSource = "user"
): { store: GalaxyStore; system: TrackingSystem } {
  const system = systemFromDraft(planetId, draft, source);
  return {
    system,
    store: {
      ...store,
      systems: [system, ...(store.systems ?? [])],
      updated_at: Date.now(),
    },
  };
}
