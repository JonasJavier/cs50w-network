import { useCallback, useEffect, useRef } from 'react'

interface Options {
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown
  /** Distance from the viewport at which the next page starts loading. */
  rootMargin?: string
}

/**
 * Returns a callback ref for a sentinel element; when it scrolls into view
 * the next page is requested. Works with TanStack `useInfiniteQuery`.
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '600px',
}: Options) {
  const observer = useRef<IntersectionObserver | null>(null)
  const latest = useRef({ hasNextPage, isFetchingNextPage, fetchNextPage })

  useEffect(() => {
    latest.current = { hasNextPage, isFetchingNextPage, fetchNextPage }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => () => observer.current?.disconnect(), [])

  return useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect()
      if (!node || typeof IntersectionObserver === 'undefined') return
      observer.current = new IntersectionObserver(
        (entries) => {
          const state = latest.current
          if (entries[0]?.isIntersecting && state.hasNextPage && !state.isFetchingNextPage) {
            state.fetchNextPage()
          }
        },
        { rootMargin },
      )
      observer.current.observe(node)
    },
    [rootMargin],
  )
}
