# Security findings — authorization & data-exposure review

Review of `database.rules.json` and the pages that read/write it (`pages/friends.vue`,
`pages/profile.vue`, `pages/signin.vue`, `pages/gatherings/new.vue`,
`pages/calendar.vue`). Findings are things a user can do that the feature design
appears not to intend.

**Severity caveat:** none of these grant a hard privilege *today* — friends lists
and gatherings don't gate any sensitive write, and the worst-named field
(`privateNote`) isn't yet read/written in the UI. These are mostly "defeats the
intent of the feature" and "dormant trap" issues. They're worth fixing before the
data model grows to depend on any of these nodes for real access control.

Background on the platform constraint that causes several of these: **Firebase
Realtime Database `.write` rules cascade and cannot be revoked by a child.** Once a
parent path grants write (here `users/$uid` with `$uid === auth.uid`), no rule on a
descendant can take that grant away — a child `.write` can only *add* permission for
other users. `.validate` rules also only run on keys you explicitly enumerate;
there is no implicit "deny unknown keys."

---

## 1. A user can insert themselves into someone else's friends list

**Bypasses the request-flow tightening added in #427.**

The intent: you can only end up in Bob's friends list via the accept flow. The rule:

```json
"friends": {
  "$friendId": {
    ".write": "auth != null && $friendId === auth.uid && (newData.exists() ? root.child('users').child(auth.uid).child('friendRequests').child($uid).exists() : true)",
    ".validate": "newData.val() === true"
  }
}
```

This lets Mallory write `users/bob/friends/mallory = true` only if
`users/mallory/friendRequests/bob` exists. But `friendRequests` lives inside the
recipient's *own* subtree, and the owner grant (`$uid === auth.uid`) cascades to it.
So Mallory can:

1. Write `users/mallory/friendRequests/bob = 'pending'` (legal — it's her subtree,
   and the `.validate` only checks the value is `'pending'`, not who it's from).
2. Write `users/bob/friends/mallory = true` (now passes, because the request she
   forged in step 1 exists).

She then appears on Bob's Friends page and in his "Invite friends" picker in
`gatherings/new.vue`, with no action by Bob.

**Root cause:** a request's authorship is encoded purely by *location*, and that
location is owner-writable. RTDB rules can't fix this in place.

**Suggested fix:** move requests and blocks to top-level nodes keyed by recipient,
so authorship is enforced by the rule rather than implied by nesting:

```
friendRequests/{toUid}/{fromUid}: 'pending'   // .write requires auth.uid === fromUid
blocked/{ownerUid}/{blockedUid}: true          // .write requires auth.uid === ownerUid
```

Then the `friends` accept write can reference `root.child('friendRequests').child(auth.uid).child($uid)`,
which the counterpart cannot forge. This also resolves finding #3 for these two nodes.

---

## 2. Email / phone search is impersonatable

`pages/signin.vue` and `pages/profile.vue` write `email` / `queryableEmail` /
`queryablePhone` with no binding to the authenticated account. Bob can save
`alice@example.com` as his email and surface himself when people search for Alice;
the same applies to phone, and `queryableName` need not match `name`.

**Suggested fix:** bind email server-side — Firebase exposes the verified auth email
to rules:

```json
"email":          { ".validate": "newData.val() === auth.token.email" },
"queryableEmail": { ".validate": "newData.val() === auth.token.email.lowerCase()" }
```

Phone can't be verified without phone auth; if impersonation matters there, gate it
behind phone-auth or accept it as a known limitation. `queryableName` can at least be
constrained to equal `name.toLowerCase()`.

---

## 3. Privacy surface is wider than the documented limitation

`users/` is world-readable to any authenticated user (required for the search
queries). The accepted limitation in CLAUDE.md only mentions phone/address, but the
same cascade now also exposes:

- **`blocked` lists** — anyone can read who declined whom. The client even *depends*
  on reading the target's blocked list before sending a request.
- **pending `friendRequests`** — anyone can read anyone's incoming requests.
- **`collection/*/privateNote`** — validated in rules and named "private," but
  world-readable. Not written by the UI yet, so it's a trap waiting for whoever
  wires it up.
- The new `queryableEmail` / `queryablePhone` **indexes** make bulk contact-info
  harvesting efficient via range queries.

**Suggested fix:** the public/private profile split already noted as post-MVP. Split
search-visible fields (name + queryable*) from private fields (phone, address,
blocked, friendRequests, private notes), and only make the public node world-readable.

---

## 4. A host can reassign a gathering to a non-consenting user

```json
"$gatheringId": {
  ".write": "auth != null && (data.exists() ? data.child('host').val() === auth.uid : newData.child('host').val() === auth.uid)"
}
```

On update, only the *old* host is checked; `newData.host` only has to be a string
(per the field `.validate`). So Mallory can create a gathering and then set
`host` to Alice's uid. It then appears in Alice's "hosting" view in `calendar.vue`,
Alice never consented, and Mallory loses edit control (the rule now treats Alice as
host). Spammy / confusing rather than dangerous, but unintended.

Related, smaller, same area:

- **`initiator` is unconstrained** — any uid can be claimed as the initiator.
- **Host can spoof guest consent** — the per-guest rule binds `$guestUid === auth.uid`,
  but the host's write cascades over `guests/*`, so a host can set any uid's response
  to `'accepted'`. (`pages/gatherings/new.vue` writes guest entries as part of the
  host update.)
- **`maxGuests` is not enforced** against the actual number of guest entries.

**Suggested fix:** make `host` immutable on update
(`!data.exists() || newData.child('host').val() === data.child('host').val()`), and
decide whether `initiator` should likewise be pinned at creation. Guest-consent
spoofing is harder to close given the host needs to seed `'invited'` entries; at
minimum, disallow the host writing `'accepted'`/`'declined'` on another uid's behalf.

---

## 5. Unvalidated free-form storage under owned paths

RTDB validates only enumerated keys and has no implicit deny for unknown keys. There
is no `"$other": { ".validate": false }` on `users/$uid` or on `$gatheringId`, so any
user can write arbitrary keys and unbounded subtrees under their own `users/{uid}`
(and hosts under their gatherings), sidestepping every length limit defined elsewhere
in the rules. Junk-data / storage-abuse vector.

**Suggested fix:** add a catch-all `"$other": { ".validate": false }` to the
`users/$uid` and `$gatheringId` rule objects so only known fields are accepted.

---

## 6. Self-attested `emailVerified`

`pages/signin.vue` writes `emailVerified: false` at signup; real verification state
lives in Firebase Auth, not the DB. The rules let a user set their own flag to `true`
(it's under their owner-writable subtree with only a `isBoolean()` validate).

Nothing reads this field today, so it's a dormant trap rather than an exploit. Either
enforce it via rules (`newData.val() === auth.token.email_verified`) or drop the field
and read verification state from Auth where it's needed.

---

## Rough fix ordering

| Finding | Effort | Notes |
| ------- | ------ | ----- |
| #1 friends self-insert | medium | needs node move (top-level friendRequests/blocked); also fixes #3 for those nodes |
| #4 host reassignment | low | rule-only: pin `host` (and maybe `initiator`) on update |
| #5 free-form storage | low | rule-only: `$other` deny on the two parent objects |
| #6 emailVerified | low | rule-only or remove the field |
| #2 email impersonation | low–medium | rule + minor signup/profile tweak |
| #3 privacy surface | high | the post-MVP public/private profile split |
