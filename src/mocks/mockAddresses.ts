/**
 * Mock Addresses.
 *
 * Prototype-scope shape (see types/primitives.ts). One Address per Location.
 * Addresses are referenced by location_id but kept as a separate store because
 * the OH spec defers to an "Address & Geolocation Service" — we mirror that
 * boundary in the mock layer.
 */

import { create } from 'zustand'
import type { Address, AddressId } from '@/types/primitives'
import { id } from './_helpers'

export const ADDRESS_FITFLOW_AUCKLAND_ID =
  'a0000001-0000-0000-0000-000000000001' as AddressId
export const ADDRESS_FITFLOW_WELLINGTON_ID =
  'a0000001-0000-0000-0000-000000000002' as AddressId
export const ADDRESS_IRON_BROOKLYN_ID =
  'a0000001-0000-0000-0000-000000000003' as AddressId
export const ADDRESS_IRON_QUEENS_ID =
  'a0000001-0000-0000-0000-000000000004' as AddressId
export const ADDRESS_IRON_MANHATTAN_ID =
  'a0000001-0000-0000-0000-000000000005' as AddressId
export const ADDRESS_IRON_BOULDER_ID =
  'a0000001-0000-0000-0000-000000000006' as AddressId

export const seedAddresses: Address[] = [
  {
    address_id: ADDRESS_FITFLOW_AUCKLAND_ID,
    line1: '154 Karangahape Road',
    city: 'Auckland Central',
    region: 'Auckland',
    postal_code: '1010',
    country_code: 'NZL',
    lat: -36.8568,
    lng: 174.7633,
  },
  {
    address_id: ADDRESS_FITFLOW_WELLINGTON_ID,
    line1: '88 Cuba Street',
    line2: 'Level 2',
    city: 'Te Aro',
    region: 'Wellington',
    postal_code: '6011',
    country_code: 'NZL',
    lat: -41.2945,
    lng: 174.7762,
  },
  {
    address_id: ADDRESS_IRON_BROOKLYN_ID,
    line1: '230 Wythe Avenue',
    city: 'Brooklyn',
    region: 'NY',
    postal_code: '11249',
    country_code: 'USA',
    lat: 40.7196,
    lng: -73.9573,
  },
  {
    address_id: ADDRESS_IRON_QUEENS_ID,
    line1: '47-12 Vernon Boulevard',
    city: 'Long Island City',
    region: 'NY',
    postal_code: '11101',
    country_code: 'USA',
    lat: 40.7415,
    lng: -73.9583,
  },
  {
    address_id: ADDRESS_IRON_MANHATTAN_ID,
    line1: '1140 Broadway',
    line2: 'Suite 605',
    city: 'New York',
    region: 'NY',
    postal_code: '10001',
    country_code: 'USA',
    lat: 40.745,
    lng: -73.9886,
  },
  {
    address_id: ADDRESS_IRON_BOULDER_ID,
    line1: '1942 Broadway',
    city: 'Boulder',
    region: 'CO',
    postal_code: '80302',
    country_code: 'USA',
    lat: 40.0148,
    lng: -105.2806,
  },
]

interface AddressesStore {
  addresses: Address[]
  list: () => Address[]
  getById: (address_id: AddressId) => Address | undefined
  create: (input: Omit<Address, 'address_id'>) => Address
  update: (
    address_id: AddressId,
    patch: Partial<Omit<Address, 'address_id'>>,
  ) => Address | undefined
}

export const useAddressesStore = create<AddressesStore>((set, get) => ({
  addresses: seedAddresses,
  list: () => get().addresses,
  getById: (address_id) =>
    get().addresses.find((a) => a.address_id === address_id),
  create: (input) => {
    const address: Address = { ...input, address_id: id() as AddressId }
    set((s) => ({ addresses: [...s.addresses, address] }))
    return address
  },
  update: (address_id, patch) => {
    const before = get().addresses.find((a) => a.address_id === address_id)
    if (!before) return undefined
    const after = { ...before, ...patch }
    set((s) => ({
      addresses: s.addresses.map((a) => (a.address_id === address_id ? after : a)),
    }))
    return after
  },
}))

export function listAddresses() {
  return useAddressesStore.getState().list()
}
export function getAddressById(address_id: AddressId) {
  return useAddressesStore.getState().getById(address_id)
}
