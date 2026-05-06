/**
 * Role → permission matrix for the Effective Permissions viewer (US-UM-016).
 *
 * Prototype-scope: authored locally so the viewer has substantive content for
 * the demo. Will need to converge with the production RBAC resolver — see
 * design.md §14.2 OQ-UM-4.
 */

import type { RoleCode } from '@/types/primitives'

const SHARED_BASIC = [
  'profile.view_self',
  'profile.edit_self_name',
  'sessions.view_self',
]

export const PERMISSIONS_BY_ROLE: Record<RoleCode, string[]> = {
  COMPANY_ADMIN: [
    ...SHARED_BASIC,
    'users.list.all',
    'users.invite',
    'users.assign_role.any',
    'users.revoke_role.any',
    'users.deactivate',
    'users.delete',
    'offerings.create',
    'offerings.publish',
    'finance.view_all',
    'finance.refund.unlimited',
    'audit.view',
    'audit.export',
    'org.manage',
  ],
  SECURITY_ADMIN: [
    ...SHARED_BASIC,
    'users.list.all',
    'users.invite',
    'users.assign_role.any',
    'users.revoke_role.any',
    'users.terminate_session',
    'users.deactivate',
    'users.delete',
    'audit.view',
    'audit.export',
    'security.policy.manage',
  ],
  FINANCE_ADMIN: [
    ...SHARED_BASIC,
    'users.list.entity',
    'finance.view_entity',
    'finance.refund.threshold',
    'finance.adjustment.threshold',
    'finance.export',
    'audit.view',
  ],
  TAX_BANK_CONFIG_ADMIN: [
    ...SHARED_BASIC,
    'finance.bank_config.manage',
    'finance.tax_config.manage',
  ],
  REGIONAL_MANAGER: [
    ...SHARED_BASIC,
    'offerings.view',
    'finance.view_entity',
    'audit.view',
  ],
  LOCATION_MANAGER: [
    ...SHARED_BASIC,
    'users.list.location',
    'users.invite',
    'users.assign_role.frontdesk_instructor',
    'users.revoke_role.frontdesk_instructor',
    'pos.use',
    'finance.view_location',
    'finance.refund.threshold',
    'audit.view.location',
  ],
  FRONT_DESK_STAFF: [
    ...SHARED_BASIC,
    'pos.use',
    'members.view',
    'members.check_in',
  ],
  INSTRUCTOR_COACH: [
    ...SHARED_BASIC,
    'classes.view_assigned',
    'members.view',
  ],
  DEPARTMENT_LEAD: [
    ...SHARED_BASIC,
    'classes.view_department',
    'staff.view_department',
  ],
  AUDITOR: [
    ...SHARED_BASIC,
    'users.list.all',
    'finance.view_all',
    'audit.view',
    'audit.export',
  ],
  PLATFORM_SUPPORT: [
    ...SHARED_BASIC,
    'impersonation.start',
    'support.tools',
  ],
  MEMBER: [...SHARED_BASIC],
  GUARDIAN: [
    ...SHARED_BASIC,
    'profile.view_dependents',
  ],
}

export interface EffectivePermission {
  permission: string
  source_role: RoleCode
  scope_type: string
  scope_id: string
}

import type { RoleAssignment } from '@/types/primitives'

export function computeEffectivePermissions(
  assignments: RoleAssignment[],
): EffectivePermission[] {
  const out: EffectivePermission[] = []
  const seen = new Set<string>()
  for (const a of assignments) {
    if (a.status !== 'ACTIVE') continue
    const perms = PERMISSIONS_BY_ROLE[a.role_code] ?? []
    for (const p of perms) {
      const key = `${p}|${a.scope_type}|${a.scope_id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        permission: p,
        source_role: a.role_code,
        scope_type: a.scope_type,
        scope_id: a.scope_id,
      })
    }
  }
  return out.sort((x, y) => x.permission.localeCompare(y.permission))
}
