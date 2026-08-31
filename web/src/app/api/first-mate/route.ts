import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadGalaxyStore, saveGalaxyStore } from "@/lib/drive-store";
import { loadStoreForAgent, saveGalaxyStoreWithAccess } from "@/lib/agent-access";
import { runFirstMate } from "@/lib/first-mate";
import type { FirstMateChannel } from "@/lib/galaxy-types";

function readAgentToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const url = new URL(request.url);
  return bearer || url.searchParams.get("token") || "";
}

function asChannel(value: unknown): FirstMateChannel {
  if (value === "mobile" || value === "sms" || value === "web") return value;
  return "web";
}

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const store = await loadGalaxyStore(session.accessToken);
    return NextResponse.json({
      phone: store.firstMate?.phone ?? null,
      smsConsent: store.firstMate?.smsConsent ?? "none",
      smsConsentAt: store.firstMate?.smsConsentAt ?? null,
      messages: store.firstMate?.messages ?? [],
      twilioNumber: process.env.TWILIO_PHONE_NUMBER || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load First Mate" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { phone?: string | null };
    const store = await loadGalaxyStore(session.accessToken);
    if (body.phone == null || body.phone === "") {
      store.firstMate = {
        ...store.firstMate,
        phone: null,
        smsConsent: "opted_out",
        smsConsentAt: Date.now(),
      };
      const saved = await saveGalaxyStore(session.accessToken, store);
      return NextResponse.json({
        phone: saved.firstMate.phone,
        smsConsent: saved.firstMate.smsConsent,
        twilioNumber: process.env.TWILIO_PHONE_NUMBER || null,
      });
    }
    return NextResponse.json(
      { error: "Link a number through the SMS opt-in form so consent is recorded." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save phone" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  let text = "";
  let channel: FirstMateChannel = "web";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    text = String(body.text || body.message || body.update || "");
    channel = asChannel(body.channel);
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    text = String(form.get("text") || form.get("message") || "");
    channel = asChannel(form.get("channel"));
  } else {
    text = (await request.text()).trim();
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const session = await auth();
  if (session?.accessToken && !session.error) {
    try {
      const store = await loadGalaxyStore(session.accessToken);
      const result = await runFirstMate(store, text, { source: "user", channel });
      await saveGalaxyStore(session.accessToken, result.store);
      return NextResponse.json({
        ok: true,
        reply: result.reply,
        applied: result.applied,
        planetsTouched: result.planetsTouched,
        mode: result.mode,
        messages: result.store.firstMate.messages,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "First Mate failed" },
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
    const result = await runFirstMate(loaded.store, text, {
      source: "agent",
      channel: channel === "web" ? "mobile" : channel,
    });
    await saveGalaxyStoreWithAccess(loaded.googleAccessToken, result.store);
    return NextResponse.json({
      ok: true,
      reply: result.reply,
      applied: result.applied,
      planetsTouched: result.planetsTouched,
      mode: result.mode,
      messages: result.store.firstMate.messages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "First Mate failed" },
      { status: 401 }
    );
  }
}
