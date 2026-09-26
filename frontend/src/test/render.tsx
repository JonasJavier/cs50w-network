import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import type { Me, Post, UserMini } from '../lib/types'
import { useAuthStore } from '../stores/auth'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
}

/** Render with the providers every screen needs (router + TanStack Query). */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    queryClient = createTestQueryClient(),
    ...options
  }: RenderOptions & { route?: string; queryClient?: QueryClient } = {},
) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>,
      options,
    ),
  }
}

export const ada: UserMini = {
  id: 1,
  username: 'ada',
  name: 'Ada Lovelace',
  headline: 'Software Engineer',
  avatar: null,
}

export const grace: UserMini = {
  id: 2,
  username: 'grace',
  name: 'Grace Hopper',
  headline: 'Compiler Engineer',
  avatar: null,
}

export const me: Me = {
  ...ada,
  is_following: false,
  follows_you: false,
  followers_count: 3,
  following_count: 2,
  posts_count: 1,
  first_name: 'Ada',
  last_name: 'Lovelace',
  bio: '',
  location: '',
  website: '',
  cover: null,
  date_joined: '2026-01-01T00:00:00Z',
  email: 'ada@network.dev',
  last_login: null,
}

export function signIn(user: Me = me) {
  useAuthStore.setState({ access: 'access-token', refresh: 'refresh-token', user })
}

export function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 10,
    author: grace,
    content: 'Hello #network from @ada',
    image: null,
    repost_of: null,
    is_repost: false,
    hashtags: ['network'],
    created_at: new Date(Date.now() - 60_000).toISOString(),
    updated_at: new Date(Date.now() - 60_000).toISOString(),
    is_edited: false,
    likes_count: 2,
    comments_count: 0,
    reposts_count: 0,
    is_liked: false,
    is_reposted: false,
    is_bookmarked: false,
    ...overrides,
  }
}
