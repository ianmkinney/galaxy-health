import { SmsOptInForm } from "@/components/sms-opt-in-form";
import { LegalFooter } from "@/components/legal-footer";
import { SMS_PROGRAM_NAME } from "@/lib/sms-consent";
import Link from "next/link";

export const metadata = {
  title: "SMS opt-in — Galaxy Health",
  description: `Opt in to ${SMS_PROGRAM_NAME} texts. Consent is never pre-selected.`,
};

export default function SmsOptInPage() {
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER || null;

  return (
    <main className="min-h-screen bg-[#05070F] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
          ← Galaxy Health
        </Link>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
          First Mate SMS
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          Yes, sign me up for texts
        </h1>
        <p className="mt-3 text-sm text-white/55">
          Public opt-in for Galaxy Health First Mate. The consent box starts unchecked. After you
          submit, we text a welcome and wait for YES before any health-log replies.
        </p>
        <div className="mt-8">
          <SmsOptInForm twilioNumber={twilioNumber} />
        </div>
        <LegalFooter className="mt-12 border-t border-white/10 pt-6" />
      </div>
    </main>
  );
}
