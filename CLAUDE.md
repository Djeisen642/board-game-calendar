# Board Game Calendar — CLAUDE.md

A Nuxt 4 / Vue 3 SPA that helps groups schedule board game nights around specific games. Deployed as a static site to GitHub Pages, backed by Firebase Realtime Database.

## Commands

```bash
yarn dev          # dev server on :3005
yarn lint         # ESLint (must pass before commit)
yarn test         # Vitest (must pass before commit)
yarn test:rules   # security-rules tests against the RTDB emulator (needs Java)
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
| `signin.vue`         | `/signin`         | auth; writes initial `profiles/{uid}` (+ `users/{uid}/phoneNumber` if present) |
| `profile.vue`        | `/profile`        | `users/{uid}` (private fields), `profiles/{uid}` (public fields); email shown from auth |
| `gamecollection.vue` | `/gamecollection` | `users/{uid}/collection/{pushId}`                   |
| `friends.vue`        | `/friends`        | `profiles/` (search + display), `users/{uid}/friends`, `friendRequests/{uid}`, `blocked/{uid}` (decline writes) |
| `calendar.vue`       | `/calendar`       | `gatherings` (loads all, splits into hosting/invited client-side), `profiles/{uid}/name` |
| `gatherings/new.vue` | `/gatherings/new` | `gatherings/{pushId}` (create; `?id=` edits in place), `users/{uid}` (own prefill), `profiles/{uid}/name` (friend/guest names) |
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
- `helpers/gatherings.ts` — `splitGatherings`, state/response color+icon maps, `formatDatetime`
- `firebase.json` — Firebase Hosting config
- `database.rules.json` — Firebase Realtime DB security rules (deployed by `cd.yml` on push to `main`, alongside functions)

### Components

- `BGCLogo.vue` — animated chess bishop SVG logo
- `GameSearch.vue` — BGG API search + add-to-collection; hits `https://boardgamegeek.com/xmlapi2/`
- `Snackbar.vue` — toast notification wrapper; uses `defineExpose` for parent `ref` access

### Composables

Pages own routing/layout, composables own data/logic (`composables/`, auto-imported):

- `useBoardGameSearch.ts` — BGG API search logic for `GameSearch.vue`
- `useFriendSearch.ts` — debounced friend search over the queryable\* indexes, annotates friendship status
- `useFriendActions.ts` — send/accept/decline friend requests, unfriend (multi-path updates)
- `useAuthSignIn.ts` — OAuth/email sign-in, signup, password reset; writes the initial profile
- `useGatheringDisplay.ts` — guest/host display-name resolution for the calendar

### Layout

`layouts/default.vue` — sidebar nav (`v-navigation-drawer`) + app bar. Nav items are conditionally shown based on `userStore.user` auth state. Uses `<slot />` for page content.

### Auth flow

1. `fireauth.client.ts` runs on boot, awaits first `onAuthStateChanged` tick, sets `userStore.user`, then unsubscribes (one-shot initialization)
2. After `signInWithPopup` / `signInWithEmailAndPassword`, sign-in handlers call `userStore.setUser(user)` manually before `router.push()` (since the listener is already unsubscribed)
3. `signOut` action calls `firebaseSignOut(auth)` then sets `userStore.user = null`

## Data Model

### Implemented and in use

```ts
// profiles/{uid} — public, search-visible; readable by any authenticated user
{
  name: string
  queryableName: string // lowercase(name), rule-enforced, indexed for friend search
  queryableEmail: string // lowercase auth email, rule-enforced, indexed for friend search
  queryablePhone: string // digits-only phone number, indexed for friend search
}

// users/{uid} — private; owner-only read/write
{
  phoneNumber: string
  address: string
  maxPeople: number
}
// the account email is not stored; the UI reads it from Firebase Auth

// users/{uid}/collection/{pushId} — owner-only, like the rest of users/{uid}
type Game = {
  id: string // BoardGameGeek game ID
  name: string
  rating?: number
  privateNote?: string // defined but not yet written/read in UI
  publicNote?: string // defined but not yet written/read in UI
}

// users/{uid}/friends/{friendId}: true — mutual; written to both sides on accept

// friendRequests/{toUid}/{fromUid}: 'pending' — top-level so the rules can enforce authorship; removed on accept/decline

// blocked/{ownerUid}/{blockedUid}: true — top-level, owner-only read/write; written on decline; directional (blocks blockedUid → ownerUid requests only)

// gatherings/{pushId}
type Gathering = {
  state: GatheringState // 'pending' | 'confirmed' | 'canceled'
  datetime: string // ISO date
  initiator: string // uid; pinned to auth.uid at creation, immutable after
  host: string // uid; immutable after creation
  maxGuests: number
  guests?: Record<string, GuestResponse> // keyed by uid; 'invited' | 'accepted' | 'declined'
  games?: GatheringGame[] // { id, name } — denormalized from the host's collection
}
```

## Firebase Security Rules

`database.rules.json` covers `profiles/`, `users/`, `friendRequests/`, `blocked/`, and `gatherings/` (deployed automatically by `cd.yml` on push to `main`; manual deploy: `firebase deploy --only database`). All nodes reject unknown keys via `"$other": { ".validate": false }` and bound types/lengths with field-level `.validate` rules.

- `profiles/{uid}` — the public/private profile split: only this node is readable by any authenticated user (required for friend search queries on `queryableName`/`queryableEmail`/`queryablePhone`, all indexed via `.indexOn`); owner-only write. `queryableEmail` must match `auth.token.email`; `name` and `queryableName` must agree (`queryableName === lowercase(name)`, enforced symmetrically so neither can drift); `queryablePhone` must be digits-only.
- `users/{uid}` — owner-only read **and** write: phone, address, maxPeople, the game collection (incl. `privateNote`), and the friends list are not visible to other users.
- `friendRequests/{toUid}/{fromUid}` — top-level so authorship is rule-enforced (a request nested under the recipient's own subtree was owner-forgeable). Only the sender can create (not overwrite) a `'pending'` entry, blocked senders can't; only the recipient can delete. Recipient reads their whole node; a sender can read only their own outgoing entry.
- `blocked/{ownerUid}/{blockedUid}` — owner-only read and write; value must be `true`.
- `users/{uid}/friends/{friendId}` — the owner can write their own list; additionally `friendId` may add themselves only while a pending request from `uid` exists at `friendRequests/{friendId}/{uid}` (the accept flow's mutual multi-path update), and may always delete themselves (mutual unfriend).
- `gatherings/` — readable by any authenticated user (rules are not filters; the calendar filters client-side for MVP); only the host can create/modify/delete a gathering; `host` must be the creator and is immutable, `initiator` is pinned to `auth.uid` at creation and immutable; an invited guest can write only their own `guests/{uid}` response (`'invited' | 'accepted' | 'declined'`), and the host can only seed `'invited'` or preserve an existing response — never answer on a guest's behalf.

Accepted limitations (conscious product trade-offs, not open findings):

- **Search exposes what it searches**: name, lowercase email, and phone digits in `profiles/` are necessarily readable (and bulk-enumerable via range queries) by any signed-in user — client-side search on a static site cannot hide the indexed values. Mitigating this requires moving search behind a Cloud Function or dropping email/phone search.
- **Phone impersonation**: `queryablePhone` is format-validated but ownership can't be verified without phone auth.
- **`maxGuests` is not rule-enforced** against the number of guest entries (RTDB rules can't count children); the client enforces it informally.

## External API

BoardGameGeek XML API v2 — used in `GameSearch.vue`:

- Search: `https://boardgamegeek.com/xmlapi2/search?query=<term>&type=boardgame`
- Detail: `https://boardgamegeek.com/xmlapi2/thing?id=<id>&stats=1`
- Response is XML; parsed with `xml2js`
- No API key required; subject to rate limits and occasional 202 "try again" responses

## Test Setup

Unit tests live in `test/` (`Logo.spec.ts`, `authErrors.spec.ts`, `gatherings.spec.ts`); security-rules tests in `test/rules/` run via `yarn test:rules` against the RTDB emulator (`vitest.rules.config.ts`). Vitest requires `environment: 'jsdom'` (set in `vitest.config.ts`). Vuetify must be inlined via `server.deps.inline: ['vuetify']` to avoid CSS import errors. Import `createVuetify` and pass it as a global plugin to `mount`.

## Pull Requests

When writing PR descriptions (e.g. via `mcp__github__create_pull_request`), pass the `body` string as a plain JSON string — **never** wrap it in a shell heredoc like `$(cat <<'EOF' ... EOF)`. The GitHub MCP tool receives the value directly as a JSON parameter; heredoc syntax will be passed literally as the PR body text rather than being interpolated. Similarly, do **not** use `\n` escape sequences in the body string — use actual line breaks in the JSON string value instead.

## Deployment

GitHub Actions (`.github/workflows/cd.yml`) runs `yarn generate` and deploys `dist/` to GitHub Pages on push to `main`. Firebase credentials are injected as GitHub secrets. The `ci.yml` workflow runs `yarn lint` and `yarn test` on push to `main`.
