/**
 * Dev-mode user switcher.
 *
 * Opened by Cmd+Shift+U / Ctrl+Shift+U (handler lives in AuthContext).
 * Lets demos swap to any seeded Person instantly so the same screen can be
 * shown from different role-personas without auth ceremony.
 *
 * Not part of the production UX. Kept inside /src/contexts/ rather than
 * /src/components/ because it's tightly coupled to AuthContext.
 */

import { useMemo } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getCompanyById,
  listCompanies,
  listPersons,
  listRoleAssignmentsForPerson,
  listTenantMembershipsByPerson,
} from '@/mocks'
import type { CompanyId, RoleCode } from '@/types/primitives'
import { useAuth } from './AuthContext'

interface PersonRow {
  person_id: import('@/types/primitives').PersonId
  display: string
  searchKey: string
  role_summary: string
  email?: string
  company_id: CompanyId
}

const ROLE_PRECEDENCE: Record<RoleCode, number> = {
  PLATFORM_SUPPORT: 100,
  COMPANY_ADMIN: 90,
  SECURITY_ADMIN: 80,
  FINANCE_ADMIN: 75,
  TAX_BANK_CONFIG_ADMIN: 75,
  REGIONAL_MANAGER: 70,
  LOCATION_MANAGER: 60,
  AUDITOR: 55,
  DEPARTMENT_LEAD: 50,
  INSTRUCTOR_COACH: 45,
  FRONT_DESK_STAFF: 40,
  GUARDIAN: 20,
  MEMBER: 10,
}

function highestRole(personId: PersonRow['person_id']): RoleCode | undefined {
  const ras = listRoleAssignmentsForPerson(personId)
  if (ras.length === 0) return undefined
  return ras
    .slice()
    .sort((a, b) => ROLE_PRECEDENCE[b.role_code] - ROLE_PRECEDENCE[a.role_code])[0]
    .role_code
}

export function UserSwitcher() {
  const { isDevSwitcherOpen, closeDevSwitcher, switchToPerson, currentPerson } =
    useAuth()

  const rowsByCompany = useMemo<Map<CompanyId, PersonRow[]>>(() => {
    const grouped = new Map<CompanyId, PersonRow[]>()
    for (const company of listCompanies()) {
      grouped.set(company.company_id, [])
    }
    for (const person of listPersons()) {
      const memberships = listTenantMembershipsByPerson(person.person_id).filter(
        (m) => m.status === 'ACTIVE' || m.status === 'INVITED',
      )
      const role = highestRole(person.person_id)
      const role_summary = role ? role.replace(/_/g, ' ').toLowerCase() : 'no role'
      const display = `${person.given_name} ${person.family_name}`
      const searchKey = [
        display,
        role_summary,
        person.primary_email ?? '',
        person.person_type,
      ]
        .join(' ')
        .toLowerCase()
      for (const m of memberships) {
        const list = grouped.get(m.company_id)
        if (!list) continue
        list.push({
          person_id: person.person_id,
          display,
          searchKey,
          role_summary,
          email: person.primary_email,
          company_id: m.company_id,
        })
      }
    }
    // Sort each tenant's rows by role precedence (highest first), then name.
    for (const list of grouped.values()) {
      list.sort((a, b) => {
        const ra = highestRole(a.person_id)
        const rb = highestRole(b.person_id)
        const sa = ra ? ROLE_PRECEDENCE[ra] : 0
        const sb = rb ? ROLE_PRECEDENCE[rb] : 0
        if (sa !== sb) return sb - sa
        return a.display.localeCompare(b.display)
      })
    }
    return grouped
  }, [])

  return (
    <Dialog open={isDevSwitcherOpen} onOpenChange={(open) => !open && closeDevSwitcher()}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b px-4 pb-3 pt-4">
          <DialogTitle>Dev: switch acting person</DialogTitle>
          <DialogDescription>
            Demo aid. Swaps the current Person without auth. Cmd+Shift+U toggles this panel.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search by name, role, email…" />
          <CommandList className="max-h-[420px]">
            <CommandEmpty>No matching person.</CommandEmpty>
            {[...rowsByCompany.entries()].map(([companyId, rows]) => {
              const company = getCompanyById(companyId)
              if (!company || rows.length === 0) return null
              return (
                <CommandGroup key={companyId} heading={company.name}>
                  {rows.map((row) => (
                    <CommandItem
                      key={`${row.company_id}:${row.person_id}`}
                      value={`${row.display}|${row.searchKey}|${row.company_id}`}
                      onSelect={() => switchToPerson(row.person_id, row.company_id)}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex flex-col">
                        <span
                          className={
                            row.person_id === currentPerson.person_id
                              ? 'font-medium text-[color:var(--color-primary)]'
                              : 'font-medium'
                          }
                        >
                          {row.display}
                          {row.person_id === currentPerson.person_id && (
                            <span className="ml-2 text-xs text-[color:var(--color-text-secondary)]">
                              (current)
                            </span>
                          )}
                        </span>
                        {row.email && (
                          <span className="text-xs text-[color:var(--color-text-secondary)]">
                            {row.email}
                          </span>
                        )}
                      </div>
                      <span className="rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]">
                        {row.role_summary}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
