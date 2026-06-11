# Component Refactoring Plan

Break up large pages and components into focused composables and sub-components.
The general rule: pages own routing/layout, composables own data/logic, sub-components own repeated UI chunks.

## Status

| File | Lines | Status |
|------|-------|--------|
| `components/GameSearch.vue` | 220 → 55 | ✅ Done — logic in `composables/useBoardGameSearch.ts` |
| `pages/friends.vue` | 239 | 🔲 To do |
| `pages/signin.vue` | 336 | 🔲 To do |
| `pages/calendar.vue` | 201 | 🔲 To do (lower priority) |

---

## Done

### `GameSearch.vue` → `composables/useBoardGameSearch.ts`

All BGG API logic extracted: `fetchResults`, `displayEntries`, `_getEntriesToShow`,
`_getDisplayItemFromSearchResult`, debounce watcher, and `entriesToShow` computed.
`GameSearch.vue` now owns only the Vuetify template ref, `searchEnterPressed`, and
the `selectedItem` watcher that drives the autocomplete blur.

---

## To Do

### `pages/friends.vue` (239 lines)

Three distinct concerns currently mixed together:

1. **`composables/useFriendSearch.ts`**
   - State: `searchQuery`, `searchResults`, `isSearching`
   - Logic: debounced Firebase query on `queryableName` / `queryableEmail` / `queryablePhone`
   - Returns search results with friendship status annotations

2. **`composables/useFriendActions.ts`**
   - `sendFriendRequest(targetUid)` — writes `friendRequests/{uid}` = `'pending'`
   - `acceptRequest(fromUid)` — multi-path update: adds to both `friends/` nodes, removes request
   - `declineRequest(fromUid)` — removes request, writes `blocked/{fromUid}` = `true`
   - `removeFriend(friendId)` — multi-path update: removes from both `friends/` nodes

3. **Page keeps**: Firebase listeners for `friends/` and `friendRequests/`, template rendering

The search and friend-actions composables are good candidates for reuse if a
"select guests" flow on the gatherings page needs friend-awareness later.

---

### `pages/signin.vue` (336 lines)

Four separate async auth flows and a bot-trap honeypot currently in one file:

1. **`composables/useAuthSignIn.ts`**
   - `handleOAuthSignIn(provider)` — `signInWithPopup`, then `setUser` + `router.push`
   - `handleEmailSignIn(email, password)` — `signInWithEmailAndPassword`
   - `handleEmailSignUp(email, password, name)` — `createUserWithEmailAndPassword` + profile write
   - `handleForgotPassword(email)` — `sendPasswordResetEmail`
   - State: `isLoading`, `errorMessage`

2. **Page keeps**: form refs, v-model bindings, Turnstile CAPTCHA token, honeypot field,
   validation rules, template

Optional further split: extract `SignInEmailForm.vue` and `SignInOAuthButtons.vue` as
sub-components if the template grows, but the composable extraction alone gets the
script block to a manageable size.

---

### `pages/calendar.vue` (201 lines, lower priority)

Single concern worth extracting:

1. **`composables/useGatheringDisplay.ts`**
   - `resolveGuestNames(guests)` — `Promise.all` over `get(ref(db, users/{uid}/name))`
   - Helper maps: `gatheringStateColor`, `gatheringStateIcon`, datetime formatting
   - These are likely useful on any future gathering detail page too

2. **Page keeps**: Firebase listener, hosting/invited split, state mutation handlers,
   response handlers, template
