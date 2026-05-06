/**
 * Sidebar.
 *
 * Primary navigation grouped into five sections: Operations, Catalog,
 * People, Finance, Admin. Items are filtered by the current Person's
 * RoleAssignments — a FRONT_DESK_STAFF doesn't see Admin sections, an
 * AUDITOR sees almost everything in read-only mode.
 *
 * Section visibility follows union semantics: a section appears if any of
 * its items are visible. The rules below intentionally err generous on
 * read access — finer-grained per-route checks live inside features and
 * surface as PermissionDenied screens when violated.
 *
 * Collapsed/expanded state persists in localStorage at fitflow:sidebar.
 */

import { Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts'
import { cn } from '@/lib/utils'
import type { RoleCode } from '@/types/primitives'

interface NavItem {
  label: string
  href: string
  /** Day this feature lands. Visible in the placeholder for handoff clarity. */
  day?: number
  /** Roles allowed to see this nav item. Empty = visible to everyone. */
  roles: RoleCode[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    title: 'Operations',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        day: 5,
        roles: [
          'COMPANY_ADMIN',
          'REGIONAL_MANAGER',
          'LOCATION_MANAGER',
          'FRONT_DESK_STAFF',
          'INSTRUCTOR_COACH',
          'DEPARTMENT_LEAD',
          'AUDITOR',
        ],
      },
      {
        label: 'Point of Sale',
        href: '/pos',
        day: 3,
        roles: ['LOCATION_MANAGER', 'FRONT_DESK_STAFF', 'COMPANY_ADMIN'],
      },
    ],
  },
  {
    title: 'Catalog',
    items: [
      {
        label: 'Offerings',
        href: '/offerings',
        day: 4,
        roles: ['COMPANY_ADMIN', 'REGIONAL_MANAGER', 'AUDITOR'],
      },
    ],
  },
  {
    title: 'People',
    items: [
      {
        label: 'Roles & Access',
        href: '/people/roles',
        day: 3,
        roles: ['SECURITY_ADMIN', 'COMPANY_ADMIN', 'AUDITOR'],
      },
      {
        label: 'Directory',
        href: '/people/directory',
        day: 3,
        roles: [
          'SECURITY_ADMIN',
          'COMPANY_ADMIN',
          'LOCATION_MANAGER',
          'FRONT_DESK_STAFF',
          'AUDITOR',
        ],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Charges',
        href: '/finance/charges',
        roles: [
          'FINANCE_ADMIN',
          'LOCATION_MANAGER',
          'FRONT_DESK_STAFF',
          'COMPANY_ADMIN',
          'AUDITOR',
        ],
      },
      {
        label: 'Refunds',
        href: '/finance/refunds',
        day: 4,
        roles: [
          'FINANCE_ADMIN',
          'LOCATION_MANAGER',
          'FRONT_DESK_STAFF',
          'COMPANY_ADMIN',
          'AUDITOR',
        ],
      },
      {
        label: 'Adjustments',
        href: '/finance/adjustments',
        roles: [
          'FINANCE_ADMIN',
          'LOCATION_MANAGER',
          'COMPANY_ADMIN',
          'AUDITOR',
        ],
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        label: 'Org Hierarchy',
        href: '/admin/org',
        day: 5,
        roles: ['COMPANY_ADMIN', 'REGIONAL_MANAGER', 'AUDITOR'],
      },
      {
        label: 'Audit Log',
        href: '/admin/audit',
        roles: ['SECURITY_ADMIN', 'COMPANY_ADMIN', 'AUDITOR'],
      },
    ],
  },
]

const COLLAPSED_KEY = 'fitflow:sidebar:collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}
function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function Sidebar() {
  const { currentRoleAssignments } = useAuth()
  const { pathname } = useLocation()

  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed)
  useEffect(() => {
    writeCollapsed(collapsed)
  }, [collapsed])

  const heldRoles = useMemo<Set<RoleCode>>(
    () => new Set(currentRoleAssignments.map((r) => r.role_code)),
    [currentRoleAssignments],
  )

  const visibleSections = useMemo(() => {
    const out: Array<NavSection & { items: NavItem[] }> = []
    for (const section of NAV) {
      const items = section.items.filter((item) =>
        item.roles.some((r) => heldRoles.has(r)),
      )
      if (items.length > 0) out.push({ ...section, items })
    }
    return out
  }, [heldRoles])

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] transition-[width] duration-150',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-9 items-center justify-center border-b border-[color:var(--color-border)] text-xs text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface)]"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹  collapse'}
      </button>

      <nav className="flex-1 overflow-y-auto py-3">
        {visibleSections.length === 0 && !collapsed && (
          <div className="px-4 py-6 text-xs text-[color:var(--color-text-secondary)]">
            You have no active roles in this tenant. Contact your admin to
            request access.
          </div>
        )}
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)]">
                {section.title}
              </div>
            )}
            <ul>
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        'group flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-[color:var(--color-primary-light)]',
                        active &&
                          'bg-[color:var(--color-primary-light)] font-medium text-[color:var(--color-primary)]',
                        collapsed && 'justify-center px-2',
                      )}
                    >
                      <span className={cn(collapsed ? 'text-xs' : 'truncate')}>
                        {collapsed ? item.label[0] : item.label}
                      </span>
                      {!collapsed && item.day && (
                        <span className="ml-auto rounded-sm border border-dashed px-1 text-[10px] uppercase text-[color:var(--color-text-secondary)]">
                          Day {item.day}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-[color:var(--color-border)] px-4 py-2 text-[10px] text-[color:var(--color-text-secondary)]">
          Prototype v0.1 · day 2 build
        </div>
      )}
    </aside>
  )
}
