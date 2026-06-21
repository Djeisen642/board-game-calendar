# Security Audit — 2026-06-20

Audit of the Firebase RTDB rules, Cloud Functions, email layer, auth/redirect
flow, and the calendar/RSVP deep-link feature. **No critical or high findings.**
The authorization model (the RTDB rules in `database.rules.json`) is solid — the
findings below are abuse/spam hardening and one self-introduced UX-security
smell.

## Attacks attempted that correctly failed (rules hold)

- **Self-inviting to read a private gathering** — blocked. `gatherings/$id/guests/$me`
  write requires `data.exists()` (the entry must already exist), so a user can't
  add themselves; `.read` requires being host/guest.
- **Impersonating a host / forging `initiator`** — blocked. `host` must equal the
  creator and is immutable; `initiator` is pinned to `auth.uid`.
- **Injecting fake calendar entries** — blocked. `userGatherings/$me/$id` self-write
  is delete-only; adding requires being the gathering's host.
- **Inviting strangers / calendar spam** — blocked. Host can only seed `'invited'`
  for users whose own friends list contains the host (can't be forged).
- **Email-squatting a stranger's address** — blocked. `queryableEmail` must match a
  *verified* token email.
- **No hardcoded secrets**; `firebase.config.ts` holds only public identifiers.
- **`decodeHtml` is XSS-safe** — sets `innerHTML` on a detached `<textarea>` (RCDATA,
  no script execution) and reads `.value`; no `v-html` renders BGG/user content.

## Findings (prioritized)

### 1. Auto-RSVP from a GET deep-link, no confirmation — **Low** (introduced in PR #482)

`/calendar?id=X&respond=declined` applies the RSVP automatically on page load.
A co-participant (who knows the gathering's push ID) could trick another invited
guest into silently flipping their own RSVP via a crafted link. Impact is bounded:
it only ever changes the victim's *own* RSVP on a gathering they're genuinely
invited to (rules enforce this), and the push ID is only known to participants.

**Fix:** show a "You're about to accept/decline — confirm?" step instead of
auto-applying, or require landing on a button rather than firing on mount.
Files: `pages/calendar.vue` (the `watch([gatheringsById, pendingRsvp], …)` block).

### 2. Friend-request email amplification — **Low**

Any authed user can write `friendRequests/{anyUid}/{me}`, and `onFriendRequest`
emails the target with the sender's (escaped) display name. One account can send
unsolicited "X sent you a friend request" emails to many users, and an abusive
display name lands in the inbox. **Mitigations already present:** OAuth-only
sign-in (no cheap account farming), sender can't overwrite an existing request,
and a decline blocks further requests — so it's ~one email per victim.

**Fix:** per-sender rate limit / cooldown (e.g. a counter checked in a Cloud
Function), or cap notification emails. Files: `functions/src/index.ts`
(`onFriendRequest`), `database.rules.json` (`friendRequests`).

### 3. Re-invite email spam by a malicious host — **Low**

`onGatheringInvite` re-fires on `declined → invited`. A host could repeatedly
re-invite a mutual friend to spam invite emails (bounded to mutual friends).

**Fix:** debounce/throttle re-invite notifications. File: `functions/src/index.ts`.

### 4. PII enumeration via `profiles/` — **Informational** (already documented & accepted)

Any authed user can range-query `queryableEmail`/`queryablePhone`/`queryableName`
and harvest names, verified emails, and phone digits. Documented trade-off of
client-side search on a static site; mitigating it requires moving search behind
a Cloud Function.

### 5. `maxGuests` not rule-enforced — **Informational** (documented)

Client-only check; a guest can accept past capacity. Low impact (over-booking).

### 6. Datetime edits don't notify accepted guests — **Informational**

`onGatheringStateChange` only fires on state change. A host can move a confirmed
event's time and guests aren't emailed. Product gap, not a security issue.

## Hardening checklist (not code issues)

- **Enable App Check enforcement on the Realtime Database** in the Firebase
  console. It's enforced on the callable functions (`enforceAppCheck`), but RTDB
  enforcement can't be verified from the repo. The rules are the real boundary
  regardless; App Check blunts bot/abuse traffic.
- **Email-escaping invariant:** every interpolated email field must stay escaped.
  Today `hostName`/`datetime` are `escapeHtml`'d and game names only flow into
  URL-encoded / `.ics` (escaped) contexts — no HTML injection — but it's one
  careless `${userValue}` away.

## Suggested order of work

1. Finding **#1** (RSVP confirmation) — self-introduced, smallest, in the open PR area.
2. Finding **#2** (friend-request rate limiting) — highest real-world abuse value.
3. Enable RTDB App Check enforcement (console toggle).
