# Galaxy Health

Monorepo with two products that share the solar-system health metaphor:

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

## Design split (intentional)

- **Mobile** keeps Expo Go + native performance: Reanimated / SVG (GL optional). Kokonut/Bklit/Motion cannot run as native dependencies.
- **Web** uses those libraries for real: Tailwind, Motion, and shadcn registries for Kokonut UI / Bklit charts.
