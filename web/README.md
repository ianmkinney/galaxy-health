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

## vs Mobile

| | Web (`web/`) | Mobile (`mobile/`) |
| --- | --- | --- |
| Auth | Google OAuth | None / BYOK for AI only |
| Storage | Drive appDataFolder | On-device SQLite |
| UI | Tailwind + Motion + Kokonut/Bklit | Reanimated + SVG/GL |
