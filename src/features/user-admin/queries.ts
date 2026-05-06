/**
 * Scope-aware read seam for User Admin.
 *
 * UUM-INVARIANT 4: every list/search/profile read filters by actor scope
 * server-side. The prototype's "server" is this module. Components must
 * call these helpers and never reach into mockPersons / mockRoleAssignments
 * directly — that's the load-bearing rule that keeps the invariant intact.
 *
 * For visibility purposes a Person is considered "in scope" if the actor
 * can see at least one of the Person's RoleAssignments under the actor's
 * scope, OR if the Person has an INVITED TenantMembership in the company
 * (so an admin can find a person they just invited even before any roles
 * are active).
 */

import type {
  BusinessEntityId,
  CompanyId,
  LocationId,
  Person,
  PersonId,
  RoleAssignment,
  RoleCode,
  TenantMembership,
  TenantMembershipStatus,
  UUID,
} from '@/types/primitives'
import {
  getLocationById,
  listPersons,
  listTenantMembershipsByCompany,
  useRoleAssignmentsStore,
} from '@/mocks'
import { getCapabilities } from './capabilities'
import {
  getActiveInviteTokenForPerson,
} from './mockInviteTokens'
import type { InviteToken } from './types'

export type DirectoryStatus = 'ACTIVE' | 'INVITED' | 'INACTIVE'

export interface DirectoryRow {
  person: Person
  status: DirectoryStatus
  roles: RoleAssignment[]
  /** Roles outside the actor's scope, masked to a count (cf. OQ-UM-3). */
  masked_role_count: number
  primary_location_name?: string
  membership?: TenantMembership
  active_invite?: InviteToken
}

export interface DirectoryFilters {
  q?: string
  role?: RoleCode[]
  status?: DirectoryStatus[]
  location_id?: LocationId[]
  created_from?: string
  created_to?: string
}

interface ScopeContextLite {
  company_id: CompanyId
  /** RoleAssignments held by the actor in this company. Drives visibility. */
  actor_assignments: RoleAssignment[]
}

function actorAuthorisedLocationIds(actor: ScopeContextLite): LocationId[] {
  return actor.actor_assignments
    .filter((a) => a.status === 'ACTIVE' && a.scope_type === 'LOCATION')
    .map((a) => a.scope_id as unknown as LocationId)
}

function actorAuthorisedEntityIds(actor: ScopeContextLite): BusinessEntityId[] {
  return actor.actor_assignments
    .filter((a) => a.status === 'ACTIVE' && a.scope_type === 'ENTITY')
    .map((a) => a.scope_id as unknown as BusinessEntityId)
}

function locationToEntity(loc_id: LocationId): BusinessEntityId | undefined {
  return getLocationById(loc_id)?.business_entity_id
}

function membershipStatusToDirectory(s: TenantMembershipStatus): DirectoryStatus {
  switch (s) {
    case 'ACTIVE':
      return 'ACTIVE'
    case 'INVITED':
      return 'INVITED'
    case 'SUSPENDED':
    case 'DEACTIVATED':
      return 'INACTIVE'
  }
}

function assignmentInActorScope(
  assignment: RoleAssignment,
  actor: ScopeContextLite,
): boolean {
  if (assignment.company_id !== actor.company_id) return false
  const caps = getCapabilities(actor.actor_assignments)
  if (caps.has('users.list')) return true
  if (caps.has('users.list.location_scoped')) {
    const myLocations = actorAuthorisedLocationIds(actor)
    if (assignment.scope_type === 'LOCATION') {
      return myLocations.includes(assignment.scope_id as unknown as LocationId)
    }
    if (assignment.scope_type === 'DEPARTMENT') {
      // Department implies a parent Location — for prototype, we don't fetch
      // the dept→location join; we conservatively include if any role matches
      // by other means. Caller handles this via per-row masking.
      return false
    }
    return false
  }
  if (caps.has('users.list.entity_scoped')) {
    const myEntities = actorAuthorisedEntityIds(actor)
    if (assignment.scope_type === 'ENTITY') {
      return myEntities.includes(assignment.scope_id as unknown as BusinessEntityId)
    }
    if (assignment.scope_type === 'LOCATION') {
      const be = locationToEntity(assignment.scope_id as unknown as LocationId)
      return be ? myEntities.includes(be) : false
    }
    if (assignment.scope_type === 'COMPANY') {
      return assignment.scope_id === (actor.company_id as unknown as UUID)
    }
    return false
  }
  return false
}

/**
 * Walk every Person with a TenantMembership in the actor's company and
 * decide if they're visible. Visible if:
 *   (a) actor has unrestricted list capability and Person has any membership
 *       in this company, OR
 *   (b) actor has scoped list capability and at least one of the Person's
 *       active RoleAssignments falls inside the actor's scope, OR
 *   (c) Person has an INVITED membership in this company (admins can always
 *       see who they invited).
 */
export function listDirectory(actor: ScopeContextLite, filters: DirectoryFilters = {}): DirectoryRow[] {
  const persons = listPersons()
  const memberships = listTenantMembershipsByCompany(actor.company_id)
  const allAssignments = useRoleAssignmentsStore.getState().listByCompany(actor.company_id)
  const personById = new Map(persons.map((p) => [p.person_id, p]))
  const membershipByPerson = new Map<PersonId, TenantMembership>()
  for (const m of memberships) {
    membershipByPerson.set(m.person_id, m)
  }

  const caps = getCapabilities(actor.actor_assignments)
  const unrestricted = caps.has('users.list')

  const rows: DirectoryRow[] = []

  for (const m of memberships) {
    const person = personById.get(m.person_id)
    if (!person) continue
    const personActiveAssignments = allAssignments.filter(
      (a) => a.person_id === m.person_id && a.status === 'ACTIVE',
    )
    const visibleAssignments = unrestricted
      ? personActiveAssignments
      : personActiveAssignments.filter((a) => assignmentInActorScope(a, actor))
    const masked = personActiveAssignments.length - visibleAssignments.length
    const isInvited = m.status === 'INVITED'
    const visible = unrestricted || visibleAssignments.length > 0 || isInvited
    if (!visible) continue

    let primary_location_name: string | undefined
    const locAssign = visibleAssignments.find((a) => a.scope_type === 'LOCATION')
    if (locAssign) {
      primary_location_name = getLocationById(
        locAssign.scope_id as unknown as LocationId,
      )?.name
    }
    const active_invite = isInvited ? getActiveInviteTokenForPerson(person.person_id) : undefined

    rows.push({
      person,
      status: membershipStatusToDirectory(m.status),
      roles: visibleAssignments,
      masked_role_count: Math.max(masked, 0),
      primary_location_name,
      membership: m,
      active_invite,
    })
  }

  return applyFilters(rows, filters, actor)
}

function applyFilters(
  rows: DirectoryRow[],
  filters: DirectoryFilters,
  actor: ScopeContextLite,
): DirectoryRow[] {
  const q = filters.q?.trim().toLowerCase()
  const allowedLocations = filters.location_id?.length
    ? filters.location_id.filter((lid) => {
        const caps = getCapabilities(actor.actor_assignments)
        if (caps.has('users.list')) return true
        if (caps.has('users.list.location_scoped')) {
          return actorAuthorisedLocationIds(actor).includes(lid)
        }
        if (caps.has('users.list.entity_scoped')) {
          const be = locationToEntity(lid)
          return be ? actorAuthorisedEntityIds(actor).includes(be) : false
        }
        return false
      })
    : undefined

  return rows.filter((row) => {
    if (q && q.length >= 3) {
      const hay = [
        row.person.given_name,
        row.person.family_name,
        row.person.primary_email ?? '',
        row.person.primary_phone ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (filters.status?.length && !filters.status.includes(row.status)) return false
    if (filters.role?.length) {
      const personRoles = row.roles.map((r) => r.role_code)
      if (!filters.role.some((fr) => personRoles.includes(fr))) return false
    }
    if (allowedLocations?.length) {
      const personLocations = row.roles
        .filter((r) => r.scope_type === 'LOCATION')
        .map((r) => r.scope_id as unknown as LocationId)
      if (!allowedLocations.some((lid) => personLocations.includes(lid))) return false
    }
    if (filters.created_from && row.person.created_at < filters.created_from) return false
    if (filters.created_to && row.person.created_at > filters.created_to) return false
    return true
  })
}

/**
 * Single-person fetch with scope check. Returns undefined if the actor
 * cannot see this Person (caller should redirect to PermissionDenied).
 */
export function getDirectoryEntry(
  actor: ScopeContextLite,
  person_id: PersonId,
): DirectoryRow | undefined {
  return listDirectory(actor).find((r) => r.person.person_id === person_id)
}

/**
 * Sole-admin guard: would revoking the role at `assignment_id` leave 0
 * active SECURITY_ADMIN at COMPANY scope in this company? Used by the UI
 * to disable the revoke button before the click.
 */
export function isLastSecurityAdminInCompany(
  assignment_id: string,
  company_id: CompanyId,
): boolean {
  const all = useRoleAssignmentsStore.getState().listByCompany(company_id)
  const target = all.find((a) => a.assignment_id === assignment_id)
  if (!target) return false
  if (target.role_code !== 'SECURITY_ADMIN') return false
  if (target.scope_type !== 'COMPANY') return false
  if (target.status !== 'ACTIVE') return false
  const otherActiveCompanySecurityAdmins = all.filter(
    (a) =>
      a.role_code === 'SECURITY_ADMIN' &&
      a.scope_type === 'COMPANY' &&
      a.status === 'ACTIVE' &&
      a.assignment_id !== assignment_id,
  )
  return otherActiveCompanySecurityAdmins.length === 0
}

/** Email-equality duplicate check (US-UM-004; OQ-UM-1 for richer matching). */
export function findDuplicateByEmail(
  email: string,
  company_id: CompanyId,
): { person: Person; has_membership: boolean } | undefined {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return undefined
  const persons = listPersons()
  const match = persons.find(
    (p) => (p.primary_email ?? '').toLowerCase() === trimmed,
  )
  if (!match) return undefined
  const memberships = listTenantMembershipsByCompany(company_id)
  return {
    person: match,
    has_membership: memberships.some((m) => m.person_id === match.person_id),
  }
}
