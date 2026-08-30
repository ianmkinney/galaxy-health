import { PLANET_IDS } from '../galaxy/planets';

// Every signal kind is a real hand-off between two domains. If a kind exists
// here, some planet screen produces it from stored data and the target planet
// reads it back — nothing is decorative.
export const SIGNAL_KINDS = {
  MACROS_LOGGED: 'galley.macros.logged',
  BURN_LOGGED: 'atlas.burn.logged',
  LOAD_LOGGED: 'atlas.load.logged',
  READINESS_LOGGED: 'lumen.readiness.logged',
  MARKER_LOGGED: 'observatory.marker.logged',
};

// source/target pairs, so the Bridge knows which arc to fly.
export const SIGNAL_ROUTES = {
  [SIGNAL_KINDS.MACROS_LOGGED]: { from: PLANET_IDS.GALLEY, to: PLANET_IDS.ATLAS },
  [SIGNAL_KINDS.BURN_LOGGED]: { from: PLANET_IDS.ATLAS, to: PLANET_IDS.GALLEY },
  [SIGNAL_KINDS.LOAD_LOGGED]: { from: PLANET_IDS.ATLAS, to: PLANET_IDS.LUMEN },
  [SIGNAL_KINDS.READINESS_LOGGED]: { from: PLANET_IDS.LUMEN, to: PLANET_IDS.ATLAS },
  [SIGNAL_KINDS.MARKER_LOGGED]: { from: PLANET_IDS.OBSERVATORY, to: PLANET_IDS.LUMEN },
};

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

// One-line human summary, used in the signal log and in each planet's inbox.
export const describeSignal = (signal) => {
  const p = signal.payload ?? {};
  switch (signal.kind) {
    case SIGNAL_KINDS.MACROS_LOGGED:
      return `${p.name ?? 'Meal'} — ${round(p.calories)} kcal, ${round(p.protein)}g protein`;
    case SIGNAL_KINDS.BURN_LOGGED:
      return `${p.name ?? 'Session'} — ${round(p.burn)} kcal burned in ${round(p.minutes)} min`;
    case SIGNAL_KINDS.LOAD_LOGGED:
      return `Training load ${round(p.load, 1)} from ${p.name ?? 'session'}`;
    case SIGNAL_KINDS.READINESS_LOGGED:
      return `Readiness ${round(p.readiness, 1)}/5 — sleep ${round(p.sleepHours, 1)}h`;
    case SIGNAL_KINDS.MARKER_LOGGED:
      return `${p.marker ?? 'Marker'} ${round(p.value, 2)}${p.unit ? ` ${p.unit}` : ''}`;
    default:
      return signal.kind;
  }
};

export const SIGNAL_LABEL = {
  [SIGNAL_KINDS.MACROS_LOGGED]: 'Fuel manifest',
  [SIGNAL_KINDS.BURN_LOGGED]: 'Burn report',
  [SIGNAL_KINDS.LOAD_LOGGED]: 'Load telemetry',
  [SIGNAL_KINDS.READINESS_LOGGED]: 'Readiness ping',
  [SIGNAL_KINDS.MARKER_LOGGED]: 'Assay result',
};
