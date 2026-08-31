import { createHmac, timingSafeEqual } from "node:crypto";

function publicRequestUrl(request: Request) {
  const incoming = new URL(request.url);
  const configured = process.env.AUTH_URL?.replace(/\/$/, "");
  if (configured) {
    return `${configured}${incoming.pathname}${incoming.search}`;
  }
  const proto = request.headers.get("x-forwarded-proto") || incoming.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || incoming.host;
  return `${proto}://${host}${incoming.pathname}${incoming.search}`;
}

/** Twilio signed-request check: HMAC-SHA1 of URL + sorted POST fields. */
export function twilioSignatureValid(
  request: Request,
  params: Record<string, string>,
  signature: string | null
) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signature) return false;
  const url = publicRequestUrl(request);
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + (params[key] ?? ""), url);
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function sendTwilioSms(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio is not configured on this host.");
  }
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Twilio send failed (${response.status})`);
  }
}

export function twimlMessage(body: string) {
  const safe = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}
