import { useEffect } from 'react'

/** Sets `document.title` as "<title> · Network" while the component is mounted. */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · Network` : 'Network'
    return () => {
      document.title = previous
    }
  }, [title])
}
