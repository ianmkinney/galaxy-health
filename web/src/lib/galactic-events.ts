import {
  isGalacticCraft,
  isGalacticTone,
  uid,
  type GalacticCraftKind,
  type GalacticEvent,
  type GalacticEventStatus,
  type GalacticEventTone,
  type GalaxyStore,
  type PlanetId,
} from "./galaxy-types";
import { extractJson } from "./world-forge";

export const CRAFT_META: Record<
  GalacticCraftKind,
  { label: string; verb: string; color: string; ink: string }
> = {
  warship: { label: "Warship", verb: "Battle stations", color: "#FF4D6D", ink: "#FF8FA3" },
  armada: { label: "Armada", verb: "Fleet inbound", color: "#FF6B3D", ink: "#FFB37A" },
  envoy: { label: "Envoy", verb: "Receive the envoy", color: "#F5C542", ink: "#FFE08A" },
  monster: { label: "Leviathan", verb: "Face the beast", color: "#A98BFF", ink: "#D0C0FF" },
  astronaut: { label: "Astronaut", verb: "Rescue the lost", color: "#4CE0FF", ink: "#9AF0FF" },
};

export const TONE_META: Record<GalacticEventTone, { label: string; color: string }> = {
  deadline: { label: "Deadline", color: "#FF4D6D" },
  fun: { label: "Fun", color: "#F5C542" },
  exciting: { label: "Exciting", color: "#A98BFF" },
};

export type EventForgeDraft = {
  title: string;
  briefing: string;
  tone: GalacticEventTone;
  craft: GalacticCraftKind;
  planet_id: PlanetId | null;
  notes?: string;
};

export function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function eventUrgency(event: Pick<GalacticEvent, "due_at" | "status">, now = Date.now()) {
  if (event.status === "done") return 0;
  const hours = (event.due_at - now) / 3_600_000;
  if (hours <= 0) return 1;
  if (hours >= 168) return 0.12;
  return Math.max(0.12, Math.min(1, 1 - hours / 168));
}

export function derivedStatus(event: GalacticEvent, now = Date.now()): GalacticEventStatus {
  if (event.status === "done") return "done";
  if (event.due_at < now) return "missed";
  return "upcoming";
}

export function openEvents(store: GalaxyStore, now = Date.now()) {
  return (store.events ?? [])
    .filter((event) => event.status !== "done")
    .sort((a, b) => a.due_at - b.due_at)
    .map((event) => ({ ...event, status: derivedStatus(event, now) }));
}

export function eventsForPlanet(store: GalaxyStore, planetId: PlanetId, now = Date.now()) {
  return openEvents(store, now).filter((event) => event.planet_id === planetId);
}

export function defaultDueAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

export function toDatetimeLocal(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(value: string) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : defaultDueAt();
}

export function formatDue(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function knownPlanetIds(store: GalaxyStore) {
  return store.planets.filter((p) => p.enabled !== false).map((p) => p.id);
}

function coercePlanetId(value: unknown, known: string[], hint: PlanetId | null): PlanetId | null {
  if (value == null || value === "" || value === "null" || value === "deep" || value === "space") {
    return hint;
  }
  const id = String(value).trim();
  if (known.includes(id)) return id;
  const lower = id.toLowerCase();
  const match = known.find((planet) => planet.toLowerCase() === lower);
  return match ?? hint;
}

export function heuristicEvent(
  description: string,
  opts?: { tone?: GalacticEventTone | ""; planetId?: PlanetId | null; knownPlanets?: string[] }
): EventForgeDraft {
  const t = description.toLowerCase();
  const known = opts?.knownPlanets ?? [];
  let tone: GalacticEventTone = opts?.tone && isGalacticTone(opts.tone) ? opts.tone : "exciting";
  if (!opts?.tone) {
    if (
      /deadline|due|tax|exam|interview|bill|appoint|submit|rent|invoice|report|meeting|call with/.test(
        t
      )
    ) {
      tone = "deadline";
    } else if (
      /party|dinner|friend|birthday|date|hang|concert|fun|brunch|game night|visit/.test(t)
    ) {
      tone = "fun";
    } else if (/help|lost|rescue|support|care|volunteer|pick up|check on/.test(t)) {
      tone = "exciting";
    }
  }

  let craft: GalacticCraftKind =
    tone === "deadline" ? "warship" : tone === "fun" ? "envoy" : "monster";
  if (tone === "deadline" && /week|finals?|taxes|move|wedding|all.?day|launch|board/.test(t)) {
    craft = "armada";
  }
  if (tone === "exciting" && /help|lost|rescue|stuck|care|support|pick up/.test(t)) {
    craft = "astronaut";
  }

  let planet_id: PlanetId | null = opts?.planetId ?? null;
  if (!planet_id) {
    if (/food|meal|cook|grocery|eat|diet|galley/.test(t)) planet_id = known.includes("galley") ? "galley" : null;
    else if (/gym|workout|run|train|lift|atlas/.test(t)) planet_id = known.includes("atlas") ? "atlas" : null;
    else if (/sleep|meditat|therap|rest|mood|lumen/.test(t)) planet_id = known.includes("lumen") ? "lumen" : null;
    else if (/lab|blood|doctor|checkup|assay|observatory/.test(t)) {
      planet_id = known.includes("observatory") ? "observatory" : null;
    }
  }

  const title =
    description
      .replace(/^[^a-z0-9]+/i, "")
      .split(/[.\n]/)[0]
      .trim()
      .slice(0, 48) || CRAFT_META[craft].label;

  const briefing =
    craft === "warship"
      ? `A warship has taken station off this world. Battle stations — ${title} is inbound and the colony needs you ready.`
      : craft === "armada"
        ? `An armada is forming on the horizon. This is no skirmish: ${title} will take the whole fleet.`
        : craft === "envoy"
          ? `A friendly envoy is on approach. Prepare a reception — ${title} should feel like a feast, not a drill.`
          : craft === "astronaut"
            ? `A lost astronaut is pulsing a distress beacon. They need you — ${title} is a rescue, not a fight.`
            : `A leviathan has entered the system. Exciting, dangerous, alive — ${title} is the beast you came here to meet.`;

  return {
    title,
    briefing,
    tone,
    craft,
    planet_id,
    notes: undefined,
  };
}

export function coerceEventDraft(
  raw: unknown,
  description: string,
  opts?: { tone?: GalacticEventTone | ""; planetId?: PlanetId | null; knownPlanets?: string[] }
): EventForgeDraft {
  const fallback = heuristicEvent(description, opts);
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  const tone = isGalacticTone(String(obj.tone ?? "")) ? (obj.tone as GalacticEventTone) : fallback.tone;
  const craft = isGalacticCraft(String(obj.craft ?? ""))
    ? (obj.craft as GalacticCraftKind)
    : fallback.craft;
  return {
    title: String(obj.title ?? fallback.title).trim().slice(0, 56) || fallback.title,
    briefing: String(obj.briefing ?? fallback.briefing).trim().slice(0, 280) || fallback.briefing,
    tone,
    craft,
    planet_id: coercePlanetId(obj.planet_id, opts?.knownPlanets ?? [], opts?.planetId ?? fallback.planet_id),
    notes: obj.notes ? String(obj.notes).trim().slice(0, 160) : undefined,
  };
}

export function parseForgeEvent(
  text: string,
  description: string,
  opts?: { tone?: GalacticEventTone | ""; planetId?: PlanetId | null; knownPlanets?: string[] }
) {
  try {
    return coerceEventDraft(extractJson(text), description, opts);
  } catch {
    return heuristicEvent(description, opts);
  }
}

export function eventForgePrompt(
  description: string,
  opts: {
    planets: { id: string; name: string; domain: string }[];
    tone?: GalacticEventTone | "";
    planetId?: PlanetId | null;
    dueAt: number;
  }
) {
  const catalog = opts.planets.map((p) => `${p.id} (${p.name} — ${p.domain})`).join("; ") || "none";
  return `You are the first-contact officer for Galaxy Health, a personal-health galaxy.
Turn a real-life scheduled event into a galactic contact that will appear as a 3D craft in the starfield.

CRAFTS:
- warship — a deadline; the pilot is preparing for battle
- armada — a huge deadline (finals, taxes, a move, a launch, a whole week)
- envoy — a fun event; a friendly visitor is arriving and the colony should prepare a reception
- monster — an exciting challenge or adventure (a race, a trip, a performance)
- astronaut — someone needs help, care, pickup, or rescue

TONES: deadline | fun | exciting

Return ONLY JSON (no markdown):
{
  "title": "short human title, max 8 words",
  "briefing": "two sentences, second person, galactic flavor, no medical advice",
  "tone": "deadline" | "fun" | "exciting",
  "craft": "warship" | "armada" | "envoy" | "monster" | "astronaut",
  "planet_id": "<id from catalog or null for deep space>",
  "notes": "optional one-line prep tip"
}

Known planets: ${catalog}
Hint tone: ${opts.tone || "infer from the description"}
Hint planet: ${opts.planetId || "infer, or null"}
Due: ${new Date(opts.dueAt).toISOString()}
User description: ${description}`;
}

export function packEvent(
  draft: EventForgeDraft,
  dueAt: number,
  source: GalacticEvent["source"] = "user"
): GalacticEvent {
  return {
    id: uid(),
    title: draft.title,
    briefing: draft.briefing,
    tone: draft.tone,
    craft: draft.craft,
    planet_id: draft.planet_id,
    due_at: dueAt,
    notes: draft.notes,
    status: "upcoming",
    created_at: Date.now(),
    source,
  };
}

export function applyEvent(store: GalaxyStore, event: GalacticEvent): GalaxyStore {
  return {
    ...store,
    events: [...(store.events ?? []), event],
    updated_at: Date.now(),
  };
}
