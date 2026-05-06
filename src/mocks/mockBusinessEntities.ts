/**
 * Mock BusinessEntities — the financial boundary (OH §2.2).
 *
 * Seed shape:
 *   - FitFlow Pacific Ltd          → FitFlow Pacific tenant; bank+tax ACTIVE
 *   - Iron Harbor Coastal LLC      → Iron Harbor tenant; bank+tax ACTIVE
 *   - Iron Harbor Mountain LLC     → Iron Harbor tenant; NO bank/tax config
 *                                    (intentional, exercises XPI-FIN-02 + XPI-CAT-03)
 */

import { create } from 'zustand'
import type {
  BusinessEntity,
  BusinessEntityId,
  CompanyId,
  PersonId,
} from '@/types/primitives'
import { daysAgo, id, isoNow } from './_helpers'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'
import {
  BANK_FITFLOW_PACIFIC_ID,
  BANK_IRON_HARBOR_COASTAL_ID,
  TAX_FITFLOW_PACIFIC_ID,
  TAX_IRON_HARBOR_COASTAL_ID,
} from './mockBankTaxConfigs'
import { emitAuditEvent } from './mockAuditEvents'

export const BE_FITFLOW_PACIFIC_ID =
  'b0000001-0000-0000-0000-000000000001' as BusinessEntityId
export const BE_IRON_HARBOR_COASTAL_ID =
  'b0000001-0000-0000-0000-000000000002' as BusinessEntityId
export const BE_IRON_HARBOR_MOUNTAIN_ID =
  'b0000001-0000-0000-0000-000000000003' as BusinessEntityId

export const seedBusinessEntities: BusinessEntity[] = [
  {
    business_entity_id: BE_FITFLOW_PACIFIC_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'FitFlow Pacific Ltd',
    legal_name: 'FitFlow Pacific Limited',
    tax_id: 'NZBN-9429000123456',
    country_code: 'NZL',
    status: 'ACTIVE',
    bank_account_config_id: BANK_FITFLOW_PACIFIC_ID,
    default_tax_config_id: TAX_FITFLOW_PACIFIC_ID,
    created_at: daysAgo(400),
  },
  {
    business_entity_id: BE_IRON_HARBOR_COASTAL_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Iron Harbor Coastal LLC',
    legal_name: 'Iron Harbor Coastal Athletics, LLC',
    tax_id: 'EIN-87-1234567',
    country_code: 'USA',
    status: 'ACTIVE',
    bank_account_config_id: BANK_IRON_HARBOR_COASTAL_ID,
    default_tax_config_id: TAX_IRON_HARBOR_COASTAL_ID,
    created_at: daysAgo(340),
  },
  {
    business_entity_id: BE_IRON_HARBOR_MOUNTAIN_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Iron Harbor Mountain LLC',
    legal_name: 'Iron Harbor Mountain Athletics, LLC',
    tax_id: 'EIN-88-7654321',
    country_code: 'USA',
    status: 'ACTIVE',
    // bank_account_config_id intentionally omitted — XPI-FIN-02 demo
    // default_tax_config_id intentionally omitted — XPI-CAT-03 demo
    created_at: daysAgo(120),
  },
]

interface BusinessEntitiesStore {
  entities: BusinessEntity[]
  list: () => BusinessEntity[]
  listByCompany: (company_id: CompanyId) => BusinessEntity[]
  getById: (be: BusinessEntityId) => BusinessEntity | undefined
  create: (
    input: Omit<BusinessEntity, 'business_entity_id' | 'created_at'>,
    actor_id: PersonId,
  ) => BusinessEntity
  update: (
    be: BusinessEntityId,
    patch: Partial<Omit<BusinessEntity, 'business_entity_id' | 'company_id' | 'created_at'>>,
    actor_id: PersonId,
  ) => BusinessEntity | undefined
  deactivate: (be: BusinessEntityId, actor_id: PersonId, reason: string) => BusinessEntity | undefined
}

export const useBusinessEntitiesStore = create<BusinessEntitiesStore>((set, get) => ({
  entities: seedBusinessEntities,

  list: () => get().entities,
  listByCompany: (company_id) =>
    get().entities.filter((e) => e.company_id === company_id),
  getById: (be) => get().entities.find((e) => e.business_entity_id === be),

  create: (input, actor_id) => {
    const entity: BusinessEntity = {
      ...input,
      business_entity_id: id() as BusinessEntityId,
      created_at: isoNow(),
    }
    set((s) => ({ entities: [...s.entities, entity] }))
    emitAuditEvent({
      event_type: 'entity.created',
      actor_person_id: actor_id,
      target_entity_type: 'BusinessEntity',
      target_entity_id: entity.business_entity_id,
      company_id: entity.company_id,
      scope_type: 'COMPANY',
      scope_id: entity.company_id,
      after_value: { name: entity.name, country_code: entity.country_code },
    })
    return entity
  },

  update: (be, patch, actor_id) => {
    const before = get().entities.find((e) => e.business_entity_id === be)
    if (!before) return undefined
    const after = { ...before, ...patch }
    set((s) => ({
      entities: s.entities.map((e) =>
        e.business_entity_id === be ? after : e,
      ),
    }))
    emitAuditEvent({
      event_type: 'entity.updated',
      actor_person_id: actor_id,
      target_entity_type: 'BusinessEntity',
      target_entity_id: be,
      company_id: before.company_id,
      scope_type: 'ENTITY',
      scope_id: be,
      before_value: { name: before.name, status: before.status },
      after_value: { name: after.name, status: after.status },
    })
    return after
  },

  deactivate: (be, actor_id, reason) => {
    const before = get().entities.find((e) => e.business_entity_id === be)
    if (!before) return undefined
    const after = { ...before, status: 'DEACTIVATED' as const }
    set((s) => ({
      entities: s.entities.map((e) =>
        e.business_entity_id === be ? after : e,
      ),
    }))
    emitAuditEvent({
      event_type: 'entity.deactivated',
      actor_person_id: actor_id,
      target_entity_type: 'BusinessEntity',
      target_entity_id: be,
      company_id: before.company_id,
      scope_type: 'ENTITY',
      scope_id: be,
      before_value: { status: before.status },
      after_value: { status: after.status, reason_code: reason },
    })
    return after
  },
}))

export function listBusinessEntities() {
  return useBusinessEntitiesStore.getState().list()
}
export function listBusinessEntitiesByCompany(company_id: CompanyId) {
  return useBusinessEntitiesStore.getState().listByCompany(company_id)
}
export function getBusinessEntityById(be: BusinessEntityId) {
  return useBusinessEntitiesStore.getState().getById(be)
}
