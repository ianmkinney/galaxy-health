# Galaxy Health

Canonical repository: [github.com/ianmkinney/galaxy-health](https://github.com/ianmkinney/galaxy-health)

Monorepo with two products that share a living health galaxy: worlds orbit First Mate (the neural lattice you talk to). Logs, files, and systems you set up raise cities.

```
galaxy_health/
  mobile/   Expo app — on-device SQLite, BYOK AI, Reanimated 3D cockpit
  web/      Next.js — Google OAuth + Drive storage, Motion + Tailwind (+ Kokonut/Bklit)
```

## Mobile

Local-first. No Google account required. Data never leaves the device unless the user opts into BYOK AI.

```bash
cd mobile
npm install
npx expo start -c --port 8090
```

See [mobile/README.md](mobile/README.md).

## Web

One Google login unlocks the app and private Drive app-data storage. Full web styling stack (Motion; Kokonut/Bklit registries configured).

```bash
cd web
cp .env.example .env.local   # add Google OAuth client + AUTH_SECRET
npm install
npm run dev
```

See [web/README.md](web/README.md) for Google Cloud setup.

## Root scripts

```bash
npm run mobile    # expo start in mobile/
npm run web       # next dev in web/
```

## Parity

**Mobile is a carbon copy of web** — same worlds, tabs, colony model, forge/systems, accents, and HUD voice. Storage and libraries differ (SQLite + Reanimated vs Drive + Motion/Tailwind); the pilot-facing product must not.

See `AGENTS.md` and `.cursor/rules/mobile-web-parity.mdc`. When a feature lands on web, land it on mobile in the same change.
