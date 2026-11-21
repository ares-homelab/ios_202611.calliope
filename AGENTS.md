This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Calliope

- Mars's music, audiobook and reading app. App data comes from the calliope api (`http://ares:8087`, FastAPI, code in `services/calliope/api/` of the ares repo, every request sends `Authorization: Bearer <token>`); music comes from navidrome's subsonic api (`http://ares:4533`, `src/navidrome.ts`, salted-token auth). Audio streams from both; downloads are kept in the document dir (`src/downloads.ts`).
- `src/api.ts` mirrors the api's pydantic models; keep optional fields optional so an older or newer api doesn't break the app.
- `src/store.ts` caches every response as json in the document dir (offline copy) and queues changes made while ares is unreachable (`outbox.json`: status, pins, audiobook positions), flushed on refresh or when the app becomes active; voice notes wait in `voice-outbox.json` (`src/voice.ts`).
- `src/player.ts` is the one player (expo-audio) for songs and books: queue, lock screen, sleep timer, smart shuffle, play log to `/plays`, book positions to `/audiobooks/{id}/position`.
- Styling lives in `src/theme.ts` (one palette, aegean, in dark and light following the system; Inter, spacing) and `src/components/ui.tsx`; screens use `useStyles`/`useTheme`, never hard-coded colors. The design reference is the claude.ai design canvas, page "a · full app".
- Installed with marsign on ares (free Apple ID): no app extensions or widgets, each needs another App ID and the free account is at its limit. No remote push either: notifications are local (`src/notify.ts`).
- Changes go to a branch and a pull request; Mars merges, and merging to `main` ships the OTA update.
- Names are lowercase (files, folders, commit subjects) unless a tool requires otherwise; code lean, few comments.
- `app.json` keeps `"slug": "athena"`: it must match the Expo project behind `extra.eas.projectId` (created as athena), or `eas update` refuses and no OTA is published. The name on the phone is `name`.
