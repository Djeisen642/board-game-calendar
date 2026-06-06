# Board Game Calendar — CLAUDE.md

A Nuxt 2 / Vue 2 SPA that helps groups schedule board game nights around specific games. Deployed as a static site to GitHub Pages, backed by Firebase Realtime Database.

## Commands

```bash
yarn dev          # dev server on :3005
yarn lint         # ESLint (must pass before commit)
yarn test         # Jest (must pass before commit)
yarn generate     # production static build → dist/
```

Pre-commit hooks run `yarn lint` via husky + lint-staged. Commits must follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Nuxt 2 + Vue 2 | Cannot upgrade to Nuxt 3/Vue 3 without full rewrite |
| UI | Vuetify 2 (dark theme) | Tied to Vue 2; Vuetify 3+ requires Vue 3 |
| State | Vuex (class-based via `nuxt-property-decorator`) | `@State`, `@Action` decorators |
| DB | Firebase Realtime Database | Not Firestore |
| Auth | Firebase Auth + FirebaseUI | Google, Facebook, Email providers |
| Language | TypeScript (strict) | `lang="ts"` on all `.vue` scripts |
| CSS | Vuetify SCSS + `~/assets/variables.scss` | sass pinned via resolutions |
| Linting | ESLint 8 + `@typescript-eslint@6` + Prettier | ESLint 9 not supported by this stack |
| Testing | Jest 29 + `@vue/test-utils@1` + `vue-jest@3` | jsdom env required |

## Architecture

### Pages → Firebase paths

| Page | Route | Firebase reads/writes |
|---|---|---|
| `SignIn.vue` | `/signin` | auth only |
| `Profile.vue` | `/profile` | `users/{uid}` |
| `GameCollection.vue` | `/gamecollection` | `users/{uid}/collection/{pushId}` |
| `Friends.vue` | `/friends` | `users/` (search), `users/{uid}/friends/{friendId}` |
| `Calendar.vue` | `/calendar` | `events` (host filter) — **stub, not MVP-complete** |
| `index.vue` | `/` | none |

### Key files

- `plugins/firebase.ts` — exports `db`, `auth`, `analytics`, `authProviders`; uses the compat API (`firebase/compat/*`)
- `plugins/fireauth.ts` — runs `auth.onAuthStateChanged` on startup, calls `store.dispatch('autoSignIn', user)`
- `store/index.ts` — single Vuex store; state: `{ user: firebase.User | null }`
- `middleware/auth.ts` — redirects unauthenticated users to `/signin`, authenticated users away from `/signin`
- `helpers/types.ts` — shared TypeScript types (see Data Model below)
- `helpers/routes.ts` — route path constants (import instead of hardcoding strings)
- `helpers/names.ts` — route name constants
- `helpers/constants.ts` — `LoadingTimeoutInMs` and other app constants
- `helpers/helpers.ts` — `handleError()`, HTML entity decoding for BGG API responses
- `firebase.config.js` — Firebase project credentials (committed; public project)
- `firebase.json` — Firebase Hosting config
- `database.rules.json` — Firebase Realtime DB security rules (deploy separately via Firebase CLI)

### Components

- `BGCLogo.vue` — animated chess bishop SVG logo
- `GameSearch.vue` — BGG API search + add-to-collection; hits `https://boardgamegeek.com/xmlapi2/`
- `Snackbar.vue` — toast notification wrapper

### Layout

`layouts/default.vue` — sidebar nav (`v-navigation-drawer`) + app bar. Nav items are filtered by `PageType` (AlwaysShow / NeedsAuth / BeforeAuth) based on auth state.

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
  queryableName: string  // lowercase(name), used for friend search
}

// users/{uid}/collection/{pushId}
type Game = {
  id: string       // BoardGameGeek game ID
  name: string
  rating?: number
  privateNote?: string   // defined but not yet written/read in UI
  publicNote?: string    // defined but not yet written/read in UI
}

// users/{uid}/friends/{friendId}: true
```

### Defined but not yet used

```ts
type GatheringState = 'pending' | 'confirmed' | 'canceled'  // not in types.ts yet

// gatherings/{gatheringId}  — path does not exist yet
type Gathering = {
  state: GatheringState
  datetime: string       // ISO date
  initiator: string      // uid
  host: string           // uid
  open: boolean
  maxGuests: number
  guests: Guest[]
  games: string[]        // Game ids from host's collection
}

type Guest = {
  id: string             // uid
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
        ".read": true          // overly permissive — exposes phone/address to anyone
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

Single test in `test/Logo.spec.js`. Jest requires `testEnvironment: 'jsdom'` (set in `jest.config.js`) because `@vue/test-utils@1` needs `window`. Vuetify components used inside test components will log "Unknown custom element" warnings — these are expected and harmless.

## Deployment

GitHub Actions (`.github/workflows/cd.yml`) runs `yarn generate` and deploys `dist/` to GitHub Pages on push to `main`. Firebase credentials are injected as GitHub secrets. The `ci.yml` workflow runs `yarn lint` only (tests are not yet in CI).
