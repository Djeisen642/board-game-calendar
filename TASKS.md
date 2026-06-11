# Remaining MVP Tasks

Goal: let a host create a game night gathering, invite friends from their collection, and let guests confirm attendance.

Tasks are ordered by dependency — earlier items must be done before later ones.

---

## 1. Data model cleanup

**`helpers/types.ts`**

- [x] Add `GatheringState` type: `'pending' | 'confirmed' | 'canceled'`
- [x] Guest responses: instead of a `Guest[]` array, `guests` is a `Record<uid, GuestResponse>` (`'invited' | 'accepted' | 'declined'`) — keying by uid makes the security rule for "a guest may update only their own response" trivial, and the tri-state distinguishes "hasn't responded" from "declined"
- [x] Add `Gathering` type — `games` is `GatheringGame[]` (`{ id, name }`), denormalized so guests can render game names without reading the host's collection
- [x] Remove the local `EventType` from `Calendar.vue` and replace with `Gathering`

---

## 2. Firebase security rules

**`database.rules.json`**

- [x] Restrict `users/{uid}` reads to authenticated users only (change `.read: true` → `.read: "auth != null"`)
- [x] Add rules for `gatherings/{gatheringId}`:
  - host can read and write the full gathering
  - any authenticated user can read gatherings (rules are not filters; client-side filtering per MVP plan in section 5)
  - a guest can update only their own `guests/{uid}` response field
- [x] Add a Firebase index on `gatherings` for `host` (guest membership is filtered client-side for MVP)

---

## 3. Create gathering page/dialog

**New: `pages/gatherings/new.vue`**

- [x] Date + time picker (native `type="date"` / `type="time"` text fields — lighter than `v-date-picker` + `v-time-picker` and better on mobile)
- [x] Max guests field (numeric, defaults to host's `maxPeople` from profile, minus the host)
- [x] Open / invite-only toggle
- [x] Guest selector — multiselect from the host's friends list
- [x] Game selector — multiselect from the host's game collection
- [x] On submit: write to `gatherings/{pushId}` with `state: 'pending'` (rejects past dates)
- [x] Add route `/gatherings/new` and nav item (NeedsAuth)

---

## 4. Calendar page — full implementation

**`pages/Calendar.vue`**

- [x] Replace `EventType` with `Gathering` type
- [x] Change Firebase query from `events` to `gatherings`, filtered to gatherings where `host === uid` OR `guests` contains `uid`
- [x] Display gathering state as a colored chip (pending = yellow, confirmed = green, canceled = red)
- [x] Display game list per gathering
- [x] Host actions: Edit (reuses `/gatherings/new?id=`), Cancel, Confirm; Delete for canceled gatherings
- [x] Guest action: Accept / Decline button (writes to `guests/{uid}`)
- [ ] Auto-confirm logic: transition to `confirmed` when all guests have responded (optional — skipped; host confirms manually)

---

## 5. Guest invitation flow

- [x] When a gathering is created with specific guests, they need to see it
  - Calendar query must include gatherings where the current user is in `guests`
  - Firebase query: load all gatherings and filter client-side (simpler for MVP)
- [x] Show "Invited" gatherings separately from "Hosting" gatherings on the calendar
- [x] Accept / Decline updates `gatherings/{id}/guests/{uid}`

---

## 6. CI: add tests to GitHub Actions

**`.github/workflows/ci.yml`**

- [x] Uncomment (or re-add) the `yarn test` step — it was commented out and the test suite is now passing

---

## 7. Game notes (stretch, post-MVP)

These fields exist in the `Game` type but no UI writes or reads them:

- [ ] `privateNote` — visible only to the owner; could be a tooltip or expandable row in GameCollection
- [ ] `publicNote` — visible to guests viewing the game list for a gathering

---

## Out of scope for MVP

- Mutual friend confirmation (friends are currently one-way)
- Push notifications
- Recurring gatherings
- Map / location picker (address is already stored in profile)
- Chat / comments on gatherings
