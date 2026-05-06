/**
 * ToastContext.
 *
 * Wraps shadcn's sonner `Toaster` and exposes a `useToast()` hook with
 * FitFlow-flavored convenience methods (info / success / warn / error).
 * The sonner library uses module-level state, so this isn't strictly a React
 * context — but the Provider component gives us a single mount point for
 * `<Toaster />` and a place to apply prototype-wide defaults later.
 */

import { type ReactNode } from 'react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

interface ToastAPI {
  info: (message: string, opts?: { description?: string }) => void
  success: (message: string, opts?: { description?: string }) => void
  warn: (message: string, opts?: { description?: string }) => void
  error: (message: string, opts?: { description?: string }) => void
  dismiss: (id?: string | number) => void
}

const toastApi: ToastAPI = {
  info: (message, opts) => toast.info(message, opts),
  success: (message, opts) => toast.success(message, opts),
  warn: (message, opts) => toast.warning(message, opts),
  error: (message, opts) => toast.error(message, opts),
  dismiss: (id) => toast.dismiss(id),
}

export function useToast(): ToastAPI {
  return toastApi
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster richColors position="bottom-right" />
    </>
  )
}
