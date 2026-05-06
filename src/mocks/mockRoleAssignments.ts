/**
 * Mock RoleAssignments — the source of every permission decision (UUM §2.4).
 *
 * One assignment per (person, role, scope) triple. Every staff Person carries
 * exactly one role at one scope in this seed; the F1 People & Access feature
 * exercises adding more.
 *
 * INVARIANT 4: a role + scope combination is unique per person per tenant.
 *              We don't violate it in the seed.
 *
 * SoD CONSTRAINTS (UUM §2.5): SECURITY_ADMIN+FINANCE_ADMIN, SECURITY_ADMIN+
 * TAX_BANK_CONFIG_ADMIN, FINANCE_ADMIN+TAX_BANK_CONFIG_ADMIN cannot share a
 * scope on the same Person. The seed places each role on a different Person
 * to keep the baseline clean — F1 demos the conflict at assignment time.
 */

import { create } from 'zustand'
import type {
  CompanyId,
  PersonId,
  RoleAssignment,
  RoleAssignmentId,
  RoleAssignmentStatus,
  RoleCode,
  ScopeType,
  UUID,
} from '@/types/primitives'
import { daysAgo, id, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'
import {
  BE_FITFLOW_PACIFIC_ID,
  BE_IRON_HARBOR_COASTAL_ID,
} from './mockBusinessEntities'
import {
  LOC_FITFLOW_AUCKLAND_ID,
  LOC_FITFLOW_WELLINGTON_ID,
  LOC_IRON_BROOKLYN_ID,
  LOC_IRON_MANHATTAN_ID,
  LOC_IRON_QUEENS_ID,
} from './mockLocations'
import {
  DEPT_AUCKLAND_PILATES_ID,
  DEPT_AUCKLAND_STRENGTH_ID,
  DEPT_AUCKLAND_YOGA_ID,
  DEPT_BROOKLYN_AQUATICS_ID,
  DEPT_BROOKLYN_PT_ID,
} from './mockDepartments'
import {
  PERSON_ANDREW_PHAM_ID,
  PERSON_AROHA_HENARE_ID,
  PERSON_AVERY_KIM_PLATFORM_ID,
  PERSON_BEATRIZ_SOTO_ID,
  PERSON_CAMILLE_LAURENT_ID,
  PERSON_CLAIRE_DONNELLY_ID,
  PERSON_DAVID_KIM_ID,
  PERSON_DEVON_BROOKS_ID,
  PERSON_ELEANOR_WHITFORD_ID,
  PERSON_GUARDIAN_RACHEL_BAILEY_ID,
  PERSON_HANA_TANE_ID,
  PERSON_JAMIE_COOPER_ID,
  PERSON_KOFI_MENSAH_ID,
  PERSON_LEILA_PATEL_ID,
  PERSON_LIAM_OBRIEN_ID,
  PERSON_MADELINE_FOSTER_ID,
  PERSON_MARCUS_WILLIAMS_ID,
  PERSON_MEI_TANAKA_ID,
  PERSON_MEMBER_AMARA_OKAFOR_ID,
  PERSON_MEMBER_ELLA_NGUYEN_ID,
  PERSON_MEMBER_ETHAN_VOGEL_ID,
  PERSON_MEMBER_HARPER_LINDQVIST_ID,
  PERSON_MEMBER_LUCIA_RIVERA_ID,
  PERSON_MEMBER_NOAH_FIELDING_ID,
  PERSON_MEMBER_OLIVIA_REID_ID,
  PERSON_MEMBER_ROHAN_DASS_ID,
  PERSON_MEMBER_TIMOTHY_AKINS_ID,
  PERSON_MEMBER_ZARA_HAQ_ID,
  PERSON_MINOR_FINN_BAILEY_ID,
  PERSON_MIRA_FERNANDES_ID,
  PERSON_NIKOLAI_PETROV_ID,
  PERSON_OWEN_DAVIES_ID,
  PERSON_PRIYA_NAIR_ID,
  PERSON_REGGIE_THOMPSON_ID,
  PERSON_SARAH_CHEN_ID,
  PERSON_TAMA_REWETI_ID,
  PERSON_TE_AROHA_MANAAKI_ID,
  PERSON_YUKI_BRENNAN_ID,
} from './mockPersons'

// SoD pairs — used by createAssignment validator.
export const SOD_FORBIDDEN_PAIRS: ReadonlyArray<readonly [RoleCode, RoleCode]> = [
  ['SECURITY_ADMIN', 'FINANCE_ADMIN'],
  ['SECURITY_ADMIN', 'TAX_BANK_CONFIG_ADMIN'],
  ['FINANCE_ADMIN', 'TAX_BANK_CONFIG_ADMIN'],
]

function ra(suffix: string): RoleAssignmentId {
  return `r0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as RoleAssignmentId
}

interface RaSpec {
  person_id: PersonId
  company_id: CompanyId
  role_code: RoleCode
  scope_type: ScopeType
  scope_id: UUID
  granted_by: PersonId
  grantedDaysAgo: number
  reason_code?: string
}

const FF = COMPANY_FITFLOW_PACIFIC_ID
const IH = COMPANY_IRON_HARBOR_ID

const SPECS: RaSpec[] = [
  // ── FitFlow Pacific ───────────────────────────────────────────────────────
  { person_id: PERSON_SARAH_CHEN_ID, company_id: FF, role_code: 'COMPANY_ADMIN', scope_type: 'COMPANY', scope_id: FF as unknown as UUID, granted_by: PERSON_SARAH_CHEN_ID, grantedDaysAgo: 410, reason_code: 'founder' },
  { person_id: PERSON_MARCUS_WILLIAMS_ID, company_id: FF, role_code: 'SECURITY_ADMIN', scope_type: 'COMPANY', scope_id: FF as unknown as UUID, granted_by: PERSON_SARAH_CHEN_ID, grantedDaysAgo: 408 },
  { person_id: PERSON_PRIYA_NAIR_ID, company_id: FF, role_code: 'FINANCE_ADMIN', scope_type: 'ENTITY', scope_id: BE_FITFLOW_PACIFIC_ID as unknown as UUID, granted_by: PERSON_SARAH_CHEN_ID, grantedDaysAgo: 380 },
  { person_id: PERSON_DAVID_KIM_ID, company_id: FF, role_code: 'TAX_BANK_CONFIG_ADMIN', scope_type: 'ENTITY', scope_id: BE_FITFLOW_PACIFIC_ID as unknown as UUID, granted_by: PERSON_SARAH_CHEN_ID, grantedDaysAgo: 360, reason_code: 'banking-setup' },
  { person_id: PERSON_HANA_TANE_ID, company_id: FF, role_code: 'REGIONAL_MANAGER', scope_type: 'ENTITY', scope_id: BE_FITFLOW_PACIFIC_ID as unknown as UUID, granted_by: PERSON_SARAH_CHEN_ID, grantedDaysAgo: 350 },
  { person_id: PERSON_LEILA_PATEL_ID, company_id: FF, role_code: 'LOCATION_MANAGER', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_AUCKLAND_ID as unknown as UUID, granted_by: PERSON_HANA_TANE_ID, grantedDaysAgo: 320 },
  { person_id: PERSON_TAMA_REWETI_ID, company_id: FF, role_code: 'LOCATION_MANAGER', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_WELLINGTON_ID as unknown as UUID, granted_by: PERSON_HANA_TANE_ID, grantedDaysAgo: 305 },
  { person_id: PERSON_AROHA_HENARE_ID, company_id: FF, role_code: 'FRONT_DESK_STAFF', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_AUCKLAND_ID as unknown as UUID, granted_by: PERSON_LEILA_PATEL_ID, grantedDaysAgo: 240 },
  { person_id: PERSON_JAMIE_COOPER_ID, company_id: FF, role_code: 'FRONT_DESK_STAFF', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_AUCKLAND_ID as unknown as UUID, granted_by: PERSON_LEILA_PATEL_ID, grantedDaysAgo: 210 },
  { person_id: PERSON_TE_AROHA_MANAAKI_ID, company_id: FF, role_code: 'FRONT_DESK_STAFF', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_WELLINGTON_ID as unknown as UUID, granted_by: PERSON_TAMA_REWETI_ID, grantedDaysAgo: 195 },
  { person_id: PERSON_LIAM_OBRIEN_ID, company_id: FF, role_code: 'INSTRUCTOR_COACH', scope_type: 'DEPARTMENT', scope_id: DEPT_AUCKLAND_YOGA_ID as unknown as UUID, granted_by: PERSON_LEILA_PATEL_ID, grantedDaysAgo: 290 },
  { person_id: PERSON_MIRA_FERNANDES_ID, company_id: FF, role_code: 'INSTRUCTOR_COACH', scope_type: 'DEPARTMENT', scope_id: DEPT_AUCKLAND_PILATES_ID as unknown as UUID, granted_by: PERSON_LEILA_PATEL_ID, grantedDaysAgo: 270 },
  { person_id: PERSON_NIKOLAI_PETROV_ID, company_id: FF, role_code: 'DEPARTMENT_LEAD', scope_type: 'DEPARTMENT', scope_id: DEPT_AUCKLAND_STRENGTH_ID as unknown as UUID, granted_by: PERSON_LEILA_PATEL_ID, grantedDaysAgo: 260 },
  { person_id: PERSON_ELEANOR_WHITFORD_ID, company_id: FF, role_code: 'AUDITOR', scope_type: 'COMPANY', scope_id: FF as unknown as UUID, granted_by: PERSON_SARAH_CHEN_ID, grantedDaysAgo: 200, reason_code: 'compliance-audit' },

  // FitFlow members (MEMBER role at home Location)
  { person_id: PERSON_MEMBER_OLIVIA_REID_ID, company_id: FF, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_AUCKLAND_ID as unknown as UUID, granted_by: PERSON_AROHA_HENARE_ID, grantedDaysAgo: 240 },
  { person_id: PERSON_MEMBER_NOAH_FIELDING_ID, company_id: FF, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_AUCKLAND_ID as unknown as UUID, granted_by: PERSON_AROHA_HENARE_ID, grantedDaysAgo: 215 },
  { person_id: PERSON_MEMBER_AMARA_OKAFOR_ID, company_id: FF, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_AUCKLAND_ID as unknown as UUID, granted_by: PERSON_JAMIE_COOPER_ID, grantedDaysAgo: 180 },
  { person_id: PERSON_MEMBER_ETHAN_VOGEL_ID, company_id: FF, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_WELLINGTON_ID as unknown as UUID, granted_by: PERSON_TE_AROHA_MANAAKI_ID, grantedDaysAgo: 410 },
  { person_id: PERSON_MEMBER_ZARA_HAQ_ID, company_id: FF, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_WELLINGTON_ID as unknown as UUID, granted_by: PERSON_TE_AROHA_MANAAKI_ID, grantedDaysAgo: 95 },
  { person_id: PERSON_GUARDIAN_RACHEL_BAILEY_ID, company_id: FF, role_code: 'GUARDIAN', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_AUCKLAND_ID as unknown as UUID, granted_by: PERSON_AROHA_HENARE_ID, grantedDaysAgo: 60 },
  { person_id: PERSON_MINOR_FINN_BAILEY_ID, company_id: FF, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_FITFLOW_AUCKLAND_ID as unknown as UUID, granted_by: PERSON_AROHA_HENARE_ID, grantedDaysAgo: 60 },

  // ── Iron Harbor ───────────────────────────────────────────────────────────
  { person_id: PERSON_MADELINE_FOSTER_ID, company_id: IH, role_code: 'COMPANY_ADMIN', scope_type: 'COMPANY', scope_id: IH as unknown as UUID, granted_by: PERSON_MADELINE_FOSTER_ID, grantedDaysAgo: 360, reason_code: 'founder' },
  { person_id: PERSON_DEVON_BROOKS_ID, company_id: IH, role_code: 'SECURITY_ADMIN', scope_type: 'COMPANY', scope_id: IH as unknown as UUID, granted_by: PERSON_MADELINE_FOSTER_ID, grantedDaysAgo: 355 },
  { person_id: PERSON_CAMILLE_LAURENT_ID, company_id: IH, role_code: 'FINANCE_ADMIN', scope_type: 'ENTITY', scope_id: BE_IRON_HARBOR_COASTAL_ID as unknown as UUID, granted_by: PERSON_MADELINE_FOSTER_ID, grantedDaysAgo: 340 },
  { person_id: PERSON_ANDREW_PHAM_ID, company_id: IH, role_code: 'TAX_BANK_CONFIG_ADMIN', scope_type: 'ENTITY', scope_id: BE_IRON_HARBOR_COASTAL_ID as unknown as UUID, granted_by: PERSON_MADELINE_FOSTER_ID, grantedDaysAgo: 320, reason_code: 'banking-setup' },
  { person_id: PERSON_REGGIE_THOMPSON_ID, company_id: IH, role_code: 'REGIONAL_MANAGER', scope_type: 'ENTITY', scope_id: BE_IRON_HARBOR_COASTAL_ID as unknown as UUID, granted_by: PERSON_MADELINE_FOSTER_ID, grantedDaysAgo: 300 },
  { person_id: PERSON_BEATRIZ_SOTO_ID, company_id: IH, role_code: 'LOCATION_MANAGER', scope_type: 'LOCATION', scope_id: LOC_IRON_BROOKLYN_ID as unknown as UUID, granted_by: PERSON_REGGIE_THOMPSON_ID, grantedDaysAgo: 280 },
  { person_id: PERSON_CLAIRE_DONNELLY_ID, company_id: IH, role_code: 'LOCATION_MANAGER', scope_type: 'LOCATION', scope_id: LOC_IRON_MANHATTAN_ID as unknown as UUID, granted_by: PERSON_REGGIE_THOMPSON_ID, grantedDaysAgo: 165 },
  { person_id: PERSON_MEI_TANAKA_ID, company_id: IH, role_code: 'FRONT_DESK_STAFF', scope_type: 'LOCATION', scope_id: LOC_IRON_BROOKLYN_ID as unknown as UUID, granted_by: PERSON_BEATRIZ_SOTO_ID, grantedDaysAgo: 220 },
  { person_id: PERSON_OWEN_DAVIES_ID, company_id: IH, role_code: 'FRONT_DESK_STAFF', scope_type: 'LOCATION', scope_id: LOC_IRON_QUEENS_ID as unknown as UUID, granted_by: PERSON_REGGIE_THOMPSON_ID, grantedDaysAgo: 180 },
  { person_id: PERSON_KOFI_MENSAH_ID, company_id: IH, role_code: 'INSTRUCTOR_COACH', scope_type: 'DEPARTMENT', scope_id: DEPT_BROOKLYN_PT_ID as unknown as UUID, granted_by: PERSON_BEATRIZ_SOTO_ID, grantedDaysAgo: 240 },
  { person_id: PERSON_YUKI_BRENNAN_ID, company_id: IH, role_code: 'DEPARTMENT_LEAD', scope_type: 'DEPARTMENT', scope_id: DEPT_BROOKLYN_AQUATICS_ID as unknown as UUID, granted_by: PERSON_BEATRIZ_SOTO_ID, grantedDaysAgo: 250 },

  // Iron Harbor members
  { person_id: PERSON_MEMBER_ROHAN_DASS_ID, company_id: IH, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_IRON_BROOKLYN_ID as unknown as UUID, granted_by: PERSON_MEI_TANAKA_ID, grantedDaysAgo: 320 },
  { person_id: PERSON_MEMBER_LUCIA_RIVERA_ID, company_id: IH, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_IRON_BROOKLYN_ID as unknown as UUID, granted_by: PERSON_MEI_TANAKA_ID, grantedDaysAgo: 290 },
  { person_id: PERSON_MEMBER_TIMOTHY_AKINS_ID, company_id: IH, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_IRON_QUEENS_ID as unknown as UUID, granted_by: PERSON_OWEN_DAVIES_ID, grantedDaysAgo: 245 },
  { person_id: PERSON_MEMBER_ELLA_NGUYEN_ID, company_id: IH, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_IRON_MANHATTAN_ID as unknown as UUID, granted_by: PERSON_CLAIRE_DONNELLY_ID, grantedDaysAgo: 130 },
  { person_id: PERSON_MEMBER_HARPER_LINDQVIST_ID, company_id: IH, role_code: 'MEMBER', scope_type: 'LOCATION', scope_id: LOC_IRON_MANHATTAN_ID as unknown as UUID, granted_by: PERSON_CLAIRE_DONNELLY_ID, grantedDaysAgo: 75 },

  // ── Platform support ──────────────────────────────────────────────────────
  // PLATFORM_SUPPORT spec scope is "System" but ScopeType has no SYSTEM value.
  // Prototype-scope choice: assign at COMPANY scope on each tenant Avery may
  // impersonate into. F1 / impersonation flow can revisit this.
  { person_id: PERSON_AVERY_KIM_PLATFORM_ID, company_id: FF, role_code: 'PLATFORM_SUPPORT', scope_type: 'COMPANY', scope_id: FF as unknown as UUID, granted_by: PERSON_SARAH_CHEN_ID, grantedDaysAgo: 500, reason_code: 'platform-support' },
  { person_id: PERSON_AVERY_KIM_PLATFORM_ID, company_id: IH, role_code: 'PLATFORM_SUPPORT', scope_type: 'COMPANY', scope_id: IH as unknown as UUID, granted_by: PERSON_MADELINE_FOSTER_ID, grantedDaysAgo: 500, reason_code: 'platform-support' },
]

export const seedRoleAssignments: RoleAssignment[] = SPECS.map(
  (s, idx): RoleAssignment => ({
    assignment_id: ra(`${idx + 1}`),
    person_id: s.person_id,
    company_id: s.company_id,
    role_code: s.role_code,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    granted_by_person_id: s.granted_by,
    granted_at: daysAgo(s.grantedDaysAgo),
    reason_code: s.reason_code,
    status: 'ACTIVE',
  }),
)

export interface SoDConflict {
  existing_role: RoleCode
  proposed_role: RoleCode
}

interface RoleAssignmentsStore {
  assignments: RoleAssignment[]
  list: () => RoleAssignment[]
  listByPerson: (pid: PersonId) => RoleAssignment[]
  listByCompany: (cid: CompanyId) => RoleAssignment[]
  listByPersonInCompany: (pid: PersonId, cid: CompanyId) => RoleAssignment[]
  getById: (id: RoleAssignmentId) => RoleAssignment | undefined
  /**
   * Validate SoD on a proposed assignment without mutating state.
   * Returns conflicts if any of SOD_FORBIDDEN_PAIRS would be violated.
   */
  validateSoD: (
    person_id: PersonId,
    company_id: CompanyId,
    role_code: RoleCode,
    scope_type: ScopeType,
    scope_id: UUID,
  ) => SoDConflict[]
  assign: (
    input: {
      person_id: PersonId
      company_id: CompanyId
      role_code: RoleCode
      scope_type: ScopeType
      scope_id: UUID
      reason_code?: string
    },
    granted_by: PersonId,
  ) => { ok: true; assignment: RoleAssignment } | { ok: false; conflicts: SoDConflict[] }
  revoke: (
    id: RoleAssignmentId,
    actor_id: PersonId,
    reason: string,
  ) => RoleAssignment | undefined
}

export const useRoleAssignmentsStore = create<RoleAssignmentsStore>((set, get) => ({
  assignments: seedRoleAssignments,

  list: () => get().assignments,
  listByPerson: (pid) =>
    get().assignments.filter((a) => a.person_id === pid && a.status === 'ACTIVE'),
  listByCompany: (cid) =>
    get().assignments.filter((a) => a.company_id === cid),
  listByPersonInCompany: (pid, cid) =>
    get().assignments.filter(
      (a) => a.person_id === pid && a.company_id === cid && a.status === 'ACTIVE',
    ),
  getById: (rid) => get().assignments.find((a) => a.assignment_id === rid),

  validateSoD: (person_id, company_id, role_code, scope_type, scope_id) => {
    const existing = get().assignments.filter(
      (a) =>
        a.person_id === person_id &&
        a.company_id === company_id &&
        a.scope_type === scope_type &&
        a.scope_id === scope_id &&
        a.status === 'ACTIVE',
    )
    const conflicts: SoDConflict[] = []
    for (const e of existing) {
      for (const [a, b] of SOD_FORBIDDEN_PAIRS) {
        if (
          (e.role_code === a && role_code === b) ||
          (e.role_code === b && role_code === a)
        ) {
          conflicts.push({ existing_role: e.role_code, proposed_role: role_code })
        }
      }
    }
    return conflicts
  },

  assign: (input, granted_by) => {
    const conflicts = get().validateSoD(
      input.person_id,
      input.company_id,
      input.role_code,
      input.scope_type,
      input.scope_id,
    )
    if (conflicts.length > 0) {
      return { ok: false, conflicts }
    }
    const assignment: RoleAssignment = {
      assignment_id: id() as RoleAssignmentId,
      person_id: input.person_id,
      company_id: input.company_id,
      role_code: input.role_code,
      scope_type: input.scope_type,
      scope_id: input.scope_id,
      granted_by_person_id: granted_by,
      granted_at: isoNow(),
      reason_code: input.reason_code,
      status: 'ACTIVE',
    }
    set((s) => ({ assignments: [...s.assignments, assignment] }))
    emitAuditEvent({
      event_type: 'role.assigned',
      actor_person_id: granted_by,
      target_entity_type: 'RoleAssignment',
      target_entity_id: assignment.assignment_id,
      company_id: input.company_id,
      scope_type: input.scope_type,
      scope_id: input.scope_id,
      after_value: {
        person_id: input.person_id,
        role_code: input.role_code,
        reason_code: input.reason_code,
      },
    })
    return { ok: true, assignment }
  },

  revoke: (rid, actor_id, reason) => {
    const before = get().assignments.find((a) => a.assignment_id === rid)
    if (!before) return undefined
    const after: RoleAssignment = {
      ...before,
      status: 'REVOKED' as RoleAssignmentStatus,
      revoked_at: isoNow(),
      revoked_by_person_id: actor_id,
    }
    set((s) => ({
      assignments: s.assignments.map((a) =>
        a.assignment_id === rid ? after : a,
      ),
    }))
    emitAuditEvent({
      event_type: 'role.revoked',
      actor_person_id: actor_id,
      target_entity_type: 'RoleAssignment',
      target_entity_id: rid,
      company_id: before.company_id,
      scope_type: before.scope_type,
      scope_id: before.scope_id,
      before_value: { role_code: before.role_code, status: before.status },
      after_value: { status: after.status, reason_code: reason },
    })
    return after
  },
}))

export function listRoleAssignmentsForPerson(pid: PersonId) {
  return useRoleAssignmentsStore.getState().listByPerson(pid)
}
export function listActiveRoleAssignmentsInCompany(pid: PersonId, cid: CompanyId) {
  return useRoleAssignmentsStore.getState().listByPersonInCompany(pid, cid)
}
