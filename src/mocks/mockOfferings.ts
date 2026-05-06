/**
 * Mock Offerings — stable product identity (UOM §3.1).
 *
 * Nine offerings across both tenants, covering all seven offering types at
 * least once. Status is one of DRAFT | PUBLISHED | RETIRED on the *parent*
 * Offering — the runtime contract (immutability) lives on OfferingVersion.
 *
 * Notable seed shapes:
 *   - All-Access Membership (Iron Harbor) carries three versions (v1+v2
 *     RETIRED, v3 PUBLISHED) so the Day 4 publish flow can demo immutable
 *     version history.
 *   - PT 1:1 Session is DRAFT — a candidate for the F4 publish demo.
 *   - Boulder Day Pass is a DRAFT targeting Iron Harbor Mountain, whose BE
 *     has no bank/tax config — F4 surfaces the XPI-CAT-03 block.
 */

import { create } from 'zustand'
import type {
  CompanyId,
  Offering,
  OfferingId,
  OfferingStatus,
  OfferingType,
  PersonId,
} from '@/types/primitives'
import { daysAgo, id, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'
import {
  PERSON_MADELINE_FOSTER_ID,
  PERSON_SARAH_CHEN_ID,
} from './mockPersons'

export const OFFERING_FF_UNLIMITED_MEMBERSHIP_ID =
  'o0000001-0000-0000-0000-000000000001' as OfferingId
export const OFFERING_FF_HEATED_VINYASA_ID =
  'o0000001-0000-0000-0000-000000000002' as OfferingId
export const OFFERING_FF_REFORMER_8PACK_ID =
  'o0000001-0000-0000-0000-000000000003' as OfferingId
export const OFFERING_FF_BRAND_TEE_ID =
  'o0000001-0000-0000-0000-000000000004' as OfferingId
export const OFFERING_FF_PT_SESSION_ID =
  'o0000001-0000-0000-0000-000000000005' as OfferingId
export const OFFERING_IH_ALL_ACCESS_ID =
  'o0000001-0000-0000-0000-000000000010' as OfferingId
export const OFFERING_IH_LAP_LANE_ID =
  'o0000001-0000-0000-0000-000000000011' as OfferingId
export const OFFERING_IH_GIFT_CARD_ID =
  'o0000001-0000-0000-0000-000000000012' as OfferingId
export const OFFERING_IH_FUNCTIONAL_STRENGTH_ID =
  'o0000001-0000-0000-0000-000000000013' as OfferingId
export const OFFERING_IH_BOULDER_DAY_PASS_ID =
  'o0000001-0000-0000-0000-000000000014' as OfferingId

interface OfferingSpec {
  offering_id: OfferingId
  company_id: CompanyId
  offering_type: OfferingType
  name: string
  description: string
  status: OfferingStatus
  created_by: PersonId
  createdDaysAgo: number
}

const SPECS: OfferingSpec[] = [
  {
    offering_id: OFFERING_FF_UNLIMITED_MEMBERSHIP_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    offering_type: 'MEMBERSHIP',
    name: 'Unlimited Membership — Monthly',
    description: 'All-access monthly membership across all FitFlow Pacific locations.',
    status: 'PUBLISHED',
    created_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 380,
  },
  {
    offering_id: OFFERING_FF_HEATED_VINYASA_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    offering_type: 'CLASS',
    name: 'Heated Vinyasa Yoga (60 min)',
    description: 'Heated flow class. Capacity 24. Drop-in or membership-eligible.',
    status: 'PUBLISHED',
    created_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 290,
  },
  {
    offering_id: OFFERING_FF_REFORMER_8PACK_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    offering_type: 'PACKAGE_CREDIT_PACK',
    name: 'Reformer Pilates 8-pack',
    description: 'Eight reformer credits. 90-day expiry. Auckland Pilates studio only.',
    status: 'PUBLISHED',
    created_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 230,
  },
  {
    offering_id: OFFERING_FF_BRAND_TEE_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    offering_type: 'RETAIL',
    name: 'FitFlow Brand Tee',
    description: 'Organic cotton tee. Sizes XS–XXL. Black or stone.',
    status: 'PUBLISHED',
    created_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 200,
  },
  {
    offering_id: OFFERING_FF_PT_SESSION_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    offering_type: 'APPOINTMENT',
    name: 'Personal Training — 1:1 (60 min)',
    description: 'One-on-one coaching session with a certified trainer.',
    status: 'DRAFT',
    created_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 14,
  },
  {
    offering_id: OFFERING_IH_ALL_ACCESS_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    offering_type: 'MEMBERSHIP',
    name: 'Iron Harbor All-Access Membership',
    description: 'Multi-location all-access. Includes pool, classes, and reciprocal access.',
    status: 'PUBLISHED',
    created_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 340,
  },
  {
    offering_id: OFFERING_IH_LAP_LANE_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    offering_type: 'FACILITY_RENTAL',
    name: 'Lap Lane Reservation (45 min)',
    description: 'Single-lane reservation in the Brooklyn 25m pool.',
    status: 'PUBLISHED',
    created_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 180,
  },
  {
    offering_id: OFFERING_IH_GIFT_CARD_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    offering_type: 'GIFT_CARD',
    name: '$50 Gift Card',
    description: 'Redeemable across any Iron Harbor offering except memberships.',
    status: 'PUBLISHED',
    created_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 150,
  },
  {
    offering_id: OFFERING_IH_FUNCTIONAL_STRENGTH_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    offering_type: 'CLASS',
    name: 'Functional Strength (50 min)',
    description: 'Coached barbell class. Capacity 12. Brooklyn Personal Training floor.',
    status: 'DRAFT',
    created_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 7,
  },
  {
    offering_id: OFFERING_IH_BOULDER_DAY_PASS_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    offering_type: 'APPOINTMENT',
    name: 'Boulder Day Pass',
    description: 'Single-visit pass for Iron Harbor Boulder. Pending bank/tax config.',
    status: 'DRAFT',
    created_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 3,
  },
]

export const seedOfferings: Offering[] = SPECS.map(
  (s): Offering => ({
    offering_id: s.offering_id,
    company_id: s.company_id,
    offering_type: s.offering_type,
    name: s.name,
    description: s.description,
    status: s.status,
    created_by: s.created_by,
    created_at: daysAgo(s.createdDaysAgo),
  }),
)

interface OfferingsStore {
  offerings: Offering[]
  list: () => Offering[]
  listByCompany: (cid: CompanyId) => Offering[]
  getById: (oid: OfferingId) => Offering | undefined
  create: (
    input: Omit<Offering, 'offering_id' | 'created_at' | 'status'> &
      Partial<Pick<Offering, 'status'>>,
    actor_id: PersonId,
  ) => Offering
  update: (
    oid: OfferingId,
    patch: Partial<Pick<Offering, 'name' | 'description' | 'status'>>,
    actor_id: PersonId,
  ) => Offering | undefined
  retire: (oid: OfferingId, actor_id: PersonId, reason: string) => Offering | undefined
}

export const useOfferingsStore = create<OfferingsStore>((set, get) => ({
  offerings: seedOfferings,
  list: () => get().offerings,
  listByCompany: (cid) => get().offerings.filter((o) => o.company_id === cid),
  getById: (oid) => get().offerings.find((o) => o.offering_id === oid),

  create: (input, actor_id) => {
    const offering: Offering = {
      ...input,
      offering_id: id() as OfferingId,
      status: input.status ?? 'DRAFT',
      created_at: isoNow(),
    }
    set((s) => ({ offerings: [...s.offerings, offering] }))
    emitAuditEvent({
      event_type: 'offering.created',
      actor_person_id: actor_id,
      target_entity_type: 'Offering',
      target_entity_id: offering.offering_id,
      company_id: offering.company_id,
      after_value: { name: offering.name, offering_type: offering.offering_type },
    })
    return offering
  },

  update: (oid, patch, actor_id) => {
    const before = get().offerings.find((o) => o.offering_id === oid)
    if (!before) return undefined
    const after = { ...before, ...patch }
    set((s) => ({
      offerings: s.offerings.map((o) => (o.offering_id === oid ? after : o)),
    }))
    emitAuditEvent({
      event_type: 'offering.draft_updated',
      actor_person_id: actor_id,
      target_entity_type: 'Offering',
      target_entity_id: oid,
      company_id: before.company_id,
      before_value: { name: before.name, status: before.status },
      after_value: { name: after.name, status: after.status },
    })
    return after
  },

  retire: (oid, actor_id, reason) => {
    const before = get().offerings.find((o) => o.offering_id === oid)
    if (!before) return undefined
    const after: Offering = { ...before, status: 'RETIRED' }
    set((s) => ({
      offerings: s.offerings.map((o) => (o.offering_id === oid ? after : o)),
    }))
    emitAuditEvent({
      event_type: 'offering.retired',
      actor_person_id: actor_id,
      target_entity_type: 'Offering',
      target_entity_id: oid,
      company_id: before.company_id,
      before_value: { status: before.status },
      after_value: { status: after.status, reason_code: reason },
    })
    return after
  },
}))

export function listOfferings() {
  return useOfferingsStore.getState().list()
}
export function getOfferingById(oid: OfferingId) {
  return useOfferingsStore.getState().getById(oid)
}
