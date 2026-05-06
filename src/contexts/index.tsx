/**
 * Contexts barrel + composed Providers wrapper.
 *
 * Provider order matters:
 *   AuthProvider          (no deps)
 *     ImpersonationProvider (reads/writes Auth)
 *       ScopeProvider       (reads Auth)
 *         AuditProvider     (reads Auth + Scope + Impersonation)
 *           ToastProvider   (no deps; renders Toaster)
 *
 * UserSwitcher is rendered alongside ToastProvider so it has access to all
 * contexts and is keyed on the global Cmd+Shift+U handler.
 */

import type { ReactNode } from 'react'
import { AuthProvider } from './AuthContext'
import { ImpersonationProvider } from './ImpersonationContext'
import { ScopeProvider } from './ScopeContext'
import { AuditProvider } from './AuditContext'
import { ToastProvider } from './ToastContext'
import { UserSwitcher } from './UserSwitcher'

export { useAuth } from './AuthContext'
export { useScope } from './ScopeContext'
export { useImpersonation } from './ImpersonationContext'
export { useAudit } from './AuditContext'
export { useToast } from './ToastContext'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ImpersonationProvider>
        <ScopeProvider>
          <AuditProvider>
            <ToastProvider>
              {children}
              <UserSwitcher />
            </ToastProvider>
          </AuditProvider>
        </ScopeProvider>
      </ImpersonationProvider>
    </AuthProvider>
  )
}
