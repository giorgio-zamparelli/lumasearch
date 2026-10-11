import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import Button from './components/Button.jsx'
import '@fontsource-variable/figtree'

import IconArrowRightFilled from './components/IconArrowRightFilled.jsx'
import IconCalendar from './components/IconCalendar.jsx'
import IconSearch from './components/IconSearch.jsx'
import Input from './components/Input.jsx'
import { filterEvents, topics } from './filters.js'
/* Copyright 2013 - 2026 Waiterio LLC */
import isComposingKeyboardEvent from './isComposingKeyboardEvent.js'
import ThemePicker from './ThemePicker.jsx'

import './style.css'

const valencia = {
  name: 'Valencia',
  country: 'Spain',
  countryCode: 'ES',
  latitude: 39.4739,
  longitude: -0.3797,
  timezone: 'Europe/Madrid',
}
const examples = [
  valencia,
  {
    name: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
    latitude: 40.4165,
    longitude: -3.7026,
    timezone: 'Europe/Madrid',
  },
  {
    name: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    latitude: 41.3888,
    longitude: 2.159,
    timezone: 'Europe/Madrid',
  },
  {
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.5085,
    longitude: -0.1257,
    timezone: 'Europe/London',
  },
  {
    name: 'San Francisco',
    country: 'United States',
    countryCode: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
  },
]

function validTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format()
    return timezone
  } catch {
    return 'UTC'
  }
}

function cityFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const latitude = Number(params.get('lat'))
  const longitude = Number(params.get('lon'))
  if (
    params.has('lat') &&
    params.has('lon') &&
    params.get('city') &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180
  ) {
    return {
      name: params.get('city').slice(0, 80),
      country: (params.get('country') || '').slice(0, 80),
      latitude,
      longitude,
      timezone: validTimezone(params.get('tz') || 'UTC'),
    }
  }
  return valencia
}

const labelOf = city => [city.name, city.country].filter(Boolean).join(', ')
const dateLabel = (date, timezone, options) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: validTimezone(timezone),
    ...options,
  }).format(new Date(date))

async function readJson(url, signal) {
  const response = await fetch(url, { signal })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      data.error || 'Search is temporarily unavailable. Please try again.',
    )
  }
  return data
}

function EventCard({ event, timezone }) {
  const [imageFailed, setImageFailed] = useState(false)
  const date = dateLabel(event.start, timezone, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const time = dateLabel(event.start, timezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const status =
    event.registration === 'waitlist'
      ? 'Waitlist'
      : event.registration === 'sold-out'
        ? 'Sold out'
        : event.approvalRequired
          ? 'Approval required'
          : 'Registration open'
  return (
    <a
      className="event-card"
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${event.name} — view on Luma (opens in a new tab)`}
    >
      <div className="event-body">
        <div className="event-date">
          <IconCalendar />{' '}
          <time dateTime={event.start}>
            {date} <span>·</span> {time}
          </time>
        </div>
        <h3>{event.name}</h3>
        <p className="event-host">By {event.organizer}</p>
        <p className="event-location">
          {event.venue || event.city} <span>· {event.distance} km</span>
        </p>
        <div className="event-bottom">
          <span
            className={`ticket-tag ${event.freeRegistration ? 'free' : ''}`}
          >
            {event.freeRegistration ? 'Free RSVP' : 'View tickets'}
          </span>
          <span className="registration">{status}</span>
          <IconArrowRightFilled />
        </div>
      </div>
      <div
        className={`event-image ${!event.cover || imageFailed ? 'image-fallback' : ''}`}
        aria-hidden="true"
      >
        {event.cover && !imageFailed ? (
          <img
            src={event.cover}
            alt=""
            loading="lazy"
            width="100"
            height="100"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <IconCalendar />
        )}
      </div>
    </a>
  )
}

function App() {
  const [city, setCity] = useState(cityFromUrl)
  const [cityQuery, setCityQuery] = useState(() => labelOf(cityFromUrl()))
  const [cityChoices, setCityChoices] = useState([])
  const [showChoices, setShowChoices] = useState(false)
  const [activeChoice, setActiveChoice] = useState(-1)
  const [findingCity, setFindingCity] = useState(false)
  const [cityError, setCityError] = useState('')
  const [radius, setRadius] = useState(25)
  const [events, setEvents] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [fetchedAt, setFetchedAt] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [topic, setTopic] = useState('all')
  const [days, setDays] = useState(0)
  const [freeOnly, setFreeOnly] = useState(false)
  const searchController = useRef(null)
  const generation = useRef(0)
  const cityInput = useRef(null)
  const cityQueryGeneration = useRef(0)

  const loadEvents = useCallback(
    async (startCursor = '', reset = true) => {
      searchController.current?.abort()
      const controller = new AbortController()
      searchController.current = controller
      const current = ++generation.current
      setError('')
      if (reset) {
        setEvents([])
        setHasMore(false)
        setCursor(null)
        setFetchedAt(null)
        setLoading(true)
      } else setLoadingMore(true)
      let next = startCursor
      try {
        for (let page = 0; page < 4; page++) {
          const params = new URLSearchParams({
            lat: city.latitude.toFixed(4),
            lon: city.longitude.toFixed(4),
            radius: String(radius),
          })
          if (next) params.set('cursor', next)
          const data = await readJson(
            `/api/events?${params}`,
            controller.signal,
          )
          if (current !== generation.current) return
          setEvents(previous => [
            ...new Map(
              [...previous, ...data.events].map(event => [event.id, event]),
            ).values(),
          ])
          setFetchedAt(data.fetchedAt)
          setHasMore(data.hasMore)
          setCursor(data.cursor)
          if (!data.hasMore) break
          next = data.cursor
        }
      } catch (failure) {
        if (failure.name !== 'AbortError' && current === generation.current) {
          setError(failure.message)
        }
      } finally {
        if (current === generation.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [city, radius],
  )

  useEffect(() => {
    loadEvents()
    return () => searchController.current?.abort()
  }, [loadEvents])

  useEffect(() => {
    if (!showChoices) {
      setFindingCity(false)
      return undefined
    }
    const query = cityQuery.split(',')[0].trim()
    const current = ++cityQueryGeneration.current
    setCityChoices([])
    setActiveChoice(-1)
    setCityError('')
    if (query.length < 2) {
      setFindingCity(false)
      return undefined
    }
    const controller = new AbortController()
    setFindingCity(true)
    const timer = setTimeout(async () => {
      try {
        const data = await readJson(
          `/api/cities?q=${encodeURIComponent(query)}`,
          controller.signal,
        )
        if (current === cityQueryGeneration.current) {
          const countryQuery = cityQuery
            .split(',')
            .slice(1)
            .join(',')
            .trim()
            .toLowerCase()
          const choices = countryQuery
            ? data.cities.filter(
                choice =>
                  choice.country.toLowerCase().includes(countryQuery) ||
                  choice.countryCode.toLowerCase() === countryQuery,
              )
            : data.cities
          setCityChoices(choices)
          if (!choices.length) {
            setCityError(
              'No cities found. Try the city name without a region or postcode.',
            )
          }
        }
      } catch (failure) {
        if (
          failure.name !== 'AbortError' &&
          current === cityQueryGeneration.current
        ) {
          setCityError(failure.message)
        }
      } finally {
        if (current === cityQueryGeneration.current) setFindingCity(false)
      }
    }, 320)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [cityQuery, showChoices])

  function chooseCity(choice) {
    cityQueryGeneration.current++
    setCity(choice)
    setCityQuery(labelOf(choice))
    setShowChoices(false)
    setFindingCity(false)
    setCityError('')
    setActiveChoice(-1)
    const params = new URLSearchParams({
      city: choice.name,
      country: choice.country,
      lat: choice.latitude.toFixed(4),
      lon: choice.longitude.toFixed(4),
      tz: choice.timezone,
    })
    window.history.replaceState(null, '', `/?${params}`)
    cityInput.current?.blur()
  }

  function cityKeyDown(event) {
    if (isComposingKeyboardEvent(event)) return
    if (event.key === 'Escape') {
      setShowChoices(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setShowChoices(true)
      setActiveChoice(previous =>
        cityChoices.length
          ? (previous +
              (event.key === 'ArrowDown' ? 1 : -1) +
              cityChoices.length) %
            cityChoices.length
          : -1,
      )
    }
    if (event.key === 'Enter' && showChoices && cityChoices[activeChoice]) {
      event.preventDefault()
      chooseCity(cityChoices[activeChoice])
    }
  }

  function clearFilters() {
    setKeyword('')
    setTopic('all')
    setDays(0)
    setFreeOnly(false)
  }
  const visible = filterEvents(events, { keyword, topic, days, freeOnly })
  const filtered = keyword.trim() || topic !== 'all' || days !== 0 || freeOnly
  const monthGroups = new Map()
  visible.forEach(event => {
    const month = dateLabel(event.start, city.timezone, {
      month: 'long',
      year: 'numeric',
    })
    if (!monthGroups.has(month)) monthGroups.set(month, [])
    monthGroups.get(month).push(event)
  })

  return (
    <>
      <a href="#events" className="skip-link">
        Skip to events
      </a>
      <div className="site-shell">
        <header className="site-header">
          <a className="brand" href="/" aria-label="LumaSearch home">
            <span className="brand-symbol">
              L<span>↗</span>
            </span>
            <span>
              Luma<span className="brand-light">Search</span>
            </span>
          </a>
          <div className="header-tools">
            <span className="header-note">
              <span className="status-dot" />
              An independent event finder
            </span>
            <ThemePicker />
          </div>
        </header>
        <main>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <p className="eyebrow">GOOD THINGS HAPPEN NEARBY</p>
              <h1 id="hero-title">
                Your city.
                <br />
                <span>Your next event.</span>
              </h1>
              <p className="hero-description">
                Find your people, learn something new, or just show up.
                <br className="desktop-break" /> Explore upcoming Luma events in
                any city.
              </p>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <div className="orbit-dot dot-one" />
              <div className="orbit-dot dot-two" />
              <div className="orbit-dot dot-three" />
              <div className="art-card">
                <span className="art-card-icon">
                  <IconCalendar />
                </span>
                <span>
                  Something good
                  <br />
                  <strong>is around the corner.</strong>
                </span>
                <span className="art-spark">✦</span>
              </div>
              <span className="art-coordinate">
                {Math.abs(city.latitude).toFixed(2)}°{' '}
                {city.latitude >= 0 ? 'N' : 'S'} &nbsp;{' '}
                {Math.abs(city.longitude).toFixed(2)}°{' '}
                {city.longitude >= 0 ? 'E' : 'W'}
              </span>
            </div>
          </section>

          <section className="search-section" aria-label="Find events by city">
            <form
              className="city-form"
              onSubmit={event => {
                event.preventDefault()
                if (cityQuery === labelOf(city)) loadEvents()
                else setShowChoices(true)
              }}
            >
              <div
                className="city-picker"
                onBlur={event => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setShowChoices(false)
                  }
                }}
              >
                <Input
                  id="city-search"
                  label="City"
                  placeholder="Enter a city"
                  value={cityQuery}
                  ref={cityInput}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showChoices}
                  aria-haspopup="listbox"
                  aria-controls="city-choices"
                  aria-activedescendant={
                    activeChoice >= 0
                      ? `city-choice-${activeChoice}`
                      : undefined
                  }
                  Icon={IconSearch}
                  onFocus={event => event.currentTarget.select()}
                  onChange={event => {
                    setCityQuery(event.target.value)
                    setShowChoices(true)
                  }}
                  onKeyDown={cityKeyDown}
                />
                {showChoices && (
                  <div
                    className="city-choices"
                    id="city-choices"
                    role="listbox"
                    aria-label="Choose a city and country"
                  >
                    {findingCity ? (
                      <p className="choice-message" role="status">
                        Looking for cities…
                      </p>
                    ) : cityError ? (
                      <p className="choice-message" role="status">
                        {cityError}
                      </p>
                    ) : cityChoices.length ? (
                      cityChoices.map((choice, index) => (
                        <Button
                          key={choice.id}
                          id={`city-choice-${index}`}
                          appearance="transparent"
                          className={`city-choice ${activeChoice === index ? 'active' : ''}`}
                          role="option"
                          aria-selected={activeChoice === index}
                          onMouseDown={event => event.preventDefault()}
                          onClick={() => chooseCity(choice)}
                        >
                          <span>
                            <strong>{choice.name}</strong>
                            <small>
                              {choice.region && choice.region !== choice.name
                                ? `${choice.region}, `
                                : ''}
                              {choice.country}
                            </small>
                          </span>
                          <IconArrowRightFilled />
                        </Button>
                      ))
                    ) : (
                      <p className="choice-message">
                        Type at least two letters to find a city.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                className="search-button"
                isLoading={findingCity}
              >
                Find events <IconArrowRightFilled />
              </Button>
            </form>
            <div className="popular-cities">
              <span>Or explore</span>
              {examples.map(example => (
                <Button
                  key={example.name}
                  appearance="transparent"
                  size="small"
                  className={`popular-city ${city.name === example.name && city.country === example.country ? 'selected' : ''}`}
                  onClick={() => chooseCity(example)}
                >
                  {example.name}
                </Button>
              ))}
            </div>
          </section>

          <section
            id="events"
            className="results-section"
            aria-labelledby="results-title"
          >
            <div className="results-heading">
              <div>
                <p className="eyebrow">GO OUT. GET INSPIRED.</p>
                <h2 id="results-title">
                  Upcoming in {city.name}
                  <span className="country-label">{city.country}</span>
                </h2>
              </div>
              <div className="radius-controls" aria-label="Search radius">
                <span>Within</span>
                {[5, 10, 25, 50].map(value => (
                  <Button
                    key={value}
                    appearance="transparent"
                    size="small"
                    className={`radius-button ${radius === value ? 'active' : ''}`}
                    aria-pressed={radius === value}
                    onClick={() => setRadius(value)}
                  >
                    {value} km
                  </Button>
                ))}
              </div>
            </div>
            <div className="topic-tabs" aria-label="Filter by topic">
              {topics.map(item => (
                <Button
                  key={item.id}
                  appearance="transparent"
                  size="small"
                  className={`topic-button ${topic === item.id ? 'active' : ''}`}
                  aria-pressed={topic === item.id}
                  onClick={() => setTopic(item.id)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
            <div className="filter-toolbar">
              <div className="keyword-input">
                <Input
                  id="keyword-search"
                  label="Filter events"
                  placeholder="Search titles, hosts or venues…"
                  value={keyword}
                  Icon={IconSearch}
                  onChange={event => setKeyword(event.target.value)}
                />
              </div>
              <div className="date-controls" aria-label="Filter by date">
                {[
                  { value: 0, label: 'Any date' },
                  { value: 7, label: 'Next 7 days' },
                  { value: 30, label: 'Next 30 days' },
                ].map(item => (
                  <Button
                    key={item.value}
                    appearance="transparent"
                    size="small"
                    className={`date-button ${days === item.value ? 'active' : ''}`}
                    aria-pressed={days === item.value}
                    onClick={() => setDays(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <Button
                appearance="transparent"
                size="small"
                className={`free-filter ${freeOnly ? 'active' : ''}`}
                aria-pressed={freeOnly}
                onClick={() => setFreeOnly(previous => !previous)}
              >
                {freeOnly ? '✓ ' : ''}Free RSVP
              </Button>
            </div>
            <div className="results-meta" role="status" aria-live="polite">
              <span>
                {loading
                  ? 'Finding upcoming events…'
                  : error && events.length === 0
                    ? 'Search unavailable'
                    : `${visible.length} ${visible.length === 1 ? 'event' : 'events'}${filtered ? ` matching · ${events.length} loaded` : ' loaded'}${hasMore ? ' · more available' : ''}`}
              </span>
              <span>
                {fetchedAt && !loading
                  ? `Updated ${dateLabel(fetchedAt, city.timezone, { hour: '2-digit', minute: '2-digit', hour12: false })} · ${city.timezone.replaceAll('_', ' ')}`
                  : 'Times are local to the selected city'}
              </span>
            </div>
            {error && (
              <div className="error-message" role="alert">
                <p>{error}</p>
                <Button
                  appearance="transparent"
                  size="small"
                  onClick={() => loadEvents(cursor || '', events.length === 0)}
                >
                  Try again
                </Button>
              </div>
            )}
            {loading ? (
              <div className="event-grid skeleton-grid" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map(index => (
                  <div key={index} className="skeleton-card">
                    <div />
                    <div />
                    <div />
                  </div>
                ))}
              </div>
            ) : visible.length ? (
              [...monthGroups].map(([month, entries]) => (
                <section key={month} className="month-group" aria-label={month}>
                  <h3 className="month-heading">
                    {month}
                    <span>{entries.length}</span>
                  </h3>
                  <div className="event-grid">
                    {entries.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        timezone={city.timezone}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              !error && (
                <div className="empty-state">
                  <IconSearch />
                  <h3>
                    {filtered
                      ? 'Nothing matches just yet.'
                      : 'A little quiet around here.'}
                  </h3>
                  <p>
                    {filtered
                      ? 'Try another keyword, clear the filters, or load more events.'
                      : `No public upcoming events found within ${radius} km. Try a wider radius or another city.`}
                  </p>
                  {filtered && (
                    <Button appearance="transparent" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              )
            )}
            {!loading && hasMore && (
              <div className="load-more">
                <Button
                  className="load-more-button"
                  appearance="transparent"
                  isLoading={loadingMore}
                  onClick={() => loadEvents(cursor, false)}
                >
                  Load more events <IconArrowRightFilled />
                </Button>
              </div>
            )}
            <p className="coverage-note">
              Public events discoverable on Luma near your selected city. Some
              listings may be missing. Topic filters use event titles and host
              names.
            </p>
          </section>
        </main>
        <footer className="site-footer">
          <p>
            <strong>LumaSearch</strong>
            <span>A little less searching. A little more showing up.</span>
          </p>
          <div>
            <p>Independent tool · Not affiliated with Luma.</p>
            <p>
              City data:{' '}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open-Meteo
              </a>{' '}
              /{' '}
              <a
                href="https://www.geonames.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                GeoNames
              </a>
              . Registration happens on{' '}
              <a
                href="https://luma.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Luma
              </a>
              .
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

createRoot(document.getElementById('root')).render(<App />)
