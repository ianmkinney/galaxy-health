import { extractJson } from './worldForge';

export const CRAFT_META = {
  warship: { label: 'Warship', verb: 'Battle stations', color: '#FF4D6D' },
  armada: { label: 'Armada', verb: 'Fleet inbound', color: '#FF6B3D' },
  envoy: { label: 'Envoy', verb: 'Receive the envoy', color: '#F5C542' },
  monster: { label: 'Leviathan', verb: 'Face the beast', color: '#A98BFF' },
  astronaut: { label: 'Astronaut', verb: 'Rescue the lost', color: '#4CE0FF' },
};

export const TONE_META = {
  deadline: { label: 'Deadline', color: '#FF4D6D' },
  fun: { label: 'Fun', color: '#F5C542' },
  exciting: { label: 'Exciting', color: '#A98BFF' },
};

export const GALACTIC_CRAFTS = Object.keys(CRAFT_META);
export const GALACTIC_TONES = Object.keys(TONE_META);

export function hashString(value) {
  let h = 2166136261;
  const s = String(value);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function derivedStatus(event, now = Date.now()) {
  if (event.status === 'done') return 'done';
  if (event.due_at < now) return 'missed';
  return 'upcoming';
}

export function openEvents(events = [], now = Date.now()) {
  return events
    .filter((event) => event.status !== 'done')
    .sort((a, b) => a.due_at - b.due_at)
    .map((event) => ({ ...event, status: derivedStatus(event, now) }));
}

export function defaultDueAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

export function formatDue(ms) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDueInput(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDueInput(value) {
  const t = Date.parse(String(value).trim().replace(' ', 'T'));
  return Number.isFinite(t) ? t : defaultDueAt();
}

function coercePlanetId(value, known, hint) {
  if (value == null || value === '' || value === 'null' || value === 'deep' || value === 'space') {
    return hint ?? null;
  }
  const id = String(value).trim();
  if (known.includes(id)) return id;
  const match = known.find((planet) => planet.toLowerCase() === id.toLowerCase());
  return match ?? hint ?? null;
}

export function heuristicEvent(description, opts = {}) {
  const t = String(description).toLowerCase();
  const known = opts.knownPlanets ?? [];
  let tone = GALACTIC_TONES.includes(opts.tone) ? opts.tone : 'exciting';
  if (!opts.tone) {
    if (/deadline|due|tax|exam|interview|bill|appoint|submit|rent|invoice|report|meeting/.test(t)) {
      tone = 'deadline';
    } else if (/party|dinner|friend|birthday|date|hang|concert|fun|brunch|game night|visit/.test(t)) {
      tone = 'fun';
    } else if (/help|lost|rescue|support|care|volunteer|pick up|check on/.test(t)) {
      tone = 'exciting';
    }
  }

  let craft = tone === 'deadline' ? 'warship' : tone === 'fun' ? 'envoy' : 'monster';
  if (tone === 'deadline' && /week|finals?|taxes|move|wedding|all.?day|launch|board/.test(t)) {
    craft = 'armada';
  }
  if (tone === 'exciting' && /help|lost|rescue|stuck|care|support|pick up/.test(t)) {
    craft = 'astronaut';
  }

  let planet_id = opts.planetId ?? null;
  if (!planet_id) {
    if (/food|meal|cook|grocery|eat|diet|galley/.test(t)) planet_id = known.includes('galley') ? 'galley' : null;
    else if (/gym|workout|run|train|lift|atlas/.test(t)) planet_id = known.includes('atlas') ? 'atlas' : null;
    else if (/sleep|meditat|therap|rest|mood|lumen/.test(t)) planet_id = known.includes('lumen') ? 'lumen' : null;
    else if (/lab|blood|doctor|checkup|assay|observatory/.test(t)) {
      planet_id = known.includes('observatory') ? 'observatory' : null;
    }
  }

  const title =
    description.replace(/^[^a-z0-9]+/i, '').split(/[.\n]/)[0].trim().slice(0, 48) || CRAFT_META[craft].label;

  const briefing =
    craft === 'warship'
      ? `A warship has taken station off this world. Battle stations — ${title} is inbound and the colony needs you ready.`
      : craft === 'armada'
        ? `An armada is forming on the horizon. This is no skirmish: ${title} will take the whole fleet.`
        : craft === 'envoy'
          ? `A friendly envoy is on approach. Prepare a reception — ${title} should feel like a feast, not a drill.`
          : craft === 'astronaut'
            ? `A lost astronaut is pulsing a distress beacon. They need you — ${title} is a rescue, not a fight.`
            : `A leviathan has entered the system. Exciting, dangerous, alive — ${title} is the beast you came here to meet.`;

  return { title, briefing, tone, craft, planet_id, notes: undefined };
}

export function coerceEventDraft(raw, description, opts = {}) {
  const fallback = heuristicEvent(description, opts);
  if (!raw || typeof raw !== 'object') return fallback;
  const tone = GALACTIC_TONES.includes(raw.tone) ? raw.tone : fallback.tone;
  const craft = GALACTIC_CRAFTS.includes(raw.craft) ? raw.craft : fallback.craft;
  return {
    title: String(raw.title ?? fallback.title).trim().slice(0, 56) || fallback.title,
    briefing: String(raw.briefing ?? fallback.briefing).trim().slice(0, 280) || fallback.briefing,
    tone,
    craft,
    planet_id: coercePlanetId(raw.planet_id, opts.knownPlanets ?? [], opts.planetId ?? fallback.planet_id),
    notes: raw.notes ? String(raw.notes).trim().slice(0, 160) : undefined,
  };
}

export function parseForgeEvent(text, description, opts = {}) {
  try {
    return coerceEventDraft(extractJson(text), description, opts);
  } catch {
    return heuristicEvent(description, opts);
  }
}

export function eventForgePrompt(description, opts) {
  const catalog = (opts.planets || []).map((p) => `${p.id} (${p.name} — ${p.domain})`).join('; ') || 'none';
  return `You are the first-contact officer for Galaxy Health, a personal-health galaxy.
Turn a real-life scheduled event into a galactic contact that will appear as a craft in the starfield.

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
Hint tone: ${opts.tone || 'infer from the description'}
Hint planet: ${opts.planetId || 'infer, or null'}
Due: ${new Date(opts.dueAt).toISOString()}
User description: ${description}`;
}

export function newEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
