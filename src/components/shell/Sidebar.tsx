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
 * Width 240px expanded / 64px collapsed; nav items h-10 with 20px icons
 * always visible; active item carries a 3px primary left-border accent
 * per style guide §Navigation. Collapsed state persists in localStorage
 * at fitflow:sidebar:collapsed.
 */

import { Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Receipt,
  ScrollText,
  ShieldCheck,
  Tag,
  Undo2,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts'
import { cn } from '@/lib/utils'
import type { RoleCode } from '@/types/primitives'

type IconType = ComponentType<{ className?: string; size?: number; strokeWidth?: number }>

interface NavItem {
  label: string
  href: string
  icon: IconType
  /** Day this feature lands. Visible in the placeholder for handoff clarity. */
  day?: number
  /** Roles allowed to see this nav item. */
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
        icon: LayoutDashboard,
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
        icon: CreditCard,
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
        icon: Tag,
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
        icon: ShieldCheck,
        day: 3,
        roles: ['SECURITY_ADMIN', 'COMPANY_ADMIN', 'AUDITOR'],
      },
      {
        label: 'Directory',
        href: '/people/directory',
        icon: Users,
        day: 3,
        roles: [
          'SECURITY_ADMIN',
          'COMPANY_ADMIN',
          'LOCATION_MANAGER',
          'AUDITOR',
          'FINANCE_ADMIN',
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
        icon: Receipt,
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
        icon: Undo2,
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
        icon: Pencil,
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
        icon: Building2,
        day: 5,
        roles: ['COMPANY_ADMIN', 'REGIONAL_MANAGER', 'AUDITOR'],
      },
      {
        label: 'Audit Log',
        href: '/admin/audit',
        icon: ScrollText,
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
    const out: NavSection[] = []
    for (const section of NAV) {
      const items = section.items.filter((item) =>
        item.roles.some((r) => heldRoles.has(r)),
      )
      if (items.length > 0) out.push({ ...section, items })
    }
    return out
  }, [heldRoles])

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] transition-[width] duration-200 ease',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-10 items-center gap-2 border-b border-[color:var(--color-border)] px-3 text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface)]"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ToggleIcon size={18} strokeWidth={1.75} />
        {!collapsed && <span className="text-xs">Collapse</span>}
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
              <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                {section.title}
              </div>
            )}
            <ul>
              {section.items.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        // Base item — h-10, px-3, radius-md, text-sm
                        'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-[color:var(--color-text-primary)] transition-colors',
                        // Hover — bg-surface
                        'hover:bg-[color:var(--color-surface)]',
                        // Active — bg-primary-light, text-primary, 3px left border
                        active &&
                          'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-[color:var(--color-primary)]',
                        // Spacing tweaks per state
                        collapsed && 'justify-center px-0',
                      )}
                    >
                      <Icon size={20} strokeWidth={1.75} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.day && (
                            <span className="ml-auto rounded-sm border border-dashed border-[color:var(--color-border-strong)] px-1 text-[10px] font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">
                              D{item.day}
                            </span>
                          )}
                        </>
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
        <div className="border-t border-[color:var(--color-border)] px-4 py-2 text-[11px] text-[color:var(--color-text-muted)]">
          Prototype v0.1 · day 2 build
        </div>
      )}
    </aside>
  )
}
