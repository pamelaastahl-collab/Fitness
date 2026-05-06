/**
 * Member Profile → Conditions tab.
 *
 * ALERT-severity rows render at the top with red border accent.
 * Historical conditions (deactivated or auto-expired) appear in a
 * collapsed "Historical" section.
 */

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SeverityBadge } from '@/components/ui-extensions/SeverityBadge'
import { useAuth, useToast } from '@/contexts'
import { formatRelative } from '@/lib/format'
import { getPersonById } from '@/mocks'
import type { Person } from '@/types/primitives'
import { canEditConditions, listActiveConditionsFor, listHistoricalConditionsFor, type ConditionView } from '../queries'
import { useMemberConditionsStore } from '../mockConditions'
import { deactivateMemberCondition } from '../mutations'
import { AddConditionDialog } from './AddConditionDialog'

interface ConditionsTabProps {
  person: Person
}

export function ConditionsTab({ person }: ConditionsTabProps) {
  const { currentPerson, currentCompanyId, currentRoleAssignments } = useAuth()
  const toast = useToast()
  const canEdit = canEditConditions(currentRoleAssignments)

  // Subscribe so list re-renders on add/deactivate.
  useMemberConditionsStore((s) => s.conditions)

  const active = useMemo(
    () => listActiveConditionsFor(person.person_id),
    [person.person_id],
  )
  const historical = useMemo(
    () => listHistoricalConditionsFor(person.person_id),
    [person.person_id],
  )

  const [addOpen, setAddOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState<ConditionView | undefined>()

  function handleDeactivate() {
    if (!confirmDeactivate) return
    const result = deactivateMemberCondition(
      { actor_id: currentPerson.person_id, company_id: currentCompanyId },
      confirmDeactivate.condition.member_condition_id,
      person.person_id,
    )
    if (result) {
      toast.success('Condition deactivated', {
        description: `${confirmDeactivate.type.label} moved to historical.`,
      })
    }
    setConfirmDeactivate(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)]">
          {active.length} active{' '}
          {active.length === 1 ? 'condition' : 'conditions'}
        </h2>
        {canEdit && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add condition
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <p className="rounded-md border border-dashed border-[color:var(--color-border-strong)] bg-white px-4 py-6 text-sm text-[color:var(--color-text-muted)]">
          No conditions on file. Use Add condition to flag health or safety
          context for staff.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((v) => (
            <ConditionRow
              key={v.condition.member_condition_id}
              view={v}
              canEdit={canEdit}
              onDeactivate={() => setConfirmDeactivate(v)}
            />
          ))}
        </ul>
      )}

      {historical.length > 0 && (
        <div className="rounded-lg border border-[color:var(--color-border)] bg-white">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface)]"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <span>
              Historical · {historical.length}
            </span>
            {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {historyOpen && (
            <ul className="divide-y divide-[color:var(--color-border)]">
              {historical.map((v) => (
                <HistoricalRow key={v.condition.member_condition_id} view={v} />
              ))}
            </ul>
          )}
        </div>
      )}

      <AddConditionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        person_id={person.person_id}
      />

      <Dialog
        open={Boolean(confirmDeactivate)}
        onOpenChange={(o) => {
          if (!o) setConfirmDeactivate(undefined)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Deactivate {confirmDeactivate?.type.label}?
            </DialogTitle>
            <DialogDescription>
              The condition moves to the historical section and stops alerting
              staff. You can re-add it later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeactivate(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              <Trash2 size={14} /> Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConditionRow({
  view,
  canEdit,
  onDeactivate,
}: {
  view: ConditionView
  canEdit: boolean
  onDeactivate: () => void
}) {
  const isAlert = view.type.severity === 'ALERT'
  const appliedBy = getPersonById(view.condition.applied_by_person_id)
  return (
    <li
      className={`rounded-lg border bg-white p-4 ${
        isAlert
          ? 'border-[color:var(--color-error)] shadow-[0_0_0_1px_var(--color-error)]/20'
          : 'border-[color:var(--color-border)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={view.type.severity} prominent={isAlert} />
            <span className="font-medium">{view.type.label}</span>
            <code className="rounded bg-[color:var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
              {view.type.code}
            </code>
          </div>
          {view.condition.note && (
            <p className="mt-2 text-sm text-[color:var(--color-text-primary)]">
              {view.condition.note}
            </p>
          )}
          <div className="mt-2 text-xs text-[color:var(--color-text-muted)]">
            Applied {formatRelative(view.condition.applied_at)} by{' '}
            {appliedBy
              ? `${appliedBy.given_name} ${appliedBy.family_name}`
              : 'unknown'}
            {view.condition.expiry_date && (
              <span> · expires {view.condition.expiry_date}</span>
            )}
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onDeactivate}>
            Deactivate
          </Button>
        )}
      </div>
    </li>
  )
}

function HistoricalRow({ view }: { view: ConditionView }) {
  const isExpired =
    view.condition.is_active &&
    view.condition.expiry_date &&
    view.condition.expiry_date <= new Date().toISOString().slice(0, 10)
  const reason = isExpired ? 'auto-expired' : 'deactivated'
  const when = view.condition.deactivated_at ?? view.condition.expiry_date
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <SeverityBadge severity={view.type.severity} />
        <span className="text-[color:var(--color-text-secondary)]">
          {view.type.label}
        </span>
        <span className="ml-auto text-xs text-[color:var(--color-text-muted)]">
          {reason}
          {when ? ` · ${formatRelative(when)}` : ''}
        </span>
      </div>
      {view.condition.note && (
        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
          {view.condition.note}
        </p>
      )}
    </li>
  )
}
