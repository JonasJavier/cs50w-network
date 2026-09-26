import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { api, fetchPage } from '../lib/api'
import type { AppNotification, CursorPage } from '../lib/types'
import { mapPages } from './cache'

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) =>
      fetchPage<CursorPage<AppNotification>>(pageParam ?? '/notifications/'),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>('/notifications/unread-count/')
      return data.count
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/notifications/${id}/read/`)
    },
    onMutate: (id) => {
      queryClient.setQueryData<InfiniteData<CursorPage<AppNotification>>>(
        ['notifications'],
        (data) =>
          mapPages(data, (notification) =>
            notification.id === id ? { ...notification, is_read: true } : notification,
          ),
      )
      queryClient.setQueryData<number>(['notifications-unread'], (count) =>
        Math.max(0, (count ?? 1) - 1),
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all/')
    },
    onSuccess: () => {
      queryClient.setQueryData<InfiniteData<CursorPage<AppNotification>>>(
        ['notifications'],
        (data) => mapPages(data, (notification) => ({ ...notification, is_read: true })),
      )
      queryClient.setQueryData(['notifications-unread'], 0)
    },
  })
}

export function useClearNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/clear/')
    },
    onSuccess: () => {
      queryClient.setQueryData<InfiniteData<CursorPage<AppNotification>>>(
        ['notifications'],
        (data) => data && { ...data, pages: [{ next: null, previous: null, results: [] }] },
      )
      queryClient.setQueryData(['notifications-unread'], 0)
    },
  })
}
