/**
 * Add-role-to-existing-person dialog. Used from the Roles tab on a profile.
 * SoD pre-check, scope picker, step-up for privileged roles. Same plumbing
 * as InviteUserDialog step 2 but shorn of the email/duplicate path.
 */

import { useMemo, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { StepUpConfirmDialog } from '@/components/ui-extensions/StepUpConfirmDialog'
import { useAuth, useToast } from '@/contexts'
import { formatRole, formatScopeType } from '@/lib/format'
import { useRoleAssignmentsStore } from '@/mocks'
import type {
  Location,
  PersonId,
  RoleCode,
  ScopeType,
  UUID,
} from '@/types/primitives'
import {
  canAssignRole,
  isPrivilegedRole,
} from '../capabilities'
import { assignRoleToExistingPerson } from '../mutations'

const ROLE_OPTIONS: RoleCode[] = [
  'COMPANY_ADMIN',
  'SECURITY_ADMIN',
  'FINANCE_ADMIN',
  'TAX_BANK_CONFIG_ADMIN',
  'AUDITOR',
  'REGIONAL_MANAGER',
  'LOCATION_MANAGER',
  'DEPARTMENT_LEAD',
  'INSTRUCTOR_COACH',
  'FRONT_DESK_STAFF',
]

const ROLE_DEFAULT_SCOPE: Record<RoleCode, ScopeType> = {
  COMPANY_ADMIN: 'COMPANY',
  SECURITY_ADMIN: 'COMPANY',
  FINANCE_ADMIN: 'ENTITY',
  TAX_BANK_CONFIG_ADMIN: 'ENTITY',
  AUDITOR: 'COMPANY',
  REGIONAL_MANAGER: 'ENTITY',
  LOCATION_MANAGER: 'LOCATION',
  DEPARTMENT_LEAD: 'DEPARTMENT',
  INSTRUCTOR_COACH: 'DEPARTMENT',
  FRONT_DESK_STAFF: 'LOCATION',
  PLATFORM_SUPPORT: 'COMPANY',
  MEMBER: 'LOCATION',
  GUARDIAN: 'LOCATION',
}

interface AssignRoleDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  targetPersonId: PersonId
  targetPersonName: string
  availableLocations: Location[]
  onAssigned?: () => void
}

export function AssignRoleDialog({
  open,
  onOpenChange,
  targetPersonId,
  targetPersonName,
  availableLocations,
  onAssigned,
}: AssignRoleDialogProps) {
  const { currentPerson, currentCompanyId, currentRoleAssignments } = useAuth()
  const toast = useToast()
  const [role, setRole] = useState<RoleCode | ''>('')
  const [scopeId, setScopeId] = useState('')
  const [stepUpOpen, setStepUpOpen] = useState(false)

  const assignableRoles = useMemo(
    () => ROLE_OPTIONS.filter((r) => canAssignRole(currentRoleAssignments, r)),
    [currentRoleAssignments],
  )

  const sodConflict = useMemo(() => {
    if (!role) return undefined
    const scope_type = ROLE_DEFAULT_SCOPE[role]
    const scope_id = (scope_type === 'COMPANY'
      ? (currentCompanyId as unknown as UUID)
      : (scopeId as unknown as UUID)) as UUID
    if (!scope_id) return undefined
    return useRoleAssignmentsStore
      .getState()
      .validateSoD(targetPersonId, currentCompanyId, role, scope_type, scope_id)[0]
  }, [role, scopeId, currentCompanyId, targetPersonId])

  function commit(stepUp?: { step_up_token: string; reason: string }) {
    if (!role) return
    const scope_type = ROLE_DEFAULT_SCOPE[role]
    const scope_id =
      scope_type === 'COMPANY'
        ? (currentCompanyId as unknown as UUID)
        : (scopeId as unknown as UUID)
    if (!scope_id) {
      toast.error('Pick a scope')
      return
    }
    const result = assignRoleToExistingPerson(
      {
        actor_id: currentPerson.person_id,
        company_id: currentCompanyId,
        step_up_token: stepUp?.step_up_token,
        step_up_reason: stepUp?.reason,
      },
      { person_id: targetPersonId, role_code: role, scope_type, scope_id },
    )
    if (!result.ok) {
      if (result.error === 'sod_violation') {
        toast.error('Separation-of-duties conflict', {
          description: `${formatRole(result.conflicts[0]!.existing_role)} and ${formatRole(role)} cannot coexist on this person.`,
        })
      } else if (result.error === 'duplicate') {
        toast.warn('Already assigned', {
          description: 'This role at this scope is already active.',
        })
      }
      return
    }
    toast.success('Role assigned', {
      description: `${formatRole(role)} granted to ${targetPersonName}.`,
    })
    setRole('')
    setScopeId('')
    onAssigned?.()
    onOpenChange(false)
  }

  function handleConfirm() {
    if (!role) return
    if (isPrivilegedRole(role)) {
      setStepUpOpen(true)
      return
    }
    commit()
  }

  const needsScope = role && ROLE_DEFAULT_SCOPE[role] !== 'COMPANY'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign role to {targetPersonName}</DialogTitle>
            <DialogDescription>
              Choose a role and the scope at which it applies. Conflicts and
              step-up requirements are surfaced before submission.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as RoleCode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-2">
                        <span>{formatRole(r)}</span>
                        {isPrivilegedRole(r) && (
                          <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                            step-up
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsScope && (
              <div className="space-y-1.5">
                <Label>{formatScopeType(ROLE_DEFAULT_SCOPE[role as RoleCode])}</Label>
                <Select value={scopeId} onValueChange={setScopeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.map((loc) => (
                      <SelectItem key={loc.location_id} value={loc.location_id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sodConflict && (
              <Alert>
                <ShieldAlert />
                <AlertTitle>Separation-of-duties conflict</AlertTitle>
                <AlertDescription>
                  {targetPersonName} already holds{' '}
                  <strong>{formatRole(sodConflict.existing_role)}</strong> at
                  this scope. Granting{' '}
                  <strong>{formatRole(sodConflict.proposed_role)}</strong>{' '}
                  would violate platform SoD policy.
                </AlertDescription>
              </Alert>
            )}

            {role && isPrivilegedRole(role) && !sodConflict && (
              <Alert>
                <ShieldAlert />
                <AlertTitle>Privileged role</AlertTitle>
                <AlertDescription>
                  Granting {formatRole(role)} requires step-up confirmation
                  with a reason captured in the audit log.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !role ||
                Boolean(sodConflict) ||
                (Boolean(needsScope) && !scopeId)
              }
              onClick={handleConfirm}
            >
              Assign role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {role && (
        <StepUpConfirmDialog
          open={stepUpOpen}
          onOpenChange={setStepUpOpen}
          actionLabel={`Grant ${formatRole(role)} to ${targetPersonName}`}
          description="This is a privileged role. Confirm with elevated authentication."
          impacts={[
            'Active sessions for this person refresh within 60 seconds (simulated).',
            'The reason is captured in the audit log.',
          ]}
          onConfirm={(result) => commit(result)}
        />
      )}
    </>
  )
}
