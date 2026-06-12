# Security findings — remaining items

The authorization findings from the friends/gatherings review have been fixed
(forged friend requests, email/name search impersonation, host reassignment,
guest-consent spoofing, free-form storage under owned paths, self-attested
`emailVerified`). `friendRequests` and `blocked` now live at top level with
sender/owner-enforced writes and owner-only reads, and
`test/rules/database.rules.spec.ts` covers the closed holes. What's left below
is the post-MVP work and the consciously accepted limitations.

## Remaining: privacy surface of world-readable profiles (post-MVP)

`users/` is readable by any authenticated user (required for the friend-search
queries). That exposes:

- **phone / address** of every user to every signed-in user (the long-standing
  accepted limitation).
- **`collection/*/privateNote`** — validated in rules and named "private," but
  world-readable. Not written by the UI yet, so it's a trap waiting for whoever
  wires it up.
- The `queryableEmail` / `queryablePhone` **indexes** make bulk contact-info
  harvesting efficient via range queries.

**Fix:** split search-visible fields (name + queryable\*) from private fields
(phone, address, private notes) into separate nodes, and only make the public
node world-readable. High effort; requires a data migration and touching every
profile read.

## Accepted limitations

- **Phone impersonation** — `queryablePhone` must be digits-only but cannot be
  verified without phone auth; a user can claim someone else's number and
  surface in phone searches.
- **`maxGuests` is not enforced** against the number of guest entries — RTDB
  rules cannot count children. The client enforces it informally.
- **No server-side data migration** for pre-existing nested
  `users/{uid}/friendRequests` / `users/{uid}/blocked` / `emailVerified` data;
  old entries are simply orphaned (no longer readable or writable by the new
  client, and new writes of those keys are rejected by `$other`).
