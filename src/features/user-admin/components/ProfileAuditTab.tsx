import { useMemo } from 'react'
import { useAuditStore } from '@/mocks/mockAuditEvents'
import { formatRelative } from '@/lib/format'
import { getPersonById } from '@/mocks'
import type { Person } from '@/types/primitives'

export function ProfileAuditTab({ person }: { person: Person }) {
  const events = useAuditStore((s) => s.events)
  const filtered = useMemo(() => {
    return events
      .filter(
        (e) =>
          (e.target_entity_type === 'Person' &&
            e.target_entity_id === person.person_id) ||
          (e.actor_person_id === person.person_id) ||
          (e.target_entity_type === 'TenantMembership' &&
            (e.after_value as Record<string, unknown> | undefined)?.['person_id'] ===
              person.person_id) ||
          (e.target_entity_type === 'RoleAssignment' &&
            (e.after_value as Record<string, unknown> | undefined)?.['person_id'] ===
              person.person_id),
      )
      .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
  }, [events, person.person_id])

  if (filtered.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[color:var(--color-border-strong)] bg-white px-4 py-6 text-sm text-[color:var(--color-text-muted)]">
        No audit events recorded yet for this person.
      </p>
    )
  }

  return (
    <ol className="space-y-2">
      {filtered.slice(0, 50).map((e) => {
        const actor = getPersonById(e.actor_person_id)
        return (
          <li
            key={e.event_id}
            className="rounded-md border border-[color:var(--color-border)] bg-white p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[color:var(--color-primary)]">
                {e.event_type}
              </span>
              <span className="text-xs text-[color:var(--color-text-muted)]">
                {formatRelative(e.occurred_at)}
              </span>
            </div>
            <div className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
              by{' '}
              {actor
                ? `${actor.given_name} ${actor.family_name}`
                : e.actor_person_id}{' '}
              · {e.actor_type.toLowerCase()}
            </div>
            {(e.before_value || e.after_value) && (
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-[color:var(--color-surface)] p-2 font-mono text-[11px] text-[color:var(--color-text-secondary)]">
                {JSON.stringify(
                  { before: e.before_value, after: e.after_value },
                  null,
                  2,
                )}
              </pre>
            )}
          </li>
        )
      })}
      {filtered.length > 50 && (
        <li className="text-center text-xs text-[color:var(--color-text-muted)]">
          Showing latest 50 of {filtered.length} events.
        </li>
      )}
    </ol>
  )
}
