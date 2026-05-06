/**
 * Bank account + tax configuration records, scoped to BusinessEntity.
 *
 * XPI-FIN-02: a Charge cannot commit if the BE has no ACTIVE bank_account_config.
 * XPI-CAT-03: an Offering cannot publish to a Location whose BE has no ACTIVE
 *             bank or tax config.
 *
 * The seed deliberately leaves Iron Harbor Mountain LLC without configs to
 * exercise both blocks in the UI.
 *
 * Full schema (PCI scope, processor keys, withholding rules) belongs in a
 * payments / tax primitive doc; this prototype tracks presence + status only.
 */

import { create } from 'zustand'
import type {
  BankAccountConfig,
  BankAccountConfigId,
  BankAccountConfigStatus,
  BusinessEntityId,
  TaxConfig,
  TaxConfigId,
  TaxConfigStatus,
} from '@/types/primitives'
import { daysAgo, id } from './_helpers'

// Hand-picked BE IDs are defined in mockBusinessEntities.ts; we redeclare the
// constant strings here to avoid a circular import. Keep these in sync.
const BE_FITFLOW_PACIFIC_ID = 'b0000001-0000-0000-0000-000000000001' as BusinessEntityId
const BE_IRON_HARBOR_COASTAL_ID =
  'b0000001-0000-0000-0000-000000000002' as BusinessEntityId
// const BE_IRON_HARBOR_MOUNTAIN_ID =
//   'b0000001-0000-0000-0000-000000000003' as BusinessEntityId  // intentionally unconfigured

export const BANK_FITFLOW_PACIFIC_ID =
  'k0000001-0000-0000-0000-000000000001' as BankAccountConfigId
export const BANK_IRON_HARBOR_COASTAL_ID =
  'k0000001-0000-0000-0000-000000000002' as BankAccountConfigId

export const TAX_FITFLOW_PACIFIC_ID =
  't0000001-0000-0000-0000-000000000001' as TaxConfigId
export const TAX_IRON_HARBOR_COASTAL_ID =
  't0000001-0000-0000-0000-000000000002' as TaxConfigId

export const seedBankAccountConfigs: BankAccountConfig[] = [
  {
    bank_account_config_id: BANK_FITFLOW_PACIFIC_ID,
    business_entity_id: BE_FITFLOW_PACIFIC_ID,
    display_name: 'ANZ Business — FitFlow Pacific Operating',
    last4: '4821',
    status: 'ACTIVE',
    created_at: daysAgo(400),
  },
  {
    bank_account_config_id: BANK_IRON_HARBOR_COASTAL_ID,
    business_entity_id: BE_IRON_HARBOR_COASTAL_ID,
    display_name: 'Chase Business — Iron Harbor Coastal',
    last4: '0917',
    status: 'ACTIVE',
    created_at: daysAgo(340),
  },
  // Iron Harbor Mountain LLC: intentionally absent so XPI-FIN-02 surfaces.
]

export const seedTaxConfigs: TaxConfig[] = [
  {
    tax_config_id: TAX_FITFLOW_PACIFIC_ID,
    business_entity_id: BE_FITFLOW_PACIFIC_ID,
    display_name: 'NZ GST 15%',
    country_code: 'NZL',
    status: 'ACTIVE',
    created_at: daysAgo(400),
  },
  {
    tax_config_id: TAX_IRON_HARBOR_COASTAL_ID,
    business_entity_id: BE_IRON_HARBOR_COASTAL_ID,
    display_name: 'NY State + NYC sales tax',
    country_code: 'USA',
    status: 'ACTIVE',
    created_at: daysAgo(340),
  },
]

interface BankAccountConfigsStore {
  configs: BankAccountConfig[]
  list: () => BankAccountConfig[]
  getById: (id: BankAccountConfigId) => BankAccountConfig | undefined
  listByEntity: (be: BusinessEntityId) => BankAccountConfig[]
  create: (input: Omit<BankAccountConfig, 'bank_account_config_id' | 'created_at'>) => BankAccountConfig
  setStatus: (
    id: BankAccountConfigId,
    status: BankAccountConfigStatus,
  ) => BankAccountConfig | undefined
}

export const useBankAccountConfigsStore = create<BankAccountConfigsStore>((set, get) => ({
  configs: seedBankAccountConfigs,
  list: () => get().configs,
  getById: (cid) => get().configs.find((c) => c.bank_account_config_id === cid),
  listByEntity: (be) => get().configs.filter((c) => c.business_entity_id === be),
  create: (input) => {
    const config: BankAccountConfig = {
      ...input,
      bank_account_config_id: id() as BankAccountConfigId,
      created_at: new Date().toISOString() as BankAccountConfig['created_at'],
    }
    set((s) => ({ configs: [...s.configs, config] }))
    return config
  },
  setStatus: (cid, status) => {
    const before = get().configs.find((c) => c.bank_account_config_id === cid)
    if (!before) return undefined
    const after = { ...before, status }
    set((s) => ({
      configs: s.configs.map((c) => (c.bank_account_config_id === cid ? after : c)),
    }))
    return after
  },
}))

interface TaxConfigsStore {
  configs: TaxConfig[]
  list: () => TaxConfig[]
  getById: (id: TaxConfigId) => TaxConfig | undefined
  listByEntity: (be: BusinessEntityId) => TaxConfig[]
  create: (input: Omit<TaxConfig, 'tax_config_id' | 'created_at'>) => TaxConfig
  setStatus: (id: TaxConfigId, status: TaxConfigStatus) => TaxConfig | undefined
}

export const useTaxConfigsStore = create<TaxConfigsStore>((set, get) => ({
  configs: seedTaxConfigs,
  list: () => get().configs,
  getById: (cid) => get().configs.find((c) => c.tax_config_id === cid),
  listByEntity: (be) => get().configs.filter((c) => c.business_entity_id === be),
  create: (input) => {
    const config: TaxConfig = {
      ...input,
      tax_config_id: id() as TaxConfigId,
      created_at: new Date().toISOString() as TaxConfig['created_at'],
    }
    set((s) => ({ configs: [...s.configs, config] }))
    return config
  },
  setStatus: (cid, status) => {
    const before = get().configs.find((c) => c.tax_config_id === cid)
    if (!before) return undefined
    const after = { ...before, status }
    set((s) => ({
      configs: s.configs.map((c) => (c.tax_config_id === cid ? after : c)),
    }))
    return after
  },
}))

/**
 * XPI-FIN-02 helper. True iff the BE has at least one ACTIVE bank_account_config.
 */
export function hasActiveBankConfig(be: BusinessEntityId): boolean {
  return useBankAccountConfigsStore
    .getState()
    .listByEntity(be)
    .some((c) => c.status === 'ACTIVE')
}

/**
 * XPI-CAT-03 helper. True iff the BE has at least one ACTIVE tax_config.
 */
export function hasActiveTaxConfig(be: BusinessEntityId): boolean {
  return useTaxConfigsStore
    .getState()
    .listByEntity(be)
    .some((c) => c.status === 'ACTIVE')
}
