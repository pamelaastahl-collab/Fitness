/**
 * InviteToken mock store. FRD-local entity (EPIC-UM).
 *
 * Per FRD §2: 7-day expiry, status transitions PENDING → ACCEPTED | EXPIRED |
 * REVOKED. Resend creates a new token with a new TTL and revokes the old one.
 *
 * No scheduler runs in the prototype, so no token auto-transitions to EXPIRED.
 * The `markExpired` helper exists for the dev affordance noted in §14.2 of
 * the design doc.
 */

import { create } from 'zustand'
import type {
  CompanyId,
  IsoTimestamp,
  PersonId,
  RoleAssignmentId,
  UUID,
} from '@/types/primitives'
import { daysFromNow, id, isoNow } from '@/mocks/_helpers'
import type { InviteToken, InviteTokenId, InviteTokenStatus } from './types'

interface InviteTokensStore {
  tokens: InviteToken[]
  list: () => InviteToken[]
  listByCompany: (cid: CompanyId) => InviteToken[]
  listByPerson: (pid: PersonId) => InviteToken[]
  getActiveByPerson: (pid: PersonId) => InviteToken | undefined
  create: (input: {
    person_id: PersonId
    company_id: CompanyId
    role_assignment_id: RoleAssignmentId
    correlation_id: UUID
  }) => InviteToken
  /** Resend = create new + revoke previous. Returns the new token. */
  resend: (
    person_id: PersonId,
    company_id: CompanyId,
    role_assignment_id: RoleAssignmentId,
    correlation_id: UUID,
  ) => InviteToken
  setStatus: (token_id: InviteTokenId, status: InviteTokenStatus) => InviteToken | undefined
  markExpired: (token_id: InviteTokenId) => InviteToken | undefined
}

function buildToken(input: {
  person_id: PersonId
  company_id: CompanyId
  role_assignment_id: RoleAssignmentId
  correlation_id: UUID
}): InviteToken {
  const created_at = isoNow()
  const expires_at = daysFromNow(7) as IsoTimestamp
  return {
    token_id: id() as InviteTokenId,
    person_id: input.person_id,
    company_id: input.company_id,
    role_assignment_id: input.role_assignment_id,
    status: 'PENDING',
    created_at,
    expires_at,
    correlation_id: input.correlation_id,
  }
}

export const useInviteTokensStore = create<InviteTokensStore>((set, get) => ({
  tokens: [],

  list: () => get().tokens,
  listByCompany: (cid) => get().tokens.filter((t) => t.company_id === cid),
  listByPerson: (pid) => get().tokens.filter((t) => t.person_id === pid),
  getActiveByPerson: (pid) =>
    get().tokens.find((t) => t.person_id === pid && t.status === 'PENDING'),

  create: (input) => {
    const token = buildToken(input)
    set((s) => ({ tokens: [...s.tokens, token] }))
    return token
  },

  resend: (person_id, company_id, role_assignment_id, correlation_id) => {
    set((s) => ({
      tokens: s.tokens.map((t) =>
        t.person_id === person_id && t.status === 'PENDING'
          ? { ...t, status: 'REVOKED' as InviteTokenStatus }
          : t,
      ),
    }))
    const next = buildToken({ person_id, company_id, role_assignment_id, correlation_id })
    set((s) => ({ tokens: [...s.tokens, next] }))
    return next
  },

  setStatus: (token_id, status) => {
    let updated: InviteToken | undefined
    set((s) => ({
      tokens: s.tokens.map((t) => {
        if (t.token_id !== token_id) return t
        const next: InviteToken = {
          ...t,
          status,
          accepted_at: status === 'ACCEPTED' ? isoNow() : t.accepted_at,
        }
        updated = next
        return next
      }),
    }))
    return updated
  },

  markExpired: (token_id) => get().setStatus(token_id, 'EXPIRED'),
}))

export function listInviteTokensByCompany(cid: CompanyId): InviteToken[] {
  return useInviteTokensStore.getState().listByCompany(cid)
}
export function getActiveInviteTokenForPerson(pid: PersonId): InviteToken | undefined {
  return useInviteTokensStore.getState().getActiveByPerson(pid)
}
