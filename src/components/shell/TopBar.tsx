/**
 * TopBar.
 *
 * Persistent chrome above every route. Per style guide §Layout the top nav
 * is 60px tall.
 *
 * Contents:
 *   - App logo + tenant name (current Company)
 *   - ScopePicker (full hierarchy + cascading switcher)
 *   - Notification bell — count = audit events in last 24h, scope-filtered
 *   - RoleBadge for the actor's primary role at the active scope
 *   - Avatar dropdown (profile, dev switcher, sign out)
 */

import { Bell, LogOut, UserCog } from 'lucide-react'
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
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-6">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md bg-[color:var(--color-primary)] font-display text-sm font-extrabold text-[color:var(--color-primary-foreground)]"
          aria-hidden
        >
          F
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-sm font-bold tracking-tight">
            FitFlow
          </span>
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
          aria-label={`Notifications — ${recentCount} in last 24h`}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-text-primary)]"
        >
          <Bell size={18} strokeWidth={1.75} />
          {recentCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--color-primary)] px-1 text-[10px] font-semibold text-[color:var(--color-primary-foreground)]">
              {recentCount > 99 ? '99+' : recentCount}
            </span>
          )}
        </button>

        {primary && (
          <RoleBadge role={primary.role_code} scopeType={primary.scope_type} />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-full px-1.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[color:var(--color-primary-light)] text-xs font-semibold text-[color:var(--color-primary)]">
                  {initials(currentPerson.given_name, currentPerson.family_name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">
                {currentPerson.given_name} {currentPerson.family_name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm">
                  {currentPerson.given_name} {currentPerson.family_name}
                </span>
                {currentPerson.primary_email && (
                  <span className="font-normal text-xs text-[color:var(--color-text-muted)]">
                    {currentPerson.primary_email}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-[color:var(--color-text-muted)]">
              Profile
              <span className="ml-auto text-[10px] uppercase">soon</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={openDevSwitcher}>
              <UserCog size={16} strokeWidth={1.75} />
              <span>Switch acting person…</span>
              <span className="ml-auto text-[10px] text-[color:var(--color-text-muted)]">
                ⌘⇧U
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>
              <LogOut size={16} strokeWidth={1.75} />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
