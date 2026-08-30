import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadGalaxyStore, saveGalaxyStore } from "@/lib/drive-store";
import { countTestRows, seedHealthyTestData, stripTestData } from "@/lib/test-data";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action === "clear" ? "clear" : "seed";

  const store = await loadGalaxyStore(session.accessToken);
  const next = action === "clear" ? stripTestData(store) : seedHealthyTestData(store);
  const saved = await saveGalaxyStore(session.accessToken, next);

  return NextResponse.json({
    ok: true,
    action,
    testRows: countTestRows(saved),
    store: saved,
  });
}
