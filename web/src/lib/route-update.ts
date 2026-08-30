import { generateText } from "./ai-client";
import type { AiSettings, GalaxyStore } from "./galaxy-types";
import {
  applyIngestOps,
  heuristicRoute,
  stripCodeFences,
  type IngestOp,
  type IngestPlan,
  type DataSource,
} from "./ingest-router";

const ROUTER_PROMPT = `You are the Galaxy Health routing computer.
Map the user's free-form update into structured operations for the solar-system health app.
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
- mood/focus are 1-5. Prefer realistic healthy defaults when numbers missing but intent clear.
- Never invent lab values that were not stated.
- Prefer multiple small ops over one vague op.`;

export async function routeAndApplyUpdate(
  store: GalaxyStore,
  text: string,
  source: DataSource = "agent"
): Promise<{
  store: GalaxyStore;
  plan: IngestPlan;
  applied: number;
  mode: "ai" | "heuristic";
}> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      store,
      plan: { ops: [], summary: "Empty update.", planetsTouched: [] },
      applied: 0,
      mode: "heuristic",
    };
  }

  let plan: IngestPlan;
  let mode: "ai" | "heuristic" = "heuristic";

  const hasKey = Boolean(store.ai.keys[store.ai.provider]);
  if (hasKey) {
    try {
      const raw = await generateText(
        store.ai as AiSettings,
        `${ROUTER_PROMPT}\n\nUser update:\n${trimmed}`
      );
      const parsed = JSON.parse(stripCodeFences(raw)) as {
        summary?: string;
        ops?: IngestOp[];
      };
      const ops = Array.isArray(parsed.ops) ? parsed.ops.filter(Boolean) : [];
      plan = {
        ops,
        summary: parsed.summary || `AI routed ${ops.length} op(s).`,
        planetsTouched: [],
      };
      mode = "ai";
    } catch {
      plan = heuristicRoute(trimmed);
      mode = "heuristic";
    }
  } else {
    plan = heuristicRoute(trimmed);
  }

  if (!plan.ops.length && mode === "ai") {
    plan = heuristicRoute(trimmed);
    mode = "heuristic";
  }

  const result = applyIngestOps(store, plan.ops, source);
  plan.planetsTouched = result.planetsTouched;
  if (!plan.summary) {
    plan.summary = `Applied ${result.applied} update(s).`;
  }

  return {
    store: result.store,
    plan,
    applied: result.applied,
    mode,
  };
}
