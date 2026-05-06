/**
 * TopBar.
 *
 * Persistent chrome above every route. Contains:
 *   - App logo + tenant name (shows current Company)
 *   - ScopePicker (current four-level hierarchy + cascading switcher)
 *   - Notification bell stub (count = audit events in last 24h, scope-filtered)
 *   - Avatar dropdown (profile, dev switcher, sign out)
 *
 * RoleBadge for the current actor sits next to the avatar so the active role
 * at the active scope is always visible.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScopePicker } from './ScopePicker'
import { RoleBadge } from '@/components/ui-extensions/RoleBadge'
import { useAuth, useScope } from '@/contexts'
import { useAuditStore } from '@/mocks'
import type { RoleCode, ScopeType } from '@/types/primitives'

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

const SCOPE_PRECEDENCE: Record<ScopeType, number> = {
  DEPARTMENT: 4,
  LOCATION: 3,
  ENTITY: 2,
  COMPANY: 1,
}

function pickPrimaryRole(
  assignments: ReturnType<typeof useAuth>['currentRoleAssignments'],
  scope_type: ScopeType,
): { role_code: RoleCode; scope_type: ScopeType } | undefined {
  if (assignments.length === 0) return undefined
  // Prefer an assignment that matches the current scope's level. Fall back
  // to the highest-precedence role at any scope.
  const matching = assignments.filter((a) => a.scope_type === scope_type)
  const pool = matching.length > 0 ? matching : assignments
  const sorted = [...pool].sort((a, b) => {
    const sa = SCOPE_PRECEDENCE[a.scope_type] - SCOPE_PRECEDENCE[b.scope_type]
    if (sa !== 0) return -sa
    return ROLE_PRECEDENCE[b.role_code] - ROLE_PRECEDENCE[a.role_code]
  })
  return { role_code: sorted[0].role_code, scope_type: sorted[0].scope_type }
}

function initials(given: string, family: string) {
  return `${given[0] ?? ''}${family[0] ?? ''}`.toUpperCase()
}

export function TopBar() {
  const {
    currentPerson,
    currentRoleAssignments,
    openDevSwitcher,
    signOut,
    currentCompanyId,
  } = useAuth()
  const { scope_type, scopedCompany } = useScope()

  const primary = pickPrimaryRole(currentRoleAssignments, scope_type)

  // Notification count: events in this tenant in the last 24h.
  const events = useAuditStore((s) => s.events)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  const recentCount = events.filter(
    (e) =>
      e.company_id === currentCompanyId &&
      new Date(e.occurred_at).getTime() >= oneDayAgo,
  ).length

  return (
    <header className="flex h-14 items-center gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--color-primary)] text-sm font-bold text-white">
          F
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">FitFlow</span>
          <span className="text-[11px] text-[color:var(--color-text-secondary)]">
            {scopedCompany.name}
          </span>
        </div>
      </div>

      <div className="ml-2">
        <ScopePicker />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface)]"
        >
          <span aria-hidden>🔔</span>
          {recentCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--color-primary)] px-1 text-[10px] font-semibold text-white">
              {recentCount > 99 ? '99+' : recentCount}
            </span>
          )}
        </button>

        {primary && (
          <RoleBadge role={primary.role_code} scopeType={primary.scope_type} />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 rounded-full px-1.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[color:var(--color-primary-light)] text-xs font-medium text-[color:var(--color-primary)]">
                  {initials(currentPerson.given_name, currentPerson.family_name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">
                {currentPerson.given_name} {currentPerson.family_name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm">
                  {currentPerson.given_name} {currentPerson.family_name}
                </span>
                {currentPerson.primary_email && (
                  <span className="text-xs font-normal text-[color:var(--color-text-secondary)]">
                    {currentPerson.primary_email}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Profile (placeholder)</DropdownMenuItem>
            <DropdownMenuItem onSelect={openDevSwitcher}>
              Dev: switch acting person…
              <span className="ml-auto text-[10px] text-[color:var(--color-text-secondary)]">
                ⌘⇧U
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
