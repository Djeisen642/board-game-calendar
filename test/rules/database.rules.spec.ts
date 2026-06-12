import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  ref,
  get,
  set,
  update,
  remove,
  query,
  orderByChild,
  startAt,
  endAt,
  limitToFirst,
} from 'firebase/database'

let testEnv: RulesTestEnvironment

const db = (uid?: string, claims?: { email?: string }) =>
  uid
    ? testEnv.authenticatedContext(uid, claims).database()
    : testEnv.unauthenticatedContext().database()

// email/queryableEmail are bound to the verified auth token, so profile
// writes need a matching token email
const alice = () => db('alice', { email: 'alice@example.com' })

const seed = (path: string, value: unknown) =>
  testEnv.withSecurityRulesDisabled(async (ctx) => {
    await set(ref(ctx.database(), path), value)
  })

const aliceProfile = {
  name: 'Alice',
  queryableName: 'alice',
  email: 'alice@example.com',
  queryableEmail: 'alice@example.com',
  phoneNumber: '(555) 123-4567',
  queryablePhone: '5551234567',
  address: '1 Main St',
  maxPeople: 6,
}

const baseGathering = {
  state: 'pending',
  datetime: '2026-07-01T19:00:00.000Z',
  initiator: 'host1',
  host: 'host1',
  maxGuests: 4,
  guests: { guest1: 'invited' },
  games: [{ id: '13', name: 'Catan' }],
}

beforeAll(async () => {
  const [host, port] = (
    process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? '127.0.0.1:9000'
  ).split(':')
  testEnv = await initializeTestEnvironment({
    projectId: 'board-game-calendar-3ae94',
    database: {
      rules: readFileSync('database.rules.json', 'utf8'),
      host,
      port: Number(port),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearDatabase()
})

describe('users rules', () => {
  it('denies unauthenticated reads of a profile', async () => {
    await seed('users/alice', aliceProfile)
    await assertFails(get(ref(db(), 'users/alice')))
  })

  it('allows any authenticated user to read a profile', async () => {
    await seed('users/alice', aliceProfile)
    await assertSucceeds(get(ref(db('bob'), 'users/alice')))
  })

  it('only lets a user write their own profile', async () => {
    await assertSucceeds(set(ref(alice(), 'users/alice'), aliceProfile))
    await assertFails(set(ref(db('bob'), 'users/alice'), aliceProfile))
  })

  it('permits the friend-search query (queryableName index) for signed-in users', async () => {
    await seed('users/alice', aliceProfile)
    const q = query(
      ref(db('bob'), 'users'),
      orderByChild('queryableName'),
      startAt('ali'),
      endAt('ali'),
      limitToFirst(10)
    )
    await assertSucceeds(get(q))
    await assertFails(
      get(
        query(
          ref(db(), 'users'),
          orderByChild('queryableName'),
          startAt('ali'),
          endAt('ali'),
          limitToFirst(10)
        )
      )
    )
  })

  it('validates field types and lengths', async () => {
    await assertFails(
      set(ref(alice(), 'users/alice'), { ...aliceProfile, maxPeople: '6' })
    )
    await assertFails(
      set(ref(alice(), 'users/alice'), {
        ...aliceProfile,
        name: 'x'.repeat(101),
        queryableName: 'x'.repeat(101),
      })
    )
    await assertSucceeds(
      set(ref(alice(), 'users/alice/collection/g1'), {
        id: '13',
        name: 'Catan',
        rating: 4.5,
      })
    )
    await assertFails(
      set(ref(alice(), 'users/alice/collection/g1'), {
        id: '13',
        name: 'Catan',
        rating: 11,
      })
    )
  })

  it('binds email and queryableEmail to the auth token email', async () => {
    await assertSucceeds(set(ref(alice(), 'users/alice'), aliceProfile))
    await assertFails(
      set(ref(db('bob', { email: 'bob@example.com' }), 'users/bob'), {
        ...aliceProfile,
        name: 'Bob',
        queryableName: 'bob',
        // bob claiming alice's email to show up in her search results
      })
    )
    await assertFails(
      set(ref(alice(), 'users/alice'), {
        ...aliceProfile,
        queryableEmail: 'someoneelse@example.com',
      })
    )
  })

  it('requires queryableName to match the lowercased name', async () => {
    await assertFails(
      set(ref(alice(), 'users/alice'), {
        ...aliceProfile,
        queryableName: 'totally different',
      })
    )
  })

  it('requires queryablePhone to be digits only', async () => {
    await assertFails(
      set(ref(alice(), 'users/alice'), {
        ...aliceProfile,
        queryablePhone: '(555) 123-4567',
      })
    )
  })

  it('rejects unknown keys under a profile', async () => {
    await assertFails(
      set(ref(alice(), 'users/alice'), { ...aliceProfile, junk: 'x' })
    )
    await assertFails(
      set(ref(alice(), 'users/alice/emailVerified'), true)
    )
    await assertFails(
      set(ref(alice(), 'users/alice/collection/g1'), {
        id: '13',
        name: 'Catan',
        junk: 'x',
      })
    )
  })
})

describe('friend search index rules', () => {
  it('permits queries on queryableEmail and queryablePhone for signed-in users', async () => {
    await seed('users/alice', aliceProfile)
    await assertSucceeds(
      get(
        query(
          ref(db('bob'), 'users'),
          orderByChild('queryableEmail'),
          startAt('alice@'),
          endAt('alice@'),
          limitToFirst(10)
        )
      )
    )
    await assertSucceeds(
      get(
        query(
          ref(db('bob'), 'users'),
          orderByChild('queryablePhone'),
          startAt('5551234'),
          endAt('5551234'),
          limitToFirst(10)
        )
      )
    )
  })
})

describe('friend request rules', () => {
  it('lets a user send a pending request under their own uid', async () => {
    await assertSucceeds(
      set(ref(db('bob'), 'friendRequests/alice/bob'), 'pending')
    )
  })

  it('rejects values other than pending', async () => {
    await assertFails(
      set(ref(db('bob'), 'friendRequests/alice/bob'), 'accepted')
    )
  })

  it('blocks sending a request under someone else uid', async () => {
    await assertFails(
      set(ref(db('mallory'), 'friendRequests/alice/bob'), 'pending')
    )
  })

  it('blocks overwriting an existing request', async () => {
    await seed('friendRequests/alice/bob', 'pending')
    await assertFails(
      set(ref(db('bob'), 'friendRequests/alice/bob'), 'pending')
    )
  })

  it('blocks requests from a sender the recipient has blocked', async () => {
    await seed('blocked/alice/bob', true)
    await assertFails(
      set(ref(db('bob'), 'friendRequests/alice/bob'), 'pending')
    )
    // the block is directional: alice can still request bob
    await assertSucceeds(
      set(ref(db('alice'), 'friendRequests/bob/alice'), 'pending')
    )
  })

  it('lets only the recipient delete a request', async () => {
    await seed('friendRequests/alice/bob', 'pending')
    await assertFails(remove(ref(db('bob'), 'friendRequests/alice/bob')))
    await assertFails(remove(ref(db('mallory'), 'friendRequests/alice/bob')))
    await assertSucceeds(remove(ref(db('alice'), 'friendRequests/alice/bob')))
  })

  it('lets the recipient read incoming requests and the sender their own entry', async () => {
    await seed('friendRequests/alice/bob', 'pending')
    await assertSucceeds(get(ref(db('alice'), 'friendRequests/alice')))
    await assertSucceeds(get(ref(db('bob'), 'friendRequests/alice/bob')))
    await assertFails(get(ref(db('mallory'), 'friendRequests/alice')))
    await assertFails(get(ref(db('mallory'), 'friendRequests/alice/bob')))
  })

  it('lets the recipient accept via the mutual multi-path update', async () => {
    await seed('friendRequests/alice/bob', 'pending')
    await assertSucceeds(
      update(ref(db('alice')), {
        'users/alice/friends/bob': true,
        'users/bob/friends/alice': true,
        'friendRequests/alice/bob': null,
      })
    )
  })

  it('blocks writing into another users friends list without a pending request', async () => {
    await assertFails(set(ref(db('alice'), 'users/bob/friends/alice'), true))
    await assertFails(set(ref(db('mallory'), 'users/bob/friends/alice'), true))
  })

  it('blocks the forged-request self-insert (request authored by the recipient)', async () => {
    // mallory can no longer forge a "request from bob" under her own subtree:
    // requests live top-level and only the sender can create them
    await assertFails(
      set(ref(db('mallory'), 'friendRequests/mallory/bob'), 'pending')
    )
    // and without a real request from bob, she cannot add herself to his list
    await assertFails(set(ref(db('mallory'), 'users/bob/friends/mallory'), true))
  })

  it('lets the decline flow remove the request and block the sender', async () => {
    await seed('friendRequests/alice/bob', 'pending')
    await assertSucceeds(
      update(ref(db('alice')), {
        'blocked/alice/bob': true,
        'friendRequests/alice/bob': null,
      })
    )
  })

  it('lets a user remove themselves from a friends list (mutual unfriend)', async () => {
    await seed('users/alice/friends/bob', true)
    await seed('users/bob/friends/alice', true)
    await assertSucceeds(
      update(ref(db('alice')), {
        'users/alice/friends/bob': null,
        'users/bob/friends/alice': null,
      })
    )
  })
})

describe('blocked list rules', () => {
  it('lets only the owner write their blocked list', async () => {
    await assertSucceeds(set(ref(db('alice'), 'blocked/alice/bob'), true))
    await assertFails(set(ref(db('bob'), 'blocked/alice/bob'), true))
  })

  it('only allows true as a blocked value', async () => {
    await assertFails(set(ref(db('alice'), 'blocked/alice/bob'), false))
    await assertFails(set(ref(db('alice'), 'blocked/alice/bob'), 'blocked'))
  })

  it('lets only the owner read their blocked list', async () => {
    await seed('blocked/alice/bob', true)
    await assertSucceeds(get(ref(db('alice'), 'blocked/alice')))
    await assertFails(get(ref(db('bob'), 'blocked/alice')))
    await assertFails(get(ref(db('bob'), 'blocked/alice/bob')))
  })
})

describe('gatherings rules', () => {
  it('requires auth to read gatherings', async () => {
    await seed('gatherings/g1', baseGathering)
    await assertFails(get(ref(db(), 'gatherings')))
    await assertSucceeds(get(ref(db('bob'), 'gatherings')))
  })

  it('lets a user create a gathering only with themselves as host', async () => {
    await assertSucceeds(set(ref(db('host1'), 'gatherings/g1'), baseGathering))
    await assertFails(
      set(ref(db('mallory'), 'gatherings/g2'), {
        ...baseGathering,
        host: 'host1',
      })
    )
  })

  it('lets only the host modify or delete a gathering', async () => {
    await seed('gatherings/g1', baseGathering)
    await assertSucceeds(
      update(ref(db('host1'), 'gatherings/g1'), { state: 'confirmed' })
    )
    await assertFails(
      update(ref(db('guest1'), 'gatherings/g1'), { state: 'confirmed' })
    )
    await assertFails(remove(ref(db('guest1'), 'gatherings/g1')))
    await assertSucceeds(remove(ref(db('host1'), 'gatherings/g1')))
  })

  it('keeps host immutable after creation', async () => {
    await seed('gatherings/g1', baseGathering)
    await assertFails(
      update(ref(db('host1'), 'gatherings/g1'), { host: 'alice' })
    )
  })

  it('pins initiator to the creator and keeps it immutable', async () => {
    await assertFails(
      set(ref(db('host1'), 'gatherings/g1'), {
        ...baseGathering,
        initiator: 'alice',
      })
    )
    await seed('gatherings/g1', baseGathering)
    await assertFails(
      update(ref(db('host1'), 'gatherings/g1'), { initiator: 'alice' })
    )
  })

  it('validates gathering state values', async () => {
    await assertFails(
      set(ref(db('host1'), 'gatherings/g1'), {
        ...baseGathering,
        state: 'partying',
      })
    )
  })

  it('rejects unknown keys on a gathering', async () => {
    await assertFails(
      set(ref(db('host1'), 'gatherings/g1'), { ...baseGathering, junk: 'x' })
    )
    await assertFails(
      set(ref(db('host1'), 'gatherings/g1'), {
        ...baseGathering,
        games: [{ id: '13', name: 'Catan', junk: 'x' }],
      })
    )
  })

  it('lets an invited guest update only their own response', async () => {
    await seed('gatherings/g1', baseGathering)
    await assertSucceeds(
      set(ref(db('guest1'), 'gatherings/g1/guests/guest1'), 'accepted')
    )
    await assertFails(
      set(ref(db('mallory'), 'gatherings/g1/guests/guest1'), 'declined')
    )
    await assertFails(
      set(ref(db('guest1'), 'gatherings/g1/guests/guest1'), 'maybe')
    )
  })

  it('blocks the host from answering on a guest behalf', async () => {
    // seeding 'invited' and preserving an existing response are fine...
    await assertSucceeds(
      set(ref(db('host1'), 'gatherings/g1'), baseGathering)
    )
    await seed('gatherings/g1/guests/guest1', 'accepted')
    await assertSucceeds(
      update(ref(db('host1'), 'gatherings/g1'), {
        guests: { guest1: 'accepted', guest2: 'invited' },
      })
    )
    // ...but the host cannot flip a guest to accepted/declined themselves
    await assertFails(
      update(ref(db('host1'), 'gatherings/g1'), {
        guests: { guest1: 'accepted', guest2: 'accepted' },
      })
    )
    await assertFails(
      set(ref(db('host1'), 'gatherings/g2'), {
        ...baseGathering,
        host: 'host1',
        guests: { guest1: 'accepted' },
      })
    )
  })

  it('blocks uninvited users from writing a guest response', async () => {
    await seed('gatherings/g1', baseGathering)
    await assertFails(
      set(ref(db('walkin'), 'gatherings/g1/guests/walkin'), 'accepted')
    )
  })
})
