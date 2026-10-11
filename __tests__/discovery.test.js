/* Copyright 2013 - 2026 Waiterio LLC */
import assert from 'node:assert/strict'
import test from 'node:test'

import cities from '../api/cities.js'
import events from '../api/events.js'
import { filterEvents } from '../client/filters.js'
import {
  distanceKm,
  parseSearch,
  projectEvent,
  projectPage,
} from '../server/discovery.js'
import { createCache } from '../server/http.js'

const search = { latitude: 39.4739, longitude: -0.3797, radius: 25, cursor: '' }
const future = new Date(Date.now() + 86400000).toISOString()
const fixture = () => ({
  event: {
    api_id: 'evt-example',
    name: 'Healthcare AI meetup',
    url: 'example-event',
    visibility: 'public',
    location_type: 'offline',
    start_at: future,
    timezone: 'Europe/Madrid',
    coordinate: { latitude: 39.47, longitude: -0.37 },
    geo_address_visibility: 'public',
    geo_address_info: {
      city: 'València',
      country: 'Spain',
      address: 'Public venue',
      mode: 'shown',
    },
    cover_url: 'https://images.lumacdn.com/example.png',
  },
  calendar: { name: 'Valencia Builders', is_personal: false },
  ticket_info: { is_free: true },
  registration_availability: 'open',
  featured_guests: [{ name: 'Private attendee' }],
  guest_info: { private: 'never ship' },
})

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(body) {
      this.body = JSON.parse(body)
    },
  }
}

test('rejects missing, out-of-range coordinates and unsupported radius before any provider call', () => {
  for (const input of [
    '',
    'lat=&lon=0',
    'lat=91&lon=0',
    'lat=0&lon=181',
    'lat=NaN&lon=0',
    'lat=0&lon=0&radius=500',
  ]) {
    assert.throws(
      () => parseSearch(new URLSearchParams(input)),
      error => error.status === 400,
    )
  }
  assert.equal(parseSearch(new URLSearchParams('lat=0&lon=0')).latitude, 0)
  assert.equal(
    parseSearch(new URLSearchParams('lat=39.473913&lon=-0.379662')).latitude,
    39.4739,
  )
})

test('radius removes results from a different city without conflating matching city names', () => {
  assert.equal(distanceKm(search, search), 0)
  const local = fixture()
  assert.ok(projectEvent(local, search))
  local.event.coordinate = { latitude: 10.1615, longitude: -68.0004 }
  local.event.geo_address_info.city = 'Valencia'
  local.event.geo_address_info.country = 'Venezuela'
  assert.equal(projectEvent(local, search), null)
})

test('excludes past, online and unlisted events', () => {
  const past = fixture()
  past.event.start_at = '2000-01-01T00:00:00Z'
  const online = fixture()
  online.event.location_type = 'online'
  const unlisted = fixture()
  unlisted.event.visibility = 'unlisted'
  for (const entry of [past, online, unlisted]) {
    assert.equal(projectEvent(entry, search), null)
  }
})

test('public response never includes attendees or an address hidden until registration', () => {
  const entry = fixture()
  entry.event.geo_address_visibility = 'private'
  entry.event.geo_address_info.address = 'Secret residence'
  entry.event.cover_url = 'data:text/html,<svg onload=alert(1)>'
  const projected = projectEvent(entry, search)
  const body = JSON.stringify(projected)
  assert.equal(projected.venue, 'Location on Luma')
  assert.equal(projected.cover, null)
  for (const text of [
    'Private attendee',
    'never ship',
    'Secret residence',
    'coordinate',
    'guest_info',
  ]) {
    assert.ok(!body.includes(text))
  }
  assert.equal(projected.url, 'https://luma.com/example-event')
})

test('preserves pagination, deduplicates events, and refuses broken provider data', () => {
  const page = projectPage(
    {
      entries: [fixture(), fixture()],
      has_more: true,
      next_cursor: 'page-two',
    },
    search,
  )
  assert.equal(page.events.length, 1)
  assert.equal(page.hasMore, true)
  assert.equal(page.cursor, 'page-two')
  assert.throws(
    () => projectPage({ error: 'blocked' }, search),
    error => error.status === 502,
  )
  assert.throws(
    () => projectPage({ entries: [], has_more: true }, search),
    error => error.status === 502,
  )
  assert.throws(() =>
    projectPage(
      { entries: [], has_more: true, next_cursor: 'repeat' },
      { ...search, cursor: 'repeat' },
    ),
  )
})

test('cache shares in-flight reads but does not persist failed responses', async () => {
  const cached = createCache(2)
  let calls = 0
  const loader = async () => {
    calls++
    return 'result'
  }
  assert.deepEqual(
    await Promise.all([
      cached('same', 60000, loader),
      cached('same', 60000, loader),
    ]),
    ['result', 'result'],
  )
  assert.equal(calls, 1)
  await assert.rejects(
    cached('failed', 60000, () => {
      throw new Error('temporary')
    }),
  )
  assert.equal(await cached('failed', 60000, loader), 'result')
})

test('rate-limited provider returns a retryable error, never an empty success list', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response('', { status: 429 })
  try {
    const response = responseRecorder()
    await events(
      { method: 'GET', url: '/api/events?lat=39.4001&lon=-0.3001&radius=25' },
      response,
    )
    assert.equal(response.statusCode, 503)
    assert.equal(response.headers['Retry-After'], '60')
    assert.equal(response.headers['Cache-Control'], 'no-store')
    assert.ok(response.body.error)
    assert.equal(response.body.events, undefined)
  } finally {
    globalThis.fetch = original
  }
})

test('geocoding preserves countries and allows a genuine empty lookup', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async url => {
    assert.ok(String(url).startsWith('https://geocoding-api.open-meteo.com/'))
    return Response.json({
      results: [
        {
          id: 1,
          name: 'Valencia',
          country: 'Spain',
          country_code: 'ES',
          latitude: 39.47,
          longitude: -0.37,
        },
        {
          id: 2,
          name: 'Valencia',
          country: 'Venezuela',
          country_code: 'VE',
          latitude: 10.16,
          longitude: -68,
        },
      ],
    })
  }
  try {
    const response = responseRecorder()
    await cities({ method: 'GET', url: '/api/cities?q=Valencia' }, response)
    assert.equal(response.statusCode, 200)
    assert.deepEqual(
      response.body.cities.map(city => city.countryCode),
      ['ES', 'VE'],
    )
    globalThis.fetch = async () => Response.json({ generationtime_ms: 0.3 })
    const empty = responseRecorder()
    await cities(
      { method: 'GET', url: '/api/cities?q=NoSuchCity123456' },
      empty,
    )
    assert.deepEqual(empty.body.cities, [])
  } finally {
    globalThis.fetch = original
  }
})

test('keyword accents, local filters and chronological order work together', () => {
  const first = projectEvent(fixture(), search)
  first.name = 'Clínica: Healthcare AI meetup'
  const later = {
    ...first,
    id: 'later',
    name: 'Paid AI meetup',
    freeRegistration: false,
    start: new Date(Date.now() + 2 * 86400000).toISOString(),
  }
  assert.equal(
    filterEvents([later, first], {
      keyword: 'clinica',
      topic: 'tech',
      freeOnly: true,
    }).length,
    1,
  )
  assert.deepEqual(
    filterEvents([later, first]).map(event => event.id),
    ['evt-example', 'later'],
  )
  assert.equal(filterEvents([later, first], { topic: 'arts' }).length, 0)
})
