import { setGlobalOptions } from 'firebase-functions'
import { onRequest } from 'firebase-functions/https'

const BGG_BASE_URL = 'https://www.boardgamegeek.com/xmlapi2'

// Limit concurrent instances to control costs
setGlobalOptions({ maxInstances: 5 })

export const bggProxy = onRequest(async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed')
    return
  }

  // The path after /bggProxy becomes the BGG endpoint, e.g. /search or /thing
  const bggPath = req.path || '/'
  const queryString = new URLSearchParams(
    req.query as Record<string, string>
  ).toString()
  const url = `${BGG_BASE_URL}${bggPath}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url)

  if (!response.ok) {
    res.status(response.status).send(response.statusText)
    return
  }

  const xml = await response.text()

  res.set('Access-Control-Allow-Origin', '*')
  res.set('Content-Type', 'application/xml')
  res.status(200).send(xml)
})
