/**
 * Audit-emitting mutation seam for Member Profile Extended Data.
 *
 * PHI-safe audit (FRD §F01 BR3, §F02 BR3): payloads carry
 * `field_names_changed[]` only — never the values themselves. This module
 * is the chokepoint that enforces the rule.
 */

import { emitAuditEvent } from '@/mocks'
import type {
  CompanyId,
  IsoDate,
  PersonId,
} from '@/types/primitives'
import type {
  ConditionTypeId,
  EmergencyContact,
  MemberCondition,
  MemberConditionId,
} from './types'
import { useEmergencyContactsStore } from './mockEmergencyContacts'
import { useMemberConditionsStore } from './mockConditions'

export interface MemberMutationContext {
  actor_id: PersonId
  company_id: CompanyId
}

interface EmergencyContactInput {
  name: string
  relationship: string
  phone_home?: string
  phone_work?: string
  phone_mobile?: string
}

export type EmergencyContactOutcome =
  | { ok: true; record: EmergencyContact }
  | { ok: false; error: 'duplicate' }
  | { ok: false; error: 'missing_phone' }

function fieldNamesPresent(input: EmergencyContactInput): string[] {
  const out: string[] = []
  if (input.name) out.push('name')
  if (input.relationship) out.push('relationship')
  if (input.phone_home) out.push('phone_home')
  if (input.phone_work) out.push('phone_work')
  if (input.phone_mobile) out.push('phone_mobile')
  return out
}

export function createEmergencyContact(
  ctx: MemberMutationContext,
  person_id: PersonId,
  input: EmergencyContactInput,
): EmergencyContactOutcome {
  if (!input.phone_home && !input.phone_work && !input.phone_mobile) {
    return { ok: false, error: 'missing_phone' }
  }
  const result = useEmergencyContactsStore.getState().create({
    person_id,
    company_id: ctx.company_id,
    name: input.name,
    relationship: input.relationship,
    phone_home: input.phone_home,
    phone_work: input.phone_work,
    phone_mobile: input.phone_mobile,
    actor_id: ctx.actor_id,
  })
  if ('error' in result) return { ok: false, error: 'duplicate' }
  emitAuditEvent({
    event_type: 'person.emergency_contact_created',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'Person',
    target_entity_id: person_id,
    company_id: ctx.company_id,
    after_value: { field_names_present: fieldNamesPresent(input) },
  })
  return { ok: true, record: result }
}

export function updateEmergencyContact(
  ctx: MemberMutationContext,
  person_id: PersonId,
  patch: Partial<EmergencyContactInput>,
): EmergencyContactOutcome {
  const before = useEmergencyContactsStore
    .getState()
    .getByPerson(person_id)
  if (!before) return { ok: false, error: 'duplicate' } // not_found → 404; reuse error type for prototype
  // Simulate the post-patch "at least one phone" rule (FRD US-MPE-004 edge 1).
  const merged: EmergencyContactInput = {
    name: patch.name ?? before.name,
    relationship: patch.relationship ?? before.relationship,
    phone_home: 'phone_home' in patch ? patch.phone_home : before.phone_home,
    phone_work: 'phone_work' in patch ? patch.phone_work : before.phone_work,
    phone_mobile: 'phone_mobile' in patch ? patch.phone_mobile : before.phone_mobile,
  }
  if (!merged.phone_home && !merged.phone_work && !merged.phone_mobile) {
    return { ok: false, error: 'missing_phone' }
  }
  const after = useEmergencyContactsStore
    .getState()
    .update(person_id, patch, ctx.actor_id)
  if (!after) return { ok: false, error: 'duplicate' }
  // PHI-safe audit: only the names of fields whose values actually changed.
  const changed: string[] = []
  for (const [k, v] of Object.entries(patch)) {
    const beforeVal = (before as unknown as Record<string, unknown>)[k]
    if (v !== beforeVal) changed.push(k)
  }
  emitAuditEvent({
    event_type: 'person.emergency_contact_updated',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'Person',
    target_entity_id: person_id,
    company_id: ctx.company_id,
    after_value: { field_names_changed: changed },
  })
  return { ok: true, record: after }
}

interface AddConditionInput {
  condition_type_id: ConditionTypeId
  note?: string
  expiry_date?: IsoDate
}

export type AddConditionOutcome =
  | { ok: true; record: MemberCondition }
  | { ok: false; error: 'duplicate' }

export function addMemberCondition(
  ctx: MemberMutationContext,
  person_id: PersonId,
  input: AddConditionInput,
): AddConditionOutcome {
  const result = useMemberConditionsStore.getState().add({
    person_id,
    company_id: ctx.company_id,
    condition_type_id: input.condition_type_id,
    note: input.note,
    expiry_date: input.expiry_date,
    actor_id: ctx.actor_id,
  })
  if ('error' in result) return { ok: false, error: 'duplicate' }
  // PHI-safe: log condition_type_id only — the type code/severity is on
  // ConditionType, lookupable separately. Note text is NOT in payload.
  emitAuditEvent({
    event_type: 'person.condition_added',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'Person',
    target_entity_id: person_id,
    company_id: ctx.company_id,
    after_value: {
      member_condition_id: result.member_condition_id,
      condition_type_id: result.condition_type_id,
      has_note: Boolean(input.note),
      has_expiry: Boolean(input.expiry_date),
    },
  })
  return { ok: true, record: result }
}

export function deactivateMemberCondition(
  ctx: MemberMutationContext,
  member_condition_id: MemberConditionId,
  person_id: PersonId,
): MemberCondition | undefined {
  const after = useMemberConditionsStore
    .getState()
    .deactivate(member_condition_id, ctx.actor_id)
  if (!after) return undefined
  emitAuditEvent({
    event_type: 'person.condition_deactivated',
    actor_person_id: ctx.actor_id,
    target_entity_type: 'Person',
    target_entity_id: person_id,
    company_id: ctx.company_id,
    after_value: {
      member_condition_id,
      condition_type_id: after.condition_type_id,
    },
  })
  return after
}
