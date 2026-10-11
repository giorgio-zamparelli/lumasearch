/* Copyright 2013 - 2026 Waiterio LLC */
import { HttpError } from './http.js'

export const LUMA_HEADERS = {
  Origin: 'https://luma.com',
  Referer: 'https://luma.com/discover',
}

export function parseSearch(params) {
  const coordinate = (key, min, max) => {
    const input = params.get(key)
    const value = input?.trim() ? Number(input) : NaN
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new HttpError(400, 'Choose a valid city before searching.')
    }
    return Number(value.toFixed(4))
  }
  const latitude = coordinate('lat', -90, 90)
  const longitude = coordinate('lon', -180, 180)
  const radius = Number(params.get('radius') || 25)
  if (![5, 10, 25, 50].includes(radius)) {
    throw new HttpError(400, 'Choose a radius of 5, 10, 25 or 50 km.')
  }
  const cursor = params.get('cursor') || ''
  if (
    cursor.length > 1600 ||
    Array.from(cursor).some(character => character.codePointAt(0) < 32)
  ) {
    throw new HttpError(400, 'Invalid pagination cursor.')
  }
  return { latitude, longitude, radius, cursor }
}

export function distanceKm(a, b) {
  if (
    ![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every(
      Number.isFinite,
    )
  ) {
    return null
  }
  const radians = degrees => (degrees * Math.PI) / 180
  const latDelta = radians(b.latitude - a.latitude)
  const lonDelta = radians(b.longitude - a.longitude)
  const arc =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(lonDelta / 2) ** 2
  return (
    6371 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, arc)), Math.sqrt(Math.max(0, 1 - arc)))
  )
}

function safeImage(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' &&
      ['images.lumacdn.com', 'cdn.lu.ma'].includes(parsed.hostname)
      ? url
      : null
  } catch {
    return null
  }
}

export function projectEvent(entry, search, now = Date.now()) {
  const event = entry?.event
  if (
    !event ||
    event.visibility !== 'public' ||
    event.location_type !== 'offline'
  ) {
    return null
  }
  if (!event.api_id || !/^[\w-]{1,120}$/.test(event.url || '') || !event.name) {
    return null
  }
  const start = Date.parse(event.start_at)
  if (!Number.isFinite(start) || start < now) return null
  const geo = event.geo_address_info || {}
  const distance = distanceKm(search, event.coordinate || geo.place_coordinate)
  if (distance === null || distance > search.radius) return null
  const publicAddress =
    event.geo_address_visibility === 'public' && geo.mode === 'shown'
  const calendar = entry.calendar || {}
  const organizer = calendar.is_personal
    ? calendar.personal_user?.name || 'Independent host'
    : calendar.name || 'Independent host'
  return {
    id: event.api_id,
    name: event.name,
    url: `https://luma.com/${event.url}`,
    start: event.start_at,
    end: event.end_at,
    timezone: event.timezone || 'UTC',
    city: geo.city || '',
    country: geo.country || '',
    venue: publicAddress
      ? geo.address || geo.short_address || geo.city
      : 'Location on Luma',
    cover: safeImage(event.cover_url || entry.cover_image?.url),
    organizer,
    distance: Math.round(distance * 10) / 10,
    freeRegistration: entry.ticket_info?.is_free === true,
    approvalRequired: entry.ticket_info?.require_approval === true,
    registration: entry.registration_availability || 'unknown',
    categories: (entry.categories || [])
      .map(category => category.name)
      .filter(Boolean),
  }
}

export function projectPage(data, search) {
  if (!Array.isArray(data.entries) || typeof data.has_more !== 'boolean') {
    throw new HttpError(
      502,
      'Luma returned an unexpected response. Please try again shortly.',
    )
  }
  if (
    data.has_more &&
    (!data.next_cursor || data.next_cursor === search.cursor)
  ) {
    throw new HttpError(
      502,
      'Luma pagination is temporarily unavailable. Please try again shortly.',
    )
  }
  const events = [
    ...new Map(
      data.entries
        .map(entry => projectEvent(entry, search))
        .filter(Boolean)
        .map(event => [event.id, event]),
    ).values(),
  ]
  return {
    events,
    hasMore: data.has_more,
    cursor: data.has_more ? data.next_cursor : null,
    fetchedAt: new Date().toISOString(),
  }
}
