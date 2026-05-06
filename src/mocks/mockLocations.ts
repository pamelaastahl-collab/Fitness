/**
 * Mock Locations — operational anchor (OH §2.3).
 *
 * Six locations across three BEs, varied timezones.
 *
 * Iron Harbor Boulder (under Iron Harbor Mountain) is foundationally important
 * to the demo: its BusinessEntity has no bank/tax config, so any attempt to
 * commit a Charge or publish an Offering targeting Boulder is blocked by
 * XPI-FIN-02 / XPI-CAT-03. The seed leaves it ACTIVE so the UI surfaces the
 * configuration gap, not a deactivation.
 */

import { create } from 'zustand'
import type { Location, LocationId, BusinessEntityId, PersonId } from '@/types/primitives'
import { daysAgo, id, isoNow } from './_helpers'
import {
  ADDRESS_FITFLOW_AUCKLAND_ID,
  ADDRESS_FITFLOW_WELLINGTON_ID,
  ADDRESS_IRON_BOULDER_ID,
  ADDRESS_IRON_BROOKLYN_ID,
  ADDRESS_IRON_MANHATTAN_ID,
  ADDRESS_IRON_QUEENS_ID,
} from './mockAddresses'
import {
  BE_FITFLOW_PACIFIC_ID,
  BE_IRON_HARBOR_COASTAL_ID,
  BE_IRON_HARBOR_MOUNTAIN_ID,
} from './mockBusinessEntities'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'
import { emitAuditEvent } from './mockAuditEvents'

export const LOC_FITFLOW_AUCKLAND_ID =
  'l0000001-0000-0000-0000-000000000001' as LocationId
export const LOC_FITFLOW_WELLINGTON_ID =
  'l0000001-0000-0000-0000-000000000002' as LocationId
export const LOC_IRON_BROOKLYN_ID =
  'l0000001-0000-0000-0000-000000000003' as LocationId
export const LOC_IRON_QUEENS_ID =
  'l0000001-0000-0000-0000-000000000004' as LocationId
export const LOC_IRON_MANHATTAN_ID =
  'l0000001-0000-0000-0000-000000000005' as LocationId
export const LOC_IRON_BOULDER_ID =
  'l0000001-0000-0000-0000-000000000006' as LocationId

export const seedLocations: Location[] = [
  {
    location_id: LOC_FITFLOW_AUCKLAND_ID,
    business_entity_id: BE_FITFLOW_PACIFIC_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'FitFlow Auckland Central',
    address_id: ADDRESS_FITFLOW_AUCKLAND_ID,
    timezone: 'Pacific/Auckland',
    phone: '+6493091234',
    email: 'auckland@fitflow.co.nz',
    status: 'ACTIVE',
    created_at: daysAgo(395),
  },
  {
    location_id: LOC_FITFLOW_WELLINGTON_ID,
    business_entity_id: BE_FITFLOW_PACIFIC_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'FitFlow Wellington Cuba',
    address_id: ADDRESS_FITFLOW_WELLINGTON_ID,
    timezone: 'Pacific/Auckland',
    phone: '+6443855678',
    email: 'wellington@fitflow.co.nz',
    status: 'ACTIVE',
    created_at: daysAgo(310),
  },
  {
    location_id: LOC_IRON_BROOKLYN_ID,
    business_entity_id: BE_IRON_HARBOR_COASTAL_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Iron Harbor Brooklyn — Wythe',
    address_id: ADDRESS_IRON_BROOKLYN_ID,
    timezone: 'America/New_York',
    phone: '+17184550100',
    email: 'brooklyn@ironharbor.com',
    status: 'ACTIVE',
    created_at: daysAgo(330),
  },
  {
    location_id: LOC_IRON_QUEENS_ID,
    business_entity_id: BE_IRON_HARBOR_COASTAL_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Iron Harbor LIC',
    address_id: ADDRESS_IRON_QUEENS_ID,
    timezone: 'America/New_York',
    phone: '+17184550150',
    email: 'lic@ironharbor.com',
    status: 'ACTIVE',
    created_at: daysAgo(220),
  },
  {
    location_id: LOC_IRON_MANHATTAN_ID,
    business_entity_id: BE_IRON_HARBOR_COASTAL_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Iron Harbor NoMad',
    address_id: ADDRESS_IRON_MANHATTAN_ID,
    timezone: 'America/New_York',
    phone: '+12125550200',
    email: 'nomad@ironharbor.com',
    status: 'ACTIVE',
    created_at: daysAgo(170),
  },
  {
    location_id: LOC_IRON_BOULDER_ID,
    business_entity_id: BE_IRON_HARBOR_MOUNTAIN_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Iron Harbor Boulder',
    address_id: ADDRESS_IRON_BOULDER_ID,
    timezone: 'America/Denver',
    phone: '+13035550300',
    email: 'boulder@ironharbor.com',
    status: 'ACTIVE',
    created_at: daysAgo(60),
  },
]

interface LocationsStore {
  locations: Location[]
  list: () => Location[]
  listByCompany: (company_id: import('@/types/primitives').CompanyId) => Location[]
  listByEntity: (be: BusinessEntityId) => Location[]
  getById: (loc: LocationId) => Location | undefined
  create: (
    input: Omit<Location, 'location_id' | 'created_at'>,
    actor_id: PersonId,
  ) => Location
  update: (
    loc: LocationId,
    patch: Partial<Omit<Location, 'location_id' | 'company_id' | 'business_entity_id' | 'created_at'>>,
    actor_id: PersonId,
  ) => Location | undefined
  deactivate: (
    loc: LocationId,
    actor_id: PersonId,
    reason: string,
  ) => Location | undefined
}

export const useLocationsStore = create<LocationsStore>((set, get) => ({
  locations: seedLocations,
  list: () => get().locations,
  listByCompany: (company_id) =>
    get().locations.filter((l) => l.company_id === company_id),
  listByEntity: (be) =>
    get().locations.filter((l) => l.business_entity_id === be),
  getById: (loc) => get().locations.find((l) => l.location_id === loc),

  create: (input, actor_id) => {
    const location: Location = {
      ...input,
      location_id: id() as LocationId,
      created_at: isoNow(),
    }
    set((s) => ({ locations: [...s.locations, location] }))
    emitAuditEvent({
      event_type: 'location.created',
      actor_person_id: actor_id,
      target_entity_type: 'Location',
      target_entity_id: location.location_id,
      company_id: location.company_id,
      scope_type: 'LOCATION',
      scope_id: location.location_id,
      after_value: {
        name: location.name,
        timezone: location.timezone,
        business_entity_id: location.business_entity_id,
      },
    })
    return location
  },

  update: (loc, patch, actor_id) => {
    const before = get().locations.find((l) => l.location_id === loc)
    if (!before) return undefined
    const after = { ...before, ...patch }
    set((s) => ({
      locations: s.locations.map((l) =>
        l.location_id === loc ? after : l,
      ),
    }))
    emitAuditEvent({
      event_type: 'location.updated',
      actor_person_id: actor_id,
      target_entity_type: 'Location',
      target_entity_id: loc,
      company_id: before.company_id,
      scope_type: 'LOCATION',
      scope_id: loc,
      before_value: { name: before.name, status: before.status, phone: before.phone },
      after_value: { name: after.name, status: after.status, phone: after.phone },
    })
    return after
  },

  deactivate: (loc, actor_id, reason) => {
    const before = get().locations.find((l) => l.location_id === loc)
    if (!before) return undefined
    const after: Location = {
      ...before,
      status: 'DEACTIVATED',
      deactivated_at: isoNow(),
      deactivation_reason: reason,
    }
    set((s) => ({
      locations: s.locations.map((l) =>
        l.location_id === loc ? after : l,
      ),
    }))
    emitAuditEvent({
      event_type: 'location.deactivated',
      actor_person_id: actor_id,
      target_entity_type: 'Location',
      target_entity_id: loc,
      company_id: before.company_id,
      scope_type: 'LOCATION',
      scope_id: loc,
      before_value: { status: before.status },
      after_value: { status: after.status, reason_code: reason },
    })
    return after
  },
}))

export function listLocations() {
  return useLocationsStore.getState().list()
}
export function getLocationById(loc: LocationId) {
  return useLocationsStore.getState().getById(loc)
}
export function listLocationsByEntity(be: BusinessEntityId) {
  return useLocationsStore.getState().listByEntity(be)
}
