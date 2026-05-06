/**
 * Read-side seam for Member Profile Extended Data.
 *
 * All reads through this module so the scope-filter rule (UUM-INVARIANT 4)
 * stays intact. Components do not import from `./mockConditions` or
 * `./mockEmergencyContacts` directly except where store reactivity is
 * required (subscribe-then-read pattern, same as user-admin).
 */

import type { PersonId, RoleAssignment } from '@/types/primitives'
import type {
  ConditionType,
  EmergencyContact,
  MemberCondition,
} from './types'
import {
  getEmergencyContactByPerson,
} from './mockEmergencyContacts'
import {
  listConditionTypesByCompany,
  useConditionTypesStore,
  useMemberConditionsStore,
} from './mockConditions'
import { getCapabilities } from '@/features/user-admin/capabilities'

/**
 * Whether the current actor is permitted to *view* sensitive member-profile
 * sections. Mirrors the User Admin caps semantics — anyone who can view a
 * profile sees Emergency + Conditions, modulo Auditor read-only and Instructor
 * read-only-on-conditions per FRD §F02.
 */
export function canViewMemberProfileExtras(
  actorAssignments: RoleAssignment[],
): boolean {
  const caps = getCapabilities(actorAssignments)
  return (
    caps.has('users.list') ||
    caps.has('users.list.location_scoped') ||
    caps.has('users.list.entity_scoped')
  )
}

export function canEditEmergencyContact(
  actorAssignments: RoleAssignment[],
): boolean {
  // Front Desk + Location Manager + Company Admin: write per FRD US-MPE-003.
  // Auditor: deny. Instructor: deny.
  for (const a of actorAssignments) {
    if (a.status !== 'ACTIVE') continue
    if (
      a.role_code === 'FRONT_DESK_STAFF' ||
      a.role_code === 'LOCATION_MANAGER' ||
      a.role_code === 'COMPANY_ADMIN' ||
      a.role_code === 'SECURITY_ADMIN'
    ) {
      return true
    }
  }
  return false
}

export function canEditConditions(
  actorAssignments: RoleAssignment[],
): boolean {
  // Same write set as Emergency Contact per FRD US-MPE-008/009.
  return canEditEmergencyContact(actorAssignments)
}

export function getEmergencyContactFor(
  person_id: PersonId,
): EmergencyContact | undefined {
  return getEmergencyContactByPerson(person_id)
}

export interface ConditionView {
  condition: MemberCondition
  type: ConditionType
}

function joinConditions(records: MemberCondition[]): ConditionView[] {
  const types = useConditionTypesStore.getState().list()
  const byId = new Map(types.map((t) => [t.condition_type_id, t]))
  return records
    .map((c) => {
      const type = byId.get(c.condition_type_id)
      return type ? { condition: c, type } : undefined
    })
    .filter((v): v is ConditionView => Boolean(v))
}

const SEVERITY_ORDER = { ALERT: 0, WARNING: 1, INFORMATIONAL: 2 } as const

export function listActiveConditionsFor(person_id: PersonId): ConditionView[] {
  const records = useMemberConditionsStore.getState().listActiveByPerson(person_id)
  return joinConditions(records).sort((a, b) => {
    const sa = SEVERITY_ORDER[a.type.severity]
    const sb = SEVERITY_ORDER[b.type.severity]
    if (sa !== sb) return sa - sb
    return a.condition.applied_at < b.condition.applied_at ? 1 : -1
  })
}

export function listHistoricalConditionsFor(
  person_id: PersonId,
): ConditionView[] {
  const records = useMemberConditionsStore
    .getState()
    .listHistoricalByPerson(person_id)
  return joinConditions(records).sort((a, b) =>
    a.condition.applied_at < b.condition.applied_at ? 1 : -1,
  )
}

export { listConditionTypesByCompany }
