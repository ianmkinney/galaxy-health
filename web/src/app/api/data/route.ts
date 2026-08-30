import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadGalaxyStore, saveGalaxyStore } from "@/lib/drive-store";
import type { GalaxyStore } from "@/lib/galaxy-types";

async function requireToken() {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { token: session.accessToken };
}

export async function GET() {
  const gate = await requireToken();
  if ("error" in gate) return gate.error;

  try {
    const store = await loadGalaxyStore(gate.token);
    return NextResponse.json(store);
  } catch (error) {
    console.error("[drive] load failed", error);
    return NextResponse.json(
      { error: "Could not load your Galaxy Health data from Google Drive." },
      { status: 502 }
    );
  }
}

export async function PUT(request: Request) {
  const gate = await requireToken();
  if ("error" in gate) return gate.error;

  try {
    const body = (await request.json()) as GalaxyStore;
    if (!body || body.version !== 1) {
      return NextResponse.json({ error: "Invalid store payload" }, { status: 400 });
    }
    const saved = await saveGalaxyStore(gate.token, body);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("[drive] save failed", error);
    return NextResponse.json(
      { error: "Could not save to Google Drive." },
      { status: 502 }
    );
  }
}
