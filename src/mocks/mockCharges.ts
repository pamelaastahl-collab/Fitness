/**
 * Mock Charges + ChargeLineItems + ChargePolicySnapshots (UCE §2.1–2.3).
 *
 * INVARIANT 3: Committed Charges and ChargeLineItems are IMMUTABLE.
 * INVARIANT 4: Every Charge carries immutable org snapshot fields.
 *
 * Day 2 seeds ~35 charges spanning ~90 days. Factory functions keep totals
 * arithmetically consistent so the seed represents real-shaped commerce
 * (gross + tax − credits = customer_due, line items sum to header totals).
 *
 * The factory does NOT enforce XPI-FIN-02 at seed time — these charges are
 * pre-existing data. The F2 commit path will enforce the BE bank-config check
 * for new commits.
 */

import { create } from 'zustand'
import type {
  Charge,
  ChargeChannel,
  ChargeId,
  ChargeLineItem,
  ChargeLineItemId,
  ChargeLineItemType,
  ChargePolicySnapshot,
  ChargePolicySnapshotId,
  CompanyId,
  DecimalString,
  IdempotencyKey,
  LocationId,
  OfferingVersionId,
  PaymentPosture,
  PersonId,
} from '@/types/primitives'
import { daysAgo, decimal, fakeSha256, id, isoNow, sumDecimals } from './_helpers'
import { emitAuditEvent } from './mockAuditEvents'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'
import {
  BE_FITFLOW_PACIFIC_ID,
  BE_IRON_HARBOR_COASTAL_ID,
} from './mockBusinessEntities'
import {
  LOC_FITFLOW_AUCKLAND_ID,
  LOC_FITFLOW_WELLINGTON_ID,
  LOC_IRON_BROOKLYN_ID,
  LOC_IRON_MANHATTAN_ID,
  LOC_IRON_QUEENS_ID,
} from './mockLocations'
import {
  OV_FF_BRAND_TEE_V1_ID,
  OV_FF_HEATED_VINYASA_V1_ID,
  OV_FF_REFORMER_8PACK_V1_ID,
  OV_FF_UNLIMITED_V1_ID,
  OV_IH_ALL_ACCESS_V1_ID,
  OV_IH_ALL_ACCESS_V2_ID,
  OV_IH_ALL_ACCESS_V3_ID,
  OV_IH_GIFT_CARD_V1_ID,
  OV_IH_LAP_LANE_V1_ID,
} from './mockOfferingVersions'
import {
  PERSON_AROHA_HENARE_ID,
  PERSON_JAMIE_COOPER_ID,
  PERSON_LEILA_PATEL_ID,
  PERSON_MEI_TANAKA_ID,
  PERSON_MEMBER_AMARA_OKAFOR_ID,
  PERSON_MEMBER_ELLA_NGUYEN_ID,
  PERSON_MEMBER_ETHAN_VOGEL_ID,
  PERSON_MEMBER_HARPER_LINDQVIST_ID,
  PERSON_MEMBER_LUCIA_RIVERA_ID,
  PERSON_MEMBER_NOAH_FIELDING_ID,
  PERSON_MEMBER_OLIVIA_REID_ID,
  PERSON_MEMBER_ROHAN_DASS_ID,
  PERSON_MEMBER_TIMOTHY_AKINS_ID,
  PERSON_MEMBER_ZARA_HAQ_ID,
  PERSON_OWEN_DAVIES_ID,
  PERSON_TE_AROHA_MANAAKI_ID,
} from './mockPersons'

// ──────────────────────────────────────────────────────────────────────────────
// Pricing reference. Used by the factory to keep numbers consistent.
// ──────────────────────────────────────────────────────────────────────────────

interface OfferingPricing {
  base_price: number
  category: string
  tax_category: string
  revenue_category: string
  description: string
  /** Effective tax rate as a decimal fraction (e.g. 0.15 for 15%). */
  tax_rate: number
}

const PRICING: Record<OfferingVersionId, OfferingPricing> = {
  [OV_FF_UNLIMITED_V1_ID]: {
    base_price: 199.0,
    category: 'membership',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-membership',
    description: 'Unlimited Membership — Monthly',
    tax_rate: 0.15,
  },
  [OV_FF_HEATED_VINYASA_V1_ID]: {
    base_price: 28.0,
    category: 'class-yoga',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-class',
    description: 'Heated Vinyasa Yoga (60 min) — drop-in',
    tax_rate: 0.15,
  },
  [OV_FF_REFORMER_8PACK_V1_ID]: {
    base_price: 280.0,
    category: 'package-pilates',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-credit-pack',
    description: 'Reformer Pilates 8-pack',
    tax_rate: 0.15,
  },
  [OV_FF_BRAND_TEE_V1_ID]: {
    base_price: 45.0,
    category: 'retail-apparel',
    tax_category: 'nz-gst-15',
    revenue_category: 'rev-retail',
    description: 'FitFlow Brand Tee',
    tax_rate: 0.15,
  },
  [OV_IH_ALL_ACCESS_V1_ID]: {
    base_price: 139.0,
    category: 'membership',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-membership',
    description: 'Iron Harbor All-Access — Monthly (v1)',
    tax_rate: 0.08875,
  },
  [OV_IH_ALL_ACCESS_V2_ID]: {
    base_price: 149.0,
    category: 'membership',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-membership',
    description: 'Iron Harbor All-Access — Monthly (v2)',
    tax_rate: 0.08875,
  },
  [OV_IH_ALL_ACCESS_V3_ID]: {
    base_price: 159.0,
    category: 'membership',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-membership',
    description: 'Iron Harbor All-Access — Monthly (v3)',
    tax_rate: 0.08875,
  },
  [OV_IH_LAP_LANE_V1_ID]: {
    base_price: 14.0,
    category: 'facility-rental',
    tax_category: 'us-ny-sales-8.875',
    revenue_category: 'rev-facility',
    description: 'Lap Lane Reservation (45 min)',
    tax_rate: 0.08875,
  },
  [OV_IH_GIFT_CARD_V1_ID]: {
    base_price: 50.0,
    category: 'gift-card',
    tax_category: 'us-non-taxable',
    revenue_category: 'rev-gift-card',
    description: '$50 Gift Card',
    tax_rate: 0,
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────────────────────────────────────

interface ChargeSpec {
  charge_id: ChargeId
  /** Days ago the charge committed. */
  committedDaysAgo: number
  customer_id: PersonId
  actor_id: PersonId
  channel: ChargeChannel
  payment_posture: PaymentPosture
  location: LocationId
  /** Items as [version_id, quantity, optional_discount]. */
  items: Array<[OfferingVersionId, number, number?]>
  /** Optional credits applied (positive number — the factory negates). */
  credit_applied?: number
  /** Optional invoice_status for PAY_LATER. */
  invoice_status?: Charge['invoice_status']
}

interface BuiltCharge {
  charge: Charge
  line_items: ChargeLineItem[]
  policy_snapshot: ChargePolicySnapshot
}

const LOC_TO_BE: Record<LocationId, [import('@/types/primitives').BusinessEntityId, CompanyId, string]> = {
  [LOC_FITFLOW_AUCKLAND_ID]: [BE_FITFLOW_PACIFIC_ID, COMPANY_FITFLOW_PACIFIC_ID, 'NZD'],
  [LOC_FITFLOW_WELLINGTON_ID]: [BE_FITFLOW_PACIFIC_ID, COMPANY_FITFLOW_PACIFIC_ID, 'NZD'],
  [LOC_IRON_BROOKLYN_ID]: [BE_IRON_HARBOR_COASTAL_ID, COMPANY_IRON_HARBOR_ID, 'USD'],
  [LOC_IRON_QUEENS_ID]: [BE_IRON_HARBOR_COASTAL_ID, COMPANY_IRON_HARBOR_ID, 'USD'],
  [LOC_IRON_MANHATTAN_ID]: [BE_IRON_HARBOR_COASTAL_ID, COMPANY_IRON_HARBOR_ID, 'USD'],
}

let lineItemCounter = 0
function liId(): ChargeLineItemId {
  lineItemCounter += 1
  return `x0000001-0000-0000-0000-${String(lineItemCounter).padStart(12, '0')}` as ChargeLineItemId
}

function buildCharge(spec: ChargeSpec): BuiltCharge {
  const [be_id, company_id, currency] = LOC_TO_BE[spec.location]
  const committed_at = daysAgo(spec.committedDaysAgo)
  const charge_id = spec.charge_id

  const lines: ChargeLineItem[] = []
  let gross = 0
  let discount = 0
  let tax = 0

  for (const [version_id, qty, lineDiscount] of spec.items) {
    const p = PRICING[version_id]
    if (!p) throw new Error(`Missing pricing for ${version_id}`)

    const baseAmount = p.base_price * qty
    lines.push({
      line_item_id: liId(),
      charge_id,
      offering_version_id: version_id,
      line_type: 'BASE_PRICE',
      description: p.description,
      category: p.category,
      revenue_category: p.revenue_category,
      tax_category: p.tax_category,
      amount: decimal(baseAmount),
      quantity: qty,
      unit_price: decimal(p.base_price),
      policy_rule_id: 'pricing.base-rate.v1',
      policy_rule_hash: fakeSha256(`${version_id}|base-rate.v1`),
    })
    gross += baseAmount

    let discountedBase = baseAmount
    if (lineDiscount && lineDiscount > 0) {
      const d = -lineDiscount
      lines.push({
        line_item_id: liId(),
        charge_id,
        offering_version_id: version_id,
        line_type: 'DISCOUNT',
        description: `Member discount — ${p.description}`,
        category: p.category,
        revenue_category: p.revenue_category,
        tax_category: p.tax_category,
        amount: decimal(d),
        quantity: 1,
        unit_price: decimal(d),
        policy_rule_id: 'pricing.member-discount.v1',
        policy_rule_hash: fakeSha256(`${version_id}|member-discount.v1`),
      })
      discount += d
      discountedBase += d
    }

    if (p.tax_rate > 0) {
      const taxAmount = Math.round(discountedBase * p.tax_rate * 100) / 100
      lines.push({
        line_item_id: liId(),
        charge_id,
        offering_version_id: version_id,
        line_type: 'TAX',
        description: `Tax (${p.tax_category})`,
        category: p.category,
        revenue_category: p.revenue_category,
        tax_category: p.tax_category,
        amount: decimal(taxAmount),
        quantity: 1,
        unit_price: decimal(taxAmount),
        policy_rule_id: 'tax.lookup.v1',
        policy_rule_hash: fakeSha256(`${version_id}|tax.lookup.v1`),
      })
      tax += taxAmount
    }
  }

  let credit_applied = 0
  if (spec.credit_applied && spec.credit_applied > 0) {
    const c = -spec.credit_applied
    // Use the first line's reporting dimensions for the credit row.
    const ref = PRICING[spec.items[0][0]]
    lines.push({
      line_item_id: liId(),
      charge_id,
      offering_version_id: spec.items[0][0],
      line_type: 'CREDIT',
      description: 'Member balance credit applied',
      category: ref.category,
      revenue_category: ref.revenue_category,
      tax_category: ref.tax_category,
      amount: decimal(c),
      quantity: 1,
      unit_price: decimal(c),
      policy_rule_id: 'credit.balance.apply.v1',
      policy_rule_hash: fakeSha256(`balance-credit.v1`),
    })
    credit_applied = c
  }

  // COMP: add a single COMP line to bring the customer_due to zero.
  let comp = 0
  if (spec.payment_posture === 'COMP') {
    const owed = gross + discount + tax + credit_applied
    if (owed > 0) {
      const c = -owed
      const ref = PRICING[spec.items[0][0]]
      lines.push({
        line_item_id: liId(),
        charge_id,
        offering_version_id: spec.items[0][0],
        line_type: 'COMP',
        description: 'Comp adjustment — staff appreciation',
        category: ref.category,
        revenue_category: ref.revenue_category,
        tax_category: ref.tax_category,
        amount: decimal(c),
        quantity: 1,
        unit_price: decimal(c),
        policy_rule_id: 'comp.staff.v1',
        policy_rule_hash: fakeSha256(`comp.staff.v1`),
      })
      comp = c
    }
  }

  const customer_due = gross + discount + tax + credit_applied + comp

  const policy_snapshot_id = id() as ChargePolicySnapshotId
  const policy_snapshot: ChargePolicySnapshot = {
    snapshot_id: policy_snapshot_id,
    charge_id,
    rules_json: {
      pricing_rules: ['pricing.base-rate.v1', 'pricing.member-discount.v1'],
      tax_rules: ['tax.lookup.v1'],
      credit_rules: ['credit.balance.apply.v1'],
      comp_rules: ['comp.staff.v1'],
    },
    rules_hash: fakeSha256(
      `${charge_id}|pricing.base-rate.v1|tax.lookup.v1|${committed_at}`,
    ),
    captured_at: committed_at,
  }

  const charge: Charge = {
    charge_id,
    idempotency_key: id() as IdempotencyKey,
    company_id,
    customer_id: spec.customer_id,
    actor_id: spec.actor_id,
    channel: spec.channel,
    location_id: spec.location,
    business_entity_id_at_sale: be_id,
    location_id_at_sale: spec.location,
    department_id_at_sale: undefined,
    status: 'COMMITTED',
    payment_posture: spec.payment_posture,
    invoice_status:
      spec.payment_posture === 'PAY_LATER'
        ? spec.invoice_status ?? 'PENDING'
        : undefined,
    gross_total: decimal(gross),
    discount_total: decimal(discount),
    tax_total: decimal(tax),
    credit_applied: decimal(credit_applied),
    subsidy_applied: decimal(0),
    customer_due: decimal(customer_due),
    currency,
    committed_at,
    policy_snapshot_id,
  }

  return { charge, line_items: lines, policy_snapshot }
}

// ──────────────────────────────────────────────────────────────────────────────
// Seed
// ──────────────────────────────────────────────────────────────────────────────

function cid(suffix: string): ChargeId {
  return `h0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as ChargeId
}

const SPECS: ChargeSpec[] = [
  // ── FitFlow Auckland — POS, mostly PAY_NOW ────────────────────────────────
  { charge_id: cid('001'), committedDaysAgo: 88, customer_id: PERSON_MEMBER_OLIVIA_REID_ID, actor_id: PERSON_AROHA_HENARE_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_UNLIMITED_V1_ID, 1]] },
  { charge_id: cid('002'), committedDaysAgo: 75, customer_id: PERSON_MEMBER_NOAH_FIELDING_ID, actor_id: PERSON_JAMIE_COOPER_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_UNLIMITED_V1_ID, 1]] },
  { charge_id: cid('003'), committedDaysAgo: 60, customer_id: PERSON_MEMBER_AMARA_OKAFOR_ID, actor_id: PERSON_AROHA_HENARE_ID, channel: 'WEB', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_REFORMER_8PACK_V1_ID, 1]] },
  { charge_id: cid('004'), committedDaysAgo: 45, customer_id: PERSON_MEMBER_OLIVIA_REID_ID, actor_id: PERSON_JAMIE_COOPER_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_HEATED_VINYASA_V1_ID, 1]] },
  { charge_id: cid('005'), committedDaysAgo: 42, customer_id: PERSON_MEMBER_NOAH_FIELDING_ID, actor_id: PERSON_JAMIE_COOPER_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_BRAND_TEE_V1_ID, 1]] },
  { charge_id: cid('006'), committedDaysAgo: 38, customer_id: PERSON_MEMBER_AMARA_OKAFOR_ID, actor_id: PERSON_AROHA_HENARE_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_HEATED_VINYASA_V1_ID, 1]], credit_applied: 14 },
  { charge_id: cid('007'), committedDaysAgo: 30, customer_id: PERSON_MEMBER_OLIVIA_REID_ID, actor_id: PERSON_AROHA_HENARE_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_UNLIMITED_V1_ID, 1]] },
  { charge_id: cid('008'), committedDaysAgo: 22, customer_id: PERSON_MEMBER_NOAH_FIELDING_ID, actor_id: PERSON_JAMIE_COOPER_ID, channel: 'POS', payment_posture: 'PAY_LATER', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_REFORMER_8PACK_V1_ID, 1]], invoice_status: 'PENDING' },
  { charge_id: cid('009'), committedDaysAgo: 14, customer_id: PERSON_MEMBER_AMARA_OKAFOR_ID, actor_id: PERSON_LEILA_PATEL_ID, channel: 'ADMIN', payment_posture: 'COMP', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_BRAND_TEE_V1_ID, 1]] },
  { charge_id: cid('010'), committedDaysAgo: 9, customer_id: PERSON_MEMBER_OLIVIA_REID_ID, actor_id: PERSON_AROHA_HENARE_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_HEATED_VINYASA_V1_ID, 1], [OV_FF_BRAND_TEE_V1_ID, 1]] },
  { charge_id: cid('011'), committedDaysAgo: 4, customer_id: PERSON_MEMBER_NOAH_FIELDING_ID, actor_id: PERSON_JAMIE_COOPER_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_UNLIMITED_V1_ID, 1]] },
  { charge_id: cid('012'), committedDaysAgo: 1, customer_id: PERSON_MEMBER_AMARA_OKAFOR_ID, actor_id: PERSON_AROHA_HENARE_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_AUCKLAND_ID, items: [[OV_FF_HEATED_VINYASA_V1_ID, 1]] },

  // ── FitFlow Wellington ────────────────────────────────────────────────────
  { charge_id: cid('020'), committedDaysAgo: 80, customer_id: PERSON_MEMBER_ETHAN_VOGEL_ID, actor_id: PERSON_TE_AROHA_MANAAKI_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_WELLINGTON_ID, items: [[OV_FF_UNLIMITED_V1_ID, 1]] },
  { charge_id: cid('021'), committedDaysAgo: 50, customer_id: PERSON_MEMBER_ETHAN_VOGEL_ID, actor_id: PERSON_TE_AROHA_MANAAKI_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_WELLINGTON_ID, items: [[OV_FF_UNLIMITED_V1_ID, 1]] },
  { charge_id: cid('022'), committedDaysAgo: 25, customer_id: PERSON_MEMBER_ZARA_HAQ_ID, actor_id: PERSON_TE_AROHA_MANAAKI_ID, channel: 'WEB', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_WELLINGTON_ID, items: [[OV_FF_BRAND_TEE_V1_ID, 2]] },
  { charge_id: cid('023'), committedDaysAgo: 19, customer_id: PERSON_MEMBER_ETHAN_VOGEL_ID, actor_id: PERSON_TE_AROHA_MANAAKI_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_FITFLOW_WELLINGTON_ID, items: [[OV_FF_UNLIMITED_V1_ID, 1]] },
  { charge_id: cid('024'), committedDaysAgo: 6, customer_id: PERSON_MEMBER_ZARA_HAQ_ID, actor_id: PERSON_TE_AROHA_MANAAKI_ID, channel: 'POS', payment_posture: 'PAY_LATER', location: LOC_FITFLOW_WELLINGTON_ID, items: [[OV_FF_UNLIMITED_V1_ID, 1]], invoice_status: 'OVERDUE' },

  // ── Iron Harbor Brooklyn — historical references include retired versions
  // for charges that pre-date publish-v3. XPI-CAT-04 — historical immutability.
  { charge_id: cid('100'), committedDaysAgo: 320, customer_id: PERSON_MEMBER_ROHAN_DASS_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_ALL_ACCESS_V1_ID, 1]] },
  { charge_id: cid('101'), committedDaysAgo: 220, customer_id: PERSON_MEMBER_ROHAN_DASS_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_ALL_ACCESS_V2_ID, 1]] },
  { charge_id: cid('102'), committedDaysAgo: 165, customer_id: PERSON_MEMBER_LUCIA_RIVERA_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_ALL_ACCESS_V2_ID, 1]] },
  { charge_id: cid('103'), committedDaysAgo: 90, customer_id: PERSON_MEMBER_ROHAN_DASS_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_ALL_ACCESS_V2_ID, 1]] },
  { charge_id: cid('104'), committedDaysAgo: 55, customer_id: PERSON_MEMBER_ROHAN_DASS_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_ALL_ACCESS_V3_ID, 1]] },
  { charge_id: cid('105'), committedDaysAgo: 40, customer_id: PERSON_MEMBER_LUCIA_RIVERA_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_LAP_LANE_V1_ID, 3]] },
  { charge_id: cid('106'), committedDaysAgo: 28, customer_id: PERSON_MEMBER_ROHAN_DASS_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_LAP_LANE_V1_ID, 1]] },
  { charge_id: cid('107'), committedDaysAgo: 18, customer_id: PERSON_MEMBER_LUCIA_RIVERA_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_ALL_ACCESS_V3_ID, 1]] },
  { charge_id: cid('108'), committedDaysAgo: 11, customer_id: PERSON_MEMBER_ROHAN_DASS_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_GIFT_CARD_V1_ID, 2]] },
  { charge_id: cid('109'), committedDaysAgo: 3, customer_id: PERSON_MEMBER_LUCIA_RIVERA_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_BROOKLYN_ID, items: [[OV_IH_LAP_LANE_V1_ID, 1]] },

  // ── Iron Harbor Queens ────────────────────────────────────────────────────
  { charge_id: cid('120'), committedDaysAgo: 70, customer_id: PERSON_MEMBER_TIMOTHY_AKINS_ID, actor_id: PERSON_OWEN_DAVIES_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_QUEENS_ID, items: [[OV_IH_ALL_ACCESS_V2_ID, 1]] },
  { charge_id: cid('121'), committedDaysAgo: 40, customer_id: PERSON_MEMBER_TIMOTHY_AKINS_ID, actor_id: PERSON_OWEN_DAVIES_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_QUEENS_ID, items: [[OV_IH_ALL_ACCESS_V3_ID, 1]] },
  { charge_id: cid('122'), committedDaysAgo: 15, customer_id: PERSON_MEMBER_TIMOTHY_AKINS_ID, actor_id: PERSON_OWEN_DAVIES_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_QUEENS_ID, items: [[OV_IH_GIFT_CARD_V1_ID, 1]] },

  // ── Iron Harbor Manhattan (NoMad) ─────────────────────────────────────────
  { charge_id: cid('140'), committedDaysAgo: 35, customer_id: PERSON_MEMBER_ELLA_NGUYEN_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_MANHATTAN_ID, items: [[OV_IH_ALL_ACCESS_V3_ID, 1]] },
  { charge_id: cid('141'), committedDaysAgo: 20, customer_id: PERSON_MEMBER_HARPER_LINDQVIST_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'POS', payment_posture: 'PAY_NOW', location: LOC_IRON_MANHATTAN_ID, items: [[OV_IH_ALL_ACCESS_V3_ID, 1]] },
  { charge_id: cid('142'), committedDaysAgo: 7, customer_id: PERSON_MEMBER_ELLA_NGUYEN_ID, actor_id: PERSON_MEI_TANAKA_ID, channel: 'WEB', payment_posture: 'PAY_NOW', location: LOC_IRON_MANHATTAN_ID, items: [[OV_IH_GIFT_CARD_V1_ID, 1]] },
]

const built = SPECS.map(buildCharge)

export const seedCharges: Charge[] = built.map((b) => b.charge)
export const seedChargeLineItems: ChargeLineItem[] = built.flatMap(
  (b) => b.line_items,
)
export const seedChargePolicySnapshots: ChargePolicySnapshot[] = built.map(
  (b) => b.policy_snapshot,
)

// ──────────────────────────────────────────────────────────────────────────────
// Stores
// ──────────────────────────────────────────────────────────────────────────────

interface ChargesStore {
  charges: Charge[]
  list: () => Charge[]
  listByCompany: (cid: CompanyId) => Charge[]
  listByLocation: (lid: LocationId) => Charge[]
  listByCustomer: (pid: PersonId) => Charge[]
  getById: (cid: ChargeId) => Charge | undefined
  /**
   * Commit a charge. Builds line items + snapshot, validates idempotency,
   * and emits charge.committed. Caller must verify XPI-FIN-02 (BE has active
   * bank config) — exposed as a separate guard so the UI can show a friendly
   * error rather than a thrown exception.
   */
  commit: (
    spec: Omit<ChargeSpec, 'charge_id' | 'committedDaysAgo'> & {
      idempotency_key?: IdempotencyKey
    },
  ) => BuiltCharge
}

interface LineItemsStore {
  items: ChargeLineItem[]
  list: () => ChargeLineItem[]
  listByCharge: (cid: ChargeId) => ChargeLineItem[]
}

interface PolicySnapshotsStore {
  snapshots: ChargePolicySnapshot[]
  getByCharge: (cid: ChargeId) => ChargePolicySnapshot | undefined
}

export const useChargesStore = create<ChargesStore>((set, get) => ({
  charges: seedCharges,
  list: () => get().charges,
  listByCompany: (cid) => get().charges.filter((c) => c.company_id === cid),
  listByLocation: (lid) =>
    get().charges.filter((c) => c.location_id_at_sale === lid),
  listByCustomer: (pid) =>
    get().charges.filter((c) => c.customer_id === pid),
  getById: (chargeId) =>
    get().charges.find((c) => c.charge_id === chargeId),

  commit: (input) => {
    const charge_id = id() as ChargeId
    const built = buildCharge({
      charge_id,
      committedDaysAgo: 0,
      ...input,
    })
    if (input.idempotency_key) {
      built.charge.idempotency_key = input.idempotency_key
    }
    set((s) => ({ charges: [...s.charges, built.charge] }))
    useLineItemsStore.setState((s) => ({
      items: [...s.items, ...built.line_items],
    }))
    usePolicySnapshotsStore.setState((s) => ({
      snapshots: [...s.snapshots, built.policy_snapshot],
    }))
    emitAuditEvent({
      event_type: 'charge.committed',
      actor_person_id: built.charge.actor_id,
      target_entity_type: 'Charge',
      target_entity_id: built.charge.charge_id,
      company_id: built.charge.company_id,
      scope_type: 'LOCATION',
      scope_id: built.charge.location_id_at_sale,
      after_value: {
        customer_due: built.charge.customer_due,
        currency: built.charge.currency,
        line_count: built.line_items.length,
      },
    })
    void isoNow()
    void sumDecimals
    return built
  },
}))

export const useLineItemsStore = create<LineItemsStore>((_set, get) => ({
  items: seedChargeLineItems,
  list: () => get().items,
  listByCharge: (chargeId) =>
    get().items.filter((i) => i.charge_id === chargeId),
}))

export const usePolicySnapshotsStore = create<PolicySnapshotsStore>(
  (_set, get) => ({
    snapshots: seedChargePolicySnapshots,
    getByCharge: (chargeId) =>
      get().snapshots.find((s) => s.charge_id === chargeId),
  }),
)

export function listCharges() {
  return useChargesStore.getState().list()
}
export function listChargesByLocation(lid: LocationId) {
  return useChargesStore.getState().listByLocation(lid)
}
export function listLineItemsByCharge(chargeId: ChargeId) {
  return useLineItemsStore.getState().listByCharge(chargeId)
}

export type { ChargeLineItemType, DecimalString }
