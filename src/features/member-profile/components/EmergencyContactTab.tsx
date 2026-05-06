/**
 * Member Profile → Emergency Contact tab.
 *
 * View, add, and edit. PHI-safe via MaskedField — phones masked unless
 * actor holds users.read_contact (Front Desk + Location Manager + above
 * by default; Auditor explicitly read-only with reveal toggle).
 */

import { useMemo, useState } from 'react'
import { Pencil, Phone, ShieldCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MaskedField } from '@/components/ui-extensions/MaskedField'
import { useAuth } from '@/contexts'
import { formatRelative } from '@/lib/format'
import { getPersonById } from '@/mocks'
import type { Person } from '@/types/primitives'
import { getCapabilities } from '@/features/user-admin/capabilities'
import {
  canEditEmergencyContact,
  getEmergencyContactFor,
} from '../queries'
import { useEmergencyContactsStore } from '../mockEmergencyContacts'
import { EmergencyContactDialog } from './EmergencyContactDialog'

interface EmergencyContactTabProps {
  person: Person
}

export function EmergencyContactTab({ person }: EmergencyContactTabProps) {
  const { currentRoleAssignments } = useAuth()
  const caps = useMemo(
    () => getCapabilities(currentRoleAssignments),
    [currentRoleAssignments],
  )
  const canEdit = canEditEmergencyContact(currentRoleAssignments)
  const canRead = caps.has('users.read_contact') || canEdit

  // Subscribe so the card re-renders when add/update commits.
  useEmergencyContactsStore((s) => s.contacts)
  const contact = getEmergencyContactFor(person.person_id)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<'add' | 'edit'>('add')

  if (!contact) {
    return (
      <>
        <div className="rounded-lg border border-dashed border-[color:var(--color-border-strong)] bg-white px-6 py-10 text-center">
          <ShieldCheck
            size={28}
            className="mx-auto mb-3 text-[color:var(--color-text-muted)]"
          />
          <h2 className="text-base font-semibold">
            No emergency contact on file
          </h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
            Adding an emergency contact ensures we can reach the right person
            if something goes wrong.
          </p>
          {canEdit && (
            <Button
              className="mt-4"
              onClick={() => {
                setMode('add')
                setDialogOpen(true)
              }}
            >
              <UserPlus size={14} /> Add contact
            </Button>
          )}
        </div>
        <EmergencyContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode="add"
          person_id={person.person_id}
        />
      </>
    )
  }

  const updatedBy = getPersonById(contact.updated_by_person_id)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Emergency contact</CardTitle>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMode('edit')
                setDialogOpen(true)
              }}
            >
              <Pencil size={14} /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Name" value={contact.name} />
            <Field label="Relationship" value={contact.relationship} />
          </div>
          <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)]">
              Phones
            </div>
            <ul className="space-y-1.5">
              <PhoneRow label="Mobile" value={contact.phone_mobile} canRead={canRead} />
              <PhoneRow label="Home" value={contact.phone_home} canRead={canRead} />
              <PhoneRow label="Work" value={contact.phone_work} canRead={canRead} />
            </ul>
          </div>
          <p className="text-xs text-[color:var(--color-text-muted)]">
            Last updated {formatRelative(contact.updated_at)}
            {updatedBy
              ? ` by ${updatedBy.given_name} ${updatedBy.family_name}`
              : ''}
            . Phone values are excluded from the audit payload — only field-
            change names are recorded.
          </p>
        </CardContent>
      </Card>
      <EmergencyContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        person_id={person.person_id}
        existing={contact}
      />
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
        {label}
      </div>
      <div className="text-sm text-[color:var(--color-text-primary)]">
        {value}
      </div>
    </div>
  )
}

function PhoneRow({
  label,
  value,
  canRead,
}: {
  label: string
  value: string | undefined
  canRead: boolean
}) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-[color:var(--color-text-secondary)]">
        <Phone
          size={14}
          className="text-[color:var(--color-text-muted)]"
        />
        {label}
      </span>
      <MaskedField value={value} kind="phone" revealed={canRead} withToggle />
    </li>
  )
}
