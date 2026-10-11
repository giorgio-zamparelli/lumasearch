/* Copyright 2013 - 2026 Waiterio LLC */
// Run before the page paints so a saved preference also applies on reload.
;(() => {
  let preference = 'system'
  try {
    const saved = window.localStorage.getItem('lumasearch-theme')
    if (saved === 'light' || saved === 'dark') preference = saved
  } catch {
    // Follow the OS when the browser does not allow local storage.
  }
  const theme =
    preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#101a17' : '#f8faf7')
})()
