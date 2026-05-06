/**
 * Emergency Contact add/edit dialog. Single dialog, two modes.
 *
 * Validation:
 *   - Name + relationship required (per default tenant config).
 *   - At least one phone field non-empty (FRD US-MPE-003 edge 1, US-MPE-004 edge 1).
 *   - E.164 format check is best-effort (starts with + and 8+ digits).
 *
 * The submit button is disabled until the form is valid; on submit, server-
 * style errors (duplicate, missing_phone) surface as toasts.
 */

import { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'
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
import { useAuth, useToast } from '@/contexts'
import type { EmergencyContact } from '../types'
import {
  createEmergencyContact,
  updateEmergencyContact,
} from '../mutations'
import type { PersonId } from '@/types/primitives'

interface EmergencyContactDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  mode: 'add' | 'edit'
  person_id: PersonId
  existing?: EmergencyContact
}

const E164 = /^\+\d{8,15}$/

export function EmergencyContactDialog({
  open,
  onOpenChange,
  mode,
  person_id,
  existing,
}: EmergencyContactDialogProps) {
  const { currentPerson, currentCompanyId } = useAuth()
  const toast = useToast()

  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phoneHome, setPhoneHome] = useState('')
  const [phoneWork, setPhoneWork] = useState('')
  const [phoneMobile, setPhoneMobile] = useState('')

  useEffect(() => {
    if (!open) return
    setName(existing?.name ?? '')
    setRelationship(existing?.relationship ?? '')
    setPhoneHome(existing?.phone_home ?? '')
    setPhoneWork(existing?.phone_work ?? '')
    setPhoneMobile(existing?.phone_mobile ?? '')
  }, [open, existing])

  const phoneFields: { value: string; key: 'phone_home' | 'phone_work' | 'phone_mobile' }[] = [
    { value: phoneHome, key: 'phone_home' },
    { value: phoneWork, key: 'phone_work' },
    { value: phoneMobile, key: 'phone_mobile' },
  ]
  const hasAtLeastOnePhone = phoneFields.some((f) => f.value.trim().length > 0)
  const phoneFormatErrors = phoneFields
    .filter((f) => f.value.trim() && !E164.test(f.value.trim()))
    .map((f) => f.key)
  const formValid =
    name.trim().length > 0 &&
    relationship.trim().length > 0 &&
    hasAtLeastOnePhone &&
    phoneFormatErrors.length === 0

  function submit() {
    const payload = {
      name: name.trim(),
      relationship: relationship.trim(),
      phone_home: phoneHome.trim() || undefined,
      phone_work: phoneWork.trim() || undefined,
      phone_mobile: phoneMobile.trim() || undefined,
    }
    const ctx = {
      actor_id: currentPerson.person_id,
      company_id: currentCompanyId,
    }
    const result =
      mode === 'add'
        ? createEmergencyContact(ctx, person_id, payload)
        : updateEmergencyContact(ctx, person_id, payload)
    if (!result.ok) {
      if (result.error === 'duplicate') {
        toast.error('Already on file', {
          description:
            'An emergency contact already exists for this member. Use Edit to update it.',
        })
      } else if (result.error === 'missing_phone') {
        toast.error('Phone required', {
          description: 'At least one phone number is required.',
        })
      }
      return
    }
    toast.success(mode === 'add' ? 'Emergency contact added' : 'Emergency contact updated')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add emergency contact' : 'Edit emergency contact'}
          </DialogTitle>
          <DialogDescription>
            All edits are audited. Phone number values aren't included in the
            audit payload — only the names of fields that changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">
              Name<span className="ml-0.5 text-[color:var(--color-error)]">*</span>
            </Label>
            <Input
              id="ec-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-rel">
              Relationship
              <span className="ml-0.5 text-[color:var(--color-error)]">*</span>
            </Label>
            <Input
              id="ec-rel"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="Spouse, parent, sibling…"
            />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <PhoneField
              id="ec-phone-mobile"
              label="Mobile phone"
              value={phoneMobile}
              onChange={setPhoneMobile}
              invalid={phoneFormatErrors.includes('phone_mobile')}
            />
            <PhoneField
              id="ec-phone-home"
              label="Home phone"
              value={phoneHome}
              onChange={setPhoneHome}
              invalid={phoneFormatErrors.includes('phone_home')}
            />
            <PhoneField
              id="ec-phone-work"
              label="Work phone"
              value={phoneWork}
              onChange={setPhoneWork}
              invalid={phoneFormatErrors.includes('phone_work')}
            />
          </div>
          {!hasAtLeastOnePhone && (
            <p className="text-xs text-[color:var(--color-error)]">
              At least one phone number is required.
            </p>
          )}
          {phoneFormatErrors.length > 0 && (
            <p className="text-xs text-[color:var(--color-error)]">
              Use international (E.164) format — start with + and country code.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!formValid}>
            {mode === 'add' ? 'Add contact' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PhoneField({
  id,
  label,
  value,
  onChange,
  invalid,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  invalid: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Phone
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]"
        />
        <Input
          id={id}
          type="tel"
          placeholder="+64 21 555 0000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          className={`pl-9 ${invalid ? 'border-[color:var(--color-error)]' : ''}`}
        />
      </div>
    </div>
  )
}
