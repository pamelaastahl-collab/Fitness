import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleBadge } from '@/components/ui-extensions/RoleBadge'
import { formatRelative, formatScopeType } from '@/lib/format'
import {
  getBusinessEntityById,
  getDepartmentById,
  getLocationById,
} from '@/mocks'
import type {
  BusinessEntityId,
  DepartmentId,
  LocationId,
  Person,
  RoleAssignment,
} from '@/types/primitives'
import type { Capability } from '../types'
import {
  computeEffectivePermissions,
  type EffectivePermission,
} from '../rolePermissions'
import { getActiveInviteTokenForPerson } from '../mockInviteTokens'
import { useAuth, useAudit, useToast } from '@/contexts'
import { resendInvite } from '../mutations'
import { useInviteTokensStore } from '../mockInviteTokens'

interface ProfileOverviewTabProps {
  person: Person
  assignments: RoleAssignment[]
  capabilities: Set<Capability>
}

export function ProfileOverviewTab({
  person,
  assignments,
  capabilities,
}: ProfileOverviewTabProps) {
  const { currentPerson, currentCompanyId } = useAuth()
  const audit = useAudit()
  const toast = useToast()
  const [permsOpen, setPermsOpen] = useState(false)

  // re-render on token changes
  useInviteTokensStore((s) => s.tokens)
  const activeInvite = getActiveInviteTokenForPerson(person.person_id)

  function handleResend() {
    if (!activeInvite) return
    const next = resendInvite(
      { actor_id: currentPerson.person_id, company_id: currentCompanyId },
      person.person_id,
      activeInvite.role_assignment_id,
    )
    toast.success('Invite resent (simulated)', {
      description: `New token expires ${new Date(next.expires_at).toLocaleDateString()}.`,
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Field
            label="Type"
            value={
              person.person_type.charAt(0) +
              person.person_type.slice(1).toLowerCase()
            }
          />
          <Field
            label="Status"
            value={
              person.status.charAt(0) + person.status.slice(1).toLowerCase()
            }
          />
          <Field
            label="Identity photo"
            value={
              (person.identity_photo_status ?? 'NONE') === 'NONE'
                ? 'Not provided'
                : (person.identity_photo_status ?? 'NONE')
                    .toLowerCase()
                    .replace(/_/g, ' ')
            }
          />
          {person.date_of_birth && (
            <Field label="Date of birth" value={person.date_of_birth} />
          )}
          {person.is_minor && (
            <span className="inline-block rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
              Minor
            </span>
          )}
          <Field label="Created" value={formatRelative(person.created_at)} />
          <Field label="Last update" value={formatRelative(person.updated_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active roles</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-muted)]">
              No active roles in this scope.
            </p>
          ) : (
            <ul className="space-y-2">
              {assignments.map((a) => (
                <li key={a.assignment_id} className="flex items-center gap-2">
                  <RoleBadge role={a.role_code} />
                  <span className="text-xs text-[color:var(--color-text-secondary)]">
                    @ {scopeLabelFor(a)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {activeInvite && (
        <Card className="lg:col-span-2 border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-sm">Pending invite</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              Created {formatRelative(activeInvite.created_at)}, expires{' '}
              {formatRelative(activeInvite.expires_at)}.
            </div>
            <Button variant="outline" size="sm" onClick={handleResend}>
              Resend invite
            </Button>
          </CardContent>
        </Card>
      )}

      {capabilities.has('users.view_effective_permissions') && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Effective permissions</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPermsOpen((v) => !v)
                  if (!permsOpen) {
                    audit.emit({
                      event_type: 'admin.effective_permissions_viewed',
                      target_entity_type: 'Person',
                      target_entity_id: person.person_id,
                    })
                  }
                }}
              >
                {permsOpen ? (
                  <>
                    <ChevronDown size={14} /> Hide
                  </>
                ) : (
                  <>
                    <ChevronRight size={14} /> Show
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          {permsOpen && (
            <CardContent>
              <EffectivePermissionsList
                items={computeEffectivePermissions(assignments)}
              />
              <p className="mt-3 text-[11px] text-[color:var(--color-text-muted)]">
                Computed from a prototype-local permission matrix; will
                converge with the production RBAC resolver — see design.md
                §14.2 (OQ-UM-4).
              </p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

function scopeLabelFor(a: RoleAssignment): string {
  if (a.scope_type === 'COMPANY') return formatScopeType(a.scope_type)
  if (a.scope_type === 'LOCATION') {
    return getLocationById(a.scope_id as unknown as LocationId)?.name ?? 'Location'
  }
  if (a.scope_type === 'ENTITY') {
    return (
      getBusinessEntityById(a.scope_id as unknown as BusinessEntityId)?.name ??
      'Business Entity'
    )
  }
  if (a.scope_type === 'DEPARTMENT') {
    return (
      getDepartmentById(a.scope_id as unknown as DepartmentId)?.name ??
      'Department'
    )
  }
  return formatScopeType(a.scope_type)
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[color:var(--color-border)] py-1.5 last:border-0">
      <dt className="text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[color:var(--color-text-primary)]">
        {value}
      </dd>
    </div>
  )
}

function EffectivePermissionsList({ items }: { items: EffectivePermission[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-text-muted)]">
        No permissions resolved.
      </p>
    )
  }
  return (
    <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <li
          key={`${p.permission}|${p.scope_type}|${p.scope_id}`}
          className="flex items-center gap-2 rounded border border-[color:var(--color-border)] bg-white px-2.5 py-1.5"
        >
          <code className="font-mono text-[11px] text-[color:var(--color-text-primary)]">
            {p.permission}
          </code>
          <span className="text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
            via {p.source_role}
          </span>
        </li>
      ))}
    </ul>
  )
}
