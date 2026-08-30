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

1. Sign in → **Settings → Generate agent token** (copy once).
2. Call ingest:

```bash
# GET (simple for agents / bookmarks)
curl "http://localhost:3000/api/ingest?token=TOKEN&text=Ate%20eggs%20420kcal%20and%20ran%2030%20min"

# POST
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Leg day 45 min + chicken bowl 600 kcal, slept 7.5h"}'
```

Signed-in browser sessions can also use the **Civilization uplink** on the Bridge (no token). With a BYOK key saved, routing uses AI JSON plans; otherwise heuristics apply.

Treat the agent token like a password — it can write your Drive app data. Revoke anytime in Settings.

## Test civilization

Settings → **Populate healthy test data** seeds ~7 days of healthy logs across all planets (tagged `source: test`). **Remove test data** strips those rows without touching real logs.

## vs Mobile

| | Web (`web/`) | Mobile (`mobile/`) |
| --- | --- | --- |
| Auth | Google OAuth | None / BYOK for AI only |
| Storage | Drive appDataFolder | On-device SQLite |
| UI | Tailwind + Motion + Kokonut/Bklit | Reanimated + SVG/GL |
