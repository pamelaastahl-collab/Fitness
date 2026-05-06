/**
 * HomeRoute — the canonical "you've landed" page for the prototype.
 *
 * Day 2 build status board, intentionally narrow in scope: shows what's
 * wired up so reviewers can spot-check progress at a glance. Real demo
 * traffic will redirect from `/` to `/dashboard` on Day 5; until then,
 * the build status doubles as a sitemap.
 */

import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Pencil,
  Receipt,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Undo2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth, useScope } from '@/contexts'
import { useAuditStore } from '@/mocks'
import { formatRelative, formatRole } from '@/lib/format'

export default function HomeRoute() {
  const { currentPerson, currentRoleAssignments } = useAuth()
  const { scope_type, scopedCompany, scopedLocation } = useScope()
  const events = useAuditStore((s) => s.events)
  const recent = events.slice().reverse().slice(0, 6)

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome, {currentPerson.given_name}.
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
          You're acting on <strong>{scopedCompany.name}</strong>
          {scopedLocation && (
            <>
              {' '}— <strong>{scopedLocation.name}</strong>
            </>
          )}
          , scoped at the {scope_type.toLowerCase()} level. Press{' '}
          <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px]">
            ⌘⇧U
          </kbd>{' '}
          to switch acting person.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[17px]">Your active roles</CardTitle>
            <CardDescription>
              At the active company. Roles in other tenants are managed
              separately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentRoleAssignments.length === 0 ? (
              <p className="text-sm text-[color:var(--color-text-secondary)]">
                No active role assignments at this tenant. Default-deny
                applies — protected routes show the PermissionDenied screen.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {currentRoleAssignments.map((r) => (
                  <li
                    key={r.assignment_id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="font-medium">{formatRole(r.role_code)}</span>
                    <span className="text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
                      @ {r.scope_type.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[17px]">Recent activity</CardTitle>
            <CardDescription>
              Latest entries from the audit event store, all tenants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {recent.map((e) => (
                <li
                  key={e.event_id}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="font-mono text-xs text-[color:var(--color-text-primary)]">
                    {e.event_type}
                  </span>
                  <span className="text-xs text-[color:var(--color-text-muted)]">
                    {formatRelative(e.occurred_at)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-[17px]">Sitemap</CardTitle>
          <CardDescription>
            Every feature route ships as a Day-2 placeholder. Sidebar items
            are filtered by role at the active company.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SitemapItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} day={5} />
          <SitemapItem to="/pos" label="Point of Sale" icon={CreditCard} day={3} />
          <SitemapItem to="/offerings" label="Offerings" icon={Tag} day={4} />
          <SitemapItem to="/people/roles" label="Roles & Access" icon={ShieldCheck} day={3} />
          <SitemapItem to="/people/directory" label="Directory" icon={Users} day={3} />
          <SitemapItem to="/finance/charges" label="Charges" icon={Receipt} />
          <SitemapItem to="/finance/refunds" label="Refunds" icon={Undo2} day={4} />
          <SitemapItem to="/finance/adjustments" label="Adjustments" icon={Pencil} />
          <SitemapItem to="/admin/org" label="Org Hierarchy" icon={Building2} day={5} />
          <SitemapItem to="/admin/audit" label="Audit Log" icon={ScrollText} />
          <SitemapItem to="/no-access" label="Permission denied" icon={ShieldAlert} />
        </CardContent>
      </Card>
    </div>
  )
}

interface SitemapItemProps {
  to: string
  label: string
  icon: LucideIcon
  day?: number
}

function SitemapItem({ to, label, icon: Icon, day }: SitemapItemProps) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-2 text-sm transition-colors hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-light)] hover:text-[color:var(--color-primary)]"
    >
      <span className="flex items-center gap-2">
        <Icon size={16} strokeWidth={1.75} />
        <span className="font-medium">{label}</span>
      </span>
      {day && (
        <span className="rounded-sm border border-dashed border-[color:var(--color-border-strong)] px-1 text-[10px] font-medium uppercase text-[color:var(--color-text-muted)]">
          D{day}
        </span>
      )}
    </Link>
  )
}
