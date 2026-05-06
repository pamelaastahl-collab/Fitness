/**
 * AuditContext.
 *
 * Thin wrapper around `emitAuditEvent` that pre-fills actor_person_id,
 * actor_type, scope_type, scope_id, and company_id from the surrounding
 * Auth + Scope + Impersonation contexts. Feature code calls `audit.emit(…)`
 * with just the event-specific fields (event_type, target, before/after).
 *
 * Per XPI-AUD-01: every state-changing operation emits an AuditEvent.
 * Per XPI-AUTH-06: when impersonating, actor_type is IMPERSONATION and the
 * banner-visible target is captured as the actor_person_id (so the audit log
 * shows "what was done as Y" with dual-attribution discoverable via the
 * still-active ImpersonationSession's impersonator_person_id).
 */

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type {
  AuditActorType,
  AuditEvent,
  ScopeType,
} from '@/types/primitives'
import { emitAuditEvent } from '@/mocks'
import { useAuth } from './AuthContext'
import { useImpersonation } from './ImpersonationContext'
import { useScope } from './ScopeContext'

interface AuditEmitInput {
  event_type: string
  target_entity_type: string
  target_entity_id: string
  before_value?: Record<string, unknown>
  after_value?: Record<string, unknown>
  /** Override the inferred scope. Use sparingly — the default is correct for most calls. */
  scope_type?: ScopeType
  scope_id?: string
  /** Override the inferred company (e.g. cross-tenant platform actions). */
  company_id?: AuditEvent['company_id']
  /** Override actor_type (defaults to USER, or IMPERSONATION when impersonating). */
  actor_type?: AuditActorType
}

interface AuditContextValue {
  emit: (input: AuditEmitInput) => AuditEvent
}

const AuditContext = createContext<AuditContextValue | null>(null)

interface AuditProviderProps {
  children: ReactNode
}

export function AuditProvider({ children }: AuditProviderProps) {
  const { currentPerson, currentCompanyId } = useAuth()
  const { isImpersonating } = useImpersonation()
  const { scope_type, scope_id } = useScope()

  const emit = useCallback(
    (input: AuditEmitInput) =>
      emitAuditEvent({
        event_type: input.event_type,
        actor_person_id: currentPerson.person_id,
        actor_type:
          input.actor_type ?? (isImpersonating ? 'IMPERSONATION' : 'USER'),
        target_entity_type: input.target_entity_type,
        target_entity_id: input.target_entity_id,
        company_id: input.company_id ?? currentCompanyId,
        scope_type: input.scope_type ?? scope_type,
        scope_id: input.scope_id ?? scope_id,
        before_value: input.before_value,
        after_value: input.after_value,
      }),
    [currentPerson.person_id, currentCompanyId, isImpersonating, scope_type, scope_id],
  )

  const value = useMemo<AuditContextValue>(() => ({ emit }), [emit])

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>
}

export function useAudit(): AuditContextValue {
  const ctx = useContext(AuditContext)
  if (!ctx) {
    throw new Error('useAudit must be used within an AuditProvider')
  }
  return ctx
}
