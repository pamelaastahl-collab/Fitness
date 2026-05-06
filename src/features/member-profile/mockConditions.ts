/**
 * Mock ConditionType + MemberCondition stores.
 *
 * ConditionType: company-scoped lookup. Configure-condition-types story
 * (US-MPE-006) is deferred — these are hardcoded canonical defaults.
 *
 * MemberCondition: per-(person, type) records. The FRD specifies a unique
 * constraint on (person, type, is_active=true) — enforced in `add` here.
 *
 * Auto-deactivation on expiry: real implementation runs nightly. Prototype
 * does it lazily on read in `listActiveByPerson` so demo isn't gated on a
 * scheduler.
 */

import { create } from 'zustand'
import type {
  ConditionSeverity,
  ConditionType,
  ConditionTypeId,
  MemberCondition,
  MemberConditionId,
} from './types'
import type { CompanyId, IsoDate, PersonId } from '@/types/primitives'
import { daysAgo, id, isoDate, isoNow } from '@/mocks/_helpers'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from '@/mocks/mockCompanies'
import {
  PERSON_AROHA_HENARE_ID,
  PERSON_BEATRIZ_SOTO_ID,
  PERSON_LEILA_PATEL_ID,
  PERSON_MEMBER_AMARA_OKAFOR_ID,
  PERSON_MEMBER_ELLA_NGUYEN_ID,
  PERSON_MEMBER_ETHAN_VOGEL_ID,
  PERSON_MEMBER_HARPER_LINDQVIST_ID,
  PERSON_MEMBER_NOAH_FIELDING_ID,
  PERSON_MEMBER_OLIVIA_REID_ID,
  PERSON_MEMBER_ROHAN_DASS_ID,
  PERSON_MEMBER_TIMOTHY_AKINS_ID,
} from '@/mocks/mockPersons'

// ──────────────────────────────────────────────────────────────────────────────
// ConditionType seed — same canonical list per tenant (real config is per-tenant)
// ──────────────────────────────────────────────────────────────────────────────

interface CtSpec {
  code: string
  label: string
  severity: ConditionSeverity
}

const CT_SPECS: CtSpec[] = [
  { code: 'ALLERGY_NUTS', label: 'Tree nut allergy', severity: 'ALERT' },
  { code: 'HEART_CONDITION', label: 'Cardiac condition — physician clearance recommended', severity: 'ALERT' },
  { code: 'EPILEPSY', label: 'Epilepsy / seizure history', severity: 'ALERT' },
  { code: 'ASTHMA', label: 'Asthma', severity: 'WARNING' },
  { code: 'ALLERGY_DAIRY', label: 'Dairy allergy', severity: 'WARNING' },
  { code: 'PREGNANCY', label: 'Pregnancy — modified exercise required', severity: 'WARNING' },
  { code: 'POST_SURGERY_RECOVERY', label: 'Post-surgery recovery', severity: 'WARNING' },
  { code: 'PREVIOUS_INJURY_BACK', label: 'Previous back injury', severity: 'INFORMATIONAL' },
  { code: 'PREVIOUS_INJURY_KNEE', label: 'Previous knee injury', severity: 'INFORMATIONAL' },
  { code: 'PREVIOUS_INJURY_SHOULDER', label: 'Previous shoulder injury', severity: 'INFORMATIONAL' },
  { code: 'DIABETES_T2', label: 'Type 2 diabetes', severity: 'INFORMATIONAL' },
  { code: 'HYPERTENSION', label: 'High blood pressure', severity: 'INFORMATIONAL' },
  { code: 'VISION_IMPAIRED', label: 'Visual impairment', severity: 'INFORMATIONAL' },
  { code: 'HEARING_IMPAIRED', label: 'Hearing impairment', severity: 'INFORMATIONAL' },
]

function ctId(company: CompanyId, code: string): ConditionTypeId {
  // Stable derived ID per (company, code) — keeps seed deterministic.
  const tenant = company.startsWith('c0000001') ? 'ff' : 'ih'
  const slug = code.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16).padEnd(16, '0')
  return `t0000001-0000-${tenant}00-0000-${slug}` as ConditionTypeId
}

function buildSeedTypes(company: CompanyId): ConditionType[] {
  return CT_SPECS.map((s) => ({
    condition_type_id: ctId(company, s.code),
    company_id: company,
    code: s.code,
    label: s.label,
    severity: s.severity,
    is_active: true,
  }))
}

const SEED_CONDITION_TYPES: ConditionType[] = [
  ...buildSeedTypes(COMPANY_FITFLOW_PACIFIC_ID),
  ...buildSeedTypes(COMPANY_IRON_HARBOR_ID),
]

// ──────────────────────────────────────────────────────────────────────────────
// MemberCondition seed
// ──────────────────────────────────────────────────────────────────────────────

interface McSpec {
  person_id: PersonId
  company_id: CompanyId
  code: string
  note?: string
  appliedDaysAgo: number
  applied_by: PersonId
  /** [year, month, day] — past dates auto-deactivate on read; future dates remain active. */
  expiry_date?: [number, number, number]
  /** Force inactive (e.g. manually deactivated). */
  is_active?: boolean
  deactivatedDaysAgo?: number
  deactivated_by?: PersonId
}

const MC_SPECS: McSpec[] = [
  // Olivia Reid — ALERT (heart condition) + INFORMATIONAL (back injury)
  {
    person_id: PERSON_MEMBER_OLIVIA_REID_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    code: 'HEART_CONDITION',
    note: 'Mitral valve prolapse — cleared by cardiologist Mar 2025. No high-intensity intervals.',
    appliedDaysAgo: 215,
    applied_by: PERSON_AROHA_HENARE_ID,
  },
  {
    person_id: PERSON_MEMBER_OLIVIA_REID_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    code: 'PREVIOUS_INJURY_BACK',
    note: 'L4-L5 disc bulge — avoid loaded spinal flexion.',
    appliedDaysAgo: 200,
    applied_by: PERSON_AROHA_HENARE_ID,
  },

  // Noah Fielding — WARNING (asthma) + manually deactivated previous injury
  {
    person_id: PERSON_MEMBER_NOAH_FIELDING_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    code: 'ASTHMA',
    note: 'Carries inhaler. Cold-air sessions can trigger.',
    appliedDaysAgo: 180,
    applied_by: PERSON_AROHA_HENARE_ID,
  },
  {
    person_id: PERSON_MEMBER_NOAH_FIELDING_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    code: 'PREVIOUS_INJURY_SHOULDER',
    note: 'Resolved.',
    appliedDaysAgo: 160,
    applied_by: PERSON_AROHA_HENARE_ID,
    is_active: false,
    deactivatedDaysAgo: 30,
    deactivated_by: PERSON_LEILA_PATEL_ID,
  },

  // Amara Okafor — WARNING (pregnancy) with future expiry
  {
    person_id: PERSON_MEMBER_AMARA_OKAFOR_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    code: 'PREGNANCY',
    note: 'Second trimester. Modified exercises only — no supine after Mar 1.',
    appliedDaysAgo: 60,
    applied_by: PERSON_AROHA_HENARE_ID,
    expiry_date: [2026, 9, 30],
  },

  // Ethan Vogel — INFORMATIONAL (hypertension)
  {
    person_id: PERSON_MEMBER_ETHAN_VOGEL_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    code: 'HYPERTENSION',
    appliedDaysAgo: 350,
    applied_by: PERSON_LEILA_PATEL_ID,
  },

  // Iron Harbor — Rohan Dass — ALERT (epilepsy) + WARNING (post-surgery, expired)
  {
    person_id: PERSON_MEMBER_ROHAN_DASS_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    code: 'EPILEPSY',
    note: 'Last seizure 2023. On medication.',
    appliedDaysAgo: 305,
    applied_by: PERSON_BEATRIZ_SOTO_ID,
  },
  {
    person_id: PERSON_MEMBER_ROHAN_DASS_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    code: 'POST_SURGERY_RECOVERY',
    note: 'Knee meniscus repair Sept 2025. PT clearance required for plyometrics.',
    appliedDaysAgo: 200,
    applied_by: PERSON_BEATRIZ_SOTO_ID,
    // Past expiry — auto-deactivated lazily on read
    expiry_date: [2026, 3, 15],
  },

  // Timothy Akins — INFORMATIONAL (diabetes + knee)
  {
    person_id: PERSON_MEMBER_TIMOTHY_AKINS_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    code: 'DIABETES_T2',
    appliedDaysAgo: 240,
    applied_by: PERSON_BEATRIZ_SOTO_ID,
  },
  {
    person_id: PERSON_MEMBER_TIMOTHY_AKINS_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    code: 'PREVIOUS_INJURY_KNEE',
    appliedDaysAgo: 240,
    applied_by: PERSON_BEATRIZ_SOTO_ID,
  },

  // Ella Nguyen — ALERT nut allergy (no other context — exercises clean ALERT-prominence demo)
  {
    person_id: PERSON_MEMBER_ELLA_NGUYEN_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    code: 'ALLERGY_NUTS',
    note: 'Anaphylactic. EpiPen at front desk.',
    appliedDaysAgo: 125,
    applied_by: PERSON_BEATRIZ_SOTO_ID,
  },

  // Harper Lindqvist — INFORMATIONAL (vision)
  {
    person_id: PERSON_MEMBER_HARPER_LINDQVIST_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    code: 'VISION_IMPAIRED',
    note: 'Low vision in left eye. Provide verbal cues during class.',
    appliedDaysAgo: 70,
    applied_by: PERSON_BEATRIZ_SOTO_ID,
  },
]

function mc(suffix: string): MemberConditionId {
  return `m1000001-0000-0000-0000-${suffix.padStart(12, '0')}` as MemberConditionId
}

const SEED_MEMBER_CONDITIONS: MemberCondition[] = MC_SPECS.map(
  (s, idx): MemberCondition => ({
    member_condition_id: mc(`${idx + 1}`),
    person_id: s.person_id,
    company_id: s.company_id,
    condition_type_id: ctId(s.company_id, s.code),
    is_active: s.is_active ?? true,
    note: s.note,
    expiry_date: s.expiry_date
      ? isoDate(s.expiry_date[0], s.expiry_date[1], s.expiry_date[2])
      : undefined,
    applied_at: daysAgo(s.appliedDaysAgo),
    applied_by_person_id: s.applied_by,
    deactivated_at:
      s.deactivatedDaysAgo !== undefined
        ? daysAgo(s.deactivatedDaysAgo)
        : undefined,
    deactivated_by_person_id: s.deactivated_by,
  }),
)

// ──────────────────────────────────────────────────────────────────────────────
// Stores
// ──────────────────────────────────────────────────────────────────────────────

interface ConditionTypesStore {
  types: ConditionType[]
  list: () => ConditionType[]
  listByCompany: (cid: CompanyId) => ConditionType[]
  getById: (tid: ConditionTypeId) => ConditionType | undefined
}

export const useConditionTypesStore = create<ConditionTypesStore>(
  (_set, get) => ({
    types: SEED_CONDITION_TYPES,
    list: () => get().types,
    listByCompany: (cid) =>
      get().types.filter((t) => t.company_id === cid && t.is_active),
    getById: (tid) => get().types.find((t) => t.condition_type_id === tid),
  }),
)

const NOW_ISO_DATE: IsoDate = isoNow().slice(0, 10) as IsoDate

interface MemberConditionsStore {
  conditions: MemberCondition[]
  /** Returns active conditions, lazily auto-deactivating any past-expiry. */
  listActiveByPerson: (pid: PersonId) => MemberCondition[]
  listHistoricalByPerson: (pid: PersonId) => MemberCondition[]
  add: (input: {
    person_id: PersonId
    company_id: CompanyId
    condition_type_id: ConditionTypeId
    note?: string
    expiry_date?: IsoDate
    actor_id: PersonId
  }) => MemberCondition | { error: 'duplicate' }
  deactivate: (
    member_condition_id: MemberConditionId,
    actor_id: PersonId,
  ) => MemberCondition | undefined
}

export const useMemberConditionsStore = create<MemberConditionsStore>(
  (set, get) => ({
    conditions: SEED_MEMBER_CONDITIONS,

    listActiveByPerson: (pid) =>
      get().conditions.filter((c) => {
        if (c.person_id !== pid) return false
        if (!c.is_active) return false
        if (c.expiry_date && c.expiry_date <= NOW_ISO_DATE) return false
        return true
      }),

    listHistoricalByPerson: (pid) =>
      get().conditions.filter((c) => {
        if (c.person_id !== pid) return false
        // Inactive OR expired
        if (!c.is_active) return true
        if (c.expiry_date && c.expiry_date <= NOW_ISO_DATE) return true
        return false
      }),

    add: (input) => {
      const dup = get().conditions.find(
        (c) =>
          c.person_id === input.person_id &&
          c.condition_type_id === input.condition_type_id &&
          c.is_active &&
          (!c.expiry_date || c.expiry_date > NOW_ISO_DATE),
      )
      if (dup) return { error: 'duplicate' }
      const next: MemberCondition = {
        member_condition_id: id() as MemberConditionId,
        person_id: input.person_id,
        company_id: input.company_id,
        condition_type_id: input.condition_type_id,
        is_active: true,
        note: input.note,
        expiry_date: input.expiry_date,
        applied_at: isoNow(),
        applied_by_person_id: input.actor_id,
      }
      set((s) => ({ conditions: [...s.conditions, next] }))
      return next
    },

    deactivate: (mcid, actor_id) => {
      const before = get().conditions.find((c) => c.member_condition_id === mcid)
      if (!before || !before.is_active) return undefined
      const after: MemberCondition = {
        ...before,
        is_active: false,
        deactivated_at: isoNow(),
        deactivated_by_person_id: actor_id,
      }
      set((s) => ({
        conditions: s.conditions.map((c) =>
          c.member_condition_id === mcid ? after : c,
        ),
      }))
      return after
    },
  }),
)

export function listConditionTypesByCompany(
  cid: CompanyId,
): ConditionType[] {
  return useConditionTypesStore.getState().listByCompany(cid)
}
export function getConditionTypeById(
  tid: ConditionTypeId,
): ConditionType | undefined {
  return useConditionTypesStore.getState().getById(tid)
}
