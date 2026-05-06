/**
 * Audit-emitting mutation seam for User Admin.
 *
 * All writes funnel through here so:
 *   (1) Multi-write actions (invite = TenantMembership + RoleAssignment +
 *       InviteToken) share a correlation_id.
 *   (2) Audit emission carries the surrounding actor + scope from the calling
 *       context (passed in explicitly — these helpers are usable outside React).
 *   (3) Sole-admin guard runs before any SECURITY_ADMIN @ COMPANY revoke.
 *
 * Feature components import from this module; never poke the mock stores
 * directly for state changes.
 */

import type {
  CompanyId,
  IsoTimestamp,
  Person,
  PersonId,
  RoleAssignment,
  RoleAssignmentId,
  RoleCode,
  ScopeType,
  TenantMembership,
  UUID,
} from '@/types/primitives'
import {
  emitAuditEvent,
  useRoleAssignmentsStore,
  useSessionsStore,
  useTenantMembershipsStore,
  usePersonsStore,
} from '@/mocks'
import { id } from '@/mocks/_helpers'
import { useInviteTokensStore } from './mockInviteTokens'
import type { InviteToken } from './types'
import { isLastSecurityAdminInCompany } from './queries'

export interface MutationContext {
  actor_id: PersonId
  company_id: CompanyId
  /** Optional: stamped on AuditEvent.after_value when an action required step-up. */
  step_up_token?: string
  /** Optional: reason captured from a step-up dialog. */
  step_up_reason?: string
}

interface InviteCreatePersonInput {
  given_name: string
  family_name: string
  email: string
  role_code: RoleCode
  scope_type: ScopeType
  scope_id: UUID
  reason_code?: string
}

export interface InviteResult {
  person: Person
  membership: TenantMembership
  assignment: RoleAssignment
  token: InviteToken
}

export type InviteOutcome =
  | { ok: true; result: InviteResult }
  | { ok: false; error: 'sod_violation'; conflicts: { existing_role: RoleCode; proposed_role: RoleCode }[] }

export function inviteNewPerson(
  ctx: MutationContext,
  input: InviteCreatePersonInput,
): InviteOutcome {
  const correlation_id = id() as UUID

  const sodCheck = useRoleAssignmentsStore
    .getState()
    .validateSoD(
      // person doesn't exist yet — but we still validate against an empty set
      // so the contract is consistent. In practice this returns no conflicts
      // for a new person.
      'pending' as PersonId,
      ctx.company_id,
      input.role_code,
      input.scope_type,
      input.scope_id,
    )
  if (sodCheck.length > 0) {
    return { ok: false, error: 'sod_violation', conflicts: sodCheck }
  }

  const person = usePersonsStore.getState().create(
    {
      person_type: 'STAFF',
      given_name: input.given_name,
      family_name: input.family_name,
      primary_email: input.email,
      identity_photo_status: 'NONE',
    },
    ctx.actor_id,
    ctx.company_id,
  )

  const membership = useTenantMembershipsStore
    .getState()
    .invite(person.person_id, ctx.company_id, ctx.actor_id)

  const assignResult = useRoleAssignmentsStore.getState().assign(
    {
      person_id: person.person_id,
      company_id: ctx.company_id,
      role_code: input.role_code,
      scope_type: input.scope_type,
      scope_id: input.scope_id,
      reason_code: input.reason_code,
    },
    ctx.actor_id,
  )
  if (!assignResult.ok) {
    return { ok: false, error: 'sod_violation', conflicts: assignResult.conflicts }
  }

  const token = useInviteTokensStore.getState().create({
    person_id: person.person_id,
    company_id: ctx.company_id,
    role_assignment_id: assignResult.assignment.assignment_id,
    correlation_id,
  })

  emitAuditEvent({
    event_type: 'admin.user_invited',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'TenantMembership',
    target_entity_id: membership.membership_id,
    company_id: ctx.company_id,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    correlation_id,
    after_value: {
      person_id: person.person_id,
      role_code: input.role_code,
      invite_token_id: token.token_id,
      step_up_token: ctx.step_up_token,
    },
  })

  return {
    ok: true,
    result: { person, membership, assignment: assignResult.assignment, token },
  }
}

interface AssignToExistingInput {
  person_id: PersonId
  role_code: RoleCode
  scope_type: ScopeType
  scope_id: UUID
  reason_code?: string
}

export type AssignOutcome =
  | { ok: true; assignment: RoleAssignment }
  | { ok: false; error: 'sod_violation'; conflicts: { existing_role: RoleCode; proposed_role: RoleCode }[] }
  | { ok: false; error: 'duplicate' }

export function assignRoleToExistingPerson(
  ctx: MutationContext,
  input: AssignToExistingInput,
): AssignOutcome {
  const existing = useRoleAssignmentsStore
    .getState()
    .listByPersonInCompany(input.person_id, ctx.company_id)
  const dup = existing.find(
    (a) =>
      a.role_code === input.role_code &&
      a.scope_type === input.scope_type &&
      a.scope_id === input.scope_id,
  )
  if (dup) return { ok: false, error: 'duplicate' }

  const result = useRoleAssignmentsStore.getState().assign(
    {
      person_id: input.person_id,
      company_id: ctx.company_id,
      role_code: input.role_code,
      scope_type: input.scope_type,
      scope_id: input.scope_id,
      reason_code: input.reason_code,
    },
    ctx.actor_id,
  )
  if (!result.ok) {
    return { ok: false, error: 'sod_violation', conflicts: result.conflicts }
  }

  emitAuditEvent({
    event_type: 'admin.role_assigned',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'RoleAssignment',
    target_entity_id: result.assignment.assignment_id,
    company_id: ctx.company_id,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    after_value: {
      person_id: input.person_id,
      role_code: input.role_code,
      step_up_token: ctx.step_up_token,
      reason: ctx.step_up_reason,
    },
  })

  return { ok: true, assignment: result.assignment }
}

export type RevokeOutcome =
  | { ok: true; assignment: RoleAssignment }
  | { ok: false; error: 'not_found' }
  | { ok: false; error: 'sole_admin_protected' }

export function revokeRole(
  ctx: MutationContext,
  assignment_id: RoleAssignmentId,
  reason: string,
): RevokeOutcome {
  const target = useRoleAssignmentsStore.getState().getById(assignment_id)
  if (!target || target.status !== 'ACTIVE') {
    return { ok: false, error: 'not_found' }
  }
  if (isLastSecurityAdminInCompany(assignment_id, ctx.company_id)) {
    return { ok: false, error: 'sole_admin_protected' }
  }

  const updated = useRoleAssignmentsStore
    .getState()
    .revoke(assignment_id, ctx.actor_id, reason)
  if (!updated) return { ok: false, error: 'not_found' }

  emitAuditEvent({
    event_type: 'admin.role_revoked',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'RoleAssignment',
    target_entity_id: assignment_id,
    company_id: ctx.company_id,
    scope_type: target.scope_type,
    scope_id: target.scope_id,
    before_value: { role_code: target.role_code, status: 'ACTIVE' },
    after_value: { status: 'REVOKED', reason },
  })

  return { ok: true, assignment: updated }
}

export function resendInvite(
  ctx: MutationContext,
  person_id: PersonId,
  role_assignment_id: RoleAssignmentId,
): InviteToken {
  const correlation_id = id() as UUID
  const token = useInviteTokensStore
    .getState()
    .resend(person_id, ctx.company_id, role_assignment_id, correlation_id)
  emitAuditEvent({
    event_type: 'admin.invite_resent',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'InviteToken',
    target_entity_id: token.token_id,
    company_id: ctx.company_id,
    scope_type: 'COMPANY',
    scope_id: ctx.company_id,
    correlation_id,
    after_value: { person_id, expires_at: token.expires_at as IsoTimestamp },
  })
  return token
}

export function editPersonName(
  ctx: MutationContext,
  person_id: PersonId,
  given_name: string,
  family_name: string,
): Person | undefined {
  const before = usePersonsStore.getState().getById(person_id)
  if (!before) return undefined
  const updated = usePersonsStore
    .getState()
    .update(person_id, { given_name, family_name }, ctx.actor_id, ctx.company_id)
  if (!updated) return undefined
  emitAuditEvent({
    event_type: 'admin.user_name_edited',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'Person',
    target_entity_id: person_id,
    company_id: ctx.company_id,
    before_value: {
      given_name: before.given_name,
      family_name: before.family_name,
    },
    after_value: { given_name, family_name },
  })
  return updated
}

export function terminateUserSession(
  ctx: MutationContext,
  session_id: string,
  reason: string,
) {
  const before = useSessionsStore
    .getState()
    .list()
    .find((s) => s.session_id === session_id)
  if (!before) return undefined
  const after = useSessionsStore
    .getState()
    .terminate(before.session_id, reason)
  if (!after) return undefined
  emitAuditEvent({
    event_type: 'admin.session_terminated',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'Session',
    target_entity_id: before.session_id,
    company_id: ctx.company_id,
    scope_type: 'COMPANY',
    scope_id: ctx.company_id,
    before_value: { status: before.status },
    after_value: { status: 'TERMINATED', reason },
  })
  return after
}
