/**
 * Mock Persons — global identity (UUM §2.1).
 *
 * Cast designed so every role-code in UUM §2.5 is held by at least one person
 * across at least two locations. Members are spread across all five active
 * locations (Boulder excluded — its BE has no bank config, so commerce
 * demos there are blocked by design).
 *
 * Bootstrap default actor for the dev mode is Leila Patel — LOCATION_MANAGER
 * at FitFlow Auckland Central. Operationally rich, sidebar-busy, and exercises
 * scope-level (LOCATION) RoleAssignments out of the gate.
 */

import { create } from 'zustand'
import type { Person, PersonId, PersonStatus, PersonType } from '@/types/primitives'
import { daysAgo, id, isoDate, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'

// ──────────────────────────────────────────────────────────────────────────────
// Stable IDs — staff first (referenced from RoleAssignment seed), then members.
// ──────────────────────────────────────────────────────────────────────────────

// FitFlow Pacific staff
export const PERSON_SARAH_CHEN_ID = 'p0000001-0000-0000-0000-000000000001' as PersonId
export const PERSON_MARCUS_WILLIAMS_ID = 'p0000001-0000-0000-0000-000000000002' as PersonId
export const PERSON_PRIYA_NAIR_ID = 'p0000001-0000-0000-0000-000000000003' as PersonId
export const PERSON_DAVID_KIM_ID = 'p0000001-0000-0000-0000-000000000004' as PersonId
export const PERSON_HANA_TANE_ID = 'p0000001-0000-0000-0000-000000000005' as PersonId
export const PERSON_LEILA_PATEL_ID = 'p0000001-0000-0000-0000-000000000006' as PersonId
export const PERSON_TAMA_REWETI_ID = 'p0000001-0000-0000-0000-000000000007' as PersonId
export const PERSON_AROHA_HENARE_ID = 'p0000001-0000-0000-0000-000000000008' as PersonId
export const PERSON_JAMIE_COOPER_ID = 'p0000001-0000-0000-0000-000000000009' as PersonId
export const PERSON_TE_AROHA_MANAAKI_ID = 'p0000001-0000-0000-0000-000000000010' as PersonId
export const PERSON_LIAM_OBRIEN_ID = 'p0000001-0000-0000-0000-000000000011' as PersonId
export const PERSON_MIRA_FERNANDES_ID = 'p0000001-0000-0000-0000-000000000012' as PersonId
export const PERSON_NIKOLAI_PETROV_ID = 'p0000001-0000-0000-0000-000000000013' as PersonId
export const PERSON_ELEANOR_WHITFORD_ID = 'p0000001-0000-0000-0000-000000000014' as PersonId

// Iron Harbor staff
export const PERSON_MADELINE_FOSTER_ID = 'p0000001-0000-0000-0000-000000000020' as PersonId
export const PERSON_DEVON_BROOKS_ID = 'p0000001-0000-0000-0000-000000000021' as PersonId
export const PERSON_CAMILLE_LAURENT_ID = 'p0000001-0000-0000-0000-000000000022' as PersonId
export const PERSON_ANDREW_PHAM_ID = 'p0000001-0000-0000-0000-000000000023' as PersonId
export const PERSON_REGGIE_THOMPSON_ID = 'p0000001-0000-0000-0000-000000000024' as PersonId
export const PERSON_BEATRIZ_SOTO_ID = 'p0000001-0000-0000-0000-000000000025' as PersonId
export const PERSON_CLAIRE_DONNELLY_ID = 'p0000001-0000-0000-0000-000000000026' as PersonId
export const PERSON_MEI_TANAKA_ID = 'p0000001-0000-0000-0000-000000000027' as PersonId
export const PERSON_OWEN_DAVIES_ID = 'p0000001-0000-0000-0000-000000000028' as PersonId
export const PERSON_KOFI_MENSAH_ID = 'p0000001-0000-0000-0000-000000000029' as PersonId
export const PERSON_YUKI_BRENNAN_ID = 'p0000001-0000-0000-0000-000000000030' as PersonId

// Cross-tenant / system
export const PERSON_AVERY_KIM_PLATFORM_ID =
  'p0000001-0000-0000-0000-000000000099' as PersonId

// Members (mix of NZ + US)
export const PERSON_MEMBER_OLIVIA_REID_ID = 'p0000001-0000-0000-0000-000000000041' as PersonId
export const PERSON_MEMBER_NOAH_FIELDING_ID = 'p0000001-0000-0000-0000-000000000042' as PersonId
export const PERSON_MEMBER_AMARA_OKAFOR_ID = 'p0000001-0000-0000-0000-000000000043' as PersonId
export const PERSON_MEMBER_ETHAN_VOGEL_ID = 'p0000001-0000-0000-0000-000000000044' as PersonId
export const PERSON_MEMBER_ZARA_HAQ_ID = 'p0000001-0000-0000-0000-000000000045' as PersonId
export const PERSON_MEMBER_ROHAN_DASS_ID = 'p0000001-0000-0000-0000-000000000046' as PersonId
export const PERSON_MEMBER_LUCIA_RIVERA_ID = 'p0000001-0000-0000-0000-000000000047' as PersonId
export const PERSON_MEMBER_TIMOTHY_AKINS_ID = 'p0000001-0000-0000-0000-000000000048' as PersonId
export const PERSON_MEMBER_ELLA_NGUYEN_ID = 'p0000001-0000-0000-0000-000000000049' as PersonId
export const PERSON_MEMBER_HARPER_LINDQVIST_ID =
  'p0000001-0000-0000-0000-000000000050' as PersonId

// Guardian + minor pair
export const PERSON_GUARDIAN_RACHEL_BAILEY_ID =
  'p0000001-0000-0000-0000-000000000061' as PersonId
export const PERSON_MINOR_FINN_BAILEY_ID =
  'p0000001-0000-0000-0000-000000000062' as PersonId

// Pending-invite staff (no RoleAssignment yet — see mockTenantMemberships).
export const PERSON_INVITED_BRYN_HALLOWAY_ID =
  'p0000001-0000-0000-0000-000000000071' as PersonId

interface PersonSpec {
  person_id: PersonId
  type: PersonType
  given_name: string
  family_name: string
  dob?: [number, number, number] // [y, m, d]
  email?: string
  phone?: string
  status?: PersonStatus
  /** Days ago the record was created. */
  createdDaysAgo: number
  /** Days ago the last update happened. Defaults to createdDaysAgo. */
  updatedDaysAgo?: number
  identity_photo_status?: Person['identity_photo_status']
}

const SPECS: PersonSpec[] = [
  // ── FitFlow Pacific staff ─────────────────────────────────────────────────
  { person_id: PERSON_SARAH_CHEN_ID, type: 'STAFF', given_name: 'Sarah', family_name: 'Chen', email: 'sarah.chen@fitflow.co.nz', phone: '+64211234567', createdDaysAgo: 410, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_MARCUS_WILLIAMS_ID, type: 'STAFF', given_name: 'Marcus', family_name: 'Williams', email: 'marcus.williams@fitflow.co.nz', phone: '+64211234568', createdDaysAgo: 408, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_PRIYA_NAIR_ID, type: 'STAFF', given_name: 'Priya', family_name: 'Nair', email: 'priya.nair@fitflow.co.nz', phone: '+64211234569', createdDaysAgo: 380, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_DAVID_KIM_ID, type: 'STAFF', given_name: 'David', family_name: 'Kim', email: 'david.kim@fitflow.co.nz', phone: '+64211234570', createdDaysAgo: 360, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_HANA_TANE_ID, type: 'STAFF', given_name: 'Hana', family_name: 'Tane', email: 'hana.tane@fitflow.co.nz', phone: '+64211234571', createdDaysAgo: 350, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_LEILA_PATEL_ID, type: 'STAFF', given_name: 'Leila', family_name: 'Patel', email: 'leila.patel@fitflow.co.nz', phone: '+64211234572', createdDaysAgo: 320, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_TAMA_REWETI_ID, type: 'STAFF', given_name: 'Tama', family_name: 'Reweti', email: 'tama.reweti@fitflow.co.nz', phone: '+64211234573', createdDaysAgo: 305, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_AROHA_HENARE_ID, type: 'STAFF', given_name: 'Aroha', family_name: 'Henare', email: 'aroha.henare@fitflow.co.nz', phone: '+64211234574', createdDaysAgo: 240, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_JAMIE_COOPER_ID, type: 'STAFF', given_name: 'Jamie', family_name: 'Cooper', email: 'jamie.cooper@fitflow.co.nz', phone: '+64211234575', createdDaysAgo: 210, identity_photo_status: 'PENDING_REVIEW' },
  { person_id: PERSON_TE_AROHA_MANAAKI_ID, type: 'STAFF', given_name: 'Te Aroha', family_name: 'Manaaki', email: 'tearoha.manaaki@fitflow.co.nz', phone: '+64211234576', createdDaysAgo: 195, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_LIAM_OBRIEN_ID, type: 'STAFF', given_name: "Liam", family_name: "O'Brien", email: 'liam.obrien@fitflow.co.nz', phone: '+64211234577', createdDaysAgo: 290, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_MIRA_FERNANDES_ID, type: 'STAFF', given_name: 'Mira', family_name: 'Fernandes', email: 'mira.fernandes@fitflow.co.nz', phone: '+64211234578', createdDaysAgo: 270, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_NIKOLAI_PETROV_ID, type: 'STAFF', given_name: 'Nikolai', family_name: 'Petrov', email: 'nikolai.petrov@fitflow.co.nz', phone: '+64211234579', createdDaysAgo: 260, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_ELEANOR_WHITFORD_ID, type: 'STAFF', given_name: 'Eleanor', family_name: 'Whitford', email: 'eleanor.whitford@fitflow.co.nz', phone: '+64211234580', createdDaysAgo: 200, identity_photo_status: 'ACTIVE' },

  // ── Iron Harbor staff ─────────────────────────────────────────────────────
  { person_id: PERSON_MADELINE_FOSTER_ID, type: 'STAFF', given_name: 'Madeline', family_name: 'Foster', email: 'madeline.foster@ironharbor.com', phone: '+19175550111', createdDaysAgo: 360, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_DEVON_BROOKS_ID, type: 'STAFF', given_name: 'Devon', family_name: 'Brooks', email: 'devon.brooks@ironharbor.com', phone: '+19175550112', createdDaysAgo: 355, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_CAMILLE_LAURENT_ID, type: 'STAFF', given_name: 'Camille', family_name: 'Laurent', email: 'camille.laurent@ironharbor.com', phone: '+19175550113', createdDaysAgo: 340, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_ANDREW_PHAM_ID, type: 'STAFF', given_name: 'Andrew', family_name: 'Pham', email: 'andrew.pham@ironharbor.com', phone: '+19175550114', createdDaysAgo: 320, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_REGGIE_THOMPSON_ID, type: 'STAFF', given_name: 'Reggie', family_name: 'Thompson', email: 'reggie.thompson@ironharbor.com', phone: '+19175550115', createdDaysAgo: 300, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_BEATRIZ_SOTO_ID, type: 'STAFF', given_name: 'Beatriz', family_name: 'Soto', email: 'beatriz.soto@ironharbor.com', phone: '+19175550116', createdDaysAgo: 280, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_CLAIRE_DONNELLY_ID, type: 'STAFF', given_name: 'Claire', family_name: 'Donnelly', email: 'claire.donnelly@ironharbor.com', phone: '+19175550117', createdDaysAgo: 165, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_MEI_TANAKA_ID, type: 'STAFF', given_name: 'Mei', family_name: 'Tanaka', email: 'mei.tanaka@ironharbor.com', phone: '+19175550118', createdDaysAgo: 220, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_OWEN_DAVIES_ID, type: 'STAFF', given_name: 'Owen', family_name: 'Davies', email: 'owen.davies@ironharbor.com', phone: '+19175550119', createdDaysAgo: 180, identity_photo_status: 'PENDING_REVIEW' },
  { person_id: PERSON_KOFI_MENSAH_ID, type: 'STAFF', given_name: 'Kofi', family_name: 'Mensah', email: 'kofi.mensah@ironharbor.com', phone: '+19175550120', createdDaysAgo: 240, identity_photo_status: 'ACTIVE' },
  { person_id: PERSON_YUKI_BRENNAN_ID, type: 'STAFF', given_name: 'Yuki', family_name: 'Brennan', email: 'yuki.brennan@ironharbor.com', phone: '+19175550121', createdDaysAgo: 250, identity_photo_status: 'ACTIVE' },

  // ── Platform support ──────────────────────────────────────────────────────
  { person_id: PERSON_AVERY_KIM_PLATFORM_ID, type: 'STAFF', given_name: 'Avery', family_name: 'Kim', email: 'avery.kim@fitflow-platform.com', phone: '+14155550199', createdDaysAgo: 500, identity_photo_status: 'ACTIVE' },

  // ── Members (FitFlow Pacific) ─────────────────────────────────────────────
  { person_id: PERSON_MEMBER_OLIVIA_REID_ID, type: 'MEMBER', given_name: 'Olivia', family_name: 'Reid', dob: [1992, 6, 14], email: 'olivia.reid@example.com', phone: '+64212223301', createdDaysAgo: 240 },
  { person_id: PERSON_MEMBER_NOAH_FIELDING_ID, type: 'MEMBER', given_name: 'Noah', family_name: 'Fielding', dob: [1988, 11, 3], email: 'noah.fielding@example.com', phone: '+64212223302', createdDaysAgo: 215 },
  { person_id: PERSON_MEMBER_AMARA_OKAFOR_ID, type: 'MEMBER', given_name: 'Amara', family_name: 'Okafor', dob: [1995, 3, 22], email: 'amara.okafor@example.com', phone: '+64212223303', createdDaysAgo: 180 },
  { person_id: PERSON_MEMBER_ETHAN_VOGEL_ID, type: 'MEMBER', given_name: 'Ethan', family_name: 'Vogel', dob: [1979, 9, 8], email: 'ethan.vogel@example.com', phone: '+64212223304', createdDaysAgo: 410 },
  { person_id: PERSON_MEMBER_ZARA_HAQ_ID, type: 'MEMBER', given_name: 'Zara', family_name: 'Haq', dob: [2001, 1, 30], email: 'zara.haq@example.com', phone: '+64212223305', createdDaysAgo: 95 },

  // ── Members (Iron Harbor) ─────────────────────────────────────────────────
  { person_id: PERSON_MEMBER_ROHAN_DASS_ID, type: 'MEMBER', given_name: 'Rohan', family_name: 'Dass', dob: [1985, 4, 12], email: 'rohan.dass@example.com', phone: '+19175552201', createdDaysAgo: 320 },
  { person_id: PERSON_MEMBER_LUCIA_RIVERA_ID, type: 'MEMBER', given_name: 'Lucía', family_name: 'Rivera', dob: [1991, 8, 19], email: 'lucia.rivera@example.com', phone: '+19175552202', createdDaysAgo: 290 },
  { person_id: PERSON_MEMBER_TIMOTHY_AKINS_ID, type: 'MEMBER', given_name: 'Timothy', family_name: 'Akins', dob: [1972, 2, 5], email: 'timothy.akins@example.com', phone: '+19175552203', createdDaysAgo: 245 },
  { person_id: PERSON_MEMBER_ELLA_NGUYEN_ID, type: 'MEMBER', given_name: 'Ella', family_name: 'Nguyen', dob: [1998, 10, 17], email: 'ella.nguyen@example.com', phone: '+19175552204', createdDaysAgo: 130 },
  { person_id: PERSON_MEMBER_HARPER_LINDQVIST_ID, type: 'MEMBER', given_name: 'Harper', family_name: 'Lindqvist', dob: [1986, 12, 2], email: 'harper.lindqvist@example.com', phone: '+19175552205', createdDaysAgo: 75 },

  // ── Guardian + minor pair (NZ) ────────────────────────────────────────────
  { person_id: PERSON_GUARDIAN_RACHEL_BAILEY_ID, type: 'GUARDIAN', given_name: 'Rachel', family_name: 'Bailey', dob: [1984, 5, 9], email: 'rachel.bailey@example.com', phone: '+64212223399', createdDaysAgo: 60 },
  { person_id: PERSON_MINOR_FINN_BAILEY_ID, type: 'MEMBER', given_name: 'Finn', family_name: 'Bailey', dob: [2014, 7, 21], createdDaysAgo: 60 },

  // ── Pending invite (Iron Harbor) ──────────────────────────────────────────
  { person_id: PERSON_INVITED_BRYN_HALLOWAY_ID, type: 'STAFF', given_name: 'Bryn', family_name: 'Halloway', email: 'bryn.halloway@ironharbor.com', createdDaysAgo: 1 },
]

function specToPerson(spec: PersonSpec): Person {
  const dob = spec.dob ? isoDate(spec.dob[0], spec.dob[1], spec.dob[2]) : undefined
  const isMinor = dob ? new Date('2026-05-06').getUTCFullYear() - spec.dob![0] < 18 : undefined
  return {
    person_id: spec.person_id,
    person_type: spec.type,
    given_name: spec.given_name,
    family_name: spec.family_name,
    date_of_birth: dob,
    is_minor: isMinor,
    primary_email: spec.email,
    primary_phone: spec.phone,
    identity_photo_status: spec.identity_photo_status ?? 'NONE',
    status: spec.status ?? 'ACTIVE',
    created_at: daysAgo(spec.createdDaysAgo),
    updated_at: daysAgo(spec.updatedDaysAgo ?? spec.createdDaysAgo),
  }
}

export const seedPersons: Person[] = SPECS.map(specToPerson)

interface PersonsStore {
  persons: Person[]
  list: () => Person[]
  listByType: (t: PersonType) => Person[]
  getById: (pid: PersonId) => Person | undefined
  create: (
    input: Omit<Person, 'person_id' | 'created_at' | 'updated_at' | 'status'> &
      Partial<Pick<Person, 'status'>>,
    actor_id: PersonId,
    company_id: import('@/types/primitives').CompanyId,
  ) => Person
  update: (
    pid: PersonId,
    patch: Partial<Omit<Person, 'person_id' | 'created_at'>>,
    actor_id: PersonId,
    company_id: import('@/types/primitives').CompanyId,
  ) => Person | undefined
  setStatus: (
    pid: PersonId,
    status: PersonStatus,
    actor_id: PersonId,
    company_id: import('@/types/primitives').CompanyId,
  ) => Person | undefined
}

export const usePersonsStore = create<PersonsStore>((set, get) => ({
  persons: seedPersons,
  list: () => get().persons,
  listByType: (t) => get().persons.filter((p) => p.person_type === t),
  getById: (pid) => get().persons.find((p) => p.person_id === pid),

  create: (input, actor_id, company_id) => {
    const now = isoNow()
    const person: Person = {
      ...input,
      person_id: id() as PersonId,
      status: input.status ?? 'ACTIVE',
      created_at: now,
      updated_at: now,
    }
    set((s) => ({ persons: [...s.persons, person] }))
    emitAuditEvent({
      event_type: 'person.created',
      actor_person_id: actor_id,
      target_entity_type: 'Person',
      target_entity_id: person.person_id,
      company_id,
      after_value: { person_type: person.person_type },
    })
    return person
  },

  update: (pid, patch, actor_id, company_id) => {
    const before = get().persons.find((p) => p.person_id === pid)
    if (!before) return undefined
    const after: Person = { ...before, ...patch, updated_at: isoNow() }
    set((s) => ({
      persons: s.persons.map((p) => (p.person_id === pid ? after : p)),
    }))
    emitAuditEvent({
      event_type: 'person.updated',
      actor_person_id: actor_id,
      target_entity_type: 'Person',
      target_entity_id: pid,
      company_id,
      before_value: { status: before.status },
      after_value: { status: after.status },
    })
    return after
  },

  setStatus: (pid, status, actor_id, company_id) => {
    return get().update(pid, { status }, actor_id, company_id)
  },
}))

export function listPersons() {
  return usePersonsStore.getState().list()
}
export function getPersonById(pid: PersonId) {
  return usePersonsStore.getState().getById(pid)
}

/** Default bootstrap actor for the prototype's auth context. */
export const DEFAULT_BOOTSTRAP_PERSON_ID = PERSON_LEILA_PATEL_ID
export const DEFAULT_BOOTSTRAP_COMPANY_ID = COMPANY_FITFLOW_PACIFIC_ID

// Force-import COMPANY_IRON_HARBOR_ID so the constant is reachable downstream.
void COMPANY_IRON_HARBOR_ID
