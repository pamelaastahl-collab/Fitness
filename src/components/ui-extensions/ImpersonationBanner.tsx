/**
 * ImpersonationBanner.
 *
 * Per UUM §2.7 INVARIANT: a persistent banner is required on every UI
 * surface during an active ImpersonationSession. The banner is rendered
 * above the TopBar inside AppLayout so it's visible regardless of route.
 *
 * Visual treatment is the highest-contrast warning in the system —
 * amber background, dark text, full-width — so it's impossible to miss.
 * Per the style guide gap (OQ-15), I'm picking amber here; revisit if a
 * dedicated impersonation token is added.
 */

import { Button } from '@/components/ui/button'
import { useImpersonation } from '@/contexts'
import { useAuth } from '@/contexts'
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
      className="flex w-full items-center gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950"
    >
      <span className="text-base">⚠</span>
      <div className="flex-1">
        <span className="font-semibold">
          Acting as {target.given_name} {target.family_name}
        </span>
        {primaryRole && (
          <span className="ml-2 opacity-80">— {formatRole(primaryRole)}</span>
        )}
        <span className="ml-3 text-xs opacity-70">
          (signed in as {impersonator.given_name} {impersonator.family_name})
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full border-amber-400 bg-white text-amber-900 hover:bg-amber-50"
        onClick={stopImpersonation}
      >
        Stop impersonating
      </Button>
    </div>
  )
}
