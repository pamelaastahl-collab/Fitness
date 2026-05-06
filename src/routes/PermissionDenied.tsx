/**
 * PermissionDenied — first-class screen rendered when a route is accessed
 * without sufficient role/scope.
 *
 * Per CLAUDE.md: "Permission-denied states are first-class screens, not
 * generic 403s." This screen tells the actor *which* role would unlock the
 * route and offers a mocked "Request access" path so the demo can show the
 * full handoff motion.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts'
import { formatRole } from '@/lib/format'
import type { RoleCode } from '@/types/primitives'

interface PermissionDeniedProps {
  /** The route the actor tried to reach. Defaults to current pathname. */
  attemptedRoute?: string
  /** Roles that would have granted access. */
  requiredRoles?: RoleCode[]
  /** Optional friendly explanation. */
  description?: string
}

export function PermissionDenied({
  attemptedRoute,
  requiredRoles,
  description,
}: PermissionDeniedProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const route = attemptedRoute ?? location.pathname

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-8 py-16">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border-strong)] px-2.5 py-0.5 text-xs uppercase tracking-wider text-[color:var(--color-text-secondary)]">
          Permission denied
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          You don't have access to this view.
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">
          {description ??
            `Your active role assignments don't grant you access at the current scope. Real access decisions are made server-side at every request.`}
        </p>
      </div>

      <dl className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[color:var(--color-text-secondary)]">Attempted route</dt>
          <dd className="font-mono text-xs">{route}</dd>
        </div>
        {requiredRoles && requiredRoles.length > 0 && (
          <div className="mt-2 flex justify-between gap-3">
            <dt className="text-[color:var(--color-text-secondary)]">
              Roles that would unlock this
            </dt>
            <dd className="text-right">
              {requiredRoles.map((r) => formatRole(r)).join(', ')}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex items-center gap-3">
        <Button
          className="rounded-full"
          onClick={() =>
            toast.success('Request submitted', {
              description:
                'Your administrator will review the request. (Mocked in prototype.)',
            })
          }
        >
          Request access
        </Button>
        <Button
          variant="ghost"
          className="rounded-full"
          onClick={() => navigate(-1)}
        >
          Go back
        </Button>
      </div>
    </div>
  )
}
