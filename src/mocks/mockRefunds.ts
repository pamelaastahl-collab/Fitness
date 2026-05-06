/**
 * Mock Refunds (UCE §2.5).
 *
 * INVARIANT 6: Over-refund is blocked.
 * UCE-BR-007: Refunds above location-configured threshold require approval.
 *
 * The prototype's location-level threshold is uniform (NZD/USD 100) until
 * F3 Refund with Approval introduces per-Location config.
 *
 * Seed shape:
 *   - One PARTIAL completed refund (below threshold, no approval needed)
 *   - One FULL completed refund (above threshold, manager approved)
 *   - One PARTIAL pending refund — exercises the approval queue UI
 */

import { create } from 'zustand'
import type {
  ChargeId,
  IdempotencyKey,
  PersonId,
  Refund,
  RefundId,
  RefundStatus,
  RefundType,
} from '@/types/primitives'
import { daysAgo, decimal, id, isoNow } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import {
  PERSON_AROHA_HENARE_ID,
  PERSON_LEILA_PATEL_ID,
  PERSON_MEI_TANAKA_ID,
} from './mockPersons'
import { useChargesStore } from './mockCharges'

/** Approval threshold (in same currency as the Charge). */
export const REFUND_APPROVAL_THRESHOLD = 100

function rfd(suffix: string): RefundId {
  return `f0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as RefundId
}

interface RefundSeed {
  refund_id: RefundId
  charge_id: ChargeId
  refund_type: RefundType
  amount: number
  reason_code: string
  actor_id: PersonId
  approved_by_id?: PersonId
  status: RefundStatus
  daysAgoVal: number
  processor_refund_reference?: string
}

const SEEDS: RefundSeed[] = [
  {
    refund_id: rfd('001'),
    charge_id: 'h0000001-0000-0000-0000-000000000010' as ChargeId, // Auckland yoga + tee
    refund_type: 'PARTIAL',
    amount: 28.0, // tee component, below threshold
    reason_code: 'returned-merchandise',
    actor_id: PERSON_AROHA_HENARE_ID,
    status: 'COMPLETED',
    daysAgoVal: 3,
    processor_refund_reference: 'ref_stripe_3kQz9R7e',
  },
  {
    refund_id: rfd('002'),
    charge_id: 'h0000001-0000-0000-0000-000000000007' as ChargeId, // Auckland membership
    refund_type: 'FULL',
    amount: 228.85, // above threshold
    reason_code: 'cancellation-relocation',
    actor_id: PERSON_AROHA_HENARE_ID,
    approved_by_id: PERSON_LEILA_PATEL_ID,
    status: 'COMPLETED',
    daysAgoVal: 8,
    processor_refund_reference: 'ref_stripe_4yCt2D9f',
  },
  {
    refund_id: rfd('003'),
    charge_id: 'h0000001-0000-0000-0000-000000000104' as ChargeId, // Brooklyn membership v3
    refund_type: 'FULL',
    amount: 173.11, // above threshold — pending approval
    reason_code: 'service-quality-complaint',
    actor_id: PERSON_MEI_TANAKA_ID,
    status: 'PENDING',
    daysAgoVal: 1,
  },
]

export const seedRefunds: Refund[] = SEEDS.map(
  (s): Refund => ({
    refund_id: s.refund_id,
    charge_id: s.charge_id,
    refund_type: s.refund_type,
    amount: decimal(s.amount),
    reason_code: s.reason_code,
    actor_id: s.actor_id,
    approved_by_id: s.approved_by_id,
    processor_refund_reference: s.processor_refund_reference,
    status: s.status,
    idempotency_key: id() as IdempotencyKey,
    created_at: daysAgo(s.daysAgoVal),
  }),
)

interface RefundsStore {
  refunds: Refund[]
  list: () => Refund[]
  listByCharge: (cid: ChargeId) => Refund[]
  listPending: () => Refund[]
  /**
   * Initiate a refund. Validates over-refund (XPI-IDM-03) and requires
   * `approved_by_id` when amount exceeds REFUND_APPROVAL_THRESHOLD.
   * Returns either { ok: true, refund } or a structured error.
   */
  initiate: (
    input: {
      charge_id: ChargeId
      refund_type: RefundType
      amount: number
      reason_code: string
      actor_id: PersonId
      approved_by_id?: PersonId
      idempotency_key?: IdempotencyKey
    },
  ) =>
    | { ok: true; refund: Refund }
    | { ok: false; error: 'OVER_REFUND' | 'APPROVAL_REQUIRED' | 'CHARGE_NOT_FOUND'; detail?: string }
  complete: (refund_id: RefundId, processor_refund_reference: string) => Refund | undefined
  approve: (refund_id: RefundId, approved_by_id: PersonId) => Refund | undefined
}

export const useRefundsStore = create<RefundsStore>((set, get) => ({
  refunds: seedRefunds,
  list: () => get().refunds,
  listByCharge: (cid) => get().refunds.filter((r) => r.charge_id === cid),
  listPending: () =>
    get().refunds.filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING'),

  initiate: (input) => {
    const charge = useChargesStore.getState().getById(input.charge_id)
    if (!charge) {
      return { ok: false, error: 'CHARGE_NOT_FOUND' }
    }

    // Over-refund guard (XPI-IDM-03).
    const priorRefunded = get()
      .refunds.filter((r) => r.charge_id === input.charge_id && r.status !== 'FAILED')
      .reduce((acc, r) => acc + Number(r.amount), 0)
    const remaining = Number(charge.customer_due) - priorRefunded
    if (input.amount > remaining + 0.0001) {
      return {
        ok: false,
        error: 'OVER_REFUND',
        detail: `Requested ${input.amount.toFixed(2)} exceeds remaining ${remaining.toFixed(2)}.`,
      }
    }

    if (input.amount > REFUND_APPROVAL_THRESHOLD && !input.approved_by_id) {
      return {
        ok: false,
        error: 'APPROVAL_REQUIRED',
        detail: `Refunds above ${REFUND_APPROVAL_THRESHOLD.toFixed(0)} require manager approval.`,
      }
    }

    const refund: Refund = {
      refund_id: id() as RefundId,
      charge_id: input.charge_id,
      refund_type: input.refund_type,
      amount: decimal(input.amount),
      reason_code: input.reason_code,
      actor_id: input.actor_id,
      approved_by_id: input.approved_by_id,
      status: 'PENDING',
      idempotency_key: input.idempotency_key ?? (id() as IdempotencyKey),
      created_at: isoNow(),
    }
    set((s) => ({ refunds: [...s.refunds, refund] }))
    emitAuditEvent({
      event_type: 'refund.created',
      actor_person_id: input.actor_id,
      target_entity_type: 'Refund',
      target_entity_id: refund.refund_id,
      company_id: charge.company_id,
      scope_type: 'LOCATION',
      scope_id: charge.location_id_at_sale,
      after_value: {
        charge_id: input.charge_id,
        amount: refund.amount,
        reason_code: input.reason_code,
        approved_by_id: input.approved_by_id,
      },
    })
    return { ok: true, refund }
  },

  complete: (refund_id, processor_refund_reference) => {
    const before = get().refunds.find((r) => r.refund_id === refund_id)
    if (!before) return undefined
    const after: Refund = {
      ...before,
      status: 'COMPLETED',
      processor_refund_reference,
    }
    set((s) => ({
      refunds: s.refunds.map((r) => (r.refund_id === refund_id ? after : r)),
    }))
    const charge = useChargesStore.getState().getById(before.charge_id)
    if (charge) {
      emitAuditEvent({
        event_type: 'refund.completed',
        actor_person_id: before.actor_id,
        target_entity_type: 'Refund',
        target_entity_id: refund_id,
        company_id: charge.company_id,
        scope_type: 'LOCATION',
        scope_id: charge.location_id_at_sale,
        before_value: { status: before.status },
        after_value: { status: after.status, processor_refund_reference },
      })
    }
    return after
  },

  approve: (refund_id, approved_by_id) => {
    const before = get().refunds.find((r) => r.refund_id === refund_id)
    if (!before) return undefined
    const after: Refund = { ...before, approved_by_id }
    set((s) => ({
      refunds: s.refunds.map((r) => (r.refund_id === refund_id ? after : r)),
    }))
    return after
  },
}))

export function listPendingRefunds() {
  return useRefundsStore.getState().listPending()
}
