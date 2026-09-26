import { useEffect, type RefObject } from 'react'

/** Calls `onOutside` when a pointer-down or Escape happens outside `ref`. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOutside()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, onOutside, active])
}
