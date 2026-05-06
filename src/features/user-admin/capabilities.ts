/**
 * Capability resolution for Admin User Management.
 *
 * The single seam mapping a Person's RoleAssignments → the capability set
 * the UI uses for affordance gating. Aligned with the FRD's per-story
 * permissions matrix. The mapping is deliberately conservative — when in
 * doubt, deny.
 *
 * This will eventually converge with the production RBAC resolver
 * (flagged in design.md §14.2). Until then, this is the prototype's
 * authoritative gate.
 */

import type { RoleAssignment, RoleCode } from '@/types/primitives'
import type { Capability } from './types'

const CAPABILITIES_BY_ROLE: Partial<Record<RoleCode, Capability[]>> = {
  COMPANY_ADMIN: [
    'users.list',
    'users.read_contact',
    'users.invite',
    'users.assign_role.unrestricted',
    'users.revoke_role.unrestricted',
    'users.edit_name',
    'users.edit_contact',
    'users.terminate_session',
    'users.deactivate',
    'users.delete',
    'users.export',
    'users.view_effective_permissions',
    'users.view_audit',
  ],
  SECURITY_ADMIN: [
    'users.list',
    'users.read_contact',
    'users.invite',
    'users.assign_role.unrestricted',
    'users.revoke_role.unrestricted',
    'users.edit_name',
    'users.edit_contact',
    'users.terminate_session',
    'users.deactivate',
    'users.delete',
    'users.export',
    'users.view_effective_permissions',
    'users.view_audit',
  ],
  LOCATION_MANAGER: [
    'users.list.location_scoped',
    'users.invite',
    'users.assign_role.location_only',
    'users.revoke_role.location_only',
    'users.edit_name',
    'users.deactivate',
    'users.view_audit',
  ],
  AUDITOR: [
    'users.list',
    'users.read_contact',
    'users.export',
    'users.view_effective_permissions',
    'users.view_audit',
  ],
  FINANCE_ADMIN: [
    'users.list.entity_scoped',
    'users.view_audit',
  ],
}

/** Roles a LOCATION_MANAGER may assign or revoke (FRD US-UM-010 BR1). */
export const LOCATION_MANAGER_ASSIGNABLE_ROLES: RoleCode[] = [
  'FRONT_DESK_STAFF',
  'INSTRUCTOR_COACH',
]

/** Privileged roles requiring step-up confirmation (FRD US-UM-010 BR4). */
export const PRIVILEGED_ROLES: RoleCode[] = [
  'COMPANY_ADMIN',
  'SECURITY_ADMIN',
  'FINANCE_ADMIN',
]

export function getCapabilities(assignments: RoleAssignment[]): Set<Capability> {
  const caps = new Set<Capability>()
  for (const a of assignments) {
    if (a.status !== 'ACTIVE') continue
    const list = CAPABILITIES_BY_ROLE[a.role_code]
    if (!list) continue
    for (const c of list) caps.add(c)
  }
  return caps
}

export function hasAny(caps: Set<Capability>, ...check: Capability[]): boolean {
  return check.some((c) => caps.has(c))
}

export function canAssignRole(
  actorAssignments: RoleAssignment[],
  targetRole: RoleCode,
): boolean {
  const caps = getCapabilities(actorAssignments)
  if (caps.has('users.assign_role.unrestricted')) return true
  if (caps.has('users.assign_role.location_only')) {
    return LOCATION_MANAGER_ASSIGNABLE_ROLES.includes(targetRole)
  }
  return false
}

export function canRevokeRole(
  actorAssignments: RoleAssignment[],
  targetRole: RoleCode,
): boolean {
  const caps = getCapabilities(actorAssignments)
  if (caps.has('users.revoke_role.unrestricted')) return true
  if (caps.has('users.revoke_role.location_only')) {
    return LOCATION_MANAGER_ASSIGNABLE_ROLES.includes(targetRole)
  }
  return false
}

export function isPrivilegedRole(role: RoleCode): boolean {
  return PRIVILEGED_ROLES.includes(role)
}
