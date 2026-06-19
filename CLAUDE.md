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

To manage packages in the `functions` workspace, use `yarn workspace functions add <package>` (note: singular `workspace`, not `workspaces`).

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

| Page                 | Route             | Firebase reads/writes                                                                                                                                             |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signin.vue`         | `/signin`         | auth; writes initial `profiles/{uid}` (+ `users/{uid}/phoneNumber` if present)                                                                                    |
| `profile.vue`        | `/profile`        | `users/{uid}` (private fields), `profiles/{uid}` (public fields); email shown from auth                                                                           |
| `gamecollection.vue` | `/gamecollection` | `users/{uid}/collection/{pushId}`                                                                                                                                 |
| `friends.vue`        | `/friends`        | `profiles/` (search + display), `users/{uid}/friends`, `friendRequests/{uid}`, `blocked/{uid}` (decline writes)                                                   |
| `calendar.vue`       | `/calendar`       | `userGatherings/{uid}` (own index), `gatherings/{id}` (one listener per entry; splits hosting/invited client-side), `profiles/{uid}/name`                         |
| `gatherings/new.vue` | `/gatherings/new` | `gatherings/{pushId}` (create; `?id=` edits in place) then `userGatherings/*` index sync, `users/{uid}` (own prefill), `profiles/{uid}/name` (friend/guest names) |
| `index.vue`          | `/`               | none                                                                                                                                                              |

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
  queryableEmail: string // lowercase auth email; rules only accept it from a *verified* token (written at sign-in), indexed for friend search
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

// gatherings/{pushId} — readable only by the host and invited guests
type Gathering = {
  state: GatheringState // 'pending' | 'confirmed' | 'canceled'
  datetime: string // ISO date
  initiator: string // uid; pinned to auth.uid at creation, immutable after
  host: string // uid; immutable after creation
  maxGuests: number
  guests?: Record<string, GuestResponse> // keyed by uid; 'invited' | 'accepted' | 'declined'; new invites require the guest to have friended the host
  games?: GatheringGame[] // { id, name } — denormalized from the host's collection
}

// userGatherings/{uid}/{gatheringId}: true — per-user calendar index, owner-only read;
// maintained by the host (written after the gathering, since rules validate entries
// against the existing gathering); a user can always delete their own entry
```

## Firebase Security Rules

`database.rules.json` covers `profiles/`, `users/`, `friendRequests/`, `blocked/`, `gatherings/`, and `userGatherings/` (deployed automatically by `cd.yml` on push to `main`; manual deploy: `firebase deploy --only database`). All nodes reject unknown keys via `"$other": { ".validate": false }` and bound types/lengths with field-level `.validate` rules.

- `profiles/{uid}` — the public/private profile split: only this node is readable by any authenticated user (required for friend search queries on `queryableName`/`queryableEmail`/`queryablePhone`, all indexed via `.indexOn`); owner-only write. A _new_ `queryableEmail` must match `auth.token.email` **with `email_verified === true`** (so an unverified signup can't squat someone else's address; sign-in writes it once verified, and profile saves preserve the stored value); `name` and `queryableName` must agree (`queryableName === lowercase(name)`, enforced symmetrically so neither can drift); `queryablePhone` must be digits-only.
- `users/{uid}` — owner-only read **and** write: phone, address, maxPeople, the game collection (incl. `privateNote`), and the friends list are not visible to other users.
- `friendRequests/{toUid}/{fromUid}` — top-level so authorship is rule-enforced (a request nested under the recipient's own subtree was owner-forgeable). Only the sender can create (not overwrite) a `'pending'` entry, blocked senders can't; only the recipient can delete. Recipient reads their whole node; a sender can read only their own outgoing entry.
- `blocked/{ownerUid}/{blockedUid}` — owner-only read and write; value must be `true`.
- `users/{uid}/friends/{friendId}` — the owner can write their own list; additionally `friendId` may add themselves only while a pending request from `uid` exists at `friendRequests/{friendId}/{uid}` (the accept flow's mutual multi-path update), and may always delete themselves (mutual unfriend).
- `gatherings/{id}` — readable only by the host and invited guests (no list read at `gatherings/`; the calendar walks the user's `userGatherings` index instead); only the host can create/modify/delete a gathering; `host` must be the creator and is immutable, `initiator` is pinned to `auth.uid` at creation and immutable; an invited guest can write only their own `guests/{uid}` response (`'invited' | 'accepted' | 'declined'`); the host can only seed `'invited'` — and only for users whose own friends list contains the host (mutual friendship, which the host cannot forge) — or preserve an existing response, never answer on a guest's behalf.
- `userGatherings/{uid}/{gatheringId}: true` — owner-only read. The host of the referenced gathering may write entries for themselves and actual participants (validated against the existing gathering, hence written _after_ the gathering itself — creation is the one non-atomic two-step flow; deletion is atomic because rules see the pre-delete state). Any user may delete their own entry (dangling-pointer cleanup; the calendar does this when an entry turns unreadable).

Accepted limitations (conscious product trade-offs, not open findings):

- **Search exposes what it searches**: name, verified lowercase email, and phone digits in `profiles/` are necessarily readable (and bulk-enumerable via range queries) by any signed-in user — client-side search on a static site cannot hide the indexed values. Mitigating this requires moving search behind a Cloud Function or dropping email/phone search.
- **Phone impersonation**: `queryablePhone` is format-validated but ownership can't be verified without phone auth.
- **`maxGuests` is not rule-enforced** against the number of guest entries (RTDB rules can't count children); the client enforces it informally.
- **Gathering creation is two writes** (gathering, then index): if the second fails, the gathering is invisible until the host re-saves it. RTDB multi-path rules validate against pre-write `root`, so the index can't reference a gathering created in the same batch.

## External API

BoardGameGeek XML API v2 — proxied via Firebase Cloud Functions (`bggSearch`, `bggThing`):

- Search: `https://boardgamegeek.com/xmlapi2/search?query=<term>&type=boardgame`
- Detail: `https://boardgamegeek.com/xmlapi2/thing?id=<id>`
- XML is parsed server-side in the functions using `xml2js`; the client receives JSON
- **Authorization is required.** Every request must include an `Authorization: Bearer <token>` header. Tokens are created at https://boardgamegeek.com/applications after registering an application (non-commercial license is free). The token is stored in Secret Manager as `BGG_API_KEY` and accessed via `defineSecret('BGG_API_KEY')` in the Cloud Functions. Requests must go to `boardgamegeek.com` (no `www.` prefix) or the token will not work.
- Subject to rate limits and occasional 202 "try again" responses
- Client calls via `httpsCallable` from `firebase/functions`; App Check enforced

## Test Setup

Unit tests live in `test/` (`Logo.spec.ts`, `authErrors.spec.ts`, `gatherings.spec.ts`); security-rules tests in `test/rules/` run via `yarn test:rules` against the RTDB emulator (`vitest.rules.config.ts`). Vitest requires `environment: 'jsdom'` (set in `vitest.config.ts`). Vuetify must be inlined via `server.deps.inline: ['vuetify']` to avoid CSS import errors. Import `createVuetify` and pass it as a global plugin to `mount`.

## Design Conventions

The app uses a consistent dark glassmorphism design system. All new UI must follow these conventions — do not introduce new colors, spacing values, or component patterns without updating this section first.

### Color palette (defined in `nuxt.config.ts` → `vuetifyOptions.theme.themes.dark.colors`)

| Token | Hex | Use |
|-------|-----|-----|
| `background` | `#11111B` | App background |
| `surface` | `#1E1E2E` | Cards, drawers |
| `surface-variant` | `#252538` | Nested surfaces, avatars |
| `primary` | `#6C5CE7` | Brand purple — CTAs, active states, icons on dark surfaces. **Do not use for text/icon buttons on dark card backgrounds** (contrast ~2.3:1, fails WCAG AA). |
| `secondary` | `#FDCB6E` | Amber/gold — star ratings, the "Rate" action. |
| `accent` | `#00CEC9` | Teal — external links, edit/navigation actions, icon buttons that need good contrast on dark surfaces (~7:1). |
| `success` | `#55EFC4` | Confirm, accept, save actions. |
| `error` | `#FF7675` | Destructive actions (delete, cancel, decline). |
| `info` | `#74B9FF` | Informational states. |
| `warning` | `#FFEAA7` | Non-critical warnings. |
| `on-background` / `on-surface` | `#CDD6F4` | Body text on dark backgrounds (lavender-white). |
| `on-primary` | `#FFFFFF` | Text on primary-colored backgrounds. |
| `on-secondary` | `#11111B` | Text on secondary (amber) backgrounds. |

**Semantic color rules:**
- Destructive action → `color="error"`
- Confirm / accept / save → `color="success"`
- Primary CTA → `color="primary"` on buttons with filled/elevated variant
- External links, secondary navigation → `color="accent"` on text/icon buttons
- Ratings and amber emphasis → `color="secondary"`
- **Never** use `color="primary"` for icon-only or text-variant buttons on cards — use `color="accent"` instead for legibility

### Typography

- Font: **Inter** (body and headings) via `$body-font-family` / `$heading-font-family` in `variables.scss`
- Body text color: `#CDD6F4` (Vuetify `on-surface`)
- Page title: `.page-title` → `1.5rem / 600`
- Section label: `.section-label` → `0.875rem / 500`, uppercase, `rgba(CDD6F4, 0.7)`
- Empty state title: `.empty-title` → `1.35rem / 600`
- Empty state description: `.empty-desc` → `1rem`, `rgba(CDD6F4, 0.75)`
- All buttons: `text-transform: none`, `letter-spacing: 0.02em` (global override in `global.scss`)

### Spacing & shape

- **Border radius root**: `12px` (set in `variables.scss`); buttons `10px`; cards `xl` (Vuetify default `24px`)
- **Card padding**: `pa-6` (24 px) for `v-card-text` content; `16px 20px` for `page-card-title` headers
- **List item gap**: `mb-2` between items
- **Section gap**: `mb-3` after section labels, `my-4` for dividers between sections

### Glassmorphism card style (automatic via `global.scss`)

All `v-card` elements get:
- Background: `rgba(30, 30, 46, 0.7)` + `backdrop-filter: blur(16px)`
- Border: `1px solid rgba(108, 92, 231, 0.12)`
- Hover: border brightens to `rgba(108,92,231,0.25)`, shadow deepens

Do not override card backgrounds inline — the global style handles it.

### Vuetify component defaults (set in `nuxt.config.ts`)

| Component | Default |
|-----------|---------|
| `VBtn` | `rounded="lg"`, `variant="elevated"` |
| `VCard` | `rounded="xl"` |
| `VTextField` | `variant="outlined"`, `density="comfortable"` |
| `VTextarea` | `variant="outlined"`, `density="comfortable"` |
| `VAutocomplete` | `variant="outlined"`, `density="comfortable"` |

Override these per-instance only when there's a clear reason (e.g., `variant="text"` for icon action buttons in list items).

### Reusable CSS classes (`assets/global.scss`)

| Class | Apply to | Purpose |
|-------|----------|---------|
| `page-card-title` | `v-card-title` | Responsive flex header: title + actions in one row at desktop, actions wrap below on narrow viewports |
| `page-header-actions` | `div` inside `page-card-title` | Right-aligns actions via `margin-left: auto`; wraps naturally on `xs` |
| `event-actions` | `div` at bottom of event card | `flex-wrap` row for action buttons, separated from metadata |
| `page-title` | `span` inside card header | Page-level heading size |
| `section-label` | `div` before a list section | Uppercase subdued section heading |
| `empty-state` / `empty-title` / `empty-desc` | Empty state container | Centered empty state layout |

### Page structure pattern

Every authenticated page follows this shell:
```html
<v-row justify="center">
  <v-col cols="12" sm="11" md="9" lg="6">   <!-- lg="7" for wider pages -->
    <v-card>
      <v-card-title class="page-card-title">
        <div class="d-flex align-center">
          <v-icon color="primary" class="mr-3 flex-shrink-0">mdi-icon</v-icon>
          <span class="page-title">Page Title</span>
        </div>
        <div class="page-header-actions">
          <v-btn color="primary" size="small">Primary Action</v-btn>
        </div>
      </v-card-title>
      <v-divider />
      <v-card-text v-if="loading" class="pa-8">
        <v-progress-linear indeterminate color="primary" />
      </v-card-text>
      <v-card-text v-else class="pa-6">
        <!-- content -->
      </v-card-text>
    </v-card>
    <Snackbar ref="snackbar" />
  </v-col>
</v-row>
```

### Event / gathering card pattern

```html
<div class="event-item pa-4 mb-3">
  <!-- metadata row: chip + datetime only -->
  <div class="d-flex align-center flex-wrap gap-2 mb-2">
    <v-chip :color="stateColor(state)" size="small" variant="tonal" class="text-capitalize">{{ state }}</v-chip>
    <span class="event-line"><v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>{{ datetime }}</span>
  </div>
  <!-- info rows (host, games, guests) -->
  <!-- actions on their own row — never mixed into the metadata row -->
  <div class="event-actions">
    <v-btn density="compact" size="small" variant="text" color="success">Accept</v-btn>
    <v-btn density="compact" size="small" variant="text" color="error">Decline</v-btn>
  </div>
</div>
```

### Icon-only action buttons

Any button without visible text **must** have `aria-label` and `title`:
```html
<v-btn icon size="small" variant="text" color="accent"
  aria-label="Open on BGG" title="Open on BGG"
  :href="url" target="_blank" rel="noopener noreferrer">
  <v-icon>mdi-open-in-new</v-icon>
</v-btn>
```

### Empty states

```html
<div class="empty-state">
  <v-icon size="64" color="primary" class="mb-4" style="opacity: 0.3">mdi-relevant-icon</v-icon>
  <div class="empty-title">Nothing here yet</div>
  <div class="empty-desc">One sentence explaining what to do next.</div>
  <v-btn variant="elevated" color="primary" class="mt-4">Primary CTA</v-btn>
</div>
```

### Notifications

Use `<Snackbar ref="snackbar" />` (placed after the `v-card`, inside `v-col`). Call `snackbar.value?.showSnackbarWithMessage(message, isError)`.

### Responsive / mobile

All pages target mobile-first. Breakpoints:

| Token | Width |
|-------|-------|
| `xs` | < 600 px — single-column mobile |
| `sm` | 600–960 px — tablet portrait |
| `md` | 960–1280 px — small desktop |
| `lg`/`xl` | 1280 px+ — desktop |

**`v-list-item-title` clipping**: Vuetify 4 clips titles to one line. When a list item has a prepend avatar and multiple append buttons the title truncates on mobile. Fix in scoped CSS:
```scss
.my-item :deep(.v-list-item-title) {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
}
```

**Accessibility**: icon-only buttons require `aria-label` + `title`. Do not rely on color alone — pair status colors with icons or labels. Never use `color="primary"` for text/icon buttons on card backgrounds (contrast fails WCAG AA).

## Pull Requests

When writing PR descriptions (e.g. via `mcp__github__create_pull_request`), pass the `body` string as a plain JSON string — **never** wrap it in a shell heredoc like `$(cat <<'EOF' ... EOF)`. The GitHub MCP tool receives the value directly as a JSON parameter; heredoc syntax will be passed literally as the PR body text rather than being interpolated. Similarly, do **not** use `\n` escape sequences in the body string — use actual line breaks in the JSON string value instead.

## Deployment

GitHub Actions (`.github/workflows/cd.yml`) runs `yarn generate` and deploys `dist/` to GitHub Pages on push to `main`. Firebase credentials are injected as GitHub secrets. The `ci.yml` workflow runs `yarn lint` and `yarn test` on push to `main`.
