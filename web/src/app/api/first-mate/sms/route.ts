import { NextResponse } from "next/server";
import { loadStoreForAgent, saveGalaxyStoreWithAccess } from "@/lib/agent-access";
import { phonesMatch, runFirstMate } from "@/lib/first-mate";
import { applySmsKeyword, publicAppOrigin } from "@/lib/sms-consent";
import { twilioSignatureValid, twimlMessage } from "@/lib/twilio";

function xml(body: string, status = 200) {
  return new NextResponse(twimlMessage(body), {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });

  const signature = request.headers.get("x-twilio-signature");
  if (!twilioSignatureValid(request, params, signature)) {
    return xml("Unauthorized.", 403);
  }

  const origin = publicAppOrigin(request);
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) {
    return xml("First Mate webhook is missing an agent token. Generate one in Settings.");
  }

  const body = String(params.Body || "").trim();
  const from = String(params.From || "");
  if (!body) {
    return xml("Empty message. Tell me a meal, workout, sleep, or lab value.");
  }

  try {
    const loaded = await loadStoreForAgent(token);
    const keyworded = applySmsKeyword(loaded.store, from, body, origin);
    if (keyworded.handled) {
      if (keyworded.store !== loaded.store) {
        await saveGalaxyStoreWithAccess(loaded.googleAccessToken, keyworded.store);
      }
      return xml(keyworded.reply);
    }

    const linked = keyworded.store.firstMate?.phone ?? null;
    if (!phonesMatch(from, linked)) {
      return xml("This number is not linked to First Mate.");
    }

    const result = await runFirstMate(keyworded.store, body, { source: "agent", channel: "sms" });
    await saveGalaxyStoreWithAccess(loaded.googleAccessToken, result.store);
    return xml(result.reply);
  } catch (error) {
    const message = error instanceof Error ? error.message : "First Mate failed";
    return xml(message);
  }
}
