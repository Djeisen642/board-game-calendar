# Remaining MVP Tasks

Goal: let a host create a game night gathering, invite friends from their collection, and let guests confirm attendance.

Tasks are ordered by dependency — earlier items must be done before later ones.

---

## 1. Data model cleanup

**`helpers/types.ts`**

- [ ] Add `GatheringState` type: `'pending' | 'confirmed' | 'canceled'`
- [ ] Add `Guest` type: `{ id: string; confirmed: boolean }`
- [ ] Add `Gathering` type: `{ id: string; state: GatheringState; datetime: string; initiator: string; host: string; open: boolean; maxGuests: number; guests: Guest[]; games: string[] }`
- [ ] Remove the local `EventType` from `Calendar.vue` and replace with `Gathering`

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

**New: `pages/CreateGathering.vue`** (or a dialog launched from Calendar)

- [ ] Date + time picker (Vuetify `v-date-picker` + `v-time-picker`)
- [ ] Max guests field (numeric, defaults to host's `maxPeople` from profile)
- [ ] Open / invite-only toggle
- [ ] Guest selector — multiselect from the host's friends list
- [ ] Game selector — multiselect from the host's game collection
- [ ] On submit: write to `gatherings/{pushId}` with `state: 'pending'`
- [ ] Add route `/gatherings/new` and nav item (NeedsAuth)

---

## 4. Calendar page — full implementation

**`pages/Calendar.vue`** (currently a stub)

- [ ] Replace `EventType` with `Gathering` type
- [ ] Change Firebase query from `events` to `gatherings`, filtered to gatherings where `host === uid` OR `guests` contains `uid`
- [ ] Display gathering state as a colored chip (pending = yellow, confirmed = green, canceled = red)
- [ ] Display game list per gathering
- [ ] Host actions: Edit, Cancel, Confirm (manual confirm for host)
- [ ] Guest action: Accept / Decline button (writes to `guests[i].confirmed`)
- [ ] Auto-confirm logic: transition to `confirmed` when all guests have responded (optional, can be host-only)

---

## 5. Guest invitation flow

- [ ] When a gathering is created with specific guests, they need to see it
  - Calendar query must include gatherings where the current user is in `guests[]`
  - Firebase query: use `gatherings` index on `guests/{uid}` or load all gatherings and filter client-side (simpler for MVP)
- [ ] Show "Invited" gatherings separately from "Hosting" gatherings on the calendar
- [ ] Accept / Decline updates `gatherings/{id}/guests/{i}/confirmed`

---

## 6. CI: add tests to GitHub Actions

**`.github/workflows/ci.yml`**

- [ ] Uncomment (or re-add) the `yarn test` step — it was commented out and the test suite is now passing

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
