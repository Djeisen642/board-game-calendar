import { setGlobalOptions } from 'firebase-functions'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import {
  onValueCreated,
  onValueUpdated,
  onValueWritten,
} from 'firebase-functions/v2/database'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { parseString } from 'xml2js'
import { promisify } from 'util'

initializeApp()

const BGG_API_KEY = defineSecret('BGG_API_KEY')
const RESEND_API_KEY = defineSecret('RESEND_API_KEY')

const parseXml = promisify(parseString)

// BGG search only supports a fixed set of item types; allowlist to avoid
// forwarding arbitrary strings to the upstream API.
const ALLOWED_BGG_TYPES = new Set([
  'boardgame',
  'boardgameexpansion',
  'boardgameaccessory',
])

const BGG_BASE_URL = 'https://boardgamegeek.com/xmlapi2'

// Do NOT pin a custom `serviceAccount` here. The 2nd-gen RTDB→Eventarc triggers
// below run as this SA, which must hold roles/eventarc.eventReceiver to receive
// events. The project's default compute SA already has it; a custom SA
// (firebase-adminsdk-fbsvc) did not, which made `firebase deploy --only
// functions` fail trigger validation with "Permission 'eventarc.events.
// receiveEvent' denied". Leaving it unset lets the functions run as the default
// compute SA. Secret access (BGG_API_KEY, RESEND_API_KEY) is auto-granted to the
// runtime SA at deploy time, by both local owner deploys and the CD deployer
// (the github-action SA has secretmanager.admin + project iam.serviceAccountUser).
setGlobalOptions({
  maxInstances: 5,
})

// xml2js wraps repeated XML elements as arrays but single occurrences as plain
// objects, so any field may be either. Always normalise to the first element.
function first(node: unknown): unknown {
  return Array.isArray(node) ? node[0] : node
}

// Safely read a BGG AttrValue: { $: { value: string } }
// Handles both the plain-object and single-element-array forms xml2js may emit.
function attrValue(node: unknown): string | null {
  const n = first(node)
  if (n == null || typeof n !== 'object') return null
  const $ = (n as Record<string, unknown>).$
  if ($ == null || typeof $ !== 'object') return null
  const v = ($ as Record<string, unknown>).value
  return typeof v === 'string' ? v : null
}

// Safely read item.$.prop
function itemAttr(item: unknown, prop: string): string | null {
  const n = first(item)
  if (n == null || typeof n !== 'object') return null
  const $ = (n as Record<string, unknown>).$
  if ($ == null || typeof $ !== 'object') return null
  const v = ($ as Record<string, unknown>)[prop]
  return typeof v === 'string' ? v : null
}

export const bggSearch = onCall(
  { enforceAppCheck: true, secrets: [BGG_API_KEY] },
  async (request) => {
    const { query, type } = request.data as { query: string; type: string }
    if (!query || !type)
      throw new HttpsError('invalid-argument', 'Missing query or type')
    if (!ALLOWED_BGG_TYPES.has(type))
      throw new HttpsError('invalid-argument', 'Invalid type')

    const params = new URLSearchParams({ query, type }).toString()
    const url = `${BGG_BASE_URL}/search?${params}`
    console.log(`Proxying search to BGG: ${url}`)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BGG_API_KEY.value()}` },
    })
    if (!response.ok)
      throw new HttpsError('internal', `BGG error: ${response.statusText}`)

    const xml = await response.text()

    let parsed: unknown
    try {
      parsed = await parseXml(xml)
    } catch (err) {
      console.error(
        'Failed to parse BGG search XML:',
        err,
        '\nRaw XML:',
        xml.slice(0, 500)
      )
      throw new HttpsError('internal', 'Invalid response from BGG')
    }

    // Validate top-level shape before touching nested fields
    const rawItems = (parsed as Record<string, unknown>)?.items
    if (rawItems == null || typeof rawItems !== 'object') {
      console.error(
        'Unexpected BGG search response shape:',
        JSON.stringify(parsed)?.slice(0, 500)
      )
      throw new HttpsError('internal', 'Unexpected response format from BGG')
    }

    const itemField = (rawItems as Record<string, unknown>).item ?? []
    const itemArray: unknown[] = Array.isArray(itemField)
      ? itemField
      : [itemField]

    const mappedItems = []
    for (const item of itemArray) {
      const id = itemAttr(item, 'id')
      const itemType = itemAttr(item, 'type')
      const nameField = (item as Record<string, unknown>)?.name
      const name = attrValue(nameField)
      if (!id || !name) {
        console.warn(
          'Skipping BGG search item missing id or name:',
          JSON.stringify(item)
        )
        continue
      }
      mappedItems.push({
        id,
        type: itemType ?? '',
        name,
        yearpublished: attrValue(
          (item as Record<string, unknown>).yearpublished
        ),
      })
    }

    return { items: mappedItems }
  }
)

function parseBggThingItem(item: unknown) {
  const itemObj = item as Record<string, unknown>
  const itemId = itemAttr(item, 'id')
  if (!itemId) return null

  const nameField = itemObj.name
  const nameArray: unknown[] = Array.isArray(nameField)
    ? nameField
    : [nameField]
  const primaryNameNode =
    nameArray.find((n) => itemAttr(n, 'type') === 'primary') ?? nameArray[0]
  const name = attrValue(primaryNameNode) ?? ''

  const descriptionRaw = first(itemObj.description)
  const imageRaw = first(itemObj.image)
  const thumbnailRaw = first(itemObj.thumbnail)

  const imageUrl = typeof imageRaw === 'string' ? imageRaw : ''
  const thumbnailUrl =
    typeof thumbnailRaw === 'string' && thumbnailRaw ? thumbnailRaw : imageUrl

  return {
    id: itemId,
    name,
    description: typeof descriptionRaw === 'string' ? descriptionRaw : '',
    image: imageUrl,
    thumbnail: thumbnailUrl,
    yearpublished: attrValue(itemObj.yearpublished),
    minplayers: attrValue(itemObj.minplayers),
    maxplayers: attrValue(itemObj.maxplayers),
    minplaytime: attrValue(itemObj.minplaytime),
    maxplaytime: attrValue(itemObj.maxplaytime),
    minage: attrValue(itemObj.minage),
  }
}

export const bggThing = onCall(
  { enforceAppCheck: true, secrets: [BGG_API_KEY] },
  async (request) => {
    const { ids } = request.data as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0)
      throw new HttpsError('invalid-argument', 'Missing ids')
    if (ids.length > 20)
      throw new HttpsError('invalid-argument', 'Too many ids (max 20)')
    if (ids.some((id) => !/^\d+$/.test(id)))
      throw new HttpsError('invalid-argument', 'Invalid id format')

    const params = new URLSearchParams({ id: ids.join(',') }).toString()
    const url = `${BGG_BASE_URL}/thing?${params}`
    console.log(`Proxying thing to BGG: ${url}`)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BGG_API_KEY.value()}` },
    })
    if (!response.ok)
      throw new HttpsError('internal', `BGG error: ${response.statusText}`)

    const xml = await response.text()

    let parsed: unknown
    try {
      parsed = await parseXml(xml)
    } catch (err) {
      console.error(
        'Failed to parse BGG thing XML:',
        err,
        '\nRaw XML:',
        xml.slice(0, 500)
      )
      throw new HttpsError('internal', 'Invalid response from BGG')
    }

    const rawItems = (parsed as Record<string, unknown>)?.items
    if (rawItems == null || typeof rawItems !== 'object') {
      console.error(
        'Unexpected BGG thing response shape:',
        JSON.stringify(parsed)?.slice(0, 500)
      )
      throw new HttpsError('internal', 'Unexpected response format from BGG')
    }

    const itemField = (rawItems as Record<string, unknown>).item ?? []
    const itemArray: unknown[] = Array.isArray(itemField)
      ? itemField
      : [itemField]

    const items = itemArray
      .map(parseBggThingItem)
      .filter(
        (item): item is NonNullable<ReturnType<typeof parseBggThingItem>> =>
          item !== null
      )

    return { items }
  }
)

const APP_URL = 'https://bgc.jasonsuttles.dev'
const FROM_EMAIL = 'Board Game Calendar <bgc-notifications@jasonsuttles.dev>'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type EmailAttachment = { filename: string; content: string } // content: base64

// Sends a single email and logs on failure without rethrowing, so one bad
// address doesn't cause a function retry that re-sends to everyone else.
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY.value()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`Resend error ${res.status} for ${to}: ${body}`)
  }
}

function formatDatetime(iso: string, timezone?: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(timezone ? { timeZone: timezone } : {}),
  })
}

// --- Calendar helpers (mirrors helpers/calendar.ts on the client; duplicated
// because the functions workspace builds from its own rootDir) ---

const GATHERING_DURATION_HOURS = 3

type CalendarEvent = {
  gatheringId: string
  datetime: string
  hostName?: string
  games?: { name?: string }[]
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toIcsUtc(date: Date): string {
  return (
    String(date.getUTCFullYear()) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

function eventEnd(datetime: string): Date {
  return new Date(
    new Date(datetime).getTime() + GATHERING_DURATION_HOURS * 60 * 60 * 1000
  )
}

function eventTitle(hostName?: string): string {
  return hostName ? `Board game night with ${hostName}` : 'Board game night'
}

function eventDescription(event: CalendarEvent): string {
  const games = (event.games ?? []).map((g) => g.name ?? '').filter(Boolean)
  const parts: string[] = []
  if (event.hostName) parts.push(`Hosted by ${event.hostName}.`)
  if (games.length) parts.push(`Games: ${games.join(', ')}.`)
  parts.push(`Details: ${APP_URL}/calendar`)
  return parts.join(' ')
}

function googleCalendarUrl(event: CalendarEvent): string {
  const dates = `${toIcsUtc(new Date(event.datetime))}/${toIcsUtc(eventEnd(event.datetime))}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(event.hostName),
    dates,
    details: eventDescription(event),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function buildIcs(event: CalendarEvent): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Board Game Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.gatheringId}@bgc.jasonsuttles.dev`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(new Date(event.datetime))}`,
    `DTEND:${toIcsUtc(eventEnd(event.datetime))}`,
    `SUMMARY:${escapeIcs(eventTitle(event.hostName))}`,
    `DESCRIPTION:${escapeIcs(eventDescription(event))}`,
    `URL:${APP_URL}/calendar`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function icsAttachment(event: CalendarEvent): EmailAttachment {
  return {
    filename: 'board-game-night.ics',
    content: Buffer.from(buildIcs(event), 'utf-8').toString('base64'),
  }
}

// "Add to Google Calendar" link shown beneath the email body.
function calendarLinkHtml(event: CalendarEvent): string {
  return `<p><a href="${googleCalendarUrl(event)}">Add to Google Calendar</a> &middot; an Apple/Outlook invite is attached.</p>`
}

// Accept / Decline buttons that deep-link into the app (the user signs in if
// needed, then the RSVP is applied on the calendar page).
function rsvpButtonsHtml(gatheringId: string): string {
  const accept = `${APP_URL}/calendar?id=${gatheringId}&respond=accepted`
  const decline = `${APP_URL}/calendar?id=${gatheringId}&respond=declined`
  return `<p>
  <a href="${accept}" style="display:inline-block;padding:10px 18px;margin-right:8px;background:#55B855;color:#100A04;text-decoration:none;border-radius:8px;font-weight:600;">Accept</a>
  <a href="${decline}" style="display:inline-block;padding:10px 18px;background:#E05252;color:#100A04;text-decoration:none;border-radius:8px;font-weight:600;">Decline</a>
</p>`
}

async function getProfileName(uid: string): Promise<string> {
  const snap = await getDatabase().ref(`profiles/${uid}/name`).get()
  const val = snap.val()
  return typeof val === 'string' ? val : 'Someone'
}

export const onFriendRequest = onValueCreated(
  {
    ref: 'friendRequests/{toUid}/{fromUid}',
    secrets: [RESEND_API_KEY],
    instance: 'board-game-calendar-3ae94-default-rtdb',
  },
  async (event) => {
    const { toUid, fromUid } = event.params
    const [toUser, fromName] = await Promise.all([
      getAuth().getUser(toUid),
      getProfileName(fromUid),
    ])
    if (!toUser.email) return
    const safeName = escapeHtml(fromName)
    await sendEmail(
      toUser.email,
      `${fromName} sent you a friend request`,
      `<p>Hi there,</p>
<p><strong>${safeName}</strong> has sent you a friend request on Board Game Calendar.</p>
<p><a href="${APP_URL}/friends">View your friend requests</a></p>`
    )
  }
)

export const onGatheringInvite = onValueWritten(
  {
    ref: 'gatherings/{gatheringId}/guests/{guestUid}',
    secrets: [RESEND_API_KEY],
    instance: 'board-game-calendar-3ae94-default-rtdb',
  },
  async (event) => {
    const after = event.data.after.val() as string | null
    const before = event.data.before.val() as string | null
    // Notify on initial invite or re-invite after a decline; skip accept/decline updates
    if (after !== 'invited' || (before !== null && before !== 'declined'))
      return
    const { gatheringId, guestUid } = event.params
    const [guestUser, gatheringSnap] = await Promise.all([
      getAuth().getUser(guestUid),
      getDatabase().ref(`gatherings/${gatheringId}`).get(),
    ])
    if (!guestUser.email) return
    const gathering = gatheringSnap.val() as Record<string, unknown> | null
    if (!gathering) return
    const hostName = await getProfileName(gathering.host as string)
    const datetime = formatDatetime(
      gathering.datetime as string,
      gathering.timezone as string
    )
    const calEvent: CalendarEvent = {
      gatheringId,
      datetime: gathering.datetime as string,
      hostName,
      games: gathering.games as { name?: string }[] | undefined,
    }
    await sendEmail(
      guestUser.email,
      `You're invited to a board game night!`,
      `<p>Hi there,</p>
<p><strong>${escapeHtml(hostName)}</strong> has invited you to a board game night on <strong>${escapeHtml(datetime)}</strong>.</p>
${rsvpButtonsHtml(gatheringId)}
<p><a href="${APP_URL}/calendar">View on your calendar</a></p>
${calendarLinkHtml(calEvent)}`,
      [icsAttachment(calEvent)]
    )
  }
)

export const onGatheringStateChange = onValueUpdated(
  {
    ref: 'gatherings/{gatheringId}/state',
    secrets: [RESEND_API_KEY],
    instance: 'board-game-calendar-3ae94-default-rtdb',
  },
  async (event) => {
    const newState = event.data.after.val() as string
    const oldState = event.data.before.val() as string
    if (newState === oldState) return
    if (newState !== 'confirmed' && newState !== 'canceled') return
    const { gatheringId } = event.params
    const gatheringSnap = await getDatabase()
      .ref(`gatherings/${gatheringId}`)
      .get()
    const gathering = gatheringSnap.val() as Record<string, unknown> | null
    if (!gathering) return
    const guests = (gathering.guests as Record<string, string> | null) ?? {}
    // Notify accepted guests on confirm; notify accepted + invited guests on cancel
    const notifyUids = Object.entries(guests)
      .filter(
        ([, status]) =>
          status === 'accepted' ||
          (newState === 'canceled' && status === 'invited')
      )
      .map(([uid]) => uid)
    if (notifyUids.length === 0) return
    const [hostName, guestUsers] = await Promise.all([
      getProfileName(gathering.host as string),
      Promise.all(notifyUids.map((uid) => getAuth().getUser(uid))),
    ])
    const datetime = formatDatetime(
      gathering.datetime as string,
      gathering.timezone as string
    )
    const subject =
      newState === 'confirmed'
        ? `Game night confirmed: ${datetime}`
        : `Game night canceled: ${datetime}`
    const safeHost = escapeHtml(hostName)
    const safeDatetime = escapeHtml(datetime)
    const calEvent: CalendarEvent = {
      gatheringId,
      datetime: gathering.datetime as string,
      hostName,
      games: gathering.games as { name?: string }[] | undefined,
    }
    const html =
      newState === 'confirmed'
        ? `<p>Great news! <strong>${safeHost}</strong> has confirmed the board game night on <strong>${safeDatetime}</strong>.</p>
<p><a href="${APP_URL}/calendar">View on your calendar</a></p>
${calendarLinkHtml(calEvent)}`
        : `<p><strong>${safeHost}</strong> has unfortunately canceled the board game night on <strong>${safeDatetime}</strong>.</p>
<p><a href="${APP_URL}/calendar">View your calendar</a></p>`
    // Attach the .ics only on confirm — there's nothing to add to a calendar
    // for a cancellation.
    const attachments =
      newState === 'confirmed' ? [icsAttachment(calEvent)] : undefined
    const emails = guestUsers
      .map((u) => u.email)
      .filter((e): e is string => !!e)
    await Promise.all(
      emails.map((email) => sendEmail(email, subject, html, attachments))
    )
  }
)
