import { Readable } from "node:stream";
import { google } from "googleapis";
import { emptyStore, type GalaxyStore } from "./galaxy-types";

const STORE_FILENAME = "galaxyhealth-store.json";

function driveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

async function findStoreFileId(accessToken: string) {
  const drive = driveClient(accessToken);
  const listed = await drive.files.list({
    spaces: "appDataFolder",
    q: `name = '${STORE_FILENAME}' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });
  return listed.data.files?.[0]?.id ?? null;
}

export async function loadGalaxyStore(accessToken: string): Promise<GalaxyStore> {
  const drive = driveClient(accessToken);
  const fileId = await findStoreFileId(accessToken);

  if (!fileId) {
    const blank = emptyStore();
    await saveGalaxyStore(accessToken, blank);
    return blank;
  }

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" }
  );

  const raw = typeof response.data === "string" ? response.data : String(response.data);
  const parsed = JSON.parse(raw) as GalaxyStore;
  if (!parsed?.version || !Array.isArray(parsed.planets)) {
    return emptyStore();
  }
  return parsed;
}

export async function saveGalaxyStore(
  accessToken: string,
  store: GalaxyStore
): Promise<GalaxyStore> {
  const drive = driveClient(accessToken);
  const payload = {
    ...store,
    updated_at: Date.now(),
  };
  const body = Readable.from([JSON.stringify(payload, null, 2)]);
  const existingId = await findStoreFileId(accessToken);

  if (existingId) {
    await drive.files.update({
      fileId: existingId,
      media: {
        mimeType: "application/json",
        body,
      },
    });
  } else {
    await drive.files.create({
      requestBody: {
        name: STORE_FILENAME,
        parents: ["appDataFolder"],
      },
      media: {
        mimeType: "application/json",
        body,
      },
      fields: "id",
    });
  }

  return payload;
}
