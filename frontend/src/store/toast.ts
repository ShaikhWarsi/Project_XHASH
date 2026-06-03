import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/(api[_-]?key|token|secret|password|authorization|bearer)\s*[=:]\s*\S+/gi, '$1=***')
    .replace(/https?:\/\/[^\s]+key=[^\s&]+/gi, (match) => {
      return match.replace(/(key=)[^&\s]+/, '$1***')
    })
    .replace(/[A-Za-z0-9_-]{20,}/g, (match) => {
      if (/[A-Za-z0-9_-]{20,}/.test(match)) return match.slice(0, 4) + '***' + match.slice(-4)
      return match
    })
}

let toastCounter = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 4000) => {
    const sanitized = sanitizeErrorMessage(message)
    const id = `toast_${++toastCounter}`
    set((state) => ({ toasts: [...state.toasts, { id, message: sanitized, type }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))
