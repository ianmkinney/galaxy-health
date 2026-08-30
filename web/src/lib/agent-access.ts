import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from "node:crypto";
import { google } from "googleapis";
import { loadGalaxyStore, saveGalaxyStore } from "./drive-store";
import type { GalaxyStore } from "./galaxy-types";

type AgentPayload = {
  v: 1;
  refreshToken: string;
  tokenId: string;
};

function keyFromSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for agent tokens");
  return scryptSync(secret, "galaxy-health-agent-v1", 32);
}

export function mintAgentCredential(refreshToken: string, tokenId: string) {
  const key = keyFromSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify({ v: 1, refreshToken, tokenId } satisfies AgentPayload));
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const body = Buffer.concat([iv, tag, enc]).toString("base64url");
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return `gh1.${body}.${sig}`;
}

export function parseAgentCredential(token: string): AgentPayload {
  const key = keyFromSecret();
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "gh1") {
    throw new Error("Invalid agent token format");
  }
  const [, body, sig] = parts;
  const expect = createHmac("sha256", key).update(body).digest("base64url");
  if (expect !== sig) throw new Error("Invalid agent token signature");

  const buf = Buffer.from(body, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  const payload = JSON.parse(json) as AgentPayload;
  if (payload.v !== 1 || !payload.refreshToken || !payload.tokenId) {
    throw new Error("Corrupt agent token");
  }
  return payload;
}

async function accessFromRefresh(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) throw new Error("Could not refresh Google access");
  return credentials.access_token;
}

export async function loadStoreForAgent(agentToken: string) {
  const payload = parseAgentCredential(agentToken);
  const googleAccessToken = await accessFromRefresh(payload.refreshToken);
  const store = await loadGalaxyStore(googleAccessToken);
  if (!store.agent?.token || store.agent.token !== payload.tokenId) {
    throw new Error("Agent token revoked. Generate a new one in Settings.");
  }
  return { store, googleAccessToken, tokenId: payload.tokenId };
}

export async function saveGalaxyStoreWithAccess(accessToken: string, store: GalaxyStore) {
  return saveGalaxyStore(accessToken, store);
}

export function newTokenId() {
  return randomBytes(16).toString("hex");
}
