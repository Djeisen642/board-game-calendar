import type { Gathering, GatheringState, GuestResponse } from './types'

export type GatheringWithId = Gathering & { id: string }

const byDatetime = (a: GatheringWithId, b: GatheringWithId) =>
  a.datetime.localeCompare(b.datetime)

// Splits the user's gatherings (loaded via their userGatherings/{uid} index,
// so all are ones they host or are invited to) into the calendar sections
export function splitGatherings(gatherings: GatheringWithId[], uid: string) {
  return {
    hosting: gatherings.filter((g) => g.host === uid).sort(byDatetime),
    invited: gatherings
      .filter((g) => g.host !== uid && g.guests?.[uid])
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
