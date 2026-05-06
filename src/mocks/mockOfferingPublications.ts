/**
 * Mock OfferingPublications — bind a published OfferingVersion to specific
 * Locations (and optionally Departments) and channels (UOM §3.4).
 *
 * INVARIANT 4: Offering cannot publish without at least one publication
 *              targeting an active Location whose BE has active bank+tax config.
 *
 * Seed binds every PUBLISHED OfferingVersion to a realistic set of Locations
 * + channels. RETIRED versions intentionally have *no* live publications —
 * historical Charges still reference those version_ids, but the offerings
 * are no longer offered.
 */

import { create } from 'zustand'
import type {
  DepartmentId,
  LocationId,
  OfferingPublication,
  OfferingPublicationId,
  OfferingVersionId,
  PersonId,
  PublicationChannel,
} from '@/types/primitives'
import { daysAgo, id, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import {
  DEPT_AUCKLAND_PILATES_ID,
  DEPT_AUCKLAND_YOGA_ID,
  DEPT_BROOKLYN_AQUATICS_ID,
} from './mockDepartments'
import {
  LOC_FITFLOW_AUCKLAND_ID,
  LOC_FITFLOW_WELLINGTON_ID,
  LOC_IRON_BROOKLYN_ID,
  LOC_IRON_MANHATTAN_ID,
  LOC_IRON_QUEENS_ID,
} from './mockLocations'
import {
  OV_FF_BRAND_TEE_V1_ID,
  OV_FF_HEATED_VINYASA_V1_ID,
  OV_FF_REFORMER_8PACK_V1_ID,
  OV_FF_UNLIMITED_V1_ID,
  OV_IH_ALL_ACCESS_V3_ID,
  OV_IH_GIFT_CARD_V1_ID,
  OV_IH_LAP_LANE_V1_ID,
} from './mockOfferingVersions'

function pub(suffix: string): OfferingPublicationId {
  return `q0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as OfferingPublicationId
}

interface PubSpec {
  publication_id: OfferingPublicationId
  offering_version_id: OfferingVersionId
  location_id: LocationId
  department_id?: DepartmentId
  channels: PublicationChannel[]
  is_active: boolean
  local_override_allowed: boolean
  createdDaysAgo: number
}

const ALL = ['WEB', 'POS', 'ADMIN'] as const satisfies readonly PublicationChannel[]
const POS_ONLY = ['POS'] as const satisfies readonly PublicationChannel[]
const POS_ADMIN = ['POS', 'ADMIN'] as const satisfies readonly PublicationChannel[]
const WEB_POS = ['WEB', 'POS'] as const satisfies readonly PublicationChannel[]

const SPECS: PubSpec[] = [
  // Unlimited Membership v1 — both FF locations, all channels.
  { publication_id: pub('001'), offering_version_id: OV_FF_UNLIMITED_V1_ID, location_id: LOC_FITFLOW_AUCKLAND_ID, channels: [...ALL], is_active: true, local_override_allowed: false, createdDaysAgo: 370 },
  { publication_id: pub('002'), offering_version_id: OV_FF_UNLIMITED_V1_ID, location_id: LOC_FITFLOW_WELLINGTON_ID, channels: [...ALL], is_active: true, local_override_allowed: false, createdDaysAgo: 370 },

  // Heated Vinyasa — Auckland Yoga dept only.
  { publication_id: pub('010'), offering_version_id: OV_FF_HEATED_VINYASA_V1_ID, location_id: LOC_FITFLOW_AUCKLAND_ID, department_id: DEPT_AUCKLAND_YOGA_ID, channels: [...POS_ADMIN], is_active: true, local_override_allowed: true, createdDaysAgo: 285 },

  // Reformer 8-pack — Auckland Pilates dept only, web+POS.
  { publication_id: pub('020'), offering_version_id: OV_FF_REFORMER_8PACK_V1_ID, location_id: LOC_FITFLOW_AUCKLAND_ID, department_id: DEPT_AUCKLAND_PILATES_ID, channels: [...WEB_POS], is_active: true, local_override_allowed: false, createdDaysAgo: 225 },

  // Brand Tee — both FF locations, POS-only.
  { publication_id: pub('030'), offering_version_id: OV_FF_BRAND_TEE_V1_ID, location_id: LOC_FITFLOW_AUCKLAND_ID, channels: [...POS_ONLY], is_active: true, local_override_allowed: false, createdDaysAgo: 195 },
  { publication_id: pub('031'), offering_version_id: OV_FF_BRAND_TEE_V1_ID, location_id: LOC_FITFLOW_WELLINGTON_ID, channels: [...POS_ONLY], is_active: true, local_override_allowed: false, createdDaysAgo: 195 },

  // Iron Harbor All-Access v3 — three coastal locations, all channels.
  { publication_id: pub('100'), offering_version_id: OV_IH_ALL_ACCESS_V3_ID, location_id: LOC_IRON_BROOKLYN_ID, channels: [...ALL], is_active: true, local_override_allowed: false, createdDaysAgo: 60 },
  { publication_id: pub('101'), offering_version_id: OV_IH_ALL_ACCESS_V3_ID, location_id: LOC_IRON_QUEENS_ID, channels: [...ALL], is_active: true, local_override_allowed: false, createdDaysAgo: 60 },
  { publication_id: pub('102'), offering_version_id: OV_IH_ALL_ACCESS_V3_ID, location_id: LOC_IRON_MANHATTAN_ID, channels: [...ALL], is_active: true, local_override_allowed: false, createdDaysAgo: 60 },

  // Lap Lane — Brooklyn Aquatics dept, POS only.
  { publication_id: pub('110'), offering_version_id: OV_IH_LAP_LANE_V1_ID, location_id: LOC_IRON_BROOKLYN_ID, department_id: DEPT_BROOKLYN_AQUATICS_ID, channels: [...POS_ONLY], is_active: true, local_override_allowed: false, createdDaysAgo: 175 },

  // Gift Card — all coastal IH locations, web+POS.
  { publication_id: pub('120'), offering_version_id: OV_IH_GIFT_CARD_V1_ID, location_id: LOC_IRON_BROOKLYN_ID, channels: [...WEB_POS], is_active: true, local_override_allowed: false, createdDaysAgo: 145 },
  { publication_id: pub('121'), offering_version_id: OV_IH_GIFT_CARD_V1_ID, location_id: LOC_IRON_QUEENS_ID, channels: [...WEB_POS], is_active: true, local_override_allowed: false, createdDaysAgo: 145 },
  { publication_id: pub('122'), offering_version_id: OV_IH_GIFT_CARD_V1_ID, location_id: LOC_IRON_MANHATTAN_ID, channels: [...WEB_POS], is_active: true, local_override_allowed: false, createdDaysAgo: 145 },
]

export const seedOfferingPublications: OfferingPublication[] = SPECS.map(
  (s): OfferingPublication => ({
    publication_id: s.publication_id,
    offering_version_id: s.offering_version_id,
    location_id: s.location_id,
    department_id: s.department_id,
    channels: s.channels,
    is_active: s.is_active,
    local_override_allowed: s.local_override_allowed,
    created_at: daysAgo(s.createdDaysAgo),
  }),
)

interface OfferingPublicationsStore {
  publications: OfferingPublication[]
  list: () => OfferingPublication[]
  listByVersion: (vid: OfferingVersionId) => OfferingPublication[]
  listByLocation: (lid: LocationId) => OfferingPublication[]
  /** Returns publications matching location AND containing the channel. */
  listByLocationAndChannel: (
    lid: LocationId,
    channel: PublicationChannel,
  ) => OfferingPublication[]
  create: (
    input: Omit<OfferingPublication, 'publication_id' | 'created_at'>,
    actor_id: PersonId,
    company_id: import('@/types/primitives').CompanyId,
  ) => OfferingPublication
  setActive: (
    pid: OfferingPublicationId,
    is_active: boolean,
    actor_id: PersonId,
    company_id: import('@/types/primitives').CompanyId,
  ) => OfferingPublication | undefined
}

export const useOfferingPublicationsStore = create<OfferingPublicationsStore>(
  (set, get) => ({
    publications: seedOfferingPublications,
    list: () => get().publications,
    listByVersion: (vid) =>
      get().publications.filter((p) => p.offering_version_id === vid),
    listByLocation: (lid) =>
      get().publications.filter((p) => p.location_id === lid),
    listByLocationAndChannel: (lid, channel) =>
      get().publications.filter(
        (p) =>
          p.location_id === lid && p.is_active && p.channels.includes(channel),
      ),

    create: (input, actor_id, company_id) => {
      const publication: OfferingPublication = {
        ...input,
        publication_id: id() as OfferingPublicationId,
        created_at: isoNow(),
      }
      set((s) => ({ publications: [...s.publications, publication] }))
      emitAuditEvent({
        event_type: 'offering.publication_scope_changed',
        actor_person_id: actor_id,
        target_entity_type: 'OfferingPublication',
        target_entity_id: publication.publication_id,
        company_id,
        scope_type: 'LOCATION',
        scope_id: publication.location_id,
        after_value: {
          offering_version_id: publication.offering_version_id,
          channels: publication.channels,
        },
      })
      return publication
    },

    setActive: (pid, is_active, actor_id, company_id) => {
      const before = get().publications.find((p) => p.publication_id === pid)
      if (!before) return undefined
      const after: OfferingPublication = { ...before, is_active }
      set((s) => ({
        publications: s.publications.map((p) =>
          p.publication_id === pid ? after : p,
        ),
      }))
      emitAuditEvent({
        event_type: 'offering.publication_scope_changed',
        actor_person_id: actor_id,
        target_entity_type: 'OfferingPublication',
        target_entity_id: pid,
        company_id,
        scope_type: 'LOCATION',
        scope_id: before.location_id,
        before_value: { is_active: before.is_active },
        after_value: { is_active: after.is_active },
      })
      return after
    },
  }),
)

export function listPublicationsForLocationChannel(
  lid: LocationId,
  channel: PublicationChannel,
) {
  return useOfferingPublicationsStore
    .getState()
    .listByLocationAndChannel(lid, channel)
}
