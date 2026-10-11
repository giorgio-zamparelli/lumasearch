/* Copyright 2013 - 2026 Waiterio LLC */
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function respond(response, status, body, ttl = 0) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader(
    'Cache-Control',
    ttl
      ? `public, max-age=60, s-maxage=${ttl}, stale-while-revalidate=3600`
      : 'no-store',
  )
  if (status === 503) response.setHeader('Retry-After', '60')
  response.end(JSON.stringify(body))
}

export function handleError(response, error) {
  respond(response, error.status || 502, {
    error:
      error instanceof HttpError
        ? error.message
        : 'The event service is temporarily unavailable. Please try again shortly.',
  })
}

export function queryOf(request) {
  if (request.method !== 'GET') throw new HttpError(405, 'Use a GET request.')
  return new URL(request.url, 'https://lumasearch.vercel.app').searchParams
}

export async function fetchJson(url, options = {}) {
  let response
  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(12000),
    })
  } catch {
    throw new HttpError(
      504,
      'The search service took too long to respond. Please try again.',
    )
  }
  if (response.status === 429) {
    throw new HttpError(
      503,
      'Luma is limiting searches right now. Please try again in a minute.',
    )
  }
  if (!response.ok) {
    throw new HttpError(
      502,
      'The search service is temporarily unavailable. Please try again shortly.',
    )
  }
  try {
    return await response.json()
  } catch {
    throw new HttpError(
      502,
      'The search service returned an unexpected response. Please try again shortly.',
    )
  }
}

export function createCache(maxEntries = 160) {
  const entries = new Map()
  return async function cached(key, ttlMs, loader) {
    const existing = entries.get(key)
    if (existing && existing.expires > Date.now()) return existing.promise
    const record = { expires: Date.now() + ttlMs }
    record.promise = Promise.resolve()
      .then(loader)
      .catch(error => {
        if (entries.get(key) === record) entries.delete(key)
        throw error
      })
    entries.delete(key)
    entries.set(key, record)
    while (entries.size > maxEntries) {
      entries.delete(entries.keys().next().value)
    }
    return record.promise
  }
}
