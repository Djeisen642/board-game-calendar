import { setGlobalOptions } from 'firebase-functions'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onValueCreated, onValueUpdated, onValueWritten } from 'firebase-functions/v2/database'
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
const ALLOWED_BGG_TYPES = new Set(['boardgame', 'boardgameexpansion', 'boardgameaccessory'])

const BGG_BASE_URL = 'https://boardgamegeek.com/xmlapi2'

setGlobalOptions({
  maxInstances: 5,
  serviceAccount:
    'firebase-adminsdk-fbsvc@board-game-calendar-3ae94.iam.gserviceaccount.com',
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
    if (!query || !type) throw new HttpsError('invalid-argument', 'Missing query or type')
    if (!ALLOWED_BGG_TYPES.has(type)) throw new HttpsError('invalid-argument', 'Invalid type')

    const params = new URLSearchParams({ query, type }).toString()
    const url = `${BGG_BASE_URL}/search?${params}`
    console.log(`Proxying search to BGG: ${url}`)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BGG_API_KEY.value()}` },
    })
    if (!response.ok) throw new HttpsError('internal', `BGG error: ${response.statusText}`)

    const xml = await response.text()

    let parsed: unknown
    try {
      parsed = await parseXml(xml)
    } catch (err) {
      console.error('Failed to parse BGG search XML:', err, '\nRaw XML:', xml.slice(0, 500))
      throw new HttpsError('internal', 'Invalid response from BGG')
    }

    // Validate top-level shape before touching nested fields
    const rawItems = (parsed as Record<string, unknown>)?.items
    if (rawItems == null || typeof rawItems !== 'object') {
      console.error('Unexpected BGG search response shape:', JSON.stringify(parsed)?.slice(0, 500))
      throw new HttpsError('internal', 'Unexpected response format from BGG')
    }

    const itemField = (rawItems as Record<string, unknown>).item ?? []
    const itemArray: unknown[] = Array.isArray(itemField) ? itemField : [itemField]

    const mappedItems = []
    for (const item of itemArray) {
      const id = itemAttr(item, 'id')
      const itemType = itemAttr(item, 'type')
      const nameField = (item as Record<string, unknown>)?.name
      const name = attrValue(nameField)
      if (!id || !name) {
        console.warn('Skipping BGG search item missing id or name:', JSON.stringify(item))
        continue
      }
      mappedItems.push({
        id,
        type: itemType ?? '',
        name,
        yearpublished: attrValue((item as Record<string, unknown>).yearpublished),
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
  const nameArray: unknown[] = Array.isArray(nameField) ? nameField : [nameField]
  const primaryNameNode = nameArray.find((n) => itemAttr(n, 'type') === 'primary') ?? nameArray[0]
  const name = attrValue(primaryNameNode) ?? ''

  const descriptionRaw = first(itemObj.description)
  const imageRaw = first(itemObj.image)
  const thumbnailRaw = first(itemObj.thumbnail)

  const imageUrl = typeof imageRaw === 'string' ? imageRaw : ''
  const thumbnailUrl = typeof thumbnailRaw === 'string' && thumbnailRaw ? thumbnailRaw : imageUrl

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
    if (ids.length > 20) throw new HttpsError('invalid-argument', 'Too many ids (max 20)')
    if (ids.some((id) => !/^\d+$/.test(id)))
      throw new HttpsError('invalid-argument', 'Invalid id format')

    const params = new URLSearchParams({ id: ids.join(',') }).toString()
    const url = `${BGG_BASE_URL}/thing?${params}`
    console.log(`Proxying thing to BGG: ${url}`)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BGG_API_KEY.value()}` },
    })
    if (!response.ok) throw new HttpsError('internal', `BGG error: ${response.statusText}`)

    const xml = await response.text()

    let parsed: unknown
    try {
      parsed = await parseXml(xml)
    } catch (err) {
      console.error('Failed to parse BGG thing XML:', err, '\nRaw XML:', xml.slice(0, 500))
      throw new HttpsError('internal', 'Invalid response from BGG')
    }

    const rawItems = (parsed as Record<string, unknown>)?.items
    if (rawItems == null || typeof rawItems !== 'object') {
      console.error('Unexpected BGG thing response shape:', JSON.stringify(parsed)?.slice(0, 500))
      throw new HttpsError('internal', 'Unexpected response format from BGG')
    }

    const itemField = (rawItems as Record<string, unknown>).item ?? []
    const itemArray: unknown[] = Array.isArray(itemField) ? itemField : [itemField]

    const items = itemArray
      .map(parseBggThingItem)
      .filter((item): item is NonNullable<ReturnType<typeof parseBggThingItem>> => item !== null)

    return { items }
  }
)

const APP_URL = 'https://djeisen642.github.io/board-game-calendar'
const FROM_EMAIL = 'Board Game Calendar <noreply@jasonsuttles.dev>'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Sends a single email and logs on failure without rethrowing, so one bad
// address doesn't cause a function retry that re-sends to everyone else.
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY.value()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
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

async function getProfileName(uid: string): Promise<string> {
  const snap = await getDatabase().ref(`profiles/${uid}/name`).get()
  const val = snap.val()
  return typeof val === 'string' ? val : 'Someone'
}

export const onFriendRequest = onValueCreated(
  { ref: 'friendRequests/{toUid}/{fromUid}', secrets: [RESEND_API_KEY] },
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
  { ref: 'gatherings/{gatheringId}/guests/{guestUid}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const after = event.data.after.val() as string | null
    const before = event.data.before.val() as string | null
    // Notify on initial invite or re-invite after a decline; skip accept/decline updates
    if (after !== 'invited' || (before !== null && before !== 'declined')) return
    const { gatheringId, guestUid } = event.params
    const [guestUser, gatheringSnap] = await Promise.all([
      getAuth().getUser(guestUid),
      getDatabase().ref(`gatherings/${gatheringId}`).get(),
    ])
    if (!guestUser.email) return
    const gathering = gatheringSnap.val() as Record<string, unknown> | null
    if (!gathering) return
    const hostName = await getProfileName(gathering.host as string)
    const tz = typeof gathering.timezone === 'string' ? gathering.timezone : undefined
    const datetime =
      typeof gathering.datetime === 'string' ? formatDatetime(gathering.datetime, tz) : 'TBD'
    await sendEmail(
      guestUser.email,
      `You're invited to a board game night!`,
      `<p>Hi there,</p>
<p><strong>${escapeHtml(hostName)}</strong> has invited you to a board game night on <strong>${escapeHtml(datetime)}</strong>.</p>
<p><a href="${APP_URL}/calendar">View on your calendar</a></p>`
    )
  }
)

export const onGatheringStateChange = onValueUpdated(
  { ref: 'gatherings/{gatheringId}/state', secrets: [RESEND_API_KEY] },
  async (event) => {
    const newState = event.data.after.val() as string
    const oldState = event.data.before.val() as string
    if (newState === oldState) return
    if (newState !== 'confirmed' && newState !== 'canceled') return
    const { gatheringId } = event.params
    const gatheringSnap = await getDatabase().ref(`gatherings/${gatheringId}`).get()
    const gathering = gatheringSnap.val() as Record<string, unknown> | null
    if (!gathering) return
    const guests = (gathering.guests as Record<string, string> | null) ?? {}
    // Notify accepted guests on confirm; notify accepted + invited guests on cancel
    const notifyUids = Object.entries(guests)
      .filter(([, status]) => status === 'accepted' || (newState === 'canceled' && status === 'invited'))
      .map(([uid]) => uid)
    if (notifyUids.length === 0) return
    const [hostName, guestUsers] = await Promise.all([
      getProfileName(gathering.host as string),
      Promise.all(notifyUids.map((uid) => getAuth().getUser(uid))),
    ])
    const tz = typeof gathering.timezone === 'string' ? gathering.timezone : undefined
    const datetime =
      typeof gathering.datetime === 'string' ? formatDatetime(gathering.datetime, tz) : 'TBD'
    const subject =
      newState === 'confirmed'
        ? `Game night confirmed: ${datetime}`
        : `Game night canceled: ${datetime}`
    const safeHost = escapeHtml(hostName)
    const safeDatetime = escapeHtml(datetime)
    const html =
      newState === 'confirmed'
        ? `<p>Great news! <strong>${safeHost}</strong> has confirmed the board game night on <strong>${safeDatetime}</strong>.</p>
<p><a href="${APP_URL}/calendar">View on your calendar</a></p>`
        : `<p><strong>${safeHost}</strong> has unfortunately canceled the board game night on <strong>${safeDatetime}</strong>.</p>
<p><a href="${APP_URL}/calendar">View your calendar</a></p>`
    const emails = guestUsers.map((u) => u.email).filter((e): e is string => !!e)
    await Promise.all(emails.map((email) => sendEmail(email, subject, html)))
  }
)
