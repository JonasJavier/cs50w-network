import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Hashtag } from '../lib/types'

export function useTrendingHashtags() {
  return useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const { data } = await api.get<Hashtag[]>('/hashtags/trending/')
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}
