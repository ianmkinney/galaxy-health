import {
  atlasRepo,
  firstMateRepo,
  galleyRepo,
  lumenRepo,
  observatoryRepo,
  signalsRepo,
  todayKey,
} from '../db/repositories';
import { SIGNAL_KINDS, SIGNAL_ROUTES } from '../state/signalKinds';
import { EVENTS, emit } from '../state/eventBus';
import { generateText } from './aiClient';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ROUTER_PROMPT = `You are the Galaxy Health routing computer.
Map the user's free-form update into structured operations.
Return ONLY valid JSON (no markdown) with this shape:
{"summary":"one sentence","ops":[ ... ]}

Allowed op types:
- meal: {type,name,slot?,calories,protein?,carbs?,fat?,day?}
- workout: {type,name,modality?,minutes,intensity?,burn?,notes?,day?}
- checkin: {type,mood?,focus?,sleep_hours?,note?,day?}
- marker: {type,marker,value,unit?,ref_low?,ref_high?,panel?,notes?,day?}
- recipe: {type,title,ingredients?,instructions?,tags?}
- pantry: {type,name,quantity?,unit?,location?}
- grocery: {type,name,quantity?,unit?}
- meal_plan: {type,title,slot?,day?}

Rules:
- Extract every distinct fact. One update can touch multiple planets.
- day is YYYY-MM-DD if mentioned, else omit.
- mood/focus are 1-5. Never invent lab values that were not stated.`;

const stripCodeFences = (text) => {
  let cleaned = (text || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
  }
  return cleaned.trim();
};

export const heuristicRoute = (text) => {
  const ops = [];
  const lower = text.toLowerCase();
  const day = todayKey();

  const kcal = text.match(/(\d{2,4})\s*(kcal|calories|cal)\b/i);
  const protein = text.match(/(\d{1,3})\s*g?\s*protein/i);
  const mealWords = /(ate|eaten|breakfast|lunch|dinner|snack|meal|eggs|salad|chicken|oats|smoothie)/i;
  if (mealWords.test(lower) || kcal) {
    const nameMatch = text.match(/(?:ate|had|logged)\s+([^.,;]+)/i);
    ops.push({
      type: 'meal',
      name: (nameMatch?.[1] || 'Logged meal').trim().slice(0, 80),
      slot: /breakfast/i.test(lower)
        ? 'breakfast'
        : /lunch/i.test(lower)
          ? 'lunch'
          : /dinner/i.test(lower)
            ? 'dinner'
            : 'snack',
      calories: kcal ? Number(kcal[1]) : 450,
      protein: protein ? Number(protein[1]) : 25,
      day,
    });
  }

  const minutes = text.match(/(\d{1,3})\s*(min|minutes|mins)\b/i);
  const workoutWords = /(ran|run|jog|lift|gym|workout|walked|cycle|bike|swim|yoga|train)/i;
  if (workoutWords.test(lower) || (minutes && /(run|walk|lift|gym|train)/i.test(lower))) {
    ops.push({
      type: 'workout',
      name: text.slice(0, 60).replace(/\s+/g, ' ').trim() || 'Session',
      modality: /run|jog/i.test(lower)
        ? 'cardio'
        : /yoga/i.test(lower)
          ? 'mobility'
          : /walk/i.test(lower)
            ? 'walk'
            : 'strength',
      minutes: minutes ? Number(minutes[1]) : 30,
      intensity: /hard|intense|heavy/i.test(lower) ? 4 : 3,
      day,
    });
  }

  const sleep =
    text.match(/slept\s+(\d+(?:\.\d+)?)\s*h/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*h(?:ours)?\s*sleep/i);
  const moodWords = /(mood|focus|tired|wired|anxious|calm|stressed|recovered|sleep)/i;
  if (sleep || moodWords.test(lower)) {
    ops.push({
      type: 'checkin',
      mood: /anxious|stressed|tired/i.test(lower) ? 2 : /calm|great|good/i.test(lower) ? 4 : 3,
      focus: /focus(ed)?|clear/i.test(lower) ? 4 : 3,
      sleep_hours: sleep ? Number(sleep[1]) : 7,
      note: text.slice(0, 160),
      day,
    });
  }

  const lab = text.match(
    /\b([A-Za-z][A-Za-z0-9 \-]{1,30}?)\s*[:=]\s*(\d+(?:\.\d+)?)\s*([a-zA-Z\/%μ]+)?/
  );
  if (/lab|assay|ldl|hdl|a1c|glucose|ferritin|vitamin|marker|panel/i.test(lower) && lab) {
    ops.push({
      type: 'marker',
      marker: lab[1].trim(),
      value: Number(lab[2]),
      unit: lab[3] || '',
      day,
    });
  }

  if (/buy|need to get|grocery|shopping/i.test(lower)) {
    const item = text.match(/(?:buy|get|need)\s+([^.,;]+)/i)?.[1];
    if (item) ops.push({ type: 'grocery', name: item.trim().slice(0, 60), quantity: 1 });
  }

  const planetsTouched = [
    ...new Set(
      ops.flatMap((op) => {
        if (
          op.type === 'meal' ||
          op.type === 'recipe' ||
          op.type === 'pantry' ||
          op.type === 'grocery' ||
          op.type === 'meal_plan'
        )
          return ['galley'];
        if (op.type === 'workout') return ['atlas'];
        if (op.type === 'checkin') return ['lumen'];
        if (op.type === 'marker') return ['observatory'];
        return [];
      })
    ),
  ];

  return {
    ops,
    summary:
      ops.length > 0
        ? `Routed ${ops.length} update(s) via heuristics to ${planetsTouched.join(', ') || 'none'}.`
        : 'Could not map that text to a planet update. Try including a meal, workout, sleep, or lab value.',
    planetsTouched,
  };
};

const sendKind = async (kind, payload, payloadRef) => {
  const route = SIGNAL_ROUTES[kind];
  if (!route) return;
  await signalsRepo.send({ ...route, kind, payload, payloadRef });
};

const applyOps = async (ops) => {
  const planets = new Set();
  let applied = 0;
  for (const op of ops) {
    const day = op.day || todayKey();
    if (op.type === 'meal') {
      const id = await galleyRepo.log({
        name: op.name,
        slot: op.slot || 'snack',
        calories: Number(op.calories) || 0,
        protein: Number(op.protein) || 0,
        carbs: Number(op.carbs) || 0,
        fat: Number(op.fat) || 0,
        loggedOn: day,
      });
      await sendKind(
        SIGNAL_KINDS.MACROS_LOGGED,
        { name: op.name, calories: Number(op.calories) || 0, protein: Number(op.protein) || 0 },
        `meals:${id}`
      );
      planets.add('galley');
      planets.add('atlas');
      applied += 1;
    } else if (op.type === 'workout') {
      const minutes = Number(op.minutes) || 0;
      const intensity = Number(op.intensity) || 3;
      const burn = Number(op.burn) || Math.round(minutes * (4 + intensity));
      const id = await atlasRepo.log({
        name: op.name,
        modality: op.modality || 'mixed',
        minutes,
        intensity,
        burn,
        notes: op.notes,
        loggedOn: day,
      });
      await sendKind(SIGNAL_KINDS.BURN_LOGGED, { name: op.name, burn, minutes }, `workouts:${id}`);
      await sendKind(
        SIGNAL_KINDS.LOAD_LOGGED,
        { name: op.name, load: minutes * intensity },
        `workouts:${id}`
      );
      planets.add('atlas');
      planets.add('galley');
      planets.add('lumen');
      applied += 1;
    } else if (op.type === 'checkin') {
      const mood = Math.max(1, Math.min(5, Number(op.mood) || 3));
      const focus = Math.max(1, Math.min(5, Number(op.focus) || 3));
      const sleepHours = Number(op.sleep_hours) || 0;
      const id = await lumenRepo.log({
        mood,
        focus,
        sleepHours,
        note: op.note || '',
        loggedOn: day,
      });
      const readiness = (mood + focus + Math.min(sleepHours, 8) / 1.6) / 3;
      await sendKind(
        SIGNAL_KINDS.READINESS_LOGGED,
        { readiness, sleepHours },
        `checkins:${id}`
      );
      planets.add('lumen');
      planets.add('atlas');
      applied += 1;
    } else if (op.type === 'marker') {
      const id = await observatoryRepo.log({
        marker: op.marker,
        value: Number(op.value),
        unit: op.unit || '',
        referenceLow: op.ref_low,
        referenceHigh: op.ref_high,
        panel: op.panel || 'General',
        note: op.notes,
        collectedOn: day,
      });
      await sendKind(SIGNAL_KINDS.MARKER_LOGGED, { marker: op.marker }, `markers:${id}`);
      planets.add('observatory');
      planets.add('lumen');
      applied += 1;
    } else if (op.type === 'recipe') {
      await galleyRepo.addRecipe({
        title: op.title,
        ingredients: op.ingredients || '',
        instructions: op.instructions || '',
        tags: op.tags || '',
      });
      planets.add('galley');
      applied += 1;
    } else if (op.type === 'pantry') {
      await galleyRepo.addPantry({
        name: op.name,
        quantity: Number(op.quantity) || 1,
        unit: op.unit || '',
        location: op.location || 'galley',
      });
      planets.add('galley');
      applied += 1;
    } else if (op.type === 'grocery') {
      await galleyRepo.addGrocery({
        name: op.name,
        quantity: Number(op.quantity) || 1,
        unit: op.unit || '',
      });
      planets.add('galley');
      applied += 1;
    } else if (op.type === 'meal_plan') {
      await galleyRepo.addPlan({
        day,
        slot: op.slot || 'dinner',
        title: op.title,
      });
      planets.add('galley');
      applied += 1;
    }
  }
  return { applied, planetsTouched: [...planets] };
};

const heuristicReply = (plan, applied) => {
  if (applied > 0 && plan.planetsTouched.length) {
    return `Logged ${applied} update${applied === 1 ? '' : 's'} on ${plan.planetsTouched.join(', ')}. ${plan.summary}`.trim();
  }
  return (
    plan.summary ||
    'I heard you. Try a meal, workout, sleep hours, or a lab value and I will file it on the right world.'
  );
};

const routePlan = async (text) => {
  try {
    const raw = await generateText(`${ROUTER_PROMPT}\n\nUser update:\n${text}`);
    const parsed = JSON.parse(stripCodeFences(raw));
    const ops = Array.isArray(parsed.ops) ? parsed.ops.filter(Boolean) : [];
    if (ops.length) {
      return {
        ops,
        summary: parsed.summary || `AI routed ${ops.length} op(s).`,
        planetsTouched: [],
        mode: 'ai',
      };
    }
  } catch {
    /* local heuristic */
  }
  const plan = heuristicRoute(text);
  return { ...plan, mode: 'heuristic' };
};

const localReply = async (text, plan, applied, recent) => {
  const history =
    (recent || [])
      .slice(-8)
      .map((m) => `${m.role === 'user' ? 'Pilot' : 'First Mate'}: ${m.text}`)
      .join('\n') || '(none)';
  try {
    const reply = await generateText(
      `You are First Mate, the neural lattice at the centre of Galaxy Health. Worlds orbit you. Speak in 1-3 short sentences. Confirm what you logged and which worlds. Not medical advice.
Recent:
${history}
Pilot said: ${text}
Routing: ${plan.summary}
Ops applied (${applied}): ${JSON.stringify(plan.ops)}
Reply as First Mate only.`
    );
    if (reply?.trim()) return reply.trim();
  } catch {
    /* heuristic */
  }
  return heuristicReply(plan, applied);
};

export const talkToFirstMate = async (text, settings = {}) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Say something for First Mate to log.');

  const recent = await firstMateRepo.list();
  await firstMateRepo.insert({
    id: uid(),
    role: 'user',
    text: trimmed,
    channel: 'mobile',
    created_at: Date.now(),
  });

  const uplinkUrl = String(settings.first_mate_uplink_url || '').trim();
  const uplinkToken = String(settings.first_mate_uplink_token || '').trim();
  if (uplinkUrl && uplinkToken) {
    try {
      const res = await fetch(uplinkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${uplinkToken}`,
        },
        body: JSON.stringify({ text: trimmed, channel: 'mobile' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) {
        const plan = heuristicRoute(trimmed);
        const local = await applyOps(plan.ops);
        await firstMateRepo.insert({
          id: uid(),
          role: 'assistant',
          text: data.reply,
          channel: 'mobile',
          planetsTouched: data.planetsTouched || local.planetsTouched,
          applied: data.applied ?? local.applied,
          created_at: Date.now(),
        });
        emit(EVENTS.DATA_CHANGED, { source: 'first-mate' });
        return {
          reply: data.reply,
          applied: data.applied ?? local.applied,
          planetsTouched: data.planetsTouched || local.planetsTouched,
        };
      }
    } catch {
      /* fall through to local */
    }
  }

  const plan = await routePlan(trimmed);
  const local = await applyOps(plan.ops);
  plan.planetsTouched = local.planetsTouched;
  const reply = await localReply(trimmed, plan, local.applied, recent);
  await firstMateRepo.insert({
    id: uid(),
    role: 'assistant',
    text: reply,
    channel: 'mobile',
    planetsTouched: local.planetsTouched,
    applied: local.applied,
    created_at: Date.now(),
  });
  emit(EVENTS.DATA_CHANGED, { source: 'first-mate' });
  return { reply, applied: local.applied, planetsTouched: local.planetsTouched };
};
