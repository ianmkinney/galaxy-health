# Galaxy Health — Mobile

Sibling web app lives in `../web`. **Mobile must stay a carbon copy of web** in features and styling (see root `AGENTS.md` and `.cursor/rules/mobile-web-parity.mdc`). Implement with Reanimated / StyleSheet; do not ship a thinner planet or a different visual language.

A solar-system shell for personal health. You start on **The Bridge** — the cockpit of your ship — looking out at a live orbiting system. **First Mate** is the neural lattice at the centre: tap it to log by chat. Each health domain is a planet.

Local-first, Bring Your Own Key. Same storage principles as Food Dude; totally different free-form 3D shell.

| Planet | Domain | Default name |
| --- | --- | --- |
| `galley` | Food & fuel | Galley |
| `atlas` | Strength & movement | Atlas |
| `lumen` | Mind & recovery | Lumen |
| `observatory` | Labs & biomarkers | Observatory |

Every name above is editable in **Settings → Planet registry**. Internal ids never change.

## Running it

```bash
npm install
npx expo start -c --port 8090
```

Port 8090 keeps this app off `8081` if Food Dude (or another Expo project) is already serving there.

- **Expo Go (iOS/Android):** scan the QR. Requires Expo Go for **SDK 54**.
- **Web:** press `w`, or `npx expo start --web --port 8090`.

No `EXPO_PUBLIC_` keys. Core logging needs no network. Optional Synthesis uses a key you paste in **Account**.

## What works

- **The Bridge** — perspective solar system (Reanimated + SVG default), four orbiting planets, star, split-depth orbit rings, parallax starfield, cockpit canopy, boresight reticle, live HUD
- **Alternate GL renderer** — `three` + `@react-three/fiber` + `expo-gl` behind one import flip in `BridgeScreen.js`
- **Warp** into Galley / Atlas / Lumen / Observatory
- **Inter-planet signals** — persisted ships you can watch fly; destinations use the numbers
- **BYOK Account** — Claude / OpenAI / Grok / Gemini keys in SecureStore; model picker
- **Synthesis** — optional cross-planet briefing from today's aggregates (raw labs stay on device)
- **Reduced motion** — orbits park, starfield stops, warp fades; everything stays reachable

## Style & motion libraries

Per vault decisions: Kokonut UI, Bklit, and Motion are **inspiration only** — they are React DOM + Tailwind kits and do not run in React Native.

Shipped stack:

- `react-native-reanimated` + `react-native-worklets` — cross-platform motion (springs, press, orbits)
- `react-native-svg` — default projected-3D solar system
- `three` + `@react-three/fiber` + `expo-gl` — alternate real-GL renderer (one-import switch)
- No Tailwind, shadcn, Kokonut registry, or Bklit analytics

## Architecture

```
src/
  db/            expo-sqlite client, versioned migrations, repositories
  galaxy/        planet registry, 3D math, SVG + GL scenes, cockpit, warp
  state/         event bus, signal kinds/routes, GalaxyContext
  services/      BYOK aiSettings / aiClient, synthesis
  components/    HoloPanel, GlowButton, fields, log rows, screen shell
  screens/       Bridge, planets, Settings, Account, Synthesis, SignalLog
  theme/         design tokens and planet accent ramps
```

Database file: `galaxyhealth.db`. Migrations use `PRAGMA user_version`.

## Store identity

`com.galaxyhealth.app` (iOS/Android), scheme `galaxyhealth`. Separate from Food Dude. No EAS project yet — publish the remote when the first version is ready.
