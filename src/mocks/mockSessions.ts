/**
 * Mock Sessions and ImpersonationSessions (UUM §2.6, §2.7).
 *
 * Per OQ-06 the spec doesn't include active_scope on Session — the prototype
 * tracks active scope in ScopeContext + localStorage instead. The sessions
 * here exist to satisfy the schema and seed an "established_at" affordance
 * for the top bar.
 *
 * Default: one ACTIVE session for the bootstrap actor (Leila Patel) on the
 * ADMIN_CONSOLE surface. No active impersonation; the seeded
 * ImpersonationSession is TERMINATED so the audit log has a historical
 * reference and the F1 demo can show "you have impersonated this person before".
 */

import { create } from 'zustand'
import type {
  AuthMethod,
  ImpersonationSession,
  ImpersonationSessionId,
  ImpersonationSessionStatus,
  PersonId,
  Session,
  SessionId,
  SessionStatus,
  SessionSurface,
} from '@/types/primitives'
import { daysAgo, daysFromNow, id, isoNow } from './_helpers'
import { COMPANY_FITFLOW_PACIFIC_ID } from './mockCompanies'
import {
  PERSON_AVERY_KIM_PLATFORM_ID,
  PERSON_LEILA_PATEL_ID,
  PERSON_MEMBER_OLIVIA_REID_ID,
} from './mockPersons'
import { emitAuditEvent } from './mockAuditEvents'

export const SESSION_BOOTSTRAP_ID =
  's0000001-0000-0000-0000-000000000001' as SessionId

export const seedSessions: Session[] = [
  {
    session_id: SESSION_BOOTSTRAP_ID,
    person_id: PERSON_LEILA_PATEL_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    surface: 'ADMIN_CONSOLE',
    auth_method: 'MAGIC_LINK',
    established_at: daysAgo(0, 2),
    last_active_at: isoNow(),
    expires_at: daysFromNow(0, 10),
    status: 'ACTIVE',
  },
]

export const IMPERSONATION_HISTORY_ID =
  'i0000099-0000-0000-0000-000000000001' as ImpersonationSessionId

export const seedImpersonationSessions: ImpersonationSession[] = [
  {
    session_id: IMPERSONATION_HISTORY_ID,
    impersonator_person_id: PERSON_AVERY_KIM_PLATFORM_ID,
    target_person_id: PERSON_MEMBER_OLIVIA_REID_ID,
    started_at: daysAgo(7, 3),
    expires_at: daysAgo(7, 0),
    reason_code: 'support-case-IH-4421',
    status: 'TERMINATED',
  },
]

interface SessionsStore {
  sessions: Session[]
  impersonations: ImpersonationSession[]
  list: () => Session[]
  getById: (sid: SessionId) => Session | undefined
  /** Soft-touch last_active_at; not audited (per spec it's a session ping, not a state change). */
  ping: (sid: SessionId) => void
  /** Terminate an active session. */
  terminate: (sid: SessionId, reason?: string) => Session | undefined

  listImpersonations: () => ImpersonationSession[]
  activeImpersonation: () => ImpersonationSession | undefined
  startImpersonation: (
    impersonator_person_id: PersonId,
    target_person_id: PersonId,
    reason_code: string,
    company_id: import('@/types/primitives').CompanyId,
  ) => ImpersonationSession
  endImpersonation: (
    impersonation_id: ImpersonationSessionId,
    actor_id: PersonId,
    company_id: import('@/types/primitives').CompanyId,
  ) => ImpersonationSession | undefined
}

export const useSessionsStore = create<SessionsStore>((set, get) => ({
  sessions: seedSessions,
  impersonations: seedImpersonationSessions,

  list: () => get().sessions,
  getById: (sid) => get().sessions.find((s) => s.session_id === sid),

  ping: (sid) => {
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.session_id === sid ? { ...sess, last_active_at: isoNow() } : sess,
      ),
    }))
  },

  terminate: (sid, reason) => {
    const before = get().sessions.find((s) => s.session_id === sid)
    if (!before) return undefined
    const after: Session = {
      ...before,
      status: 'TERMINATED' as SessionStatus,
      reason_code: reason,
    }
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.session_id === sid ? after : sess)),
    }))
    return after
  },

  listImpersonations: () => get().impersonations,

  activeImpersonation: () =>
    get().impersonations.find((i) => i.status === 'ACTIVE'),

  startImpersonation: (impersonator_person_id, target_person_id, reason_code, company_id) => {
    const session: ImpersonationSession = {
      session_id: id() as ImpersonationSessionId,
      impersonator_person_id,
      target_person_id,
      started_at: isoNow(),
      // Max 4 hours per UUM §2.7.
      expires_at: daysFromNow(0, 4),
      reason_code,
      status: 'ACTIVE',
    }
    set((s) => ({ impersonations: [...s.impersonations, session] }))
    emitAuditEvent({
      event_type: 'impersonation.started',
      actor_person_id: impersonator_person_id,
      actor_type: 'IMPERSONATION',
      target_entity_type: 'Person',
      target_entity_id: target_person_id,
      company_id,
      scope_type: 'COMPANY',
      scope_id: company_id,
      after_value: { reason_code, target_person_id },
    })
    return session
  },

  endImpersonation: (impersonation_id, actor_id, company_id) => {
    const before = get().impersonations.find((i) => i.session_id === impersonation_id)
    if (!before) return undefined
    const after: ImpersonationSession = {
      ...before,
      status: 'TERMINATED' as ImpersonationSessionStatus,
    }
    set((s) => ({
      impersonations: s.impersonations.map((i) =>
        i.session_id === impersonation_id ? after : i,
      ),
    }))
    emitAuditEvent({
      event_type: 'impersonation.ended',
      actor_person_id: actor_id,
      actor_type: 'IMPERSONATION',
      target_entity_type: 'Person',
      target_entity_id: before.target_person_id,
      company_id,
      scope_type: 'COMPANY',
      scope_id: company_id,
      before_value: { status: before.status },
      after_value: { status: after.status },
    })
    return after
  },
}))

// Re-export types so consumers can import everything they need from this module.
export type {
  AuthMethod,
  Session,
  SessionId,
  SessionStatus,
  SessionSurface,
  ImpersonationSession,
  ImpersonationSessionId,
  ImpersonationSessionStatus,
}
