/**
 * Mock EmergencyContact store + seed.
 *
 * Seeds emergency contacts on ~6 of the 12 members across both tenants
 * with varied phone-field combos so the UI exercises every state:
 * - all three phones present
 * - mobile-only
 * - home + mobile
 * - work + mobile
 * - and two members deliberately have NO emergency contact so the
 *   "No emergency contact on file" empty state shows in the demo.
 */

import { create } from 'zustand'
import type { EmergencyContact, EmergencyContactId } from './types'
import type { CompanyId, PersonId } from '@/types/primitives'
import { daysAgo, id, isoNow } from '@/mocks/_helpers'
import {
  PERSON_AROHA_HENARE_ID,
  PERSON_BEATRIZ_SOTO_ID,
  PERSON_LEILA_PATEL_ID,
  PERSON_MEMBER_ETHAN_VOGEL_ID,
  PERSON_MEMBER_OLIVIA_REID_ID,
  PERSON_MEMBER_ROHAN_DASS_ID,
  PERSON_MEMBER_TIMOTHY_AKINS_ID,
  PERSON_MEMBER_ZARA_HAQ_ID,
  PERSON_MEMBER_NOAH_FIELDING_ID,
} from '@/mocks/mockPersons'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from '@/mocks/mockCompanies'

function ec(suffix: string): EmergencyContactId {
  return `e0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as EmergencyContactId
}

interface SeedSpec {
  person_id: PersonId
  company_id: CompanyId
  name: string
  relationship: string
  phone_home?: string
  phone_work?: string
  phone_mobile?: string
  createdDaysAgo: number
  created_by: PersonId
}

const SPECS: SeedSpec[] = [
  // FitFlow members
  {
    person_id: PERSON_MEMBER_OLIVIA_REID_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'James Reid',
    relationship: 'Spouse',
    phone_home: '+6494442211',
    phone_mobile: '+64211990011',
    createdDaysAgo: 230,
    created_by: PERSON_AROHA_HENARE_ID,
  },
  {
    person_id: PERSON_MEMBER_NOAH_FIELDING_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'Margaret Fielding',
    relationship: 'Mother',
    phone_mobile: '+64211990022',
    createdDaysAgo: 180,
    created_by: PERSON_AROHA_HENARE_ID,
  },
  {
    person_id: PERSON_MEMBER_ETHAN_VOGEL_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'Lara Vogel',
    relationship: 'Wife',
    phone_work: '+6494445566',
    phone_mobile: '+64211990033',
    createdDaysAgo: 400,
    created_by: PERSON_LEILA_PATEL_ID,
  },
  {
    person_id: PERSON_MEMBER_ZARA_HAQ_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'Imran Haq',
    relationship: 'Father',
    phone_home: '+6494443344',
    phone_work: '+6494445599',
    phone_mobile: '+64211990044',
    createdDaysAgo: 80,
    created_by: PERSON_AROHA_HENARE_ID,
  },

  // Iron Harbor members
  {
    person_id: PERSON_MEMBER_ROHAN_DASS_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Priti Dass',
    relationship: 'Sister',
    phone_mobile: '+19175558811',
    createdDaysAgo: 300,
    created_by: PERSON_BEATRIZ_SOTO_ID,
  },
  {
    person_id: PERSON_MEMBER_TIMOTHY_AKINS_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Margot Akins',
    relationship: 'Daughter',
    phone_home: '+12125550110',
    phone_mobile: '+19175558822',
    createdDaysAgo: 240,
    created_by: PERSON_BEATRIZ_SOTO_ID,
  },
  // PERSON_MEMBER_ELLA_NGUYEN_ID and PERSON_MEMBER_AMARA_OKAFOR_ID deliberately
  // omitted so the "no emergency contact on file" empty state demos out of
  // the box.
]

const SEED_CONTACTS: EmergencyContact[] = SPECS.map((s, idx): EmergencyContact => ({
  emergency_contact_id: ec(`${idx + 1}`),
  person_id: s.person_id,
  company_id: s.company_id,
  name: s.name,
  relationship: s.relationship,
  phone_home: s.phone_home,
  phone_work: s.phone_work,
  phone_mobile: s.phone_mobile,
  created_at: daysAgo(s.createdDaysAgo),
  updated_at: daysAgo(s.createdDaysAgo),
  created_by_person_id: s.created_by,
  updated_by_person_id: s.created_by,
}))

interface EmergencyContactsStore {
  contacts: EmergencyContact[]
  list: () => EmergencyContact[]
  getByPerson: (pid: PersonId) => EmergencyContact | undefined
  create: (input: {
    person_id: PersonId
    company_id: CompanyId
    name: string
    relationship: string
    phone_home?: string
    phone_work?: string
    phone_mobile?: string
    actor_id: PersonId
  }) => EmergencyContact | { error: 'duplicate' }
  update: (
    person_id: PersonId,
    patch: {
      name?: string
      relationship?: string
      phone_home?: string
      phone_work?: string
      phone_mobile?: string
    },
    actor_id: PersonId,
  ) => EmergencyContact | undefined
}

export const useEmergencyContactsStore = create<EmergencyContactsStore>(
  (set, get) => ({
    contacts: SEED_CONTACTS,
    list: () => get().contacts,
    getByPerson: (pid) => get().contacts.find((c) => c.person_id === pid),

    create: (input) => {
      const existing = get().contacts.find((c) => c.person_id === input.person_id)
      if (existing) return { error: 'duplicate' }
      const now = isoNow()
      const next: EmergencyContact = {
        emergency_contact_id: id() as EmergencyContactId,
        person_id: input.person_id,
        company_id: input.company_id,
        name: input.name,
        relationship: input.relationship,
        phone_home: input.phone_home || undefined,
        phone_work: input.phone_work || undefined,
        phone_mobile: input.phone_mobile || undefined,
        created_at: now,
        updated_at: now,
        created_by_person_id: input.actor_id,
        updated_by_person_id: input.actor_id,
      }
      set((s) => ({ contacts: [...s.contacts, next] }))
      return next
    },

    update: (person_id, patch, actor_id) => {
      const before = get().contacts.find((c) => c.person_id === person_id)
      if (!before) return undefined
      const after: EmergencyContact = {
        ...before,
        ...Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined),
        ),
        updated_at: isoNow(),
        updated_by_person_id: actor_id,
      }
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c.person_id === person_id ? after : c,
        ),
      }))
      return after
    },
  }),
)

export function getEmergencyContactByPerson(
  pid: PersonId,
): EmergencyContact | undefined {
  return useEmergencyContactsStore.getState().getByPerson(pid)
}
