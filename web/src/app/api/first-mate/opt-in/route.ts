import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadGalaxyStore, saveGalaxyStore } from "@/lib/drive-store";
import { normalizePhone } from "@/lib/phone";
import {
  publicAppOrigin,
  startWelcomeMessage,
} from "@/lib/sms-consent";
import { sendTwilioSms } from "@/lib/twilio";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Sign in to finish SMS opt-in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    consent?: boolean;
  };

  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Consent checkbox must be selected. It is never pre-checked." },
      { status: 400 }
    );
  }

  const phone = normalizePhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
  }

  try {
    const store = await loadGalaxyStore(session.accessToken);
    store.firstMate = {
      ...store.firstMate,
      phone,
      smsConsent: "pending",
      smsConsentAt: Date.now(),
      smsConsentSource: "web",
    };
    const saved = await saveGalaxyStore(session.accessToken, store);
    const origin = publicAppOrigin(request);
    const welcome = startWelcomeMessage(origin);

    let smsSent = false;
    let message = `Saved ${phone}. Text START to the First Mate number, then reply YES.`;
    try {
      await sendTwilioSms(phone, welcome);
      smsSent = true;
      message = `We texted ${phone}. Reply YES to confirm.`;
    } catch (err) {
      message =
        err instanceof Error
          ? `${err.message} Number saved as pending — text START, then YES.`
          : message;
    }

    return NextResponse.json({
      ok: true,
      phone: saved.firstMate.phone,
      smsConsent: saved.firstMate.smsConsent,
      smsSent,
      message,
      twilioNumber: process.env.TWILIO_PHONE_NUMBER || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save opt-in" },
      { status: 400 }
    );
  }
}
