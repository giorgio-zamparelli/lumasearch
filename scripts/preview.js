import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import cities from '../api/cities.js'
import events from '../api/events.js'

const directory = path.resolve(
  fileURLToPath(new URL('../dist/', import.meta.url)),
)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
}
const port = Number(process.env.LUMA_SEARCH_PREVIEW_PORT || 47831)
const deployment = JSON.parse(
  await fs.readFile(new URL('../vercel.json', import.meta.url)),
)
const headers =
  deployment.headers.find(rule => rule.source === '/(.*)')?.headers || []
http
  .createServer(async (request, response) => {
    for (const { key, value } of headers) {
      response.setHeader(key, value)
    }
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname
    if (pathname === '/api/cities') return cities(request, response)
    if (pathname === '/api/events') return events(request, response)
    try {
      const relative = decodeURIComponent(
        pathname === '/' ? '/index.html' : pathname,
      )
      const filename = path.resolve(directory, `.${relative}`)
      if (!filename.startsWith(`${directory}${path.sep}`))
        throw new Error('Invalid path')
      const body = await fs.readFile(filename)
      response.writeHead(200, {
        'Content-Type':
          types[path.extname(filename)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      })
      response.end(body)
    } catch {
      response.writeHead(404)
      response.end('Not found')
    }
  })
  .listen(port, '127.0.0.1', () =>
    console.info(`LumaSearch preview: http://127.0.0.1:${port}`),
  )
