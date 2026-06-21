# Board Game Calendar — CLAUDE.md

A Nuxt 4 / Vue 3 SPA that helps groups schedule board game nights around specific games. Deployed as a static site to GitHub Pages, backed by Firebase Realtime Database.

## Keeping this file up to date

**When you change a convention documented here — a colour token, a component pattern, a CSS class, an accessibility rule, a Firebase path, a command — update the relevant section of this file in the same commit.** Treat CLAUDE.md as part of the changeset, not an afterthought. If you add a new reusable pattern (composable, layout class, data model field), document it here so future sessions have accurate context.

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

### Screenshots

```bash
yarn screenshot /calendar              # mobile + desktop
yarn screenshot /gamecollection --mobile
yarn screenshot /calendar --desktop --full-page
yarn screenshot /gatherings/new --fixture scripts/fixtures/custom.json
```

Screenshots are saved to `screenshots/<route>-<viewport>.png` (git-ignored). No Firebase credentials needed — the dev server starts automatically with all Firebase modules mocked and a fake logged-in user (`screenshot-uid-1`, "Alex Johnson").

Fixture data is in `scripts/fixtures/default.json` and mirrors the Firebase RTDB path structure (`profiles/`, `users/`, `gatherings/`, etc.). To use custom data, copy it, edit, and pass `--fixture scripts/fixtures/my-fixture.json`. The `/screenshot` slash command in Claude Code wraps `yarn screenshot`.

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
- `middleware/auth.global.ts` — Nuxt 4 auto-global route middleware; redirects unauthenticated users to `/signin?redirect={intended fullPath}` (so email RSVP deep-links survive login), authenticated users away from `/signin`. `useAuthSignIn` reads `?redirect` after sign-in (internal paths only, open-redirect-guarded; falls back to `/gamecollection`)
- `firebase.config.ts` — Firebase credentials (dev vs prod via `NODE_ENV`; committed; public project)
- `helpers/types.ts` — shared TypeScript types including `FormInstance` for Vuetify 4 form refs
- `helpers/routes.ts` — route path constants
- `helpers/names.ts` — route name constants (lowercase; match Nuxt 4 file-based routing)
- `helpers/constants.ts` — `LoadingTimeoutInMs`, `DebounceThrottleInMs`, BGG API constants
- `helpers/helpers.ts` — `handleError()`, HTML entity decoding for BGG API responses
- `helpers/gatherings.ts` — `splitGatherings`, state/response color+icon maps, `formatDatetime`
- `helpers/collection.ts` — `filterAndSortCollection` (text + genre filter, name/rating/recent sort → ordered `CollectionEntry[]`) and `collectionGenres`; pure + unit-tested (`test/collection.spec.ts`), drives the collection browse UI
- `helpers/calendar.ts` — calendar-export builders: `googleCalendarUrl()` (Google "new event" template URL), `buildIcs()` (single-VEVENT `.ics`, `PUBLISH`, 3-hour default duration since gatherings store no end time, RFC-5545 escaped, no location since the host address is private), `downloadIcs()` (browser blob download), `toCalendarEventInput()`. The Cloud Functions duplicate this logic server-side (their build has its own `rootDir`, same as `formatDatetime`) — keep both in sync
- `firebase.json` — Firebase Hosting config
- `database.rules.json` — Firebase Realtime DB security rules (deployed by `cd.yml` on push to `main`, alongside functions)

### Components

- `BGCLogo.vue` — animated brass **meeple** SVG logo (bob + glow). The meeple is also the favicon (`public/favicon.svg` + `.png`: brass meeple on a felt-green tile).
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
  categories?: string[] // BGG `boardgamecategory` values (genres); used for the
  // collection genre-filter chips. Stored as an RTDB array (numeric-keyed);
  // rules validate each entry as a string ≤60 chars. Absent when BGG lists none.
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
- XML is parsed server-side in the functions using `xml2js`; the client receives JSON. `bggThing` also extracts `boardgamecategory` `<link>` values as `categories: string[]` (BGG's genre concept) via the `linkValues()` helper — these feed the collection genre-filter chips
- **Authorization is required.** Every request must include an `Authorization: Bearer <token>` header. Tokens are created at https://boardgamegeek.com/applications after registering an application (non-commercial license is free). The token is stored in Secret Manager as `BGG_API_KEY` and accessed via `defineSecret('BGG_API_KEY')` in the Cloud Functions. Requests must go to `boardgamegeek.com` (no `www.` prefix) or the token will not work.
- Subject to rate limits and occasional 202 "try again" responses
- Client calls via `httpsCallable` from `firebase/functions`; App Check enforced

## Email notifications & calendar export

Transactional emails are sent server-side from `functions/src/index.ts` via Resend (`RESEND_API_KEY` secret; `FROM_EMAIL`; `APP_URL = https://bgc.jasonsuttles.dev` — keep this current with the deployed domain, it backs every email link). Triggers: `onFriendRequest`, `onGatheringInvite`, `onGatheringStateChange`.

- **Calendar export in-app**: the calendar page renders an "Add to calendar" menu (Google Calendar / Apple·Outlook `.ics`) on every non-canceled hosting and invited card, via `helpers/calendar.ts`.
- **Calendar in emails**: invite + confirmation emails include an "Add to Google Calendar" link and attach a `.ics` invite (`sendEmail`'s optional `attachments: [{ filename, content }]`, content base64). Cancellation emails get neither.
- **RSVP from email**: the invite email has Accept/Decline buttons that deep-link to `/calendar?id={gatheringId}&respond=accepted|declined`. The calendar page applies the RSVP on mount once the gathering loads and confirms the user is an invited guest (writes `gatherings/{id}/guests/{uid}` under the existing rules — login required, no new security surface), then strips the query. This relies on the `?redirect` sign-in flow above.

## Test Setup

Unit tests live in `test/` (`Logo.spec.ts`, `authErrors.spec.ts`, `gatherings.spec.ts`, `collection.spec.ts`); security-rules tests in `test/rules/` run via `yarn test:rules` against the RTDB emulator (`vitest.rules.config.ts`). Vitest requires `environment: 'jsdom'` (set in `vitest.config.ts`). Vuetify must be inlined via `server.deps.inline: ['vuetify']` to avoid CSS import errors. Import `createVuetify` and pass it as a global plugin to `mount`.

## Design Conventions

The app uses a consistent **"Evening Game Table"** design system: a deep green felt play surface lit by a warm overhead lamp, framed in walnut wood, with brass-gold accents and wooden-token chips. The aesthetic is modern post-morphism — soft realistic shadows and honest warm light, restrained texture, no HUD/skeuomorphic chrome. All new UI must follow these conventions.

### Color palette (defined in `nuxt.config.ts` → `vuetifyOptions.theme.themes.dark.colors`)

| Token | Hex | Use |
|-------|-----|-----|
| `background` | `#0E1A12` | App background (deep felt green — the table surface). Also the `theme-color` meta + the initial paint colour (the "default load colour"). |
| `surface` | `#20140A` | Cards (walnut cardstock), drawers. Distinct from the green felt by hue, not just luminance. |
| `surface-variant` | `#2A1A0B` | Nested surfaces, avatars |
| `primary` | `#C8860A` | Amber gold — CTAs, active states, icons. ~5.9:1 on card. |
| `on-primary` | `#100A04` | Text/icons on primary-coloured backgrounds. |
| `secondary` | `#4A7A44` | Muted green — secondary actions. |
| `accent` | `#C0A870` | Sand/tan — external links, edit/navigation actions on dark surfaces (~7.8:1). |
| `success` | `#55B855` | Confirm, accept, save actions. ~7.2:1 on card. |
| `error` | `#E05252` | Destructive actions (delete, cancel, decline). ~4.7:1 on card. |
| `warning` | `#D4A820` | Pending / invited states (chips). |
| `info` | `#5B8FAB` | Informational states. |
| `on-surface` / `on-background` | `#E8D4A8` | Body text on dark backgrounds (warm parchment). ~12.4:1 on card. |

> **Why success and error are brighter than typical dark-theme palettes:** `variant="text"` and `variant="tonal"` buttons use these colours directly as foreground text on the near-black card background. The values above are the minimum needed to reach WCAG AA 4.5:1. Do not darken them.

**Semantic color rules:**
- Destructive action → `color="error"`
- Confirm / accept / save → `color="success"`
- Primary CTA → `color="primary"` on buttons with filled/elevated variant
- External links, secondary navigation → `color="accent"` on text/icon buttons
- Pending / invited state chips → `color="warning"`
- **Never** substitute a darker custom colour for `success` or `error` — contrast will fail

### Typography

- Headings / display: **Fraunces** (serif) via `$heading-font-family` in `variables.scss`. A warm "old-style" serif loaded as a **variable font with its optical-size axis** (`opsz` `9..144`, weights 400/600/700) — the browser auto-renders small text with the legible *text* cut and large titles with the expressive *display* cut. Replaced Cinzel (a caps-only inscriptional face that was illegible on small all-caps chrome).
- Body: **Lora** (serif) via `$body-font-family`. Also used on **chips/status tokens** (not the display face) so small tokens stay readable.
- Body text color: `#E8D4A8` (Vuetify `on-surface`)
- Page title: `.page-title` → `1.4rem / 700`, Fraunces, `letter-spacing: 0.01em`, rendered as `<h1>` (not `<span>`)
- Section label: `.section-label` → `0.82rem / 600`, Fraunces, uppercase, `letter-spacing: 0.1em`, `#c8860a` (full opacity); auto-prefixed with a small amber diamond "scoring marker" via `::before` (flex row)
- Empty state title: `.empty-title` → `1.25rem / 600`, Fraunces
- Empty state description: `.empty-desc` → `0.95rem`, Lora, `rgba(240,223,196,0.80)`
- All buttons: `text-transform: none`, `font-family: Fraunces`, `letter-spacing: 0.01em` (global override in `global.scss`)
- Chips: `font-family: Lora`, `0.78rem / 600`, `letter-spacing: 0.01em` (global override in `global.scss`) — deliberately the body serif, not the display face. **Keep tracking minimal**; the old wide letter-spacing existed only to space out Cinzel's caps.

> **Why Fraunces, not Cinzel:** Cinzel has no real lowercase, so it force-capped everything; on small chips/buttons/labels that read as illegible. Fraunces has true lowercase, a full weight range, and an optical-size axis, so it keeps the warm antique tabletop character while reading cleanly at every size. When adding new display text, prefer Fraunces with minimal letter-spacing; reserve uppercase for short single-word labels only.

### UI copy (capitalization)

All UI labels use **sentence case** — capitalize only the first word: buttons ("Add game", "Create gathering", "Sign in"), nav items, menu items, page titles (`.page-title` h1 and `useHead({ title })`), section labels, field labels/placeholders, and status text. This is the Material Design / Vuetify default.

- **Exceptions — keep their own casing:** proper nouns (the "Board Game Calendar" brand and "BGC", product names like "Google Calendar" and "Apple / Outlook", "BoardGameGeek"/"BGG"), game names, and people's names.
- This convention only became visible once the display font changed to Fraunces (Cinzel rendered everything as caps, hiding casing). When adding any new label, default to sentence case.

### Spacing & shape

- **Border radius root**: `10px` (set in `variables.scss`); buttons & fields `10px` (global override in `global.scss`); cards `xl` (Vuetify default `24px`)
- **Card padding**: `pa-6` (24 px) for `v-card-text` content; `16px 20px` for `page-card-title` headers
- **List item gap**: `mb-2` between items
- **Section gap**: `mb-3` after section labels, `my-4` for dividers between sections

### Cardstock card style (automatic via `global.scss`)

All `v-card` elements are styled as walnut cardstock resting on the felt table:
- Background: solid walnut `#241808` with a barely-there linen weave (two faint 1px cross-hatch `repeating-linear-gradient`s at ~1.4% parchment)
- Border: `1px solid rgba(200, 134, 10, 0.22)` (hairline brass edge)
- Shadow: a soft cast shadow onto the felt (`0 20px 44px -16px rgba(0,0,0,0.65)`) + a contact shadow + a top-edge bevel highlight (`inset 0 1px 0 rgba(240,223,196,0.05)`)
- Hover: border brightens to `rgba(200,134,10,0.4)`, shadow deepens
- No `backdrop-filter`, no corner-bracket ornaments (both removed — they read as 90s-RTS HUD chrome)

The table surface itself (felt + lamp glow + fabric grain) is painted on `body::before` / `body::after`; the walnut frame is the app bar, navigation drawer, **and footer** — all three are opaque walnut so page content scrolls cleanly behind them (the footer must not be transparent, or long content shows through it). Do not override card backgrounds inline — the global style handles it.

### Collection browse (genre filter)

`gamecollection.vue` is the reference pattern for browsing a large list: a toolbar row (text filter + sort `v-select`), a `v-chip-group multiple` of genre facets (`filter` chips, `color="info"`; the group's `v-model` is the selected-genre `string[]` — use the group, not hand-rolled click + `aria-pressed`, so selection state and keyboard nav are correct), a "Showing N of M" count, then the list. Genres beyond `GENRE_CHIP_LIMIT` (12) collapse behind a "+N more" toggle. Genres come from BGG `categories`; each card shows up to 4 genre chips (`size="x-small"` `variant="tonal"` `color="info"`) with a `+N` overflow count. Sort options: name, my rating (own collection only — hidden in friend view), recently added (Firebase push-ID order, newest first).

- **The list is virtualized** (`v-virtual-scroll`, `max-height="72vh"`) because collections can be large — never render the whole list with a plain `v-list`. The per-row note `v-textarea` is folded into the same row item (not a sibling list row) so the virtual scroller measures each row's height correctly when expanded. Do not add per-row entry animations (e.g. a `deal-in` stagger) to virtualized rows — they replay on every scroll recycle.
- Filter/sort logic is a pure, unit-tested helper: `helpers/collection.ts` (`filterAndSortCollection`, `collectionGenres`). Keep it returning an **ordered array** (`CollectionEntry[] = { id, game }[]`); do not smuggle display order through an object's key-iteration order.

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
| `section-label` | `div` before a list section | Uppercase subdued section heading with a leading amber diamond marker |
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


### Accessibility

The app targets WCAG 2.1 AA. Every new UI component must satisfy the rules below.

#### Heading hierarchy
Every page title must be an `<h1>`, not a `<span>`. Use the `.page-title` class on it — the CSS resets browser heading defaults so it renders identically:
```html
<h1 class="page-title">Calendar</h1>
```

#### Skip-to-main link
`layouts/default.vue` has a `.skip-link` as the very first focusable element, targeting `#main-content` on the `<v-container>` inside `<v-main>`. Do not remove it.

#### Loading states
Every `<v-progress-linear indeterminate>` must have an `aria-label` describing what is loading:
```html
<v-progress-linear indeterminate color="primary" aria-label="Loading gatherings" />
```

#### Notifications
`<Snackbar>` has `role="alert"` on its `<v-snackbar>` so screen readers announce messages. Do not remove it.

#### Decorative avatars
Avatar initials (the single letter in `v-avatar`) are decorative — the person's name is already in the adjacent `v-list-item-title`. Add `aria-hidden="true"` to the `v-avatar`:
```html
<v-avatar color="primary" size="36" aria-hidden="true">
  <span class="avatar-initial">{{ name.charAt(0) }}</span>
</v-avatar>
```

#### Links identifiable without colour
Links must not rely on colour alone. Use `text-decoration: underline` in the default (non-hover) state.

#### Motion
`global.scss` includes a `@media (prefers-reduced-motion: reduce)` block that collapses all animation/transition durations to 0.01 ms. Do not add inline `animation` or `transition` styles that bypass this.

#### Contrast quick-reference

Ratios below are measured against the walnut card surface `#20140A` (where body text sits), verified with a WCAG script.

| Use case | Colour | CR on card |
|---|---|---|
| Primary buttons, icons | `#C8860A` | ~5.9:1 ✓ |
| Success text/tonal | `#55B855` | ~7.2:1 ✓ |
| Error text/tonal | `#E05252` | ~4.7:1 ✓ |
| Accent text/tonal | `#C0A870` | ~7.8:1 ✓ |
| Warning text/tonal | `#D4A820` | ~8.1:1 ✓ |
| Info text/tonal | `#5B8FAB` | ~5.1:1 ✓ |
| Body text | `#E8D4A8` | ~12.4:1 ✓ |
| Button label on primary | `#100A04` on `#C8860A` | ~6.4:1 ✓ |
| Section labels | `#c8860a` at `0.8rem` | ~5.9:1 ✓ |

Inactive rating stars use `rgba(200,134,10,0.7)` (~3.5:1) — clears the 3:1 WCAG 1.4.11 threshold for UI components against the card. **Do not drop below 0.7**; `0.55` fails on the lighter walnut surface.

Friend/request avatar initials are dark (`#231708`) on the brass/sand (`primary`/`accent`) token avatars (~5.8:1); on a `surface-variant` avatar use the `.avatar-initial--on-dark` modifier (parchment text) instead.

## Pull Requests

When writing PR descriptions (e.g. via `mcp__github__create_pull_request`), pass the `body` string as a plain JSON string — **never** wrap it in a shell heredoc like `$(cat <<'EOF' ... EOF)`. The GitHub MCP tool receives the value directly as a JSON parameter; heredoc syntax will be passed literally as the PR body text rather than being interpolated. Similarly, do **not** use `\n` escape sequences in the body string — use actual line breaks in the JSON string value instead.

## Deployment

GitHub Actions (`.github/workflows/cd.yml`) runs `yarn generate` and deploys `dist/` to GitHub Pages on push to `main`, then deploys the database rules and Cloud Functions (`firebase deploy --only database` / `--only functions`) authenticated with the `FIREBASE_SERVICE_ACCOUNT_3AE94` key (the `github-action-…` SA). Firebase credentials are injected as GitHub secrets. The `ci.yml` workflow runs `yarn lint` and `yarn test` on push to `main`.

### Cloud Functions service accounts (important)

The functions pin a scoped runtime SA in `setGlobalOptions`: `serviceAccount: 'firebase-adminsdk-fbsvc@…'`. This is deliberate, for **least privilege** — if `serviceAccount` is unset, functions run as the project's default compute SA (`<projectNumber>-compute@…`), which carries the broad `roles/editor`. The scoped SA already has the RTDB read + Firebase Auth access the functions need.

The 2nd-gen RTDB→Eventarc triggers (`onFriendRequest`, `onGatheringInvite`, `onGatheringStateChange`) run as that SA, which **must hold `roles/eventarc.eventReceiver`** or deploys fail trigger validation with `Permission 'eventarc.events.receiveEvent' denied`. This is a one-time, persistent grant (CD never touches IAM):

```bash
gcloud projects add-iam-policy-binding board-game-calendar-3ae94 \
  --member="serviceAccount:firebase-adminsdk-fbsvc@board-game-calendar-3ae94.iam.gserviceaccount.com" \
  --role="roles/eventarc.eventReceiver"
```

Secret access (`BGG_API_KEY`, `RESEND_API_KEY`) is auto-granted to the runtime SA at deploy time; this works in CD because the `github-action-…` deployer SA has `secretmanager.admin` and project-level `iam.serviceAccountUser` (so it can grant secrets and `actAs` the runtime SA). Each trigger also pins `instance: 'board-game-calendar-3ae94-default-rtdb'` so the RTDB instance is unambiguous.

### Cloud Functions dependencies — no lockfile, pin exact (important)

`functions/` is a Yarn Berry workspace member, so `yarn.lock` at the repo root manages it for local/CI installs (Berry doesn't emit a standalone per-workspace lockfile). On deploy, Firebase uploads **only** the `functions/` dir, and Google's buildpack installs runtime deps from `functions/package.json`. The buildpack chooses the package manager by lockfile: a `package-lock.json` triggers strict `npm ci` (fails if it drifts from `package.json`), while **no lockfile** falls back to a forgiving `npm install`. A committed npm `package-lock.json` inside this yarn repo was the source of recurring deploy failures — **do not add one back** (nor a `functions/yarn.lock`). Instead, **pin runtime deps to exact versions** (no `^`/`~`) in `functions/package.json` for reproducible cloud installs; Dependabot bumps them. Don't add a `yarn` field under `functions.engines` — the cloud build uses npm there, not yarn.
