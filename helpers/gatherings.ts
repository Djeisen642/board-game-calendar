import type { Gathering, GatheringState, GuestResponse } from './types'

export type GatheringWithId = Gathering & { id: string }

const byDatetime = (a: GatheringWithId, b: GatheringWithId) =>
  a.datetime.localeCompare(b.datetime)

// Rules are not filters: any signed-in user may read gatherings, so the
// calendar loads them all and splits them client-side (MVP approach)
export function splitGatherings(
  gatherings: GatheringWithId[],
  uid: string,
  now: number = Date.now()
) {
  return {
    hosting: gatherings.filter((g) => g.host === uid).sort(byDatetime),
    invited: gatherings
      .filter((g) => g.host !== uid && g.guests?.[uid])
      .sort(byDatetime),
    open: gatherings
      .filter(
        (g) =>
          g.host !== uid &&
          !g.guests?.[uid] &&
          g.open &&
          g.state !== 'canceled' &&
          new Date(g.datetime).getTime() > now
      )
      .sort(byDatetime),
  }
}

export function acceptedCount(gathering: Gathering): number {
  return Object.values(gathering.guests ?? {}).filter(
    (response) => response === 'accepted'
  ).length
}

export function isFull(gathering: Gathering): boolean {
  return gathering.maxGuests > 0 && acceptedCount(gathering) >= gathering.maxGuests
}

export function stateColor(state: GatheringState): string {
  return (
    { pending: 'warning', confirmed: 'success', canceled: 'error' }[state] ??
    'info'
  )
}

export function responseColor(response: GuestResponse): string {
  return (
    { invited: 'warning', accepted: 'success', declined: 'error' }[response] ??
    'info'
  )
}

export function responseIcon(response: GuestResponse): string {
  return (
    {
      invited: 'mdi-help-circle-outline',
      accepted: 'mdi-check-circle-outline',
      declined: 'mdi-close-circle-outline',
    }[response] ?? 'mdi-help-circle-outline'
  )
}

export function formatDatetime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
