/**
 * StepUpConfirmDialog — elevated-action confirmation surface.
 *
 * Used wherever an action requires step-up auth: privileged role assignment,
 * contact-method edit, deactivate, delete. Real step-up isn't implemented in
 * the prototype — this dialog simulates it by requiring a typed reason and
 * stamping a fake step_up_token onto the resulting AuditEvent.
 *
 * Visually distinct from a normal confirm: warning-tone header, lock icon,
 * required reason field, "Confirm with elevated auth" CTA. The affordance
 * is the demo-load-bearing part — it makes the elevated-action moment legible.
 */

import { useId, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { id as randomId } from '@/mocks/_helpers'

export interface StepUpConfirmResult {
  step_up_token: string
  reason: string
}

interface StepUpConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Short verb-object label, e.g. "Assign Security Admin role". */
  actionLabel: string
  /** One-sentence summary of what's about to happen. */
  description: string
  /** Optional list of impact bullets shown above the reason field. */
  impacts?: string[]
  /** Confirm CTA label. Defaults to "Confirm with elevated auth". */
  confirmLabel?: string
  /** Min length for reason. Default 10. */
  minReasonLength?: number
  onConfirm: (result: StepUpConfirmResult) => void
}

export function StepUpConfirmDialog({
  open,
  onOpenChange,
  actionLabel,
  description,
  impacts,
  confirmLabel = 'Confirm with elevated auth',
  minReasonLength = 10,
  onConfirm,
}: StepUpConfirmDialogProps) {
  const reasonId = useId()
  const [reason, setReason] = useState('')
  const reasonValid = reason.trim().length >= minReasonLength

  function handleConfirm() {
    if (!reasonValid) return
    const token = `prototype-stepup-${randomId()}`
    onConfirm({ step_up_token: token, reason: reason.trim() })
    setReason('')
    onOpenChange(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) setReason('')
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-900">
            <ShieldAlert size={16} strokeWidth={2} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Elevated action — step-up required
            </span>
          </div>
          <DialogTitle>{actionLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {impacts && impacts.length > 0 && (
          <ul className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 text-sm">
            {impacts.map((line, i) => (
              <li key={i} className="flex gap-2 py-0.5">
                <span aria-hidden className="text-[color:var(--color-text-muted)]">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>
            Reason for this action
            <span className="ml-1 text-[color:var(--color-text-muted)]">(required)</span>
          </Label>
          <Textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`At least ${minReasonLength} characters. This is captured in the audit log.`}
            rows={3}
            autoFocus
          />
          <p className="text-xs text-[color:var(--color-text-muted)]">
            Prototype note: real step-up auth is mocked. The reason and a
            simulated token are stamped on the AuditEvent.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!reasonValid}
            onClick={handleConfirm}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
