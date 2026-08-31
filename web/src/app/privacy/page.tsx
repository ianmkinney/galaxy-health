import { LegalShell } from "@/components/legal-footer";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  SMS_FREQUENCY,
  SMS_HELP_STOP,
  SMS_MESSAGE_TYPES,
  SMS_PROGRAM_NAME,
  SMS_RATE_DISCLAIMER,
} from "@/lib/sms-consent";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Galaxy Health",
  description: `How ${SMS_PROGRAM_NAME} handles mobile numbers, health logs, and SMS.`,
};

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="Legal" title="Privacy Policy">
      <p className="text-xs uppercase tracking-widest text-white/35">Effective 30 August 2026</p>

      <GlassPanel title="Who we are" accent="#4CE0FF" index={0}>
        <p>
          Galaxy Health is a personal health galaxy. Worlds orbit First Mate, the neural lattice you
          talk to. Web data lives in your private Google Drive app folder. Mobile data stays on
          device unless you opt into your own AI key.
        </p>
      </GlassPanel>

      <GlassPanel title="SMS / mobile numbers" accent="#7AF0FF" index={1}>
        <p>
          <strong className="text-white">We do not share, sell, or rent mobile phone numbers</strong>{" "}
          to third parties or affiliates for their marketing. Your number is used only to send and
          receive {SMS_PROGRAM_NAME} messages you opted into, to verify STOP/HELP/START, and to match
          inbound texts to your Galaxy Health account.
        </p>
        <p className="mt-3">{SMS_MESSAGE_TYPES}</p>
        <p className="mt-3">{SMS_FREQUENCY}</p>
        <p className="mt-3">{SMS_RATE_DISCLAIMER}</p>
        <p className="mt-3">{SMS_HELP_STOP}</p>
        <p className="mt-3">
          Opt in at{" "}
          <Link href="/sms" className="text-cyan-200/85 underline-offset-2 hover:underline">
            /sms
          </Link>{" "}
          or by texting START to the First Mate number, then replying YES. Privacy questions about
          SMS can be sent from the signed-in app (Settings → First Mate) or by texting HELP.
        </p>
      </GlassPanel>

      <GlassPanel title="What we store" accent="#A98BFF" index={2}>
        <ul className="list-disc space-y-2 pl-5">
          <li>Google account identity needed to sign in on the web.</li>
          <li>
            Health logs, files, and settings in your Drive app folder (web) or on-device SQLite
            (mobile).
          </li>
          <li>
            Optional First Mate phone number, SMS consent state, and recent First Mate messages.
          </li>
          <li>Optional AI provider keys you paste (stored only in your private store).</li>
        </ul>
      </GlassPanel>

      <GlassPanel title="Processors" accent="#FF8A3D" index={3}>
        <p>
          Google provides sign-in and Drive storage. Twilio delivers SMS if you opt in. Your chosen
          AI provider (if any) receives the prompts you send through First Mate. We do not use your
          mobile number for third-party marketing lists.
        </p>
      </GlassPanel>

      <GlassPanel title="Retention" accent="#FF4D6D" index={4}>
        <p>
          You can unlink your number, reply STOP, revoke the agent token, or delete Drive app data
          / purge the mobile database. STOP ends SMS; it does not erase prior health logs unless you
          delete them.
        </p>
      </GlassPanel>
    </LegalShell>
  );
}
