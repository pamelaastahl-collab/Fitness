/**
 * Mock Companies — the tenant boundary (OH §2.1).
 *
 * Two companies seed enough variety to demo cross-tenant isolation:
 *   - FitFlow Pacific (NZ, NZD, Pacific/Auckland)
 *   - Iron Harbor Athletics (US, USD, America/New_York)
 *
 * IDs in this seed are hand-picked stable UUIDs so cross-entity references
 * (Persons, Offerings, Charges) can target them by constant.
 */

import { create } from 'zustand'
import type { Company, CompanyId, CompanyStatus, PersonId } from '@/types/primitives'
import { daysAgo, id, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'

export const COMPANY_FITFLOW_PACIFIC_ID = 'c0000001-0000-0000-0000-000000000001' as CompanyId
export const COMPANY_IRON_HARBOR_ID = 'c0000001-0000-0000-0000-000000000002' as CompanyId

export const seedCompanies: Company[] = [
  {
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'FitFlow Pacific',
    slug: 'fitflow-pacific',
    status: 'ACTIVE',
    primary_timezone: 'Pacific/Auckland',
    primary_locale: 'en-NZ',
    primary_currency: 'NZD',
    created_at: daysAgo(420),
  },
  {
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Iron Harbor Athletics',
    slug: 'iron-harbor',
    status: 'ACTIVE',
    primary_timezone: 'America/New_York',
    primary_locale: 'en-US',
    primary_currency: 'USD',
    created_at: daysAgo(365),
  },
]

interface CompaniesStore {
  companies: Company[]
  list: () => Company[]
  getById: (company_id: CompanyId) => Company | undefined
  create: (input: Omit<Company, 'company_id' | 'created_at'>, actor_id: PersonId) => Company
  update: (
    company_id: CompanyId,
    patch: Partial<Omit<Company, 'company_id' | 'created_at'>>,
    actor_id: PersonId,
  ) => Company | undefined
  deactivate: (company_id: CompanyId, actor_id: PersonId) => Company | undefined
}

export const useCompaniesStore = create<CompaniesStore>((set, get) => ({
  companies: seedCompanies,

  list: () => get().companies,

  getById: (company_id) =>
    get().companies.find((c) => c.company_id === company_id),

  create: (input, actor_id) => {
    const company: Company = {
      ...input,
      company_id: id() as CompanyId,
      created_at: isoNow(),
    }
    set((s) => ({ companies: [...s.companies, company] }))
    emitAuditEvent({
      event_type: 'company.created',
      actor_person_id: actor_id,
      target_entity_type: 'Company',
      target_entity_id: company.company_id,
      company_id: company.company_id,
      after_value: {
        name: company.name,
        slug: company.slug,
        primary_timezone: company.primary_timezone,
        primary_locale: company.primary_locale,
        primary_currency: company.primary_currency,
      },
    })
    return company
  },

  update: (company_id, patch, actor_id) => {
    const before = get().companies.find((c) => c.company_id === company_id)
    if (!before) return undefined
    const after: Company = { ...before, ...patch }
    set((s) => ({
      companies: s.companies.map((c) => (c.company_id === company_id ? after : c)),
    }))
    emitAuditEvent({
      event_type: 'company.updated',
      actor_person_id: actor_id,
      target_entity_type: 'Company',
      target_entity_id: company_id,
      company_id,
      scope_type: 'COMPANY',
      scope_id: company_id,
      before_value: { name: before.name, status: before.status },
      after_value: { name: after.name, status: after.status },
    })
    return after
  },

  deactivate: (company_id, actor_id) => {
    const next: CompanyStatus = 'DEACTIVATED'
    return get().update(company_id, { status: next }, actor_id)
  },
}))

export function listCompanies() {
  return useCompaniesStore.getState().list()
}
export function getCompanyById(company_id: CompanyId) {
  return useCompaniesStore.getState().getById(company_id)
}
