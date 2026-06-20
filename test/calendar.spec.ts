import { describe, it, expect } from 'vitest'
import {
  eventTitle,
  eventDescription,
  googleCalendarUrl,
  buildIcs,
  type CalendarEventInput,
} from '~/helpers/calendar'

const APP_URL = 'https://bgc.jasonsuttles.dev'

// 2026-07-01 19:00 UTC; +3h default duration => 22:00 UTC
const event: CalendarEventInput = {
  gatheringId: 'abc123',
  datetime: '2026-07-01T19:00:00.000Z',
  hostName: 'Alex Johnson',
  games: [{ name: 'Catan' }, { name: 'Wingspan' }],
}

describe('eventTitle', () => {
  it('includes the host name when present', () => {
    expect(eventTitle('Alex Johnson')).toBe(
      'Board game night with Alex Johnson'
    )
  })

  it('falls back to a generic title without a host', () => {
    expect(eventTitle()).toBe('Board game night')
  })
})

describe('eventDescription', () => {
  it('lists host, games, and a details link', () => {
    const desc = eventDescription(event, APP_URL)
    expect(desc).toContain('Hosted by Alex Johnson.')
    expect(desc).toContain('Games: Catan, Wingspan.')
    expect(desc).toContain(`${APP_URL}/calendar`)
  })
})

describe('googleCalendarUrl', () => {
  it('builds a TEMPLATE url with a UTC start/end range', () => {
    const url = googleCalendarUrl(event, APP_URL)
    expect(url).toContain('https://calendar.google.com/calendar/render?')
    expect(url).toContain('action=TEMPLATE')
    // dates=20260701T190000Z/20260701T220000Z (url-encoded slash)
    expect(decodeURIComponent(url)).toContain(
      'dates=20260701T190000Z/20260701T220000Z'
    )
  })
})

describe('buildIcs', () => {
  it('produces a single VEVENT with correct UTC times and CRLF lines', () => {
    const ics = buildIcs(event, APP_URL)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('UID:abc123@bgc.jasonsuttles.dev')
    expect(ics).toContain('DTSTART:20260701T190000Z')
    expect(ics).toContain('DTEND:20260701T220000Z')
    expect(ics).toContain('SUMMARY:Board game night with Alex Johnson')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('\r\n')
  })

  it('escapes commas in the description per RFC 5545', () => {
    const ics = buildIcs(event, APP_URL)
    expect(ics).toContain('Catan\\, Wingspan')
  })
})
