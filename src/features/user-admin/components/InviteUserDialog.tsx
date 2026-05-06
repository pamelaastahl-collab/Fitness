/**
 * Invite User dialog — two-step flow.
 *
 * Step 1: Email entry → debounced (300ms) duplicate check (US-UM-004).
 *   - No match: enable "Continue" → step 2.
 *   - Match without membership in this company: prompt "This email belongs
 *     to {Name} in our system. Add them to this company?" → step 2.
 *   - Match WITH membership in this company: blocked with "Already a user"
 *     and a link to their profile. (FRD US-UM-004 BR2 conformance.)
 *
 * Step 2: Role + scope picker.
 *   - Roles filtered to actor's assignable set (FRD US-UM-005 BR1).
 *   - SoD pre-check against the existing-person path; SoD-violating role
 *     options disabled with explanation (FRD US-UM-005 BR2 surfaced before click).
 *   - Privileged roles (COMPANY_ADMIN, SECURITY_ADMIN, FINANCE_ADMIN) require
 *     step-up confirmation via StepUpConfirmDialog.
 *
 * On commit: emits `admin.user_invited` with correlation_id linking
 * Person + TenantMembership + RoleAssignment + InviteToken.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Mail, ShieldAlert, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type {
  Location,
  Person,
  RoleCode,
  ScopeType,
  UUID,
} from '@/types/primitives'
import { useRoleAssignmentsStore } from '@/mocks'
import {
  canAssignRole,
  isPrivilegedRole,
  LOCATION_MANAGER_ASSIGNABLE_ROLES,
  getCapabilities,
} from '../capabilities'
import {
  findDuplicateByEmail,
} from '../queries'
import {
  assignRoleToExistingPerson,
  inviteNewPerson,
  type InviteResult,
} from '../mutations'

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  availableLocations: Location[]
  onInvited?: (result: InviteResult | { addedToExisting: true; person_id: string }) => void
}

type Step = 1 | 2

interface DuplicateCheck {
  state: 'idle' | 'checking' | 'none' | 'reusable' | 'blocked'
  match?: { person: Person; has_membership: boolean }
}

const ROLE_OPTIONS_FULL: RoleCode[] = [
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

export function InviteUserDialog({
  open,
  onOpenChange,
  availableLocations,
  onInvited,
}: InviteUserDialogProps) {
  const { currentPerson, currentCompanyId, currentRoleAssignments } = useAuth()
  const toast = useToast()
  const caps = useMemo(
    () => getCapabilities(currentRoleAssignments),
    [currentRoleAssignments],
  )

  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState('')
  const [givenName, setGivenName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [duplicate, setDuplicate] = useState<DuplicateCheck>({ state: 'idle' })

  const assignableRoles = useMemo(
    () =>
      ROLE_OPTIONS_FULL.filter((r) =>
        canAssignRole(currentRoleAssignments, r),
      ),
    [currentRoleAssignments],
  )

  const [role, setRole] = useState<RoleCode | ''>('')
  const [scopeId, setScopeId] = useState<string>('')
  const [stepUpOpen, setStepUpOpen] = useState(false)

  // Reset state when dialog closes / re-opens.
  useEffect(() => {
    if (!open) {
      setStep(1)
      setEmail('')
      setGivenName('')
      setFamilyName('')
      setDuplicate({ state: 'idle' })
      setRole('')
      setScopeId('')
    }
  }, [open])

  // Debounced duplicate check.
  useEffect(() => {
    const trimmed = email.trim()
    if (!trimmed.includes('@')) {
      setDuplicate({ state: 'idle' })
      return
    }
    setDuplicate({ state: 'checking' })
    const t = setTimeout(() => {
      const match = findDuplicateByEmail(trimmed, currentCompanyId)
      if (!match) {
        setDuplicate({ state: 'none' })
      } else if (match.has_membership) {
        setDuplicate({ state: 'blocked', match })
      } else {
        setDuplicate({ state: 'reusable', match })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [email, currentCompanyId])

  const isReusingExisting = duplicate.state === 'reusable'
  const targetPersonId = duplicate.match?.person.person_id

  // SoD pre-check for reused-person path.
  const sodConflict = useMemo(() => {
    if (!isReusingExisting || !targetPersonId || !role) return undefined
    const scopeIdResolved = resolveScopeId(role, scopeId, currentCompanyId)
    if (!scopeIdResolved) return undefined
    const scopeType = ROLE_DEFAULT_SCOPE[role]
    const conflicts = useRoleAssignmentsStore
      .getState()
      .validateSoD(targetPersonId, currentCompanyId, role, scopeType, scopeIdResolved)
    return conflicts[0]
  }, [isReusingExisting, targetPersonId, role, scopeId, currentCompanyId])

  function handleStep1Continue() {
    if (duplicate.state === 'blocked') return
    if (duplicate.state === 'checking') return
    if (!email.trim().includes('@')) return
    if (!isReusingExisting && (!givenName.trim() || !familyName.trim())) return
    setStep(2)
  }

  function commit(stepUp?: { step_up_token: string; reason: string }) {
    if (!role) return
    const scope_type = ROLE_DEFAULT_SCOPE[role]
    const scope_id = resolveScopeId(role, scopeId, currentCompanyId)
    if (!scope_id) {
      toast.error('Pick a scope', {
        description: 'A scope is required for this role.',
      })
      return
    }

    if (isReusingExisting && targetPersonId) {
      const result = assignRoleToExistingPerson(
        {
          actor_id: currentPerson.person_id,
          company_id: currentCompanyId,
          step_up_token: stepUp?.step_up_token,
          step_up_reason: stepUp?.reason,
        },
        {
          person_id: targetPersonId,
          role_code: role,
          scope_type,
          scope_id,
        },
      )
      if (!result.ok) {
        if (result.error === 'sod_violation') {
          toast.error('Separation-of-duties conflict', {
            description: `${formatRole(result.conflicts[0]!.existing_role)} and ${formatRole(role)} cannot coexist on the same person.`,
          })
        } else if (result.error === 'duplicate') {
          toast.warn('Already assigned', {
            description: 'This person already holds this role at this scope.',
          })
        }
        return
      }
      toast.success('Role added', {
        description: `${formatRole(role)} granted to ${duplicate.match!.person.given_name} ${duplicate.match!.person.family_name}.`,
      })
      onInvited?.({ addedToExisting: true, person_id: targetPersonId })
      onOpenChange(false)
      return
    }

    const result = inviteNewPerson(
      {
        actor_id: currentPerson.person_id,
        company_id: currentCompanyId,
        step_up_token: stepUp?.step_up_token,
        step_up_reason: stepUp?.reason,
      },
      {
        given_name: givenName.trim(),
        family_name: familyName.trim(),
        email: email.trim(),
        role_code: role,
        scope_type,
        scope_id,
      },
    )
    if (!result.ok) {
      toast.error('Could not invite', {
        description: 'Separation-of-duties conflict on the proposed role.',
      })
      return
    }
    toast.success('Invite sent (simulated)', {
      description: `${givenName} ${familyName} will receive an invite at ${email.trim()}. Expires in 7 days.`,
    })
    onInvited?.(result.result)
    onOpenChange(false)
  }

  function handleStep2Confirm() {
    if (!role) return
    if (isPrivilegedRole(role)) {
      setStepUpOpen(true)
      return
    }
    commit()
  }

  if (!caps.has('users.invite')) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} />
              Invite a user
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Enter the new user's email. We'll check whether they already exist."
                : 'Choose the starting role and scope. The invite includes this assignment.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
            <span
              className={
                step === 1
                  ? 'font-semibold text-[color:var(--color-primary)]'
                  : ''
              }
            >
              1. Email
            </span>
            <span aria-hidden>→</span>
            <span
              className={
                step === 2
                  ? 'font-semibold text-[color:var(--color-primary)]'
                  : ''
              }
            >
              2. Role &amp; scope
            </span>
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]"
                  />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="name@company.com"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {duplicate.state === 'checking' && (
                  <p className="text-xs text-[color:var(--color-text-muted)]">
                    Checking…
                  </p>
                )}
                {duplicate.state === 'blocked' && duplicate.match && (
                  <Alert>
                    <AlertCircle />
                    <AlertTitle>Already a user in this company</AlertTitle>
                    <AlertDescription>
                      <Link
                        className="text-[color:var(--color-primary)] underline"
                        to={`/people/directory/${duplicate.match.person.person_id}`}
                      >
                        {duplicate.match.person.given_name}{' '}
                        {duplicate.match.person.family_name}
                      </Link>{' '}
                      is already in this directory. Open their profile to
                      change their roles instead.
                    </AlertDescription>
                  </Alert>
                )}
                {duplicate.state === 'reusable' && duplicate.match && (
                  <Alert>
                    <ShieldAlert />
                    <AlertTitle>Email already in our platform</AlertTitle>
                    <AlertDescription>
                      Belongs to {duplicate.match.person.given_name}{' '}
                      {duplicate.match.person.family_name}. They aren't yet a
                      member of this company — continuing will add them and
                      grant the chosen role.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              {!isReusingExisting && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-given">Given name</Label>
                    <Input
                      id="invite-given"
                      value={givenName}
                      onChange={(e) => setGivenName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-family">Family name</Label>
                    <Input
                      id="invite-family"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
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
                {assignableRoles.length === 0 && (
                  <p className="text-xs text-[color:var(--color-text-muted)]">
                    Your role doesn't permit assigning any roles in this scope.
                  </p>
                )}
                {role &&
                  caps.has('users.assign_role.location_only') &&
                  !LOCATION_MANAGER_ASSIGNABLE_ROLES.includes(role) && (
                    <p className="text-xs text-[color:var(--color-error)]">
                      Location Managers can only assign Front Desk and Instructor.
                    </p>
                  )}
              </div>

              {role && needsScopeId(ROLE_DEFAULT_SCOPE[role]) && (
                <div className="space-y-1.5">
                  <Label>{formatScopeType(ROLE_DEFAULT_SCOPE[role])}</Label>
                  <Select value={scopeId} onValueChange={setScopeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a location…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLocations.map((loc) => (
                        <SelectItem key={loc.location_id} value={loc.location_id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-[color:var(--color-text-muted)]">
                    Department-scoped roles default to the Location's first
                    department in this prototype.
                  </p>
                </div>
              )}

              {sodConflict && (
                <Alert>
                  <ShieldAlert />
                  <AlertTitle>Separation-of-duties conflict</AlertTitle>
                  <AlertDescription>
                    This person already holds{' '}
                    <strong>{formatRole(sodConflict.existing_role)}</strong> at
                    this scope. Granting{' '}
                    <strong>{formatRole(sodConflict.proposed_role)}</strong>{' '}
                    would violate platform SoD policy. Choose a different role
                    or revoke the existing one first.
                  </AlertDescription>
                </Alert>
              )}

              {role && isPrivilegedRole(role) && !sodConflict && (
                <Alert>
                  <ShieldAlert />
                  <AlertTitle>Privileged role</AlertTitle>
                  <AlertDescription>
                    Granting {formatRole(role)} requires step-up confirmation.
                    You'll be prompted to enter a reason next.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step === 1 && (
              <Button
                onClick={handleStep1Continue}
                disabled={
                  duplicate.state === 'blocked' ||
                  duplicate.state === 'checking' ||
                  !email.includes('@') ||
                  (!isReusingExisting &&
                    (!givenName.trim() || !familyName.trim()))
                }
              >
                Continue
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={handleStep2Confirm}
                disabled={!role || Boolean(sodConflict) || !canCommitScope(role, scopeId)}
              >
                {isReusingExisting ? 'Add role' : 'Send invite'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {role && (
        <StepUpConfirmDialog
          open={stepUpOpen}
          onOpenChange={setStepUpOpen}
          actionLabel={`Grant ${formatRole(role)}`}
          description={
            isReusingExisting
              ? `You are granting ${formatRole(role)} to ${duplicate.match?.person.given_name} ${duplicate.match?.person.family_name}.`
              : `You are inviting ${givenName} ${familyName} as ${formatRole(role)}.`
          }
          impacts={[
            'Privileged role assignments require an audited reason.',
            'Active sessions for this user refresh within 60 seconds (simulated).',
          ]}
          onConfirm={(result) => commit(result)}
        />
      )}
    </>
  )
}

function needsScopeId(t: ScopeType): boolean {
  return t === 'LOCATION' || t === 'DEPARTMENT' || t === 'ENTITY'
}

function canCommitScope(role: RoleCode | '', scopeId: string): boolean {
  if (!role) return false
  const t = ROLE_DEFAULT_SCOPE[role]
  if (t === 'COMPANY') return true
  return Boolean(scopeId)
}

function resolveScopeId(role: RoleCode, scopeId: string, companyId: string): UUID | '' {
  const t = ROLE_DEFAULT_SCOPE[role]
  if (t === 'COMPANY') return companyId as unknown as UUID
  if (!scopeId) return ''
  return scopeId as unknown as UUID
}
