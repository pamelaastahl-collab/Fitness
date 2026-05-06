/**
 * Mock Adjustments (UCE §2.4).
 *
 * Adjustments do NOT modify the original Charge — they create a new record
 * with full attribution and reason. Reason codes come from the controlled
 * vocabulary on UCE.
 *
 * Seed includes one of each adjustment type currently relevant to the demo:
 *   - NO_SHOW_FEE on a Brooklyn lap-lane reservation
 *   - GOODWILL_CREDIT against an Auckland membership
 *   - ADMIN_CORRECTION on a tee retail line
 */

import { create } from 'zustand'
import type {
  Adjustment,
  AdjustmentId,
  AdjustmentType,
  ChargeId,
  IdempotencyKey,
  PersonId,
} from '@/types/primitives'
import { daysAgo, decimal, id, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import {
  PERSON_BEATRIZ_SOTO_ID,
  PERSON_LEILA_PATEL_ID,
} from './mockPersons'
import { useChargesStore } from './mockCharges'

function adj(suffix: string): AdjustmentId {
  return `j0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as AdjustmentId
}

interface AdjSeed {
  adjustment_id: AdjustmentId
  charge_id: ChargeId
  adjustment_type: AdjustmentType
  amount: number
  reason_code: string
  reason_detail?: string
  actor_id: PersonId
  approval_required: boolean
  approved_by_id?: PersonId
  daysAgoVal: number
}

const SEEDS: AdjSeed[] = [
  {
    adjustment_id: adj('001'),
    charge_id: 'h0000001-0000-0000-0000-000000000105' as ChargeId, // Brooklyn lap-lane (3x)
    adjustment_type: 'NO_SHOW_FEE',
    amount: 5.0,
    reason_code: 'no-show.lap-lane.45min',
    reason_detail: 'Member did not check in within the 10-minute grace window.',
    actor_id: PERSON_BEATRIZ_SOTO_ID,
    approval_required: false,
    daysAgoVal: 35,
  },
  {
    adjustment_id: adj('002'),
    charge_id: 'h0000001-0000-0000-0000-000000000007' as ChargeId, // Auckland membership
    adjustment_type: 'GOODWILL_CREDIT',
    amount: -25.0,
    reason_code: 'goodwill.equipment-outage',
    reason_detail: 'Reformer studio AC offline 22 May. Goodwill credit applied.',
    actor_id: PERSON_LEILA_PATEL_ID,
    approval_required: true,
    approved_by_id: PERSON_LEILA_PATEL_ID,
    daysAgoVal: 12,
  },
  {
    adjustment_id: adj('003'),
    charge_id: 'h0000001-0000-0000-0000-000000000005' as ChargeId, // Auckland tee
    adjustment_type: 'ADMIN_CORRECTION',
    amount: -3.0,
    reason_code: 'admin-correction.price-mismatch',
    reason_detail: 'Tee was POS-priced at NZD 48; should have been NZD 45 promo.',
    actor_id: PERSON_LEILA_PATEL_ID,
    approval_required: false,
    daysAgoVal: 36,
  },
]

export const seedAdjustments: Adjustment[] = SEEDS.map(
  (s): Adjustment => ({
    adjustment_id: s.adjustment_id,
    charge_id: s.charge_id,
    line_item_id: undefined,
    adjustment_type: s.adjustment_type,
    amount: decimal(s.amount),
    reason_code: s.reason_code,
    reason_detail: s.reason_detail,
    actor_id: s.actor_id,
    approval_required: s.approval_required,
    approved_by_id: s.approved_by_id,
    idempotency_key: id() as IdempotencyKey,
    created_at: daysAgo(s.daysAgoVal),
  }),
)

interface AdjustmentsStore {
  adjustments: Adjustment[]
  list: () => Adjustment[]
  listByCharge: (cid: ChargeId) => Adjustment[]
  create: (
    input: {
      charge_id: ChargeId
      adjustment_type: AdjustmentType
      amount: number
      reason_code: string
      reason_detail?: string
      actor_id: PersonId
      idempotency_key?: IdempotencyKey
      approval_threshold?: number
      approved_by_id?: PersonId
    },
  ) => Adjustment
}

export const useAdjustmentsStore = create<AdjustmentsStore>((set, get) => ({
  adjustments: seedAdjustments,
  list: () => get().adjustments,
  listByCharge: (cid) =>
    get().adjustments.filter((a) => a.charge_id === cid),

  create: (input) => {
    const charge = useChargesStore.getState().getById(input.charge_id)
    const approval_required = (input.approval_threshold ?? 0) > 0
      ? Math.abs(input.amount) > (input.approval_threshold ?? 0)
      : false
    const adjustment: Adjustment = {
      adjustment_id: id() as AdjustmentId,
      charge_id: input.charge_id,
      line_item_id: undefined,
      adjustment_type: input.adjustment_type,
      amount: decimal(input.amount),
      reason_code: input.reason_code,
      reason_detail: input.reason_detail,
      actor_id: input.actor_id,
      approval_required,
      approved_by_id: input.approved_by_id,
      idempotency_key: input.idempotency_key ?? (id() as IdempotencyKey),
      created_at: isoNow(),
    }
    set((s) => ({ adjustments: [...s.adjustments, adjustment] }))
    emitAuditEvent({
      event_type: 'adjustment.created',
      actor_person_id: input.actor_id,
      target_entity_type: 'Adjustment',
      target_entity_id: adjustment.adjustment_id,
      company_id: charge?.company_id ?? ('' as never),
      scope_type: 'LOCATION',
      scope_id: charge?.location_id_at_sale,
      after_value: {
        charge_id: input.charge_id,
        adjustment_type: input.adjustment_type,
        amount: adjustment.amount,
        reason_code: input.reason_code,
        approval_required,
      },
    })
    return adjustment
  },
}))

export function listAdjustmentsByCharge(cid: ChargeId) {
  return useAdjustmentsStore.getState().listByCharge(cid)
}
