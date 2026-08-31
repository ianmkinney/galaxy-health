"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  CONSENT_CHECKBOX_LABEL,
  SMS_FREQUENCY,
  SMS_HELP_STOP,
  SMS_KEYWORD,
  SMS_MESSAGE_TYPES,
  SMS_RATE_DISCLAIMER,
  formatPhoneDisplay,
} from "@/lib/sms-consent";

const DRAFT_KEY = "galaxy-health-sms-opt-in";

type Draft = { phone: string; consented: boolean };

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (typeof parsed.phone !== "string") return null;
    return { phone: parsed.phone, consented: Boolean(parsed.consented) };
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft) {
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  window.sessionStorage.removeItem(DRAFT_KEY);
}

export function SmsOptInForm({
  twilioNumber,
  preview = false,
}: {
  twilioNumber: string | null;
  preview?: boolean;
}) {
  const { status } = useSession();
  const [phone, setPhone] = useState("");
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const autoSent = useRef(false);

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setPhone(draft.phone);
      setConsented(draft.consented);
    }
  }, []);

  useEffect(() => {
    if (preview || status !== "authenticated" || autoSent.current) return;
    const draft = readDraft();
    if (!draft?.consented || !draft.phone) return;
    autoSent.current = true;
    setPhone(draft.phone);
    setConsented(true);
    setBusy(true);
    void (async () => {
      try {
        const res = await fetch("/api/first-mate/opt-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: draft.phone, consent: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start opt-in");
        clearDraft();
        setMsg(
          data.smsSent
            ? `Check ${data.phone}. Reply YES to finish opt-in.`
            : data.message ||
                `Saved ${data.phone}. Text ${SMS_KEYWORD} to the First Mate number, then reply YES.`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start opt-in");
      } finally {
        setBusy(false);
      }
    })();
  }, [preview, status]);

  const displayNumber = twilioNumber ? formatPhoneDisplay(twilioNumber) : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (preview) return;
    setError("");
    setMsg("");
    if (!consented) {
      setError("Check the consent box to opt in. It is never pre-selected.");
      return;
    }
    if (status !== "authenticated") {
      writeDraft({ phone, consented: true });
      await signIn("google", { callbackUrl: "/sms" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/first-mate/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, consent: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start opt-in");
      clearDraft();
      setMsg(
        data.smsSent
          ? `Check ${data.phone}. Reply YES to finish opt-in.`
          : data.message || `Saved ${data.phone}. Text ${SMS_KEYWORD} to the First Mate number, then reply YES.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start opt-in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel title="Text First Mate" accent="#7AF0FF" index={0}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-white/65">{SMS_MESSAGE_TYPES}</p>
        <p className="text-sm text-white/65">{SMS_FREQUENCY}</p>
        <p className="text-sm text-white/65">
          {SMS_RATE_DISCLAIMER} {SMS_HELP_STOP}
        </p>
        {displayNumber ? (
          <p className="text-sm text-cyan-200/85">
            Or text <span className="font-semibold">{SMS_KEYWORD}</span> to {displayNumber}, then
            reply YES to confirm.
          </p>
        ) : (
          <p className="text-sm text-white/45">
            Text <span className="font-semibold text-white/70">{SMS_KEYWORD}</span> to the Galaxy
            Health First Mate long code after it is published on this page, then reply YES.
          </p>
        )}

        <label className="block text-[10px] uppercase tracking-widest text-white/40">
          Mobile phone number
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 010-0100"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm tracking-normal text-white outline-none focus:border-cyan-300/40"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
          <input
            type="checkbox"
            name="consent"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-cyan-300"
          />
          <span className="text-sm leading-relaxed text-white/70">{CONSENT_CHECKBOX_LABEL}</span>
        </label>

        <p className="text-xs text-white/45">
          <Link href="/terms" className="text-cyan-200/80 underline-offset-2 hover:underline">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/privacy" className="text-cyan-200/80 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
        </p>

        <ShimmerButton
          tone="#7AF0FF"
          type="submit"
          disabled={busy || preview}
          className="min-w-[220px]"
        >
          {busy ? "Sending…" : "Yes, sign me up!"}
        </ShimmerButton>

        {status !== "authenticated" && !preview ? (
          <p className="text-xs text-white/40">
            You will sign in with Google so this number is saved to your private Drive store, then
            we text you for a YES confirmation.
          </p>
        ) : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {msg ? <p className="text-sm text-cyan-100/90">{msg}</p> : null}
      </form>
    </GlassPanel>
  );
}
