/**
 * Roles tab — assign/revoke RoleAssignments for a Person.
 *
 * Sole-admin guard: revoke button is disabled with a tooltip when removing
 * the role would leave 0 active SECURITY_ADMIN at COMPANY scope. The mutation
 * layer also re-checks (defense in depth).
 *
 * Each role row shows: role badge, scope label, granted-by + granted-at,
 * reason code if any, and a Revoke button gated on actor capability.
 */

import { useMemo, useState } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RoleBadge } from '@/components/ui-extensions/RoleBadge'
import { useAuth, useToast } from '@/contexts'
import { formatRelative, formatRole, formatScopeType } from '@/lib/format'
import {
  getBusinessEntityById,
  getDepartmentById,
  getLocationById,
  getPersonById,
  useRoleAssignmentsStore,
} from '@/mocks'
import type {
  BusinessEntityId,
  DepartmentId,
  LocationId,
  Person,
  RoleAssignment,
  ScopeType,
  UUID,
} from '@/types/primitives'
import {
  canRevokeRole,
  getCapabilities,
} from '../capabilities'
import { isLastSecurityAdminInCompany } from '../queries'
import { revokeRole } from '../mutations'
import { AssignRoleDialog } from './AssignRoleDialog'
import { listAllLocationsForCompany } from '../scopeData'

interface ProfileRolesTabProps {
  person: Person
  assignments: RoleAssignment[]
}

export function ProfileRolesTab({ person, assignments }: ProfileRolesTabProps) {
  const { currentPerson, currentCompanyId, currentRoleAssignments } = useAuth()
  const toast = useToast()
  const caps = useMemo(
    () => getCapabilities(currentRoleAssignments),
    [currentRoleAssignments],
  )
  const [assignOpen, setAssignOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<RoleAssignment | undefined>()
  const [revokeReason, setRevokeReason] = useState('')

  const canAssign =
    caps.has('users.assign_role.unrestricted') ||
    caps.has('users.assign_role.location_only')

  const availableLocations = listAllLocationsForCompany(currentCompanyId)

  function handleRevoke() {
    if (!revokeTarget || revokeReason.trim().length < 5) return
    const result = revokeRole(
      { actor_id: currentPerson.person_id, company_id: currentCompanyId },
      revokeTarget.assignment_id,
      revokeReason.trim(),
    )
    if (!result.ok) {
      if (result.error === 'sole_admin_protected') {
        toast.error('Sole-admin protected', {
          description:
            'This person is the only Security Admin in this company. Assign another before revoking.',
        })
      } else {
        toast.error('Could not revoke')
      }
      return
    }
    toast.success('Role revoked', {
      description: `${formatRole(revokeTarget.role_code)} removed from ${person.given_name} ${person.family_name}.`,
    })
    setRevokeTarget(undefined)
    setRevokeReason('')
  }

  // Re-render trigger
  useRoleAssignmentsStore((s) => s.assignments)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)]">
          {assignments.length} active{' '}
          {assignments.length === 1 ? 'role' : 'roles'}
        </h2>
        {canAssign && (
          <Button onClick={() => setAssignOpen(true)} size="sm">
            <ShieldCheck size={14} /> Assign role
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <p className="rounded-md border border-dashed border-[color:var(--color-border-strong)] bg-white px-4 py-6 text-sm text-[color:var(--color-text-muted)]">
          No active role assignments. Use Assign role to grant access.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)] bg-white">
          {assignments.map((a) => (
            <RoleRow
              key={a.assignment_id}
              assignment={a}
              actorAssignments={currentRoleAssignments}
              canRevoke={canRevokeRole(currentRoleAssignments, a.role_code)}
              onRevokeClick={() => setRevokeTarget(a)}
            />
          ))}
        </ul>
      )}

      <AssignRoleDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        targetPersonId={person.person_id}
        targetPersonName={`${person.given_name} ${person.family_name}`}
        availableLocations={availableLocations}
      />

      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setRevokeTarget(undefined)
            setRevokeReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Revoke {revokeTarget && formatRole(revokeTarget.role_code)}?
            </DialogTitle>
            <DialogDescription>
              {person.given_name} {person.family_name} will lose access granted
              by this role. Sessions refresh within 60s (simulated).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Captured in the audit log."
              rows={3}
              autoFocus
            />
            <p className="text-xs text-[color:var(--color-text-muted)]">
              At least 5 characters.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeReason.trim().length < 5}
            >
              <Trash2 size={14} /> Revoke role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function scopeLabelFor(scope_type: ScopeType, scope_id: UUID): string {
  if (scope_type === 'COMPANY') return formatScopeType(scope_type)
  if (scope_type === 'LOCATION') {
    return getLocationById(scope_id as unknown as LocationId)?.name ?? 'Location'
  }
  if (scope_type === 'ENTITY') {
    return (
      getBusinessEntityById(scope_id as unknown as BusinessEntityId)?.name ??
      'Business Entity'
    )
  }
  if (scope_type === 'DEPARTMENT') {
    return (
      getDepartmentById(scope_id as unknown as DepartmentId)?.name ??
      'Department'
    )
  }
  return formatScopeType(scope_type)
}

function RoleRow({
  assignment,
  actorAssignments: _actor,
  canRevoke,
  onRevokeClick,
}: {
  assignment: RoleAssignment
  actorAssignments: RoleAssignment[]
  canRevoke: boolean
  onRevokeClick: () => void
}) {
  const grantor = getPersonById(assignment.granted_by_person_id)
  const isLast = isLastSecurityAdminInCompany(
    assignment.assignment_id,
    assignment.company_id,
  )
  const revokeDisabled = !canRevoke || isLast

  const reason = isLast
    ? 'Sole-admin protected — cannot revoke the only Security Admin.'
    : !canRevoke
    ? 'Your role does not permit revoking this assignment.'
    : ''

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge
            role={assignment.role_code}
            scopeLabel={scopeLabelFor(assignment.scope_type, assignment.scope_id)}
          />
          {isLast && (
            <span className="rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
              Sole admin
            </span>
          )}
        </div>
        <div className="text-xs text-[color:var(--color-text-muted)]">
          Granted {formatRelative(assignment.granted_at)} by{' '}
          {grantor
            ? `${grantor.given_name} ${grantor.family_name}`
            : 'unknown'}
          {assignment.reason_code && (
            <span> · reason: {assignment.reason_code}</span>
          )}
        </div>
      </div>
      {revokeDisabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={-1}>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="cursor-not-allowed"
              >
                Revoke
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">{reason}</TooltipContent>
        </Tooltip>
      ) : (
        <Button variant="outline" size="sm" onClick={onRevokeClick}>
          Revoke
        </Button>
      )}
    </li>
  )
}
