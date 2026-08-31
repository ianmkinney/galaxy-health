import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadGalaxyStore } from "@/lib/drive-store";
import { fallbackModels, listProviderModels, type ProviderId } from "@/lib/ai-client";

const PROVIDERS: ProviderId[] = ["anthropic", "openai", "xai", "gemini"];

function isProvider(value: unknown): value is ProviderId {
  return typeof value === "string" && PROVIDERS.includes(value as ProviderId);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { provider?: string; apiKey?: string };
    if (!isProvider(body.provider)) {
      return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
    }

    let apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!apiKey) {
      const store = await loadGalaxyStore(session.accessToken);
      apiKey = store.ai.keys[body.provider] || "";
    }
    if (!apiKey) {
      return NextResponse.json({ error: "Add an API key in Settings to list models." }, { status: 400 });
    }

    try {
      const models = await listProviderModels({ provider: body.provider, apiKey });
      return NextResponse.json({ models, via: "live" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not list models";
      return NextResponse.json({
        models: fallbackModels(body.provider),
        via: "fallback",
        notice: message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list models";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
