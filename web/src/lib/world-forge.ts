import {
  BUILDING_KINDS,
  DEFAULT_PLANETS,
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

/** Default planet setup — AI fills names, kinds, and fields from the user's context. */
export const DEFAULT_PLANET_TEMPLATE: ForgePlanetDraft = {
  name: "New world",
  domain: "Custom tracking",
  vibe: "A forged world waiting for logs",
  cadence: "As you log",
  accent: "#4CE0FF",
  accentSoft: "#A8F0EB",
  systems: [
    {
      name: "Primary log",
      description: "The main thing you record on this world.",
      building_kind: "hall",
      building_name: "Hall",
      fields: [
        { id: "value", label: "Value", kind: "number" },
        { id: "notes", label: "Notes", kind: "text" },
      ],
    },
    {
      name: "Measure",
      description: "A score or quantity you watch over time.",
      building_kind: "lab",
      building_name: "Lab",
      fields: [
        { id: "score", label: "Score", kind: "scale", min: 1, max: 5 },
        { id: "notes", label: "Notes", kind: "text" },
      ],
    },
    {
      name: "Archive",
      description: "Notes and context that do not fit a number.",
      building_kind: "archive",
      building_name: "Archive",
      fields: [
        { id: "title", label: "Title", kind: "text" },
        { id: "notes", label: "Notes", kind: "text" },
      ],
    },
  ],
};

export function emptyPlanetTemplate(): ForgePlanetDraft {
  return {
    ...DEFAULT_PLANET_TEMPLATE,
    systems: DEFAULT_PLANET_TEMPLATE.systems.map((system) => ({
      ...system,
      fields: system.fields.map((field) => ({ ...field })),
    })),
  };
}

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
  const template = emptyPlanetTemplate();
  const topics = splitTopics(description);
  const nameGuess =
    description
      .split(/[.!?]/)[0]
      ?.replace(/\b(i want to|track|tracking|planet|world|a place for)\b/gi, "")
      .trim() || topics[0];
  const name = titleCase(nameGuess).slice(0, 24).trim() || template.name;
  const palette = PALETTES[Math.abs(hash(description)) % PALETTES.length];
  const systems = template.systems.map((slot, index) => {
    const topic = topics[index];
    if (!topic) return slot;
    return heuristicSystem(topic);
  });
  if (topics.length > template.systems.length) {
    for (const topic of topics.slice(template.systems.length, 4)) {
      systems.push(heuristicSystem(topic));
    }
  }
  return {
    name,
    domain: titleCase(topics[0] || template.domain).slice(0, 40),
    vibe: `Custom world · ${topics.slice(0, 2).join(" · ") || "forged from your brief"}`.slice(0, 80),
    cadence: /daily|every day|each day/i.test(description)
      ? "Daily"
      : /week/i.test(description)
        ? "Weekly"
        : template.cadence,
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

export function draftFromSystem(system: {
  name: string;
  description: string;
  building_kind: BuildingKind;
  building_name: string;
  fields: TrackingField[];
}): ForgeSystemDraft {
  return {
    name: system.name,
    description: system.description,
    building_kind: system.building_kind,
    building_name: system.building_name,
    fields: system.fields.map((field) => ({ ...field })),
  };
}

/** Keep existing field ids when the AI (or heuristic) means the same column, so past logs still line up. */
export function preserveFieldIds(existing: TrackingField[], next: TrackingField[]): TrackingField[] {
  if (!existing.length) return next;
  const taken: string[] = [];
  return next.map((field, index) => {
    if (existing.some((item) => item.id === field.id) && !taken.includes(field.id)) {
      taken.push(field.id);
      return field;
    }
    const byLabel = existing.find(
      (item) => item.label.toLowerCase() === field.label.toLowerCase() && !taken.includes(item.id)
    );
    if (byLabel) {
      taken.push(byLabel.id);
      return { ...field, id: byLabel.id };
    }
    const id = taken.includes(field.id) ? slugField(field.label, index, taken) : field.id;
    taken.push(id);
    return { ...field, id };
  });
}

const KIND_ALIAS: Record<string, TrackingFieldKind> = {
  number: "number",
  scale: "scale",
  text: "text",
  duration: "duration",
  boolean: "boolean",
  minute: "duration",
  minutes: "duration",
  hour: "duration",
  hours: "duration",
};

export function heuristicReviseSystem(current: ForgeSystemDraft, instruction: string): ForgeSystemDraft {
  const text = instruction.trim();
  const lower = text.toLowerCase();
  const replace = /\b(instead|replace|rebuild|switch to|now track|change (this|it) to)\b/i.test(text);

  let name = current.name;
  const rename = text.match(/\b(?:rename|call (?:it|this)|named?)\s+(?:to\s+)?["']?([^"'.\n]+)["']?/i);
  if (rename) name = titleCase(rename[1]).slice(0, 40);

  if (replace) {
    const fresh = heuristicSystem(text);
    return {
      ...fresh,
      name: name !== current.name ? name : fresh.name,
      fields: preserveFieldIds(current.fields, fresh.fields),
    };
  }

  let fields = current.fields.map((field) => ({ ...field }));
  let kind = current.building_kind;
  let building_name = current.building_name;
  const guessed = kindFromText(text);
  if (guessed !== "hall" || /sleep|dream|rest|nap/.test(lower)) {
    kind = guessed;
    building_name = `${name} ${kind}`.slice(0, 40);
  }

  for (const match of text.matchAll(
    /\b(?:remove|drop|delete|stop tracking|don't track|do not track)\s+([^,.;]+)/gi
  )) {
    const needle = match[1].toLowerCase();
    fields = fields.filter(
      (field) =>
        !needle.includes(field.label.toLowerCase()) &&
        !needle.includes(field.id.replace(/_/g, " "))
    );
  }

  const taken = fields.map((field) => field.id);
  for (const match of text.matchAll(/\b(?:add|also track|include)\s+([^,.;]+)/gi)) {
    const extra = heuristicSystem(match[1]);
    for (const field of extra.fields) {
      if (field.id === "notes" && fields.some((item) => item.id === "notes")) continue;
      if (taken.includes(field.id) || fields.some((item) => item.label.toLowerCase() === field.label.toLowerCase())) {
        continue;
      }
      fields.push(field);
      taken.push(field.id);
    }
  }

  const asKind = text.match(
    /\b(?:make|track|change)\s+(.+?)\s+(?:a |as |to )?(number|scale|text|duration|boolean|minutes?|hours?)\b/i
  );
  if (asKind) {
    const needle = asKind[1].toLowerCase();
    const nextKind = KIND_ALIAS[asKind[2].toLowerCase()];
    if (nextKind) {
      fields = fields.map((field) => {
        if (!needle.includes(field.label.toLowerCase()) && !needle.includes(field.id)) return field;
        const next: TrackingField = { ...field, kind: nextKind };
        if (nextKind === "scale") {
          next.min = field.min ?? 1;
          next.max = field.max ?? 5;
        }
        if (/^hour/.test(asKind[2])) next.unit = "h";
        if (/^min/.test(asKind[2])) next.unit = "min";
        return next;
      });
    }
  }

  return {
    name,
    description: text.slice(0, 240) || current.description,
    building_kind: kind,
    building_name,
    fields: fields.length ? fields.slice(0, 8) : current.fields,
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

export function parseForgeSystem(
  text: string,
  description: string,
  existing: TrackingField[] = []
): ForgeSystemDraft {
  try {
    const draft = coerceSystemDraft(extractJson(text), description);
    return existing.length ? { ...draft, fields: preserveFieldIds(existing, draft.fields) } : draft;
  } catch {
    return heuristicSystem(description);
  }
}

export function planetForgePrompt(description: string) {
  return `You fill a Galaxy Health planet setup template from the user's context.
Keep the structure: one planet, 2–4 tracking systems, each with 2–5 fields.
Specialize names, building kinds, and fields to the brief. Do not leave placeholders like "Primary log", "Measure", or "New world".
building_kind must be one of: ${BUILDING_KINDS.join("|")}.
Return ONLY JSON (no markdown) matching this template:
${JSON.stringify(emptyPlanetTemplate(), null, 2)}
User context:
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

export function systemRevisePrompt(
  planetName: string,
  domain: string,
  current: ForgeSystemDraft,
  instruction: string
) {
  return `You revise an existing Galaxy Health tracking system on "${planetName}" (${domain}).
Return ONLY JSON (no markdown) for the UPDATED system.
Keep field "id" values when the field is the same concept so past logs still line up.
You may add, remove, rename, or change field kinds (what is tracked and how).
You may change name, description, building_kind, and building_name.
building_kind must be one of: ${BUILDING_KINDS.join("|")}.
fields.kind must be one of: number|scale|text|duration|boolean.
Use 2–6 fields. Scale fields need min and max.

Current system:
${JSON.stringify(
  {
    name: current.name,
    description: current.description,
    building_kind: current.building_kind,
    building_name: current.building_name,
    fields: current.fields,
  },
  null,
  2
)}

Requested change:
${instruction}`;
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

export function applyReviseSystem(
  store: GalaxyStore,
  systemId: string,
  draft: ForgeSystemDraft
): { store: GalaxyStore; system: TrackingSystem } {
  const existing = (store.systems ?? []).find((item) => item.id === systemId);
  if (!existing) throw new Error("That system is not on this world.");
  const system: TrackingSystem = {
    ...existing,
    name: draft.name,
    description: draft.description,
    building_kind: draft.building_kind,
    building_name: draft.building_name,
    fields: preserveFieldIds(existing.fields, draft.fields),
  };
  return {
    system,
    store: {
      ...store,
      systems: (store.systems ?? []).map((item) => (item.id === systemId ? system : item)),
      updated_at: Date.now(),
    },
  };
}

/** Custom worlds are deleted. Core worlds leave the canopy (enabled = false) and can be restored. */
export function unmakePlanet(store: GalaxyStore, id: PlanetId): GalaxyStore {
  if (isCorePlanet(id)) {
    return {
      ...store,
      planets: store.planets.map((planet) =>
        planet.id === id ? { ...planet, enabled: false } : planet
      ),
      updated_at: Date.now(),
    };
  }
  return {
    ...store,
    planets: store.planets.filter((planet) => planet.id !== id),
    worlds: (store.worlds ?? []).filter((world) => world.id !== id),
    systems: (store.systems ?? []).filter((system) => system.planet_id !== id),
    entries: (store.entries ?? []).filter((entry) => entry.planet_id !== id),
    updated_at: Date.now(),
  };
}

export function restoreCoreWorlds(store: GalaxyStore): GalaxyStore {
  const custom = store.planets.filter((planet) => !isCorePlanet(planet.id));
  return {
    ...store,
    planets: [...DEFAULT_PLANETS.map((planet) => ({ ...planet })), ...custom],
    updated_at: Date.now(),
  };
}
