import { setGlobalOptions } from 'firebase-functions'
import { onRequest } from 'firebase-functions/https'

const BGG_BASE_URL = 'https://www.boardgamegeek.com/xmlapi2'

const ALLOWED_ORIGINS = [
  'https://djeisen642.github.io',
  'http://localhost:3005', // local dev
]

// Limit concurrent instances to control costs
setGlobalOptions({
  maxInstances: 5,
  serviceAccount:
    'firebase-adminsdk-fbsvc@board-game-calendar-3ae94.iam.gserviceaccount.com',
})

export const bggProxy = onRequest({ invoker: 'public' }, async (req, res) => {
  const origin = req.headers.origin ?? ''

  if (!ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).send('Forbidden')
    return
  }

  res.set('Access-Control-Allow-Origin', origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET')
    res.set('Access-Control-Max-Age', '3600')
    res.status(204).send('')
    return
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const bggPath = req.path || '/'
  const queryString = new URLSearchParams(
    req.query as Record<string, string>
  ).toString()
  const url = `${BGG_BASE_URL}${bggPath}${queryString ? `?${queryString}` : ''}`

  console.log(`Proxying request to BGG: ${url}`)
  const response = await fetch(url)
  console.log(`BGG responded with status: ${response.status}`)

  if (!response.ok) {
    res.status(response.status).send(response.statusText)
    return
  }

  const xml = await response.text()

  res.set('Content-Type', 'application/xml')
  res.status(200).send(xml)
})
