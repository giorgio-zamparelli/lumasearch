/* Copyright 2013 - 2026 Waiterio LLC */
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { build } from 'vite'

process.env.NODE_ENV = 'production'
await build({
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
})
await fs.writeFile(
  new URL('../dist/build-info.json', import.meta.url),
  JSON.stringify({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    builtAt: new Date().toISOString(),
  }),
)
