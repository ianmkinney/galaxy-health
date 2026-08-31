# Galaxy Health — agent instructions

Monorepo: `web/` (Next.js, Google + Drive) and `mobile/` (Expo, on-device SQLite).

Canonical GitHub: https://github.com/ianmkinney/galaxy-health

## Product

Health as a place. Four core worlds orbit **First Mate** (the neural lattice you talk to — never a sun): Galley, Atlas, Lumen, Observatory. Custom worlds can be forged from a description. Population is a live count of inputs + files + systems×3. Each tracking system is a voxel building.

## Carbon copy

**Mobile must stay as close as possible to web in features and styling.** Web is the source of truth for what exists and how it looks. Native stacks (Reanimated, StyleSheet) implement that look; they are not an excuse for a thinner app.

Read `.cursor/rules/mobile-web-parity.mdc` before changing either app. If you add a tab, ledger, forge flow, or visual pattern on one side, add it on the other in the same change.

## Web HTML

Never nest `<button>` inside `<button>` (Galley week grid is the cautionary case). Use a `div` cell with sibling controls.

## Surface 3D

Building names on the landed view are ring callouts (drei `Text` + leader line), not overlapping HTML chips on the stacks. See `.cursor/rules/surface-building-labels.mdc`.

## Current mobile gap

Web is ahead on Galley depth (Colony / Charts / AI Chef) and surface voxel callouts. First Mate (click/tap the lattice, chat, voice, optional SMS uplink) exists on both. Remaining Galley parity is still required work.

## Secrets

Never commit `.env`, Drive tokens, or API keys.
