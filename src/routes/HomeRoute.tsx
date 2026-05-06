/**
 * HomeRoute — the canonical "you've landed" page for the prototype.
 *
 * Day 2 build status board, intentionally narrow in scope: shows what's
 * wired up so reviewers can spot-check progress at a glance. Real demo
 * traffic will redirect from `/` to `/dashboard` on Day 5; until then,
 * the build status doubles as a sitemap.
 */

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
import { formatRelative } from '@/lib/format'

export default function HomeRoute() {
  const { currentPerson, currentRoleAssignments } = useAuth()
  const { scope_type, scopedCompany, scopedLocation } = useScope()
  const events = useAuditStore((s) => s.events)
  const recent = events.slice().reverse().slice(0, 5)

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {currentPerson.given_name}.
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
          You're acting on {scopedCompany.name}
          {scopedLocation && ` — ${scopedLocation.name}`}, scoped at{' '}
          {scope_type.toLowerCase()} level. Cmd+Shift+U opens the dev person
          switcher.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your active roles</CardTitle>
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
              <ul className="space-y-1 text-sm">
                {currentRoleAssignments.map((r) => (
                  <li key={r.assignment_id}>
                    <span className="font-medium">{r.role_code}</span>
                    <span className="ml-2 text-[color:var(--color-text-secondary)]">
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
            <CardTitle className="text-base">Recent activity</CardTitle>
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
                  <span className="font-mono text-xs">{e.event_type}</span>
                  <span className="text-xs text-[color:var(--color-text-secondary)]">
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
          <CardTitle className="text-base">Sitemap</CardTitle>
          <CardDescription>
            Every feature route ships as a Day-2 placeholder. Sidebar items
            are filtered by role at the active company.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <SitemapItem to="/dashboard" label="Dashboard" day={5} />
          <SitemapItem to="/pos" label="Point of Sale" day={3} />
          <SitemapItem to="/offerings" label="Offerings" day={4} />
          <SitemapItem to="/people/roles" label="Roles & Access" day={3} />
          <SitemapItem to="/people/directory" label="Directory" day={3} />
          <SitemapItem to="/finance/charges" label="Charges" />
          <SitemapItem to="/finance/refunds" label="Refunds" day={4} />
          <SitemapItem to="/finance/adjustments" label="Adjustments" />
          <SitemapItem to="/admin/org" label="Org Hierarchy" day={5} />
          <SitemapItem to="/admin/audit" label="Audit Log" />
          <SitemapItem to="/no-access" label="Permission denied" />
        </CardContent>
      </Card>
    </div>
  )
}

function SitemapItem({ to, label, day }: { to: string; label: string; day?: number }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-md border border-[color:var(--color-border)] px-3 py-2 hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-light)]"
    >
      <span className="font-medium">{label}</span>
      {day && (
        <span className="rounded-sm border border-dashed px-1 text-[10px] uppercase text-[color:var(--color-text-secondary)]">
          Day {day}
        </span>
      )}
    </Link>
  )
}
