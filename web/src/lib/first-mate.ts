import { generateText } from "./ai-client";
import {
  uid,
  type AiSettings,
  type DataSource,
  type FirstMateChannel,
  type FirstMateMessage,
  type GalaxyStore,
  type PlanetId,
  DEFAULT_FIRST_MATE,
} from "./galaxy-types";
import { routeAndApplyUpdate } from "./route-update";
import type { IngestPlan } from "./ingest-router";

export { normalizePhone, phonesMatch } from "./phone";

export const FIRST_MATE_MESSAGE_CAP = 40;

export function heuristicReply(plan: IngestPlan, applied: number) {
  if (applied > 0 && plan.planetsTouched.length) {
    const worlds = plan.planetsTouched.join(", ");
    return `Logged ${applied} update${applied === 1 ? "" : "s"} on ${worlds}. ${plan.summary}`.trim();
  }
  return (
    plan.summary ||
    "I heard you. Try a meal, workout, sleep hours, or a lab value and I'll file it on the right world."
  );
}

function trimMessages(messages: FirstMateMessage[]) {
  if (messages.length <= FIRST_MATE_MESSAGE_CAP) return messages;
  return messages.slice(-FIRST_MATE_MESSAGE_CAP);
}

function replyPrompt(opts: {
  channel: FirstMateChannel;
  text: string;
  recent: FirstMateMessage[];
  plan: IngestPlan;
  applied: number;
}) {
  const history =
    opts.recent
      .slice(-8)
      .map((m) => `${m.role === "user" ? "Pilot" : "First Mate"}: ${m.text}`)
      .join("\n") || "(none)";
  const smsRule =
    opts.channel === "sms" ? "Keep the whole reply under 280 characters — this is an SMS." : "";
  return `You are First Mate, the neural lattice at the centre of Galaxy Health. Worlds orbit you. Speak in 1–3 short sentences, in character. Confirm what you logged and which worlds. If nothing logged, ask one clarifying question. Not medical advice. No diagnoses.
${smsRule}

Recent conversation:
${history}

Pilot said: ${opts.text}
Routing summary: ${opts.plan.summary}
Ops applied (${opts.applied}): ${JSON.stringify(opts.plan.ops)}
Planets touched: ${opts.plan.planetsTouched.join(", ") || "none"}

Reply as First Mate only — no JSON, no markdown fences.`;
}

export async function runFirstMate(
  store: GalaxyStore,
  text: string,
  options: { source?: DataSource; channel: FirstMateChannel }
): Promise<{
  store: GalaxyStore;
  reply: string;
  applied: number;
  planetsTouched: PlanetId[];
  mode: "ai" | "heuristic";
}> {
  const trimmed = text.trim();
  const routed = await routeAndApplyUpdate(store, trimmed, options.source ?? "user");
  const prior = routed.store.firstMate ?? DEFAULT_FIRST_MATE;
  const messages = [...(prior.messages ?? [])];

  const userMessage: FirstMateMessage = {
    id: uid(),
    role: "user",
    text: trimmed,
    channel: options.channel,
    created_at: Date.now(),
  };

  let reply = heuristicReply(routed.plan, routed.applied);
  let mode: "ai" | "heuristic" = "heuristic";
  const hasKey = Boolean(routed.store.ai.keys[routed.store.ai.provider]);
  if (hasKey) {
    try {
      reply = (
        await generateText(
          routed.store.ai as AiSettings,
          replyPrompt({
            channel: options.channel,
            text: trimmed,
            recent: messages,
            plan: routed.plan,
            applied: routed.applied,
          })
        )
      ).trim();
      if (reply) mode = "ai";
      else reply = heuristicReply(routed.plan, routed.applied);
    } catch {
      reply = heuristicReply(routed.plan, routed.applied);
    }
  }

  const assistantMessage: FirstMateMessage = {
    id: uid(),
    role: "assistant",
    text: reply,
    channel: options.channel,
    created_at: Date.now(),
    planetsTouched: routed.plan.planetsTouched,
    applied: routed.applied,
  };

  return {
    store: {
      ...routed.store,
      firstMate: {
        ...prior,
        phone: prior.phone ?? null,
        messages: trimMessages([...messages, userMessage, assistantMessage]),
      },
    },
    reply,
    applied: routed.applied,
    planetsTouched: routed.plan.planetsTouched,
    mode,
  };
}
