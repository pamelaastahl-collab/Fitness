/**
 * Scope-aware location list helpers for filter UIs.
 *
 * Wraps the OH mock layer so feature components don't reach across stores.
 */

import type { CompanyId, Location } from '@/types/primitives'
import { useLocationsStore } from '@/mocks/mockLocations'

export function listAllLocationsForCompany(company_id: CompanyId): Location[] {
  return useLocationsStore
    .getState()
    .list()
    .filter((l) => l.company_id === company_id && l.status === 'ACTIVE')
}
