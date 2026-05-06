/**
 * Add Condition dialog. Implements US-MPE-008 incl. ALERT-severity
 * confirmation prompt (FRD edge case 2): when the chosen ConditionType has
 * severity=ALERT, the primary CTA changes to "Confirm — flag as ALERT" and
 * an inline warning calls out the visibility consequences (roster + check-in).
 *
 * Duplicate (same person + same active type) surfaces both pre-submit
 * (button disabled) and post-submit (toast fallback for race conditions).
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { OctagonAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SeverityBadge } from '@/components/ui-extensions/SeverityBadge'
import { useAuth, useToast } from '@/contexts'
import type { IsoDate, PersonId } from '@/types/primitives'
import type { ConditionTypeId } from '../types'
import { listConditionTypesByCompany } from '../mockConditions'
import {
  listActiveConditionsFor,
} from '../queries'
import { addMemberCondition } from '../mutations'

interface AddConditionDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  person_id: PersonId
}

export function AddConditionDialog({
  open,
  onOpenChange,
  person_id,
}: AddConditionDialogProps) {
  const { currentPerson, currentCompanyId } = useAuth()
  const toast = useToast()
  const [conditionTypeId, setConditionTypeId] = useState<ConditionTypeId | ''>('')
  const [note, setNote] = useState('')
  const [expiry, setExpiry] = useState('')

  useEffect(() => {
    if (!open) {
      setConditionTypeId('')
      setNote('')
      setExpiry('')
    }
  }, [open])

  const types = useMemo(
    () => listConditionTypesByCompany(currentCompanyId),
    [currentCompanyId],
  )

  const selectedType = types.find((t) => t.condition_type_id === conditionTypeId)

  const activeForPerson = useMemo(
    () => listActiveConditionsFor(person_id),
    [person_id, open],
  )
  const isDuplicate =
    selectedType !== undefined &&
    activeForPerson.some((v) => v.type.condition_type_id === selectedType.condition_type_id)

  const expiryValid =
    !expiry || new Date(expiry).toISOString().slice(0, 10) > new Date().toISOString().slice(0, 10)

  function submit() {
    if (!selectedType || isDuplicate || !expiryValid) return
    const result = addMemberCondition(
      { actor_id: currentPerson.person_id, company_id: currentCompanyId },
      person_id,
      {
        condition_type_id: selectedType.condition_type_id,
        note: note.trim() || undefined,
        expiry_date: expiry ? (expiry as IsoDate) : undefined,
      },
    )
    if (!result.ok) {
      toast.error('Already active', {
        description: 'This condition is already active for this member.',
      })
      return
    }
    toast.success('Condition added', {
      description: `${selectedType.label} flagged on this member.`,
    })
    onOpenChange(false)
  }

  const isAlert = selectedType?.severity === 'ALERT'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add condition</DialogTitle>
          <DialogDescription>
            Flag a health, safety, or operational condition on this member.
            ALERT-severity flags are shown prominently at check-in and on
            class rosters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Condition</Label>
            <Select
              value={conditionTypeId}
              onValueChange={(v) => setConditionTypeId(v as ConditionTypeId)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a condition…" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.condition_type_id} value={t.condition_type_id}>
                    <span className="flex items-center gap-2">
                      <span>{t.label}</span>
                      <SeverityBadge severity={t.severity} />
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cond-note">Note (optional)</Label>
            <Textarea
              id="cond-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Operational context for staff. Up to 1000 characters."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cond-expiry">Expiry date (optional)</Label>
            <Input
              id="cond-expiry"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
            {expiry && !expiryValid && (
              <p className="text-xs text-[color:var(--color-error)]">
                Expiry date must be in the future.
              </p>
            )}
            <p className="text-xs text-[color:var(--color-text-muted)]">
              The condition auto-deactivates on this date. Leave blank for no expiry.
            </p>
          </div>

          {isDuplicate && selectedType && (
            <Alert>
              <AlertTitle>Already active</AlertTitle>
              <AlertDescription>
                {selectedType.label} is already flagged on this member. Choose
                a different condition or deactivate the existing one first.
              </AlertDescription>
            </Alert>
          )}

          {isAlert && !isDuplicate && (
            <Alert>
              <OctagonAlert />
              <AlertTitle>This is an ALERT-level condition</AlertTitle>
              <AlertDescription>
                It will be displayed prominently at check-in and on class
                rosters. Confirm you want to flag this on the member's record.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!selectedType || isDuplicate || !expiryValid}
            className={
              isAlert ? 'bg-[color:var(--color-error)] hover:bg-red-700' : ''
            }
          >
            {isAlert ? 'Confirm — flag as ALERT' : 'Add condition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
