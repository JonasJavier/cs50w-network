import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  duration: number
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, kind?: ToastKind, duration?: number) => number
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (message, kind = 'info', duration = kind === 'error' ? 5000 : 3000) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, kind, message, duration }] }))
    return id
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

/** Imperative helpers usable outside React (hooks, API layer). */
export const toast = {
  success: (message: string) => useToastStore.getState().push(message, 'success'),
  error: (message: string) => useToastStore.getState().push(message, 'error'),
  info: (message: string) => useToastStore.getState().push(message, 'info'),
}
