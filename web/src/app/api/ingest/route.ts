import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadGalaxyStore, saveGalaxyStore } from "@/lib/drive-store";
import { routeAndApplyUpdate } from "@/lib/route-update";
import { loadStoreForAgent, saveGalaxyStoreWithAccess } from "@/lib/agent-access";

function readAgentToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const url = new URL(request.url);
  return bearer || url.searchParams.get("token") || "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("text") || url.searchParams.get("q") || "";
  return handleIngest(request, text);
}

export async function POST(request: Request) {
  let text = "";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    text = String(body.text || body.message || body.update || "");
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    text = String(form.get("text") || form.get("message") || "");
  } else {
    text = (await request.text()).trim();
  }
  return handleIngest(request, text);
}

async function handleIngest(request: Request, text: string) {
  if (!text.trim()) {
    return NextResponse.json(
      {
        error: "Missing text",
        usage: {
          get: "/api/ingest?token=AGENT_TOKEN&text=Ate%20eggs%20and%20ran%2030%20min",
          post: 'POST /api/ingest with Authorization: Bearer AGENT_TOKEN and JSON {"text":"..."}',
          session: "While signed in to Galaxy Health, omit the token.",
        },
      },
      { status: 400 }
    );
  }

  const session = await auth();
  if (session?.accessToken && !session.error) {
    try {
      const store = await loadGalaxyStore(session.accessToken);
      const routed = await routeAndApplyUpdate(store, text, "user");
      await saveGalaxyStore(session.accessToken, routed.store);
      return NextResponse.json({
        ok: true,
        mode: routed.mode,
        applied: routed.applied,
        planetsTouched: routed.plan.planetsTouched,
        summary: routed.plan.summary,
        ops: routed.plan.ops,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Ingest failed" },
        { status: 400 }
      );
    }
  }

  const agentToken = readAgentToken(request);
  if (!agentToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const loaded = await loadStoreForAgent(agentToken);
    const routed = await routeAndApplyUpdate(loaded.store, text, "agent");
    await saveGalaxyStoreWithAccess(loaded.googleAccessToken, routed.store);
    return NextResponse.json({
      ok: true,
      mode: routed.mode,
      applied: routed.applied,
      planetsTouched: routed.plan.planetsTouched,
      summary: routed.plan.summary,
      ops: routed.plan.ops,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 401 }
    );
  }
}
