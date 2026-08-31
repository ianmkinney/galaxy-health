import { LegalShell } from "@/components/legal-footer";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  SMS_FREQUENCY,
  SMS_HELP_STOP,
  SMS_KEYWORD,
  SMS_MESSAGE_TYPES,
  SMS_PROGRAM_NAME,
  SMS_RATE_DISCLAIMER,
} from "@/lib/sms-consent";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Galaxy Health",
  description: `Terms for Galaxy Health and the ${SMS_PROGRAM_NAME} text program.`,
};

export default function TermsPage() {
  return (
    <LegalShell eyebrow="Legal" title="Terms of Service">
      <p className="text-xs uppercase tracking-widest text-white/35">Effective 30 August 2026</p>

      <GlassPanel title="The service" accent="#4CE0FF" index={0}>
        <p>
          Galaxy Health lets you log meals, training, sleep, labs, and custom worlds around First
          Mate. It is not medical care, diagnosis, or emergency service. If you have a medical
          emergency, call your local emergency number.
        </p>
      </GlassPanel>

      <GlassPanel title={`${SMS_PROGRAM_NAME} SMS`} accent="#7AF0FF" index={1}>
        <p>
          By opting in — checking the box on{" "}
          <Link href="/sms" className="text-cyan-200/85 underline-offset-2 hover:underline">
            the SMS form
          </Link>{" "}
          and completing YES, or texting {SMS_KEYWORD} and replying YES — you agree to receive texts
          from Galaxy Health at the First Mate long code.
        </p>
        <p className="mt-3">{SMS_MESSAGE_TYPES}</p>
        <p className="mt-3">{SMS_FREQUENCY}</p>
        <p className="mt-3">{SMS_RATE_DISCLAIMER}</p>
        <p className="mt-3">{SMS_HELP_STOP}</p>
        <p className="mt-3">
          Carriers are not liable for delayed or undelivered messages. Consent is not a condition of
          purchase. There is no fee from Galaxy Health to subscribe; your carrier may charge for
          texts.
        </p>
        <p className="mt-3">
          See the{" "}
          <Link href="/privacy" className="text-cyan-200/85 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>{" "}
          for how mobile numbers are handled (including that we do not share them for third-party
          marketing).
        </p>
      </GlassPanel>

      <GlassPanel title="Accounts and data" accent="#A98BFF" index={2}>
        <p>
          Web access requires a Google account. You are responsible for what you log. You may stop
          using the service and delete data from Drive appData or the on-device database at any
          time.
        </p>
      </GlassPanel>

      <GlassPanel title="Limitation" accent="#FF4D6D" index={3}>
        <p>
          Galaxy Health is provided as-is. We are not liable for decisions you make from logs,
          First Mate replies, or missed messages. These terms are governed by the laws applicable
          to the operator of this instance, excluding conflict-of-law rules.
        </p>
      </GlassPanel>
    </LegalShell>
  );
}
