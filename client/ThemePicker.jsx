import { useEffect, useState } from 'react'

/* Copyright 2013 - 2026 Waiterio LLC */
import Button from './components/Button.jsx'

const storageKey = 'lumasearch-theme'
const modes = ['system', 'light', 'dark']

function readPreference() {
  try {
    const saved = window.localStorage.getItem(storageKey)
    return modes.includes(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

export default function ThemePicker() {
  const [mode, setMode] = useState(readPreference)

  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const theme =
        mode === 'system' ? (system.matches ? 'dark' : 'light') : mode
      document.documentElement.dataset.theme = theme
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#101a17' : '#f8faf7')
    }
    const syncPreference = event => {
      if (event.key === storageKey || event.key === null) {
        setMode(readPreference())
      }
    }
    applyTheme()
    system.addEventListener('change', applyTheme)
    window.addEventListener('storage', syncPreference)
    return () => {
      system.removeEventListener('change', applyTheme)
      window.removeEventListener('storage', syncPreference)
    }
  }, [mode])

  function chooseMode(next) {
    setMode(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // The current page can still switch themes when storage is unavailable.
    }
  }

  return (
    <div className="theme-picker" role="group" aria-label="Color theme">
      {modes.map(option => (
        <Button
          key={option}
          appearance="transparent"
          size="small"
          className="theme-button"
          aria-pressed={mode === option}
          title={
            option === 'system'
              ? 'Follow your device theme'
              : `Use ${option} theme`
          }
          onClick={() => chooseMode(option)}
        >
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </Button>
      ))}
    </div>
  )
}
