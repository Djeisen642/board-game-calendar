# Board Game Calendar — CLAUDE.md

A Nuxt 4 / Vue 3 SPA that helps groups schedule board game nights around specific games. Deployed as a static site to GitHub Pages, backed by Firebase Realtime Database.

## Commands

```bash
yarn dev          # dev server on :3005
yarn lint         # ESLint (must pass before commit)
yarn test         # Vitest (must pass before commit)
yarn generate     # production static build → dist/
yarn postinstall  # nuxi prepare — regenerates .nuxt/ types (run after yarn install)
```

Pre-commit hooks run `yarn lint` via husky + lint-staged. Commits must follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).

## Stack

| Layer     | Choice                                              | Notes                                                                                                     |
| --------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Framework | Nuxt 4.4 + Vue 3.5                                  | `<script setup>` Composition API throughout                                                               |
| UI        | Vuetify 4.1 (Material Design 3, dark theme)         | via `vuetify-nuxt-module`                                                                                 |
| State     | Pinia 3 via `@pinia/nuxt`                           | `stores/user.ts`; replaces Vuex                                                                           |
| DB        | Firebase Realtime Database                          | Not Firestore                                                                                             |
| Auth      | Firebase Auth (custom sign-in UI)                   | Google, Facebook, email/password via `signInWithPopup` / `signInWithEmailAndPassword`; FirebaseUI removed |
| Language  | TypeScript (strict)                                 | `<script setup lang="ts">` on all `.vue` files                                                            |
| CSS       | Vuetify SCSS + `~/assets/variables.scss`            | configured in `nuxt.config.ts`                                                                            |
| Linting   | ESLint 10 flat config via `@nuxt/eslint` + Prettier | `eslint.config.mjs` imports from `.nuxt/eslint.config.mjs`                                                |
| Testing   | Vitest 4 + `@nuxt/test-utils`                       | `vitest.config.ts`; jsdom env                                                                             |

## Architecture

### Pages → Firebase paths

| Page                 | Route             | Firebase reads/writes                               |
| -------------------- | ----------------- | --------------------------------------------------- |
| `signin.vue`         | `/signin`         | auth only                                           |
| `profile.vue`        | `/profile`        | `users/{uid}`                                       |
| `gamecollection.vue` | `/gamecollection` | `users/{uid}/collection/{pushId}`                   |
| `friends.vue`        | `/friends`        | `users/` (search), `users/{uid}/friends/{friendId}` |
| `calendar.vue`       | `/calendar`       | `events` (host filter) — **stub, not MVP-complete** |
| `index.vue`          | `/`               | none                                                |

### Key files

- `plugins/firebase.ts` — exports `db`, `auth`, `logEvent`, `log`; uses Firebase 12 modular SDK (`firebase/app`, `/auth`, `/database`, `/analytics`)
- `plugins/fireauth.client.ts` — Nuxt 4 client-only plugin; awaits first `onAuthStateChanged` callback to hydrate the Pinia store before navigation runs
- `stores/user.ts` — Pinia store; state: `{ user: User | null }`; actions: `setUser`, `signInWithGoogle`, `signOut`
- `middleware/auth.global.ts` — Nuxt 4 auto-global route middleware; redirects unauthenticated users to `/signin`, authenticated users away from `/signin`
- `firebase.config.ts` — Firebase credentials (dev vs prod via `NODE_ENV`; committed; public project)
- `helpers/types.ts` — shared TypeScript types including `FormInstance` for Vuetify 4 form refs
- `helpers/routes.ts` — route path constants
- `helpers/names.ts` — route name constants (lowercase; match Nuxt 4 file-based routing)
- `helpers/constants.ts` — `LoadingTimeoutInMs`, `DebounceThrottleInMs`, BGG API constants
- `helpers/helpers.ts` — `handleError()`, HTML entity decoding for BGG API responses
- `firebase.json` — Firebase Hosting config
- `database.rules.json` — Firebase Realtime DB security rules (deploy separately via Firebase CLI)

### Components

- `BGCLogo.vue` — animated chess bishop SVG logo
- `GameSearch.vue` — BGG API search + add-to-collection; hits `https://boardgamegeek.com/xmlapi2/`
- `Snackbar.vue` — toast notification wrapper; uses `defineExpose` for parent `ref` access

### Layout

`layouts/default.vue` — sidebar nav (`v-navigation-drawer`) + app bar. Nav items are conditionally shown based on `userStore.user` auth state. Uses `<slot />` for page content.

### Auth flow

1. `fireauth.client.ts` runs on boot, awaits first `onAuthStateChanged` tick, sets `userStore.user`, then unsubscribes (one-shot initialization)
2. After `signInWithPopup` / `signInWithEmailAndPassword`, sign-in handlers call `userStore.setUser(user)` manually before `router.push()` (since the listener is already unsubscribed)
3. `signOut` action calls `firebaseSignOut(auth)` then sets `userStore.user = null`

## Data Model

### Implemented and in use

```ts
// users/{uid}
{
  name: string
  email: string
  phoneNumber: string
  address: string
  maxPeople: number
  queryableName: string // lowercase(name), used for friend search
}

// users/{uid}/collection/{pushId}
type Game = {
  id: string // BoardGameGeek game ID
  name: string
  rating?: number
  privateNote?: string // defined but not yet written/read in UI
  publicNote?: string // defined but not yet written/read in UI
}

// users/{uid}/friends/{friendId}: true
```

### Defined but not yet used

```ts
type GatheringState = 'pending' | 'confirmed' | 'canceled' // not in types.ts yet

// gatherings/{gatheringId}  — path does not exist yet
type Gathering = {
  state: GatheringState
  datetime: string // ISO date
  initiator: string // uid
  host: string // uid
  open: boolean
  maxGuests: number
  guests: Guest[]
  games: string[] // Game ids from host's collection
}

type Guest = {
  id: string // uid
  confirmed: boolean
}

// Calendar.vue currently uses this ad-hoc type instead:
type EventType = {
  host: string
  date: Date
  guests: Person[]
}
```

## Firebase Security Rules

Current state — `database.rules.json` only covers `users/`:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".write": "$uid === auth.uid",
        ".read": true // overly permissive — exposes phone/address to anyone
      }
    },
    ".read": false,
    ".write": false
  }
}
```

The `gatherings` path has no rules yet (will default to `".read": false, ".write": false` from the root).

## External API

BoardGameGeek XML API v2 — used in `GameSearch.vue`:

- Search: `https://boardgamegeek.com/xmlapi2/search?query=<term>&type=boardgame`
- Detail: `https://boardgamegeek.com/xmlapi2/thing?id=<id>&stats=1`
- Response is XML; parsed with `xml2js`
- No API key required; subject to rate limits and occasional 202 "try again" responses

## Test Setup

Single test in `test/Logo.spec.ts`. Vitest requires `environment: 'jsdom'` (set in `vitest.config.ts`). Vuetify must be inlined via `server.deps.inline: ['vuetify']` to avoid CSS import errors. Import `createVuetify` and pass it as a global plugin to `mount`.

## Deployment

GitHub Actions (`.github/workflows/cd.yml`) runs `yarn generate` and deploys `dist/` to GitHub Pages on push to `main`. Firebase credentials are injected as GitHub secrets. The `ci.yml` workflow runs `yarn lint` and `yarn test` on push to `main`.
