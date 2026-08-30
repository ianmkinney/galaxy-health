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

  return NextResponse.json({
    token: credential,
    tokenId,
    examples: {
      get: `${origin}/api/ingest?token=${encodeURIComponent(credential)}&text=${encodeURIComponent("Ate eggs (420 kcal) and ran 30 min, slept 7.5h")}`,
      post: `curl -X POST ${origin}/api/ingest -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"text":"Leg day 45 min + chicken bowl 600 kcal"}'`,
    },
  });
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
