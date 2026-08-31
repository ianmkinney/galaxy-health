import { Readable } from "node:stream";
import { google } from "googleapis";
import { emptyStore, normalizeStore, type GalaxyStore } from "./galaxy-types";

export const STORE_FILENAME = "galaxyhealth-store.json";

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

export type DriveAppFile = {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
};

export async function listAppDataFiles(accessToken: string): Promise<{
  count: number;
  files: DriveAppFile[];
  driveHomeUrl: string;
  appDataNote: string;
}> {
  const drive = driveClient(accessToken);
  const files: DriveAppFile[] = [];
  let pageToken: string | undefined;

  do {
    const listed = await drive.files.list({
      spaces: "appDataFolder",
      q: "trashed = false",
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)",
      pageSize: 100,
      pageToken,
    });
    for (const f of listed.data.files || []) {
      if (!f.id || !f.name) continue;
      files.push({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType ?? null,
        size: f.size != null ? Number(f.size) : null,
        modifiedTime: f.modifiedTime ?? null,
        webViewLink: f.webViewLink ?? null,
      });
    }
    pageToken = listed.data.nextPageToken || undefined;
  } while (pageToken);

  files.sort((a, b) => a.name.localeCompare(b.name));

  return {
    count: files.length,
    files,
    driveHomeUrl: "https://drive.google.com/drive/my-drive",
    appDataNote:
      "Galaxy Health stores data in Google Drive’s private app folder for this app. That folder is hidden from My Drive, but the count below is live from your account.",
  };
}

export async function loadGalaxyStore(accessToken: string): Promise<GalaxyStore> {
  const fileId = await findStoreFileId(accessToken);

  if (!fileId) {
    const blank = emptyStore();
    await saveGalaxyStore(accessToken, blank);
    return blank;
  }

  const drive = driveClient(accessToken);
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" }
  );

  const raw = typeof response.data === "string" ? response.data : String(response.data);
  try {
    return normalizeStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

export async function saveGalaxyStore(
  accessToken: string,
  store: GalaxyStore
): Promise<GalaxyStore> {
  const drive = driveClient(accessToken);
  const payload = normalizeStore({
    ...store,
    updated_at: Date.now(),
  });
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
