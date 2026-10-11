/* Copyright 2013 - 2026 Waiterio LLC */
import { LUMA_HEADERS, parseSearch, projectPage } from '../server/discovery.js'
import {
  createCache,
  fetchJson,
  handleError,
  queryOf,
  respond,
} from '../server/http.js'

const cached = createCache()

export default async function events(request, response) {
  try {
    const search = parseSearch(queryOf(request))
    const params = new URLSearchParams({
      latitude: search.latitude,
      longitude: search.longitude,
      pagination_limit: '50',
    })
    if (search.cursor) params.set('pagination_cursor', search.cursor)
    const key = `${search.latitude}:${search.longitude}:${search.radius}:${search.cursor}`
    const data = await cached(key, 600000, async () => {
      const raw = await fetchJson(
        `https://api.luma.com/discover/get-paginated-events?${params}`,
        { headers: LUMA_HEADERS },
      )
      return projectPage(raw, search)
    })
    respond(response, 200, data, 600)
  } catch (error) {
    handleError(response, error)
  }
}
