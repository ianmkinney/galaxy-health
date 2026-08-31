import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import { SmsOptInForm } from "@/components/sms-opt-in-form";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  SMS_CONFIRM_KEYWORD,
  SMS_FREQUENCY,
  SMS_HELP_STOP,
  SMS_KEYWORD,
  SMS_PROGRAM_NAME,
  SMS_RATE_DISCLAIMER,
  confirmMessage,
  formatPhoneDisplay,
  helpMessage,
  startWelcomeMessage,
  stopMessage,
  legalUrls,
  publicAppOrigin,
} from "@/lib/sms-consent";

export const metadata = {
  title: "SMS message flow — Galaxy Health",
  description: `A2P campaign collateral for ${SMS_PROGRAM_NAME}: web opt-in and keyword screenshots.`,
};

function Bubble({
  from,
  children,
}: {
  from: "user" | "first-mate";
  children: string;
}) {
  const mine = from === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
          mine
            ? "bg-cyan-300 text-slate-950"
            : "border border-white/10 bg-white/[0.06] text-white/85"
        }`}
      >
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] opacity-70">
          {mine ? "End user" : "First Mate"}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function SmsFlowPage() {
  const origin = publicAppOrigin() || "https://example.com";
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER || null;
  const display = twilioNumber ? formatPhoneDisplay(twilioNumber) : "[First Mate long code]";
  const urls = legalUrls(origin);

  return (
    <main className="min-h-screen bg-[#05070F] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/sms" className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
          ← SMS opt-in
        </Link>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
          A2P campaign collateral
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Message flow</h1>
        <p className="mt-3 text-sm text-white/55">
          Public screenshot page for Twilio / carrier reviewers. Live web form:{" "}
          <Link href="/sms" className="text-cyan-200/85 underline-offset-2 hover:underline">
            {urls.sms}
          </Link>
          . Keyword: text {SMS_KEYWORD} to {display}.
        </p>

        <div className="mt-8 space-y-4">
          <GlassPanel title="1. Web opt-in form" accent="#7AF0FF" index={0}>
            <p className="mb-4 text-sm text-white/55">
              Consent checkbox is never pre-selected. Submit language is “Yes, sign me up!” The live
              form is at{" "}
              <Link href="/sms" className="text-cyan-200/85 underline-offset-2 hover:underline">
                /sms
              </Link>
              .
            </p>
            <SmsOptInForm twilioNumber={twilioNumber} preview />
          </GlassPanel>

          <GlassPanel title="2. Text-in keyword" accent="#A98BFF" index={1}>
            <p className="mb-4 text-sm text-white/55">
              End user texts {SMS_KEYWORD} to {display}. First Mate replies with the welcome,
              frequency, {SMS_RATE_DISCLAIMER.toLowerCase()} HELP/STOP, and links, then waits for{" "}
              {SMS_CONFIRM_KEYWORD}.
            </p>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
              <Bubble from="user">{SMS_KEYWORD}</Bubble>
              <Bubble from="first-mate">{startWelcomeMessage(origin)}</Bubble>
              <Bubble from="user">{SMS_CONFIRM_KEYWORD}</Bubble>
              <Bubble from="first-mate">{confirmMessage(origin)}</Bubble>
            </div>
          </GlassPanel>

          <GlassPanel title="3. HELP and STOP" accent="#FF8A3D" index={2}>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
              <Bubble from="user">HELP</Bubble>
              <Bubble from="first-mate">{helpMessage(origin)}</Bubble>
              <Bubble from="user">STOP</Bubble>
              <Bubble from="first-mate">{stopMessage(origin)}</Bubble>
            </div>
            <p className="mt-4 text-xs text-white/40">
              {SMS_FREQUENCY} {SMS_HELP_STOP} Privacy: {urls.privacy} · Terms: {urls.terms}
            </p>
          </GlassPanel>
        </div>

        <LegalFooter className="mt-12 border-t border-white/10 pt-6" />
      </div>
    </main>
  );
}
