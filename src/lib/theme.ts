// Helper de tema cliente — persistencia + sync entre tabs

export type UlTheme = 'dark' | 'light'

const KEY = 'ul-theme'

export function getTheme(): UlTheme {
  if (typeof window === 'undefined') return 'dark'
  const t = localStorage.getItem(KEY)
  return t === 'light' ? 'light' : 'dark'
}

export function setTheme(t: UlTheme) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, t)
  document.documentElement.setAttribute('data-theme', t)
  window.dispatchEvent(new CustomEvent('ul-theme-change', { detail: t }))
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}
