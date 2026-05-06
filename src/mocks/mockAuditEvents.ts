/**
 * Audit event bus.
 *
 * Per UUM §2.8 and XPI-AUD-01: every state-changing operation across all four
 * primitives emits an AuditEvent. AuditEvents are append-only and immutable —
 * the prototype enforces this at the store API: there is no update or delete.
 *
 * Per XPI-AUD-02: payloads are PHI-safe — IDs and hashes only. Mock seeds
 * follow this rule and use redacted shapes for before/after.
 */

import { create } from 'zustand'
import type {
  AuditActorType,
  AuditEvent,
  AuditEventId,
  CompanyId,
  PersonId,
  ScopeType,
  UUID,
} from '@/types/primitives'
import { fakeSha256, id, isoNow } from './_helpers'

export interface EmitAuditEventInput {
  event_type: string
  actor_person_id: PersonId
  actor_type?: AuditActorType
  target_entity_type: string
  /** Polymorphic across primitives — see AuditEvent.target_entity_id note. */
  target_entity_id: string
  company_id: CompanyId
  scope_type?: ScopeType
  scope_id?: string
  before_value?: Record<string, unknown>
  after_value?: Record<string, unknown>
  correlation_id?: UUID
  /** When backfilling historical events; defaults to isoNow(). */
  occurred_at?: AuditEvent['occurred_at']
}

interface AuditStore {
  events: AuditEvent[]
  emit: (input: EmitAuditEventInput) => AuditEvent
  /** Bulk seed historical events — bypasses normal emit ordering checks. */
  hydrate: (events: AuditEvent[]) => void
  /** Read-only query helpers. */
  listByCompany: (company_id: CompanyId) => AuditEvent[]
  listByEntity: (target_entity_type: string, target_entity_id: string) => AuditEvent[]
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  events: [],

  emit: (input) => {
    const occurred_at = input.occurred_at ?? isoNow()
    const payload_hash = fakeSha256(
      [
        input.event_type,
        input.actor_person_id,
        input.target_entity_type,
        input.target_entity_id,
        occurred_at,
        JSON.stringify(input.before_value ?? null),
        JSON.stringify(input.after_value ?? null),
      ].join('|'),
    )
    const event: AuditEvent = {
      event_id: id() as AuditEventId,
      event_type: input.event_type,
      actor_person_id: input.actor_person_id,
      actor_type: input.actor_type ?? 'USER',
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      company_id: input.company_id,
      scope_type: input.scope_type,
      scope_id: input.scope_id,
      occurred_at,
      payload_hash,
      before_value: input.before_value,
      after_value: input.after_value,
      correlation_id: input.correlation_id,
    }
    set((s) => ({ events: [...s.events, event] }))
    return event
  },

  hydrate: (events) => {
    set(() => ({
      events: [...events].sort((a, b) =>
        a.occurred_at < b.occurred_at ? -1 : a.occurred_at > b.occurred_at ? 1 : 0,
      ),
    }))
  },

  listByCompany: (company_id) =>
    get().events.filter((e) => e.company_id === company_id),

  listByEntity: (target_entity_type, target_entity_id) =>
    get().events.filter(
      (e) =>
        e.target_entity_type === target_entity_type &&
        e.target_entity_id === target_entity_id,
    ),
}))

/**
 * Imperative emit helper for use outside React components (mock CRUD functions).
 * Wraps the store's emit so callers don't have to import `useAuditStore` and
 * call `.getState()` themselves.
 */
export function emitAuditEvent(input: EmitAuditEventInput): AuditEvent {
  return useAuditStore.getState().emit(input)
}
