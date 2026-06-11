import { describe, it, expect } from 'vitest'
import {
  splitGatherings,
  acceptedCount,
  isFull,
  stateColor,
  type GatheringWithId,
} from '~/helpers/gatherings'
import type { Gathering } from '~/helpers/types'

const NOW = new Date('2026-06-01T12:00:00Z').getTime()
const FUTURE = '2026-07-01T19:00:00.000Z'
const PAST = '2026-05-01T19:00:00.000Z'

function gathering(overrides: Partial<GatheringWithId>): GatheringWithId {
  return {
    id: 'g',
    state: 'pending',
    datetime: FUTURE,
    initiator: 'host1',
    host: 'host1',
    open: false,
    maxGuests: 4,
    ...overrides,
  }
}

describe('splitGatherings', () => {
  it('splits into hosting, invited, and open sections', () => {
    const all = [
      gathering({ id: 'mine', host: 'me' }),
      gathering({ id: 'inv', guests: { me: 'invited' } }),
      gathering({ id: 'open', open: true }),
      gathering({ id: 'closed' }),
    ]
    const { hosting, invited, open } = splitGatherings(all, 'me', NOW)
    expect(hosting.map((g) => g.id)).toEqual(['mine'])
    expect(invited.map((g) => g.id)).toEqual(['inv'])
    expect(open.map((g) => g.id)).toEqual(['open'])
  })

  it('does not list my own or already-joined gatherings as open', () => {
    const all = [
      gathering({ id: 'mine', host: 'me', open: true }),
      gathering({ id: 'joined', open: true, guests: { me: 'accepted' } }),
    ]
    const { invited, open } = splitGatherings(all, 'me', NOW)
    expect(open).toEqual([])
    expect(invited.map((g) => g.id)).toEqual(['joined'])
  })

  it('hides past and canceled gatherings from the open section only', () => {
    const all = [
      gathering({ id: 'past', open: true, datetime: PAST }),
      gathering({ id: 'canceled', open: true, state: 'canceled' }),
      gathering({
        id: 'pastInvite',
        datetime: PAST,
        guests: { me: 'invited' },
      }),
    ]
    const { invited, open } = splitGatherings(all, 'me', NOW)
    expect(open).toEqual([])
    expect(invited.map((g) => g.id)).toEqual(['pastInvite'])
  })

  it('sorts each section by datetime ascending', () => {
    const all = [
      gathering({ id: 'later', host: 'me', datetime: '2026-08-01T19:00:00.000Z' }),
      gathering({ id: 'sooner', host: 'me', datetime: FUTURE }),
    ]
    expect(splitGatherings(all, 'me', NOW).hosting.map((g) => g.id)).toEqual([
      'sooner',
      'later',
    ])
  })
})

describe('capacity helpers', () => {
  const guests: Gathering['guests'] = {
    a: 'accepted',
    b: 'accepted',
    c: 'declined',
    d: 'invited',
  }

  it('counts only accepted guests', () => {
    expect(acceptedCount(gathering({ guests }))).toBe(2)
    expect(acceptedCount(gathering({}))).toBe(0)
  })

  it('reports fullness against maxGuests', () => {
    expect(isFull(gathering({ guests, maxGuests: 2 }))).toBe(true)
    expect(isFull(gathering({ guests, maxGuests: 3 }))).toBe(false)
    // maxGuests 0 means "no limit set"
    expect(isFull(gathering({ guests, maxGuests: 0 }))).toBe(false)
  })
})

describe('stateColor', () => {
  it('maps states to theme colors', () => {
    expect(stateColor('pending')).toBe('warning')
    expect(stateColor('confirmed')).toBe('success')
    expect(stateColor('canceled')).toBe('error')
  })
})
