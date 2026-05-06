/**
 * Mock TenantMemberships — Person ↔ Company link (UUM §2.3).
 *
 * Each Person has at least one ACTIVE membership at the company that hosts
 * their roles. Avery Kim (PLATFORM_SUPPORT) carries memberships at both
 * tenants — they're a system actor, not a real tenant member, but the
 * record exists so impersonation can target either tenant.
 *
 * One INVITED membership is seeded (Bryn Halloway) so the F7 directory page
 * has a non-empty pending-invites state from the moment the prototype boots.
 */

import { create } from 'zustand'
import type {
  CompanyId,
  PersonId,
  TenantMembership,
  TenantMembershipId,
  TenantMembershipStatus,
} from '@/types/primitives'
import { daysAgo, daysFromNow, id, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'
import {
  PERSON_AROHA_HENARE_ID,
  PERSON_AVERY_KIM_PLATFORM_ID,
  PERSON_ANDREW_PHAM_ID,
  PERSON_BEATRIZ_SOTO_ID,
  PERSON_CAMILLE_LAURENT_ID,
  PERSON_CLAIRE_DONNELLY_ID,
  PERSON_DAVID_KIM_ID,
  PERSON_DEVON_BROOKS_ID,
  PERSON_ELEANOR_WHITFORD_ID,
  PERSON_GUARDIAN_RACHEL_BAILEY_ID,
  PERSON_HANA_TANE_ID,
  PERSON_INVITED_BRYN_HALLOWAY_ID,
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

function mid(suffix: string): TenantMembershipId {
  return `m0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as TenantMembershipId
}

interface MembershipSpec {
  person_id: PersonId
  company_id: CompanyId
  createdDaysAgo: number
  status?: TenantMembershipStatus
  invited_by?: PersonId
}

const FITFLOW = COMPANY_FITFLOW_PACIFIC_ID
const IRON = COMPANY_IRON_HARBOR_ID

const SPECS: MembershipSpec[] = [
  // FitFlow Pacific
  { person_id: PERSON_SARAH_CHEN_ID, company_id: FITFLOW, createdDaysAgo: 410 },
  { person_id: PERSON_MARCUS_WILLIAMS_ID, company_id: FITFLOW, createdDaysAgo: 408 },
  { person_id: PERSON_PRIYA_NAIR_ID, company_id: FITFLOW, createdDaysAgo: 380 },
  { person_id: PERSON_DAVID_KIM_ID, company_id: FITFLOW, createdDaysAgo: 360 },
  { person_id: PERSON_HANA_TANE_ID, company_id: FITFLOW, createdDaysAgo: 350 },
  { person_id: PERSON_LEILA_PATEL_ID, company_id: FITFLOW, createdDaysAgo: 320 },
  { person_id: PERSON_TAMA_REWETI_ID, company_id: FITFLOW, createdDaysAgo: 305 },
  { person_id: PERSON_AROHA_HENARE_ID, company_id: FITFLOW, createdDaysAgo: 240 },
  { person_id: PERSON_JAMIE_COOPER_ID, company_id: FITFLOW, createdDaysAgo: 210 },
  { person_id: PERSON_TE_AROHA_MANAAKI_ID, company_id: FITFLOW, createdDaysAgo: 195 },
  { person_id: PERSON_LIAM_OBRIEN_ID, company_id: FITFLOW, createdDaysAgo: 290 },
  { person_id: PERSON_MIRA_FERNANDES_ID, company_id: FITFLOW, createdDaysAgo: 270 },
  { person_id: PERSON_NIKOLAI_PETROV_ID, company_id: FITFLOW, createdDaysAgo: 260 },
  { person_id: PERSON_ELEANOR_WHITFORD_ID, company_id: FITFLOW, createdDaysAgo: 200 },
  // FitFlow members
  { person_id: PERSON_MEMBER_OLIVIA_REID_ID, company_id: FITFLOW, createdDaysAgo: 240 },
  { person_id: PERSON_MEMBER_NOAH_FIELDING_ID, company_id: FITFLOW, createdDaysAgo: 215 },
  { person_id: PERSON_MEMBER_AMARA_OKAFOR_ID, company_id: FITFLOW, createdDaysAgo: 180 },
  { person_id: PERSON_MEMBER_ETHAN_VOGEL_ID, company_id: FITFLOW, createdDaysAgo: 410 },
  { person_id: PERSON_MEMBER_ZARA_HAQ_ID, company_id: FITFLOW, createdDaysAgo: 95 },
  { person_id: PERSON_GUARDIAN_RACHEL_BAILEY_ID, company_id: FITFLOW, createdDaysAgo: 60 },
  { person_id: PERSON_MINOR_FINN_BAILEY_ID, company_id: FITFLOW, createdDaysAgo: 60 },

  // Iron Harbor
  { person_id: PERSON_MADELINE_FOSTER_ID, company_id: IRON, createdDaysAgo: 360 },
  { person_id: PERSON_DEVON_BROOKS_ID, company_id: IRON, createdDaysAgo: 355 },
  { person_id: PERSON_CAMILLE_LAURENT_ID, company_id: IRON, createdDaysAgo: 340 },
  { person_id: PERSON_ANDREW_PHAM_ID, company_id: IRON, createdDaysAgo: 320 },
  { person_id: PERSON_REGGIE_THOMPSON_ID, company_id: IRON, createdDaysAgo: 300 },
  { person_id: PERSON_BEATRIZ_SOTO_ID, company_id: IRON, createdDaysAgo: 280 },
  { person_id: PERSON_CLAIRE_DONNELLY_ID, company_id: IRON, createdDaysAgo: 165 },
  { person_id: PERSON_MEI_TANAKA_ID, company_id: IRON, createdDaysAgo: 220 },
  { person_id: PERSON_OWEN_DAVIES_ID, company_id: IRON, createdDaysAgo: 180 },
  { person_id: PERSON_KOFI_MENSAH_ID, company_id: IRON, createdDaysAgo: 240 },
  { person_id: PERSON_YUKI_BRENNAN_ID, company_id: IRON, createdDaysAgo: 250 },
  // Iron Harbor members
  { person_id: PERSON_MEMBER_ROHAN_DASS_ID, company_id: IRON, createdDaysAgo: 320 },
  { person_id: PERSON_MEMBER_LUCIA_RIVERA_ID, company_id: IRON, createdDaysAgo: 290 },
  { person_id: PERSON_MEMBER_TIMOTHY_AKINS_ID, company_id: IRON, createdDaysAgo: 245 },
  { person_id: PERSON_MEMBER_ELLA_NGUYEN_ID, company_id: IRON, createdDaysAgo: 130 },
  { person_id: PERSON_MEMBER_HARPER_LINDQVIST_ID, company_id: IRON, createdDaysAgo: 75 },

  // Platform support — both tenants
  { person_id: PERSON_AVERY_KIM_PLATFORM_ID, company_id: FITFLOW, createdDaysAgo: 500 },
  { person_id: PERSON_AVERY_KIM_PLATFORM_ID, company_id: IRON, createdDaysAgo: 500 },
]

export const seedTenantMemberships: TenantMembership[] = SPECS.map(
  (s, idx): TenantMembership => ({
    membership_id: mid(`${idx + 1}`),
    person_id: s.person_id,
    company_id: s.company_id,
    status: s.status ?? 'ACTIVE',
    invited_by_person_id: s.invited_by,
    created_at: daysAgo(s.createdDaysAgo),
  }),
)

// Seeded INVITED row — pending acceptance, exercises directory empty/pending state.
export const seedInvitedMembership: TenantMembership = {
  membership_id: mid('99'),
  person_id: PERSON_INVITED_BRYN_HALLOWAY_ID,
  company_id: IRON,
  status: 'INVITED',
  invited_by_person_id: PERSON_DEVON_BROOKS_ID,
  invite_expires_at: daysFromNow(2, 4),
  created_at: daysAgo(1, 4),
}

export const allSeedTenantMemberships: TenantMembership[] = [
  ...seedTenantMemberships,
  seedInvitedMembership,
]

interface TenantMembershipsStore {
  memberships: TenantMembership[]
  list: () => TenantMembership[]
  listByPerson: (pid: PersonId) => TenantMembership[]
  listByCompany: (cid: CompanyId) => TenantMembership[]
  getById: (mid: TenantMembershipId) => TenantMembership | undefined
  invite: (
    person_id: PersonId,
    company_id: CompanyId,
    invited_by: PersonId,
  ) => TenantMembership
  setStatus: (
    mid: TenantMembershipId,
    status: TenantMembershipStatus,
    actor_id: PersonId,
  ) => TenantMembership | undefined
}

export const useTenantMembershipsStore = create<TenantMembershipsStore>((set, get) => ({
  memberships: allSeedTenantMemberships,
  list: () => get().memberships,
  listByPerson: (pid) => get().memberships.filter((m) => m.person_id === pid),
  listByCompany: (cid) => get().memberships.filter((m) => m.company_id === cid),
  getById: (id) => get().memberships.find((m) => m.membership_id === id),

  invite: (person_id, company_id, invited_by) => {
    const membership: TenantMembership = {
      membership_id: id() as TenantMembershipId,
      person_id,
      company_id,
      status: 'INVITED',
      invited_by_person_id: invited_by,
      invite_expires_at: daysFromNow(3),
      created_at: isoNow(),
    }
    set((s) => ({ memberships: [...s.memberships, membership] }))
    emitAuditEvent({
      event_type: 'user.invited',
      actor_person_id: invited_by,
      target_entity_type: 'TenantMembership',
      target_entity_id: membership.membership_id,
      company_id,
      scope_type: 'COMPANY',
      scope_id: company_id,
      after_value: { person_id, status: 'INVITED' },
    })
    return membership
  },

  setStatus: (mid, status, actor_id) => {
    const before = get().memberships.find((m) => m.membership_id === mid)
    if (!before) return undefined
    const after: TenantMembership = { ...before, status }
    set((s) => ({
      memberships: s.memberships.map((m) =>
        m.membership_id === mid ? after : m,
      ),
    }))
    emitAuditEvent({
      event_type: status === 'ACTIVE' ? 'tenant_membership.activated' : 'tenant_membership.updated',
      actor_person_id: actor_id,
      target_entity_type: 'TenantMembership',
      target_entity_id: mid,
      company_id: before.company_id,
      before_value: { status: before.status },
      after_value: { status: after.status },
    })
    return after
  },
}))

export function listTenantMembershipsByCompany(cid: CompanyId) {
  return useTenantMembershipsStore.getState().listByCompany(cid)
}
export function listTenantMembershipsByPerson(pid: PersonId) {
  return useTenantMembershipsStore.getState().listByPerson(pid)
}
