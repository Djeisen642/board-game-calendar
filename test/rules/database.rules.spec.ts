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

const db = (uid?: string) =>
  uid
    ? testEnv.authenticatedContext(uid).database()
    : testEnv.unauthenticatedContext().database()

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
  open: false,
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
    await assertSucceeds(set(ref(db('alice'), 'users/alice'), aliceProfile))
    await assertFails(set(ref(db('bob'), 'users/alice'), aliceProfile))
  })

  it('permits the friend-search query (queryableName index) for signed-in users', async () => {
    await seed('users/alice', aliceProfile)
    const q = query(
      ref(db('bob'), 'users'),
      orderByChild('queryableName'),
      startAt('ali'),
      endAt('ali'),
      limitToFirst(10)
    )
    await assertSucceeds(get(q))
    await assertFails(
      get(
        query(
          ref(db(), 'users'),
          orderByChild('queryableName'),
          startAt('ali'),
          endAt('ali'),
          limitToFirst(10)
        )
      )
    )
  })

  it('validates field types and lengths', async () => {
    await assertFails(
      set(ref(db('alice'), 'users/alice'), { ...aliceProfile, maxPeople: '6' })
    )
    await assertFails(
      set(ref(db('alice'), 'users/alice'), {
        ...aliceProfile,
        name: 'x'.repeat(101),
      })
    )
    await assertSucceeds(
      set(ref(db('alice'), 'users/alice/collection/g1'), {
        id: '13',
        name: 'Catan',
        rating: 4.5,
      })
    )
    await assertFails(
      set(ref(db('alice'), 'users/alice/collection/g1'), {
        id: '13',
        name: 'Catan',
        rating: 11,
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
          endAt('alice@'),
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
          endAt('5551234'),
          limitToFirst(10)
        )
      )
    )
  })

  it('validates queryableEmail and queryablePhone types and lengths', async () => {
    await assertFails(
      set(ref(db('alice'), 'users/alice'), {
        ...aliceProfile,
        queryableEmail: 'x'.repeat(201),
      })
    )
    await assertFails(
      set(ref(db('alice'), 'users/alice'), {
        ...aliceProfile,
        queryablePhone: 5551234567,
      })
    )
  })
})

describe('friend request rules', () => {
  it('lets a user send a pending request under their own uid', async () => {
    await assertSucceeds(
      set(ref(db('bob'), 'users/alice/friendRequests/bob'), 'pending')
    )
  })

  it('rejects values other than pending', async () => {
    await assertFails(
      set(ref(db('bob'), 'users/alice/friendRequests/bob'), 'accepted')
    )
  })

  it('blocks sending a request under someone else uid', async () => {
    await assertFails(
      set(ref(db('mallory'), 'users/alice/friendRequests/bob'), 'pending')
    )
  })

  it('blocks overwriting an existing request', async () => {
    await seed('users/alice/friendRequests/bob', 'pending')
    await assertFails(
      set(ref(db('bob'), 'users/alice/friendRequests/bob'), 'pending')
    )
  })

  it('blocks requests from a sender the recipient has blocked', async () => {
    await seed('users/alice/blocked/bob', true)
    await assertFails(
      set(ref(db('bob'), 'users/alice/friendRequests/bob'), 'pending')
    )
    // the block is directional: alice can still request bob
    await assertSucceeds(
      set(ref(db('alice'), 'users/bob/friendRequests/alice'), 'pending')
    )
  })

  it('lets only the recipient delete a request', async () => {
    await seed('users/alice/friendRequests/bob', 'pending')
    await assertFails(remove(ref(db('bob'), 'users/alice/friendRequests/bob')))
    await assertSucceeds(
      remove(ref(db('alice'), 'users/alice/friendRequests/bob'))
    )
  })

  it('lets the recipient accept via the mutual multi-path update', async () => {
    await seed('users/alice/friendRequests/bob', 'pending')
    await assertSucceeds(
      update(ref(db('alice')), {
        'users/alice/friends/bob': true,
        'users/bob/friends/alice': true,
        'users/alice/friendRequests/bob': null,
      })
    )
  })

  it('blocks writing into another users friends list without a pending request', async () => {
    await assertFails(set(ref(db('alice'), 'users/bob/friends/alice'), true))
    await assertFails(set(ref(db('mallory'), 'users/bob/friends/alice'), true))
  })

  it('lets the decline flow remove the request and block the sender', async () => {
    await seed('users/alice/friendRequests/bob', 'pending')
    await assertSucceeds(
      update(ref(db('alice')), {
        'users/alice/blocked/bob': true,
        'users/alice/friendRequests/bob': null,
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
    await assertSucceeds(set(ref(db('alice'), 'users/alice/blocked/bob'), true))
    await assertFails(set(ref(db('bob'), 'users/alice/blocked/bob'), true))
  })

  it('only allows true as a blocked value', async () => {
    await assertFails(set(ref(db('alice'), 'users/alice/blocked/bob'), false))
    await assertFails(
      set(ref(db('alice'), 'users/alice/blocked/bob'), 'blocked')
    )
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

  it('validates gathering state values', async () => {
    await assertFails(
      set(ref(db('host1'), 'gatherings/g1'), {
        ...baseGathering,
        state: 'partying',
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

  it('blocks uninvited users from invite-only gatherings', async () => {
    await seed('gatherings/g1', baseGathering)
    await assertFails(
      set(ref(db('walkin'), 'gatherings/g1/guests/walkin'), 'accepted')
    )
  })

  it('lets a signed-in user join an open gathering by accepting', async () => {
    await seed('gatherings/g1', { ...baseGathering, open: true })
    await assertSucceeds(
      set(ref(db('walkin'), 'gatherings/g1/guests/walkin'), 'accepted')
    )
    // joining is accept-only; you can't add yourself as merely invited
    await assertFails(
      set(ref(db('other'), 'gatherings/g1/guests/other'), 'invited')
    )
  })

  it('blocks joining a canceled open gathering', async () => {
    await seed('gatherings/g1', {
      ...baseGathering,
      open: true,
      state: 'canceled',
    })
    await assertFails(
      set(ref(db('walkin'), 'gatherings/g1/guests/walkin'), 'accepted')
    )
  })
})
