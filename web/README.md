# Galaxy Health — Web

Pure web app (Next.js). **Google sign-in is the only login.** Health data is stored in the user’s private Google Drive `appDataFolder` — not on a Galaxy Health database.

## Stack

- Next.js App Router + Tailwind CSS v4
- **Motion** (`motion/react`) for animation
- Kokonut / Bklit-ready: `components.json` registries + glass/shimmer primitives
- Auth.js (NextAuth v5) → Google OAuth with `drive.appdata` scope
- `googleapis` Drive client

## Setup

1. Copy env and fill Google OAuth credentials:

```bash
cp .env.example .env.local
# AUTH_SECRET=$(npx auth secret)
# AUTH_GOOGLE_ID=...
# AUTH_GOOGLE_SECRET=...
# AUTH_URL=http://localhost:3000
```

2. Google Cloud Console:

- Enable **Google Drive API**
- OAuth client type **Web application**
- Redirect URI: `http://localhost:3000/api/auth/callback/google`
- Scopes used: `openid email profile` + `https://www.googleapis.com/auth/drive.appdata`

3. Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Continue with Google**.

## Optional: pull Kokonut / Bklit components

```bash
npx shadcn@latest add @kokonutui/particle-button
npx shadcn@latest add @bklit/area-chart
```

Registries are declared in `components.json`.

## Agent uplink

Any agent (Cursor, Claude, ChatGPT Actions, curl) can log free-form updates. Galaxy Health routes the text into meals, workouts, check-ins, markers, pantry, grocery, and meal plans, then fires inter-planet signals.

1. Sign in → **Settings → Generate agent token**
2. Tap **Copy** on **Paste this to your agent**
3. Paste that block into your agent chat, then talk normally (“ran 30 min and ate eggs”)

The copied instructions already include the token, ingest URL, and rules. Treat the token like a password — revoke anytime in Settings.

## Google Drive storage

Settings → **View in Google Drive** shows a live count of files in this app’s private Drive app folder, plus **Open Google Drive**. App-folder files are hidden from My Drive; the Settings panel is the inventory.

## Test civilization

Settings → **Populate healthy test data** seeds ~7 days of healthy logs across all planets (tagged `source: test`), plus recipes, pantry, a program, and a ritual so colonies look inhabited. **Remove test data** strips those rows without touching real logs.

Galley on web is a full household loop (recipe book with search/cook, pantry expiry, grocery generated from the week plan without AI, aisle grouping, week grid). Atlas/Lumen/Observatory follow the same depth: ledgers, filters, saved systems that raise buildings.

## Forge a world

On the Bridge, describe what you want to track. AI (or a local fallback if no API key is saved) stands up a custom planet beyond Observatory, with tracking systems that each raise a voxel building. Every core world also has a **Systems** tab to add more.

## vs Mobile

| | Web (`web/`) | Mobile (`mobile/`) |
| --- | --- | --- |
| Auth | Google OAuth | None / BYOK for AI only |
| Storage | Drive appDataFolder | On-device SQLite |
| UI | Tailwind + Motion + Kokonut/Bklit | Reanimated + SVG/GL |
