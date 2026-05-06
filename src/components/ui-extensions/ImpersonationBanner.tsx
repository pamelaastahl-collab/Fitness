/**
 * ImpersonationBanner.
 *
 * Per UUM §2.7 INVARIANT: a persistent banner is required on every UI
 * surface during an active ImpersonationSession. The banner is rendered
 * above the TopBar inside AppLayout so it's visible regardless of route.
 *
 * Visual treatment uses the FitFlow `--color-warning` family — same tokens
 * as toast warnings — with a thicker bottom border and a left accent so
 * it reads as more emphatic than a transient warning toast and impossible
 * to miss while scrolling.
 *
 * "Acting as {name} — {role} (signed in as {impersonator})" copy fulfils
 * the dual-attribution requirement (XPI-AUTH-06).
 */

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, useImpersonation } from '@/contexts'
import { listRoleAssignmentsForPerson } from '@/mocks'
import { formatRole } from '@/lib/format'

export function ImpersonationBanner() {
  const { isImpersonating, impersonator, target, stopImpersonation } =
    useImpersonation()
  const { currentCompanyId } = useAuth()

  if (!isImpersonating || !target || !impersonator) return null

  const targetRoles = listRoleAssignmentsForPerson(target.person_id).filter(
    (r) => r.company_id === currentCompanyId,
  )
  const primaryRole = targetRoles[0]?.role_code

  return (
    <div
      role="alert"
      className="flex w-full shrink-0 items-center gap-3 border-b-2 border-[color:var(--color-warning)] bg-[color:var(--color-warning-light)] px-6 py-2 text-sm text-[color:var(--color-text-primary)] shadow-[inset_3px_0_0_var(--color-warning)]"
    >
      <AlertTriangle
        size={18}
        strokeWidth={2}
        className="text-[color:var(--color-warning)]"
      />
      <div className="flex-1">
        <span className="font-semibold">
          Acting as {target.given_name} {target.family_name}
        </span>
        {primaryRole && (
          <span className="ml-2 text-[color:var(--color-text-secondary)]">
            — {formatRole(primaryRole)}
          </span>
        )}
        <span className="ml-3 text-xs text-[color:var(--color-text-muted)]">
          Signed in as {impersonator.given_name} {impersonator.family_name}.
          All actions emit dual-attributed audit events.
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full border-[color:var(--color-warning)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-warning-light)]"
        onClick={stopImpersonation}
      >
        Stop impersonating
      </Button>
    </div>
  )
}
