import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { auth } from "@/auth";
import { loadGalaxyStore, saveGalaxyStore } from "@/lib/drive-store";
import { mintAgentCredential, newTokenId } from "@/lib/agent-access";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hdrs = await headers();
  const jwt = await getToken({
    req: { headers: hdrs } as Parameters<typeof getToken>[0]["req"],
    secret: process.env.AUTH_SECRET,
  });
  const refreshToken = jwt?.refreshToken;
  if (!refreshToken) {
    return NextResponse.json(
      {
        error:
          "No Google refresh token in session. Sign out, then sign in again so Google consent can issue offline access.",
      },
      { status: 400 }
    );
  }

  const tokenId = newTokenId();
  const credential = mintAgentCredential(refreshToken, tokenId);
  const store = await loadGalaxyStore(session.accessToken);
  store.agent = { token: tokenId, created_at: Date.now() };
  await saveGalaxyStore(session.accessToken, store);

  const url = new URL(request.url);
  const origin = process.env.AUTH_URL || `${url.protocol}//${url.host}`;
  const ingestUrl = `${origin}/api/ingest`;
  const firstMateUrl = `${origin}/api/first-mate`;
  const firstMateSmsUrl = `${origin}/api/first-mate/sms?token=${encodeURIComponent(credential)}`;
  const getExample = `${ingestUrl}?token=${encodeURIComponent(credential)}&text=${encodeURIComponent("Ate eggs (420 kcal) and ran 30 min, slept 7.5h")}`;
  const agentPrompt = buildAgentPrompt({ origin, ingestUrl, token: credential });

  return NextResponse.json({
    token: credential,
    tokenId,
    origin,
    ingestUrl,
    firstMateUrl,
    firstMateSmsUrl,
    agentPrompt,
    examples: {
      get: getExample,
      post: `curl -X POST ${ingestUrl} -H "Authorization: Bearer ${credential}" -H "Content-Type: application/json" -d '{"text":"Leg day 45 min + chicken bowl 600 kcal"}'`,
    },
  });
}

function buildAgentPrompt(opts: { origin: string; ingestUrl: string; token: string }) {
  return `You are my Galaxy Health logging agent.

Whenever I mention food, workouts, sleep, mood, focus, labs/markers, recipes, pantry, or groceries, send that update to Galaxy Health. Do not ask me to open the app unless the request fails.

How to log (preferred — POST):
POST ${opts.ingestUrl}
Authorization: Bearer ${opts.token}
Content-Type: application/json

Body:
{"text":"<my free-form update in plain English>"}

Simple GET alternative (good for one-liners):
${opts.ingestUrl}?token=${encodeURIComponent(opts.token)}&text=<url-encoded update>

Rules:
- Put everything I said into the "text" field. Galaxy Health routes it into the right planets (Galley, Atlas, Lumen, Observatory).
- After each call, briefly confirm what was applied (planets touched / summary from the JSON response).
- If you get 401, tell me to revoke and regenerate the agent token in Galaxy Health → Settings.
- Keep my token secret. Never paste it into public chats or commit it.

App origin: ${opts.origin}`;
}

export async function DELETE() {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await loadGalaxyStore(session.accessToken);
  store.agent = { token: null, created_at: null };
  await saveGalaxyStore(session.accessToken, store);
  return NextResponse.json({ ok: true });
}
