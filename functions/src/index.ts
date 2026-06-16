import { setGlobalOptions } from 'firebase-functions'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { parseString } from 'xml2js'
import { promisify } from 'util'

const BGG_API_KEY = defineSecret('BGG_API_KEY')

const parseXml = promisify(parseString)

// BGG search only supports a fixed set of item types; allowlist to avoid
// forwarding arbitrary strings to the upstream API.
const ALLOWED_BGG_TYPES = new Set(['boardgame', 'boardgameexpansion', 'boardgameaccessory'])

const BGG_BASE_URL = 'https://boardgamegeek.com/xmlapi2'

// BGG XML response shapes (minimal, only what we use)
interface AttrValue {
  $: { value: string }
}

interface BggSearchItem {
  $: { id: string; type: string }
  name: { $: { type: string; value: string } }
  yearpublished?: AttrValue
}

interface BggSearchResponse {
  items: { item?: BggSearchItem | BggSearchItem[] }
}

interface BggThingItem {
  $: { id: string; type: string }
  name: { $: { type: string; value: string } } | { $: { type: string; value: string } }[]
  description?: string
  image?: string
  yearpublished?: AttrValue
  minplayers?: AttrValue
  maxplayers?: AttrValue
  minplaytime?: AttrValue
  maxplaytime?: AttrValue
  minage?: AttrValue
}

interface BggThingResponse {
  items: { item?: BggThingItem }
}

setGlobalOptions({
  maxInstances: 5,
  serviceAccount:
    'firebase-adminsdk-fbsvc@board-game-calendar-3ae94.iam.gserviceaccount.com',
})

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
    const parsed = await parseXml(xml) as BggSearchResponse

    const items = parsed?.items?.item ?? []
    const itemArray = Array.isArray(items) ? items : [items]

    return {
      items: itemArray.map((item) => ({
        id: item.$.id,
        type: item.$.type,
        name: item.name.$.value,
        yearpublished: item.yearpublished?.$.value ?? null,
      })),
    }
  }
)

export const bggThing = onCall(
  { enforceAppCheck: true, secrets: [BGG_API_KEY] },
  async (request) => {
    const { id } = request.data as { id: string }
    if (!id) throw new HttpsError('invalid-argument', 'Missing id')

    const params = new URLSearchParams({ id }).toString()
    const url = `${BGG_BASE_URL}/thing?${params}`
    console.log(`Proxying thing to BGG: ${url}`)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BGG_API_KEY.value()}` },
    })
    if (!response.ok) throw new HttpsError('internal', `BGG error: ${response.statusText}`)

    const xml = await response.text()
    const parsed = await parseXml(xml) as BggThingResponse
    const item = parsed?.items?.item
    if (!item) throw new HttpsError('not-found', 'Item not found')

    const names = Array.isArray(item.name) ? item.name : [item.name]
    const primaryName = names.find((n) => n.$.type === 'primary') ?? names[0]

    return {
      id: item.$.id,
      name: primaryName?.$.value ?? '',
      description: item.description ?? '',
      image: item.image ?? '',
      yearpublished: item.yearpublished?.$.value ?? null,
      minplayers: item.minplayers?.$.value ?? null,
      maxplayers: item.maxplayers?.$.value ?? null,
      minplaytime: item.minplaytime?.$.value ?? null,
      maxplaytime: item.maxplaytime?.$.value ?? null,
      minage: item.minage?.$.value ?? null,
    }
  }
)
