/* Copyright 2013 - 2026 Waiterio LLC */
export const topics = [
  { id: 'all', name: 'All events' },
  {
    id: 'tech',
    name: 'Tech & AI',
    expression:
      /\b(ai|ia|tech|technology|tecnolog\w*|n8n|notion|developer\w*|devday|hackathon|hackalencia|inteligencia|digital|xr|descubrexrpro|coding|programaci\w*|software|cloud|blockchain|crypto|web3|videojuegos|mcp)\b/i,
  },
  {
    id: 'business',
    name: 'Business',
    expression:
      /founder|startup|business|negocio|networking|invest|inversi[oó]n|pitch|residency|entrepreneur|emprend|real estate|afterwork/i,
  },
  {
    id: 'health',
    name: 'Health & wellness',
    expression:
      /health|salud|longevity|longevidad|wellness|yoga|medicin|m[eé]dic|clinic|dental|dentist|odontolog|farmac|pharma|veterin|\bela\b/i,
  },
  {
    id: 'arts',
    name: 'Arts & culture',
    expression:
      /\bart\b|arts|arte|literatur|lectura|reading|libro|club -|m[uú]sica|music|cine|film|creativ|podcast|talks -|gong|teatro/i,
  },
  {
    id: 'social',
    name: 'Community',
    expression:
      /offline|hangout|community|comunidad|gathering|festa|fiesta|weekend|meetup|melodies|connection|caf[eé]/i,
  },
]

export function matchesTopic(event, topic) {
  if (topic === 'all') return true
  const definition = topics.find(item => item.id === topic)
  return !!definition?.expression.test(
    `${event.name} ${event.organizer} ${(event.categories || []).join(' ')}`,
  )
}

export function filterEvents(
  events,
  {
    keyword = '',
    topic = 'all',
    days = 0,
    freeOnly = false,
    now = Date.now(),
  } = {},
) {
  const words = keyword
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  const upper = days ? now + days * 86400000 : Infinity
  return events
    .filter(event => {
      const start = Date.parse(event.start)
      const text =
        `${event.name} ${event.organizer} ${event.venue} ${event.city}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
      return (
        start >= now &&
        start < upper &&
        (!freeOnly || event.freeRegistration) &&
        matchesTopic(event, topic) &&
        words.every(word => text.includes(word))
      )
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}
