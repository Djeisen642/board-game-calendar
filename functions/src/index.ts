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
