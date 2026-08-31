import { DEFAULT_FIRST_MATE, type GalaxyStore, type FirstMateSettings } from "./galaxy-types";
import { normalizePhone } from "./phone";

export const SMS_PROGRAM_NAME = "Galaxy Health First Mate";
export const SMS_KEYWORD = "START";
export const SMS_CONFIRM_KEYWORD = "YES";

/** Typical volume — required on the opt-in form, privacy policy, and HELP. */
export const SMS_FREQUENCY =
  "Message frequency varies. Typical volume is 1–8 messages per week, based on how often you text First Mate.";

export const SMS_RATE_DISCLAIMER = "Message and data rates may apply.";

export const SMS_MESSAGE_TYPES =
  "First Mate texts are conversational replies that log meals, workouts, sleep, labs, and other health notes you send. We do not send advertising or marketing texts.";

export const SMS_HELP_STOP =
  "Reply HELP for help. Reply STOP to cancel. You can opt out at any time.";

export type SmsKeyword = "stop" | "start" | "yes" | "help" | "other";

export function publicAppOrigin(request?: Request | null) {
  const configured = process.env.AUTH_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (request) {
    const incoming = new URL(request.url);
    const proto = request.headers.get("x-forwarded-proto") || incoming.protocol.replace(":", "");
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host") || incoming.host;
    return `${proto}://${host}`;
  }
  return "";
}

export function legalUrls(origin: string) {
  const base = origin.replace(/\/$/, "");
  return {
    origin: base,
    sms: `${base}/sms`,
    flow: `${base}/sms/flow`,
    privacy: `${base}/privacy`,
    terms: `${base}/terms`,
  };
}

export function formatPhoneDisplay(raw: string | null | undefined) {
  const e164 = normalizePhone(raw);
  if (!e164) return raw?.trim() || "";
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

export function classifySmsKeyword(body: string): SmsKeyword {
  const token = body.trim().toUpperCase().replace(/[!.?,]/g, "");
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(token)) return "stop";
  if (token === "START" || token === "UNSTOP") return "start";
  if (token === "YES" || token === "Y") return "yes";
  if (token === "HELP" || token === "INFO") return "help";
  return "other";
}

export function helpMessage(origin: string) {
  const urls = legalUrls(origin);
  return `${SMS_PROGRAM_NAME}: ${SMS_MESSAGE_TYPES} ${SMS_FREQUENCY} ${SMS_RATE_DISCLAIMER} Reply STOP to cancel. Opt in: ${urls.sms} Terms: ${urls.terms} Privacy: ${urls.privacy}`;
}

export function stopMessage(origin: string) {
  const urls = legalUrls(origin);
  return `You are unsubscribed from ${SMS_PROGRAM_NAME} and will receive no further texts. Reply START to resubscribe. Privacy: ${urls.privacy}`;
}

export function startWelcomeMessage(origin: string) {
  const urls = legalUrls(origin);
  return `${SMS_PROGRAM_NAME}: Reply ${SMS_CONFIRM_KEYWORD} to confirm you want personal health-log texts from this number. ${SMS_MESSAGE_TYPES} ${SMS_FREQUENCY} ${SMS_RATE_DISCLAIMER} ${SMS_HELP_STOP} Terms: ${urls.terms} Privacy: ${urls.privacy}`;
}

export function confirmMessage(origin: string) {
  const urls = legalUrls(origin);
  return `You're subscribed to ${SMS_PROGRAM_NAME}. Text a meal, workout, sleep, or lab and I'll log it. ${SMS_FREQUENCY} ${SMS_RATE_DISCLAIMER} ${SMS_HELP_STOP} Terms: ${urls.terms} Privacy: ${urls.privacy}`;
}

export function alreadySubscribedMessage(origin: string) {
  const urls = legalUrls(origin);
  return `You're already subscribed to ${SMS_PROGRAM_NAME}. ${SMS_HELP_STOP} ${urls.sms}`;
}

export function notSubscribedMessage(origin: string) {
  const urls = legalUrls(origin);
  return `You're not subscribed to ${SMS_PROGRAM_NAME}. Text ${SMS_KEYWORD} to opt in, or visit ${urls.sms}. ${SMS_RATE_DISCLAIMER} ${SMS_HELP_STOP}`;
}

export function isSmsOptedIn(settings: FirstMateSettings | undefined, from?: string | null) {
  if (!settings || settings.smsConsent !== "opted_in" || !settings.phone) return false;
  if (!from) return true;
  const a = normalizePhone(from);
  const b = normalizePhone(settings.phone);
  return Boolean(a && b && a === b);
}

function withFirstMate(store: GalaxyStore, patch: Partial<FirstMateSettings>): GalaxyStore {
  const prior = store.firstMate ?? DEFAULT_FIRST_MATE;
  return {
    ...store,
    firstMate: {
      ...prior,
      ...patch,
      messages: patch.messages ?? prior.messages ?? [],
    },
    updated_at: Date.now(),
  };
}

/** Handle STOP / HELP / START / YES. `handled` means do not run First Mate logging. */
export function applySmsKeyword(
  store: GalaxyStore,
  from: string,
  body: string,
  origin: string
): { store: GalaxyStore; reply: string; handled: boolean } {
  const keyword = classifySmsKeyword(body);
  const fromPhone = normalizePhone(from);
  const prior = store.firstMate ?? DEFAULT_FIRST_MATE;
  const linked = normalizePhone(prior.phone);
  const consent = prior.smsConsent ?? "none";
  const sameNumber = Boolean(fromPhone && linked && fromPhone === linked);

  if (keyword === "help") {
    return { store, reply: helpMessage(origin), handled: true };
  }

  if (keyword === "stop") {
    if (fromPhone && (!linked || sameNumber)) {
      return {
        store: withFirstMate(store, {
          phone: fromPhone,
          smsConsent: "opted_out",
          smsConsentAt: Date.now(),
        }),
        reply: stopMessage(origin),
        handled: true,
      };
    }
    return { store, reply: stopMessage(origin), handled: true };
  }

  if (keyword === "start") {
    if (linked && !sameNumber && consent === "opted_in") {
      return {
        store,
        reply: `This First Mate line is already linked to another number. Sign in at ${legalUrls(origin).sms} to manage SMS. Reply STOP to opt out.`,
        handled: true,
      };
    }
    return {
      store: withFirstMate(store, {
        phone: fromPhone,
        smsConsent: "pending",
        smsConsentAt: Date.now(),
        smsConsentSource: "sms",
      }),
      reply: startWelcomeMessage(origin),
      handled: true,
    };
  }

  if (keyword === "yes") {
    if (consent === "opted_in" && sameNumber) {
      return { store, reply: alreadySubscribedMessage(origin), handled: true };
    }
    const canConfirm = consent === "pending" && Boolean(fromPhone) && (!linked || sameNumber);
    if (canConfirm) {
      return {
        store: withFirstMate(store, {
          phone: fromPhone,
          smsConsent: "opted_in",
          smsConsentAt: Date.now(),
          smsConsentSource: prior.smsConsentSource ?? "sms",
        }),
        reply: confirmMessage(origin),
        handled: true,
      };
    }
    return {
      store,
      reply: `To subscribe, text ${SMS_KEYWORD} or opt in at ${legalUrls(origin).sms}. ${SMS_RATE_DISCLAIMER}`,
      handled: true,
    };
  }

  if (!isSmsOptedIn(prior, from)) {
    return { store, reply: notSubscribedMessage(origin), handled: true };
  }

  return { store, reply: "", handled: false };
}

export const CONSENT_CHECKBOX_LABEL = `I agree to receive ${SMS_PROGRAM_NAME} text messages at the number I provide. ${SMS_MESSAGE_TYPES} ${SMS_FREQUENCY} ${SMS_RATE_DISCLAIMER} ${SMS_HELP_STOP} I have read the Terms of Service and Privacy Policy.`;
