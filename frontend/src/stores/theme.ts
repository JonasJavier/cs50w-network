import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
  /** Cycle light → dark → light (used by the navbar button). */
  toggle: () => void
}

const media =
  typeof window !== 'undefined' && 'matchMedia' in window
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

function systemTheme(): ResolvedTheme {
  return media?.matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference
}

function apply(theme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#09090b' : '#ffffff')
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      resolved: systemTheme(),
      setPreference: (preference) => {
        const resolved = resolveTheme(preference)
        apply(resolved)
        set({ preference, resolved })
      },
      toggle: () => get().setPreference(get().resolved === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'network-theme',
      version: 2,
      partialize: (state) => ({ preference: state.preference }),
      migrate: (persisted) => {
        // v1 stored { theme: 'light' | 'dark' }
        const legacy = persisted as { theme?: ResolvedTheme; preference?: ThemePreference }
        return { preference: legacy.preference ?? legacy.theme ?? 'system' }
      },
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return
        const resolved = resolveTheme(state.preference)
        apply(resolved)
        useThemeStore.setState({ resolved })
      },
    },
  ),
)

// Follow OS changes while the preference is "system".
media?.addEventListener('change', () => {
  const { preference } = useThemeStore.getState()
  if (preference === 'system') {
    const resolved = systemTheme()
    apply(resolved)
    useThemeStore.setState({ resolved })
  }
})

apply(useThemeStore.getState().resolved)
