/* Copyright 2013 - 2026 Waiterio LLC */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import cities from './api/cities.js'
import events from './api/events.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-event-api',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const pathname = new URL(request.url, 'http://127.0.0.1').pathname
          if (pathname === '/api/cities') return cities(request, response)
          if (pathname === '/api/events') return events(request, response)
          next()
        })
      },
    },
  ],
  envDir: false,
  server: { host: '127.0.0.1', port: 47831, strictPort: true },
  build: { outDir: 'dist', sourcemap: false, target: 'es2020' },
})
