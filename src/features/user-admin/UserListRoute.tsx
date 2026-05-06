/**
 * User List route — `/people/directory`.
 *
 * Collapses US-UM-001 (paginated list), US-UM-002 (filter), US-UM-003
 * (search) onto one screen per the design.md decisions log. The three
 * stories are UI affordances on the same data, not separate routes.
 *
 * Permission-denied is a first-class screen via Navigate to /no-access.
 * In-page permission gating (e.g. read_contact, invite, export) lives at
 * the affordance level — buttons disable with tooltips rather than
 * disappear, so the actor learns the shape of their permissions.
 */

import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Download, Search, UserPlus, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth, useAudit } from '@/contexts'
import { useRoleAssignmentsStore, useTenantMembershipsStore } from '@/mocks'
import { useInviteTokensStore } from './mockInviteTokens'
import { listAllLocationsForCompany } from './scopeData'
import { UserListTable } from './components/UserListTable'
import { UserListFilters } from './components/UserListFilters'
import { InviteUserDialog } from './components/InviteUserDialog'
import { listDirectory, type DirectoryFilters } from './queries'
import { getCapabilities } from './capabilities'

export function UserListRoute() {
  const { currentPerson, currentCompanyId, currentRoleAssignments } = useAuth()
  const audit = useAudit()
  const caps = useMemo(
    () => getCapabilities(currentRoleAssignments),
    [currentRoleAssignments],
  )

  const canList =
    caps.has('users.list') ||
    caps.has('users.list.location_scoped') ||
    caps.has('users.list.entity_scoped')

  // Subscribe so list re-renders on mutations.
  useRoleAssignmentsStore((s) => s.assignments)
  useTenantMembershipsStore((s) => s.memberships)
  useInviteTokensStore((s) => s.tokens)

  const [filters, setFilters] = useState<DirectoryFilters>({})
  const [inviteOpen, setInviteOpen] = useState(false)

  const availableLocations = useMemo(
    () => listAllLocationsForCompany(currentCompanyId),
    [currentCompanyId],
  )

  const rows = useMemo(() => {
    if (!canList) return []
    return listDirectory(
      {
        company_id: currentCompanyId,
        actor_assignments: currentRoleAssignments,
      },
      filters,
    )
  }, [canList, currentCompanyId, currentRoleAssignments, filters])

  // Audit: emit user_list_viewed once per first paint with these filters.
  // Throttle (FRD spec gap, see design.md §14.2).
  useEffect(() => {
    if (!canList) return
    audit.emit({
      event_type: 'admin.user_list_viewed',
      target_entity_type: 'Company',
      target_entity_id: currentCompanyId,
      after_value: {
        result_count: rows.length,
        filters_applied: Object.keys(filters).filter(
          (k) => (filters as Record<string, unknown>)[k] !== undefined,
        ),
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- emit-once-per-mount semantics
  }, [])

  if (!canList) {
    return <Navigate to="/no-access" replace />
  }

  const isSearchTooShort =
    typeof filters.q === 'string' &&
    filters.q.length > 0 &&
    filters.q.trim().length < 3

  const totalEverInCompany = useTenantMembershipsStore
    .getState()
    .listByCompany(currentCompanyId).length

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto w-full max-w-[var(--container-content)] p-6 md:p-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Directory
            </h1>
            <p className="text-sm text-[color:var(--color-text-secondary)]">
              {rows.length} of {totalEverInCompany}{' '}
              {totalEverInCompany === 1 ? 'person' : 'people'} in this company,
              within your scope.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={-1}>
                  <Button variant="outline" disabled className="cursor-not-allowed">
                    <Download size={16} />
                    Export
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                CSV export is sent by email — available once Notification
                Engine integration ships (US-UM-017).
              </TooltipContent>
            </Tooltip>
            {caps.has('users.invite') && (
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus size={16} />
                Invite user
              </Button>
            )}
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]"
            />
            <Input
              type="search"
              placeholder="Search name, email, phone…"
              className="pl-9"
              value={filters.q ?? ''}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>
          <UserListFilters
            filters={filters}
            onChange={setFilters}
            availableLocations={availableLocations}
          />
        </div>

        {isSearchTooShort && (
          <p className="mb-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-warning-light)] px-3 py-2 text-xs text-amber-900">
            Search needs at least 3 characters.
          </p>
        )}

        {rows.length === 0 && !isSearchTooShort ? (
          <EmptyState
            hasFilters={hasActiveFilters(filters)}
            onClear={() => setFilters({})}
            actor={currentPerson.given_name}
          />
        ) : (
          <UserListTable
            rows={rows}
            canReadContact={caps.has('users.read_contact')}
          />
        )}

        <footer className="mt-4 text-xs text-[color:var(--color-text-muted)]">
          Pagination is in-memory for this prototype. Server-side pagination
          (page_size 25, max 100) is specified in FRD US-UM-001 §FR.
        </footer>

        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          availableLocations={availableLocations}
        />
      </div>
    </TooltipProvider>
  )
}

function hasActiveFilters(f: DirectoryFilters): boolean {
  return Boolean(
    f.q ||
      f.role?.length ||
      f.status?.length ||
      f.location_id?.length ||
      f.created_from ||
      f.created_to,
  )
}

function EmptyState({
  hasFilters,
  onClear,
  actor,
}: {
  hasFilters: boolean
  onClear: () => void
  actor: string
}) {
  if (hasFilters) {
    return (
      <div className="rounded-lg border border-dashed border-[color:var(--color-border-strong)] bg-white px-6 py-12 text-center">
        <Users size={28} className="mx-auto mb-3 text-[color:var(--color-text-muted)]" />
        <h2 className="text-base font-semibold">No users match your filters.</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
          Try adjusting filters, or clear them to see everyone in scope.
        </p>
        <Button variant="outline" className="mt-4" onClick={onClear}>
          Clear all filters
        </Button>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--color-border-strong)] bg-white px-6 py-12 text-center">
      <Users size={28} className="mx-auto mb-3 text-[color:var(--color-text-muted)]" />
      <h2 className="text-base font-semibold">No users in your scope yet.</h2>
      <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
        {actor}, you're seeing everyone you have authority over. Invite the
        first one to get started.
      </p>
    </div>
  )
}
