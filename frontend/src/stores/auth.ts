import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Me } from '../lib/types'

interface AuthState {
  access: string | null
  refresh: string | null
  user: Me | null
  setTokens: (access: string, refresh: string) => void
  setUser: (user: Me | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      refresh: null,
      user: null,
      setTokens: (access, refresh) => set({ access, refresh }),
      setUser: (user) => set({ user }),
      logout: () => set({ access: null, refresh: null, user: null }),
    }),
    { name: 'network-auth' },
  ),
)

export const isAuthenticated = () => useAuthStore.getState().access !== null
