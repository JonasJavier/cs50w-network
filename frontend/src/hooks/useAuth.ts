import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { api } from '../lib/api'
import type { Me, TokenPair } from '../lib/types'
import { useAuthStore } from '../stores/auth'

interface LoginInput {
  username: string
  password: string
}

interface RegisterInput extends LoginInput {
  email: string
  first_name?: string
  last_name?: string
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<TokenPair>('/auth/token/', input)
      const { setTokens, setUser } = useAuthStore.getState()
      setTokens(data.access, data.refresh)
      setUser(data.user)
      return data.user
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<TokenPair>('/auth/register/', input)
      const { setTokens, setUser } = useAuthStore.getState()
      setTokens(data.access, data.refresh)
      setUser(data.user)
      return data.user
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return () => {
    const { refresh, logout } = useAuthStore.getState()
    if (refresh) {
      api.post('/auth/logout/', { refresh }).catch(() => {})
    }
    logout()
    queryClient.clear()
    navigate('/login')
  }
}

/** Keeps the persisted user profile fresh. */
export function useMe() {
  const access = useAuthStore((state) => state.access)
  return useQuery({
    queryKey: ['me'],
    enabled: access !== null,
    queryFn: async () => {
      const { data } = await api.get<Me>('/users/me/')
      useAuthStore.getState().setUser(data)
      return data
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { current_password: string; new_password: string }) => {
      const { data } = await api.post<TokenPair>('/auth/password/change/', input)
      // The server revoked every other session and issued a fresh pair for this one.
      useAuthStore.getState().setTokens(data.access, data.refresh)
      return data.user
    },
  })
}

export function useDeleteAccount() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (password: string) => {
      await api.delete('/users/me/', { data: { password } })
    },
    onSuccess: () => {
      useAuthStore.getState().logout()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
}
