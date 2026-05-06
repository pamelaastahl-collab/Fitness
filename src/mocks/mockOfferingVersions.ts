/**
 * Mock OfferingVersions — the immutable published configuration snapshot
 * (UOM §3.2).
 *
 * INVARIANT 2: Published OfferingVersions are IMMUTABLE — no in-place edits.
 * INVARIANT 3: Publishing creates a new version; the prior version is RETIRED.
 *
 * Seed shape:
 *   - Most published offerings carry exactly one v1 PUBLISHED version.
 *   - Iron Harbor All-Access carries v1 RETIRED, v2 RETIRED, v3 PUBLISHED so
 *     the F4 history view has real data.
 *   - DRAFT offerings (PT 1:1, Functional Strength, Boulder Day Pass) carry a
 *     single DRAFT version with no published_at — F4 will publish them.
 *
 * Reporting dimensions (category / tax_category / revenue_category) are set
 * to plausible governed values; F4 will treat the dimension lists as
 * reference data once those screens exist.
 */

import { create } from 'zustand'
import type {
  OfferingId,
  OfferingVersion,
  OfferingVersionId,
  OfferingVersionStatus,
  PersonId,
  Sha256Hex,
} from '@/types/primitives'
import { daysAgo, fakeSha256, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import {
  OFFERING_FF_BRAND_TEE_ID,
  OFFERING_FF_HEATED_VINYASA_ID,
  OFFERING_FF_PT_SESSION_ID,
  OFFERING_FF_REFORMER_8PACK_ID,
  OFFERING_FF_UNLIMITED_MEMBERSHIP_ID,
  OFFERING_IH_ALL_ACCESS_ID,
  OFFERING_IH_BOULDER_DAY_PASS_ID,
  OFFERING_IH_FUNCTIONAL_STRENGTH_ID,
  OFFERING_IH_GIFT_CARD_ID,
  OFFERING_IH_LAP_LANE_ID,
} from './mockOfferings'
import {
  PERSON_MADELINE_FOSTER_ID,
  PERSON_SARAH_CHEN_ID,
} from './mockPersons'

function ov(suffix: string): OfferingVersionId {
  return `v0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as OfferingVersionId
}

interface VersionSpec {
  version_id: OfferingVersionId
  offering_id: OfferingId
  version_number: number
  status: OfferingVersionStatus
  category: string
  tax_category: string
  revenue_category: string
  publishedDaysAgo?: number
  retiredDaysAgo?: number
  published_by?: PersonId
  createdDaysAgo: number
}

// ── FitFlow Pacific ──────────────────────────────────────────────────────────
export const OV_FF_UNLIMITED_V1_ID = ov('001')
export const OV_FF_HEATED_VINYASA_V1_ID = ov('010')
export const OV_FF_REFORMER_8PACK_V1_ID = ov('020')
export const OV_FF_BRAND_TEE_V1_ID = ov('030')
export const OV_FF_PT_SESSION_DRAFT_ID = ov('040')

// ── Iron Harbor ──────────────────────────────────────────────────────────────
export const OV_IH_ALL_ACCESS_V1_ID = ov('100') // RETIRED
export const OV_IH_ALL_ACCESS_V2_ID = ov('101') // RETIRED
export const OV_IH_ALL_ACCESS_V3_ID = ov('102') // PUBLISHED (current)
export const OV_IH_LAP_LANE_V1_ID = ov('110')
export const OV_IH_GIFT_CARD_V1_ID = ov('120')
export const OV_IH_FUNCTIONAL_STRENGTH_DRAFT_ID = ov('130')
export const OV_IH_BOULDER_DAY_PASS_DRAFT_ID = ov('140')

const SPECS: VersionSpec[] = [
  {
    version_id: OV_FF_UNLIMITED_V1_ID,
    offering_id: OFFERING_FF_UNLIMITED_MEMBERSHIP_ID,
    version_number: 1,
    status: 'PUBLISHED',
    category: 'membership',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-membership',
    publishedDaysAgo: 370,
    published_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 380,
  },
  {
    version_id: OV_FF_HEATED_VINYASA_V1_ID,
    offering_id: OFFERING_FF_HEATED_VINYASA_ID,
    version_number: 1,
    status: 'PUBLISHED',
    category: 'class-yoga',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-class',
    publishedDaysAgo: 285,
    published_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 290,
  },
  {
    version_id: OV_FF_REFORMER_8PACK_V1_ID,
    offering_id: OFFERING_FF_REFORMER_8PACK_ID,
    version_number: 1,
    status: 'PUBLISHED',
    category: 'package-pilates',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-credit-pack',
    publishedDaysAgo: 225,
    published_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 230,
  },
  {
    version_id: OV_FF_BRAND_TEE_V1_ID,
    offering_id: OFFERING_FF_BRAND_TEE_ID,
    version_number: 1,
    status: 'PUBLISHED',
    category: 'retail-apparel',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-retail',
    publishedDaysAgo: 195,
    published_by: PERSON_SARAH_CHEN_ID,
    createdDaysAgo: 200,
  },
  {
    version_id: OV_FF_PT_SESSION_DRAFT_ID,
    offering_id: OFFERING_FF_PT_SESSION_ID,
    version_number: 1,
    status: 'DRAFT',
    category: 'appointment-pt',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-appointment',
    createdDaysAgo: 14,
  },

  // Iron Harbor All-Access — three versions to demo immutable history.
  {
    version_id: OV_IH_ALL_ACCESS_V1_ID,
    offering_id: OFFERING_IH_ALL_ACCESS_ID,
    version_number: 1,
    status: 'RETIRED',
    category: 'membership',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-membership',
    publishedDaysAgo: 335,
    retiredDaysAgo: 200,
    published_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 340,
  },
  {
    version_id: OV_IH_ALL_ACCESS_V2_ID,
    offering_id: OFFERING_IH_ALL_ACCESS_ID,
    version_number: 2,
    status: 'RETIRED',
    category: 'membership',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-membership',
    publishedDaysAgo: 200,
    retiredDaysAgo: 60,
    published_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 200,
  },
  {
    version_id: OV_IH_ALL_ACCESS_V3_ID,
    offering_id: OFFERING_IH_ALL_ACCESS_ID,
    version_number: 3,
    status: 'PUBLISHED',
    category: 'membership',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-membership',
    publishedDaysAgo: 60,
    published_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 60,
  },

  {
    version_id: OV_IH_LAP_LANE_V1_ID,
    offering_id: OFFERING_IH_LAP_LANE_ID,
    version_number: 1,
    status: 'PUBLISHED',
    category: 'facility-rental',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-facility',
    publishedDaysAgo: 175,
    published_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 180,
  },
  {
    version_id: OV_IH_GIFT_CARD_V1_ID,
    offering_id: OFFERING_IH_GIFT_CARD_ID,
    version_number: 1,
    status: 'PUBLISHED',
    category: 'gift-card',
    tax_category: 'us-non-taxable',
    revenue_category: 'rev-gift-card',
    publishedDaysAgo: 145,
    published_by: PERSON_MADELINE_FOSTER_ID,
    createdDaysAgo: 150,
  },
  {
    version_id: OV_IH_FUNCTIONAL_STRENGTH_DRAFT_ID,
    offering_id: OFFERING_IH_FUNCTIONAL_STRENGTH_ID,
    version_number: 1,
    status: 'DRAFT',
    category: 'class-strength',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-class',
    createdDaysAgo: 7,
  },
  {
    version_id: OV_IH_BOULDER_DAY_PASS_DRAFT_ID,
    offering_id: OFFERING_IH_BOULDER_DAY_PASS_ID,
    version_number: 1,
    status: 'DRAFT',
    category: 'appointment-day-pass',
    tax_category: 'us-co-sales-2.9',
    revenue_category: 'rev-appointment',
    createdDaysAgo: 3,
  },
]

export const seedOfferingVersions: OfferingVersion[] = SPECS.map((s) => {
  const config_hash: Sha256Hex = fakeSha256(
    `${s.offering_id}|v${s.version_number}|${s.category}|${s.tax_category}|${s.revenue_category}`,
  )
  return {
    offering_version_id: s.version_id,
    offering_id: s.offering_id,
    version_number: s.version_number,
    status: s.status,
    config_hash,
    category: s.category,
    tax_category: s.tax_category,
    revenue_category: s.revenue_category,
    published_at: s.publishedDaysAgo !== undefined ? daysAgo(s.publishedDaysAgo) : undefined,
    published_by: s.published_by,
    retired_at: s.retiredDaysAgo !== undefined ? daysAgo(s.retiredDaysAgo) : undefined,
    created_at: daysAgo(s.createdDaysAgo),
  }
})

interface OfferingVersionsStore {
  versions: OfferingVersion[]
  list: () => OfferingVersion[]
  listByOffering: (oid: OfferingId) => OfferingVersion[]
  getCurrentPublished: (oid: OfferingId) => OfferingVersion | undefined
  getById: (vid: OfferingVersionId) => OfferingVersion | undefined
  /**
   * Publish a DRAFT version. Atomically retires any prior PUBLISHED version
   * on the same Offering per UOM INVARIANT 3 / publish lifecycle step 6.
   */
  publish: (
    vid: OfferingVersionId,
    actor_id: PersonId,
    company_id: import('@/types/primitives').CompanyId,
  ) => OfferingVersion | undefined
}

export const useOfferingVersionsStore = create<OfferingVersionsStore>((set, get) => ({
  versions: seedOfferingVersions,

  list: () => get().versions,
  listByOffering: (oid) =>
    get()
      .versions.filter((v) => v.offering_id === oid)
      .slice()
      .sort((a, b) => b.version_number - a.version_number),
  getCurrentPublished: (oid) =>
    get().versions.find(
      (v) => v.offering_id === oid && v.status === 'PUBLISHED',
    ),
  getById: (vid) => get().versions.find((v) => v.offering_version_id === vid),

  publish: (vid, actor_id, company_id) => {
    const draft = get().versions.find((v) => v.offering_version_id === vid)
    if (!draft || draft.status !== 'DRAFT') return undefined
    const now = isoNow()
    const priorPublished = get().versions.find(
      (v) => v.offering_id === draft.offering_id && v.status === 'PUBLISHED',
    )
    set((s) => ({
      versions: s.versions.map((v) => {
        if (v.offering_version_id === vid) {
          return {
            ...v,
            status: 'PUBLISHED',
            published_at: now,
            published_by: actor_id,
          }
        }
        if (priorPublished && v.offering_version_id === priorPublished.offering_version_id) {
          return { ...v, status: 'RETIRED', retired_at: now }
        }
        return v
      }),
    }))
    emitAuditEvent({
      event_type: 'offering.published',
      actor_person_id: actor_id,
      target_entity_type: 'OfferingVersion',
      target_entity_id: vid,
      company_id,
      after_value: {
        offering_id: draft.offering_id,
        version_number: draft.version_number,
        config_hash: draft.config_hash,
      },
    })
    if (priorPublished) {
      emitAuditEvent({
        event_type: 'offering.retired',
        actor_person_id: actor_id,
        target_entity_type: 'OfferingVersion',
        target_entity_id: priorPublished.offering_version_id,
        company_id,
        before_value: { status: 'PUBLISHED' },
        after_value: { status: 'RETIRED', superseded_by: vid },
      })
    }
    return get().versions.find((v) => v.offering_version_id === vid)
  },
}))

export function listOfferingVersions() {
  return useOfferingVersionsStore.getState().list()
}
export function getCurrentPublishedVersion(oid: OfferingId) {
  return useOfferingVersionsStore.getState().getCurrentPublished(oid)
}
export function getOfferingVersionById(vid: OfferingVersionId) {
  return useOfferingVersionsStore.getState().getById(vid)
}
