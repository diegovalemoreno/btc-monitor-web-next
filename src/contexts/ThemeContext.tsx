'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'orange' | 'celeste'

const THEMES: Theme[] = ['dark', 'light', 'orange', 'celeste']
const STORAGE_KEY = 'btc-theme'

interface ThemeContextValue {
  theme:    Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:    'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (saved && THEMES.includes(saved)) {
      setThemeState(saved)
    }
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

export const THEME_INIT_SCRIPT = `(function(){var t=localStorage.getItem('btc-theme');if(t==='dark'||t==='light'||t==='orange'||t==='celeste')document.documentElement.setAttribute('data-theme',t);})()`
