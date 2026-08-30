import { generateText } from './aiClient';
import { describeSignal, SIGNAL_LABEL } from '../state/signalKinds';
import { signalsRepo, todayKey } from '../db/repositories';

const DISCLAIMER =
  'This is coaching context from your local logs, not medical advice. Lab values and symptoms need a clinician.';

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

/**
 * Build a compact, anonymized day brief from on-device aggregates.
 * Marker names/values are summarized as counts only — never send raw labs.
 */
export function buildDayBrief({ totals, planets, inFlight = [], recentSignals = [] }) {
  const name = (id) => planets.find((p) => p.id === id)?.name || id;
  const fuel = totals.galley || {};
  const load = totals.atlas || {};
  const mind = totals.lumen || {};
  const labs = totals.observatory || {};
  const net = round((fuel.calories || 0) - (load.burn || 0));

  const lines = [
    `Day: ${todayKey()}`,
    `${name('galley')}: ${fuel.entries || 0} meals, ${round(fuel.calories)} kcal in, ${round(fuel.protein)} g protein`,
    `${name('atlas')}: ${load.entries || 0} sessions, ${round(load.minutes)} min, ${round(load.burn)} kcal burned`,
    `${name('lumen')}: ${mind.entries || 0} check-ins, mood ${mind.entries ? round(mind.mood, 1) : '—'}, focus ${mind.entries ? round(mind.focus, 1) : '—'}, sleep ${mind.entries ? round(mind.sleep, 1) : '—'} h`,
    `${name('observatory')}: ${labs.markers || 0} assay rows on file (values not sent)`,
    `Net fuel today: ${net > 0 ? '+' : ''}${net} kcal`,
    `Ships currently in transit: ${inFlight.length}`,
  ];

  if (recentSignals.length) {
    lines.push('Recent transmissions:');
    recentSignals.slice(0, 8).forEach((signal) => {
      const label = SIGNAL_LABEL[signal.kind] || signal.kind;
      // Never forward Observatory payload values off-device.
      const detail =
        signal.kind === 'observatory.marker.logged'
          ? 'assay filed (values kept on device)'
          : describeSignal(signal);
      lines.push(
        `- ${name(signal.from)} → ${name(signal.to)} · ${label} · ${detail} · ${signal.delivered_at ? 'delivered' : 'in transit'}`
      );
    });
  }

  return lines.join('\n');
}

export async function synthesizeDay(context) {
  const recent = context.recentSignals?.length
    ? context.recentSignals
    : await signalsRepo.recent(20);

  const brief = buildDayBrief({ ...context, recentSignals: recent });

  const prompt = [
    'You are a concise personal health systems coach inside an app called Galaxy Health.',
    'The user pilots a solar-system shell where each health domain is a planet.',
    'Planets: Galley (food/fuel), Atlas (movement), Lumen (mind/recovery), Observatory (labs).',
    'Use ONLY the day brief below. Do not invent numbers. Do not diagnose.',
    'Respond in 3 short sections with plain headings:',
    '1) What stands out',
    '2) One tension across domains (e.g. fuel vs burn, load vs recovery)',
    '3) One concrete next action for today',
    'Keep the whole reply under 180 words. No markdown tables. No medical claims.',
    '',
    'Day brief:',
    brief,
  ].join('\n');

  const text = await generateText(prompt);
  return { text, disclaimer: DISCLAIMER, brief };
}
