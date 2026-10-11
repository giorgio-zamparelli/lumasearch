/* Copyright 2013 - 2026 Waiterio LLC */
import {
  createCache,
  fetchJson,
  handleError,
  HttpError,
  queryOf,
  respond,
} from '../server/http.js'

const cached = createCache()

export default async function cities(request, response) {
  try {
    const q = (queryOf(request).get('q') || '').trim()
    if (q.length < 2 || q.length > 80) {
      throw new HttpError(400, 'Enter a city name between 2 and 80 characters.')
    }
    const data = await cached(q.toLowerCase(), 86400000, async () => {
      const params = new URLSearchParams({
        name: q,
        count: '12',
        language: 'en',
        format: 'json',
      })
      const raw = await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?${params}`,
      )
      if (
        raw.error ||
        (raw.results !== undefined && !Array.isArray(raw.results))
      ) {
        throw new HttpError(
          502,
          'City search is temporarily unavailable. Please try again.',
        )
      }
      return {
        cities: (raw.results || [])
          .map(city => ({
            id: city.id,
            name: city.name,
            country: city.country || '',
            countryCode: city.country_code || '',
            region: city.admin1 || '',
            latitude: city.latitude,
            longitude: city.longitude,
            timezone: city.timezone || 'UTC',
          }))
          .filter(
            city =>
              city.name &&
              Number.isFinite(city.latitude) &&
              Number.isFinite(city.longitude),
          ),
      }
    })
    respond(response, 200, data, 86400)
  } catch (error) {
    handleError(response, error)
  }
}
