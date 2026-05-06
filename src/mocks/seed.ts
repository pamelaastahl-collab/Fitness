/**
 * Seed orchestrator.
 *
 * Each individual mock store ships its data inline via `create<>(... seed)`,
 * so the entity stores are populated from the moment they're imported. The
 * one thing that needs explicit orchestration is the **audit event backfill** —
 * historical state-changing events that would have been emitted as the seed
 * was created, replayed in chronological order so the audit log isn't empty
 * when the prototype boots.
 *
 * Backfill emits cover, per primitive's audit-event-spec:
 *   OH:  company.created · entity.created · location.created · department.created
 *   UOM: offering.created · offering.published · offering.retired
 *   UUM: role.assigned · user.invited
 *   UCE: charge.committed · adjustment.created · refund.created · refund.completed
 *   Impersonation history.
 *
 * Idempotent: bootstrap may be called multiple times (HMR), but the audit
 * store is hydrated only once per session via `__seeded` flag.
 */

import type { AuditEvent, AuditEventId, ScopeType } from '@/types/primitives'
import { fakeSha256, id } from './_helpers'
import { useAuditStore } from './mockAuditEvents'
import { seedCompanies } from './mockCompanies'
import { seedBusinessEntities } from './mockBusinessEntities'
import { seedLocations } from './mockLocations'
import { seedDepartments } from './mockDepartments'
import { seedOfferings } from './mockOfferings'
import { seedOfferingVersions } from './mockOfferingVersions'
import { seedRoleAssignments } from './mockRoleAssignments'
import { seedInvitedMembership } from './mockTenantMemberships'
import { seedImpersonationSessions } from './mockSessions'
import {
  seedCharges,
  seedChargeLineItems,
} from './mockCharges'
import { seedAdjustments } from './mockAdjustments'
import { seedRefunds } from './mockRefunds'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'
import { PERSON_SARAH_CHEN_ID, PERSON_MADELINE_FOSTER_ID } from './mockPersons'

let __seeded = false

interface BackfillEvent {
  event_type: string
  actor_person_id: import('@/types/primitives').PersonId
  target_entity_type: string
  target_entity_id: string
  company_id: import('@/types/primitives').CompanyId
  scope_type?: ScopeType
  scope_id?: string
  occurred_at: import('@/types/primitives').IsoTimestamp
  before_value?: Record<string, unknown>
  after_value?: Record<string, unknown>
  actor_type?: import('@/types/primitives').AuditActorType
}

function buildBackfill(): BackfillEvent[] {
  const events: BackfillEvent[] = []

  // Company creation events — actor is the company's first COMPANY_ADMIN.
  for (const c of seedCompanies) {
    const founder =
      c.company_id === COMPANY_FITFLOW_PACIFIC_ID
        ? PERSON_SARAH_CHEN_ID
        : PERSON_MADELINE_FOSTER_ID
    events.push({
      event_type: 'company.created',
      actor_person_id: founder,
      target_entity_type: 'Company',
      target_entity_id: c.company_id,
      company_id: c.company_id,
      occurred_at: c.created_at,
      after_value: {
        slug: c.slug,
        primary_timezone: c.primary_timezone,
        primary_currency: c.primary_currency,
      },
    })
  }

  for (const be of seedBusinessEntities) {
    const founder =
      be.company_id === COMPANY_FITFLOW_PACIFIC_ID
        ? PERSON_SARAH_CHEN_ID
        : PERSON_MADELINE_FOSTER_ID
    events.push({
      event_type: 'entity.created',
      actor_person_id: founder,
      target_entity_type: 'BusinessEntity',
      target_entity_id: be.business_entity_id,
      company_id: be.company_id,
      scope_type: 'COMPANY',
      scope_id: be.company_id,
      occurred_at: be.created_at,
      after_value: { name: be.name, country_code: be.country_code },
    })
  }

  for (const loc of seedLocations) {
    const founder =
      loc.company_id === COMPANY_FITFLOW_PACIFIC_ID
        ? PERSON_SARAH_CHEN_ID
        : PERSON_MADELINE_FOSTER_ID
    events.push({
      event_type: 'location.created',
      actor_person_id: founder,
      target_entity_type: 'Location',
      target_entity_id: loc.location_id,
      company_id: loc.company_id,
      scope_type: 'LOCATION',
      scope_id: loc.location_id,
      occurred_at: loc.created_at,
      after_value: {
        name: loc.name,
        timezone: loc.timezone,
        business_entity_id: loc.business_entity_id,
      },
    })
  }

  for (const dept of seedDepartments) {
    const founder =
      dept.company_id === COMPANY_FITFLOW_PACIFIC_ID
        ? PERSON_SARAH_CHEN_ID
        : PERSON_MADELINE_FOSTER_ID
    events.push({
      event_type: 'department.created',
      actor_person_id: founder,
      target_entity_type: 'Department',
      target_entity_id: dept.department_id,
      company_id: dept.company_id,
      scope_type: 'DEPARTMENT',
      scope_id: dept.department_id,
      occurred_at: dept.created_at,
      after_value: { name: dept.name, location_id: dept.location_id },
    })
  }

  // Role assignments
  for (const ra of seedRoleAssignments) {
    events.push({
      event_type: 'role.assigned',
      actor_person_id: ra.granted_by_person_id,
      target_entity_type: 'RoleAssignment',
      target_entity_id: ra.assignment_id,
      company_id: ra.company_id,
      scope_type: ra.scope_type,
      scope_id: ra.scope_id,
      occurred_at: ra.granted_at,
      after_value: {
        person_id: ra.person_id,
        role_code: ra.role_code,
        reason_code: ra.reason_code,
      },
    })
  }

  // Pending invite
  events.push({
    event_type: 'user.invited',
    actor_person_id: seedInvitedMembership.invited_by_person_id!,
    target_entity_type: 'TenantMembership',
    target_entity_id: seedInvitedMembership.membership_id,
    company_id: seedInvitedMembership.company_id,
    scope_type: 'COMPANY',
    scope_id: seedInvitedMembership.company_id,
    occurred_at: seedInvitedMembership.created_at,
    after_value: {
      person_id: seedInvitedMembership.person_id,
      status: 'INVITED',
      invite_expires_at: seedInvitedMembership.invite_expires_at,
    },
  })

  // Offerings: created + published + retired (chronological).
  for (const o of seedOfferings) {
    events.push({
      event_type: 'offering.created',
      actor_person_id: o.created_by,
      target_entity_type: 'Offering',
      target_entity_id: o.offering_id,
      company_id: o.company_id,
      occurred_at: o.created_at,
      after_value: { name: o.name, offering_type: o.offering_type },
    })
  }
  for (const v of seedOfferingVersions) {
    if (v.published_at && v.published_by) {
      events.push({
        event_type: 'offering.published',
        actor_person_id: v.published_by,
        target_entity_type: 'OfferingVersion',
        target_entity_id: v.offering_version_id,
        company_id:
          // resolve company via parent offering
          seedOfferings.find((o) => o.offering_id === v.offering_id)!.company_id,
        occurred_at: v.published_at,
        after_value: {
          offering_id: v.offering_id,
          version_number: v.version_number,
          config_hash: v.config_hash,
        },
      })
    }
    if (v.retired_at) {
      events.push({
        event_type: 'offering.retired',
        actor_person_id: v.published_by ?? PERSON_SARAH_CHEN_ID,
        target_entity_type: 'OfferingVersion',
        target_entity_id: v.offering_version_id,
        company_id:
          seedOfferings.find((o) => o.offering_id === v.offering_id)!.company_id,
        occurred_at: v.retired_at,
        after_value: {
          offering_id: v.offering_id,
          version_number: v.version_number,
          status: 'RETIRED',
        },
      })
    }
  }

  // Charges
  for (const c of seedCharges) {
    events.push({
      event_type: 'charge.committed',
      actor_person_id: c.actor_id,
      target_entity_type: 'Charge',
      target_entity_id: c.charge_id,
      company_id: c.company_id,
      scope_type: 'LOCATION',
      scope_id: c.location_id_at_sale,
      occurred_at: c.committed_at,
      after_value: {
        customer_due: c.customer_due,
        currency: c.currency,
        line_count: seedChargeLineItems.filter((li) => li.charge_id === c.charge_id)
          .length,
      },
    })
  }

  // Adjustments
  for (const a of seedAdjustments) {
    const charge = seedCharges.find((c) => c.charge_id === a.charge_id)
    if (!charge) continue
    events.push({
      event_type: 'adjustment.created',
      actor_person_id: a.actor_id,
      target_entity_type: 'Adjustment',
      target_entity_id: a.adjustment_id,
      company_id: charge.company_id,
      scope_type: 'LOCATION',
      scope_id: charge.location_id_at_sale,
      occurred_at: a.created_at,
      after_value: {
        charge_id: a.charge_id,
        adjustment_type: a.adjustment_type,
        amount: a.amount,
        reason_code: a.reason_code,
      },
    })
  }

  // Refunds
  for (const r of seedRefunds) {
    const charge = seedCharges.find((c) => c.charge_id === r.charge_id)
    if (!charge) continue
    events.push({
      event_type: 'refund.created',
      actor_person_id: r.actor_id,
      target_entity_type: 'Refund',
      target_entity_id: r.refund_id,
      company_id: charge.company_id,
      scope_type: 'LOCATION',
      scope_id: charge.location_id_at_sale,
      occurred_at: r.created_at,
      after_value: {
        charge_id: r.charge_id,
        amount: r.amount,
        refund_type: r.refund_type,
        reason_code: r.reason_code,
        approved_by_id: r.approved_by_id,
      },
    })
    if (r.status === 'COMPLETED') {
      events.push({
        event_type: 'refund.completed',
        actor_person_id: r.actor_id,
        target_entity_type: 'Refund',
        target_entity_id: r.refund_id,
        company_id: charge.company_id,
        scope_type: 'LOCATION',
        scope_id: charge.location_id_at_sale,
        occurred_at: r.created_at,
        after_value: {
          processor_refund_reference: r.processor_refund_reference,
        },
      })
    }
  }

  // Impersonation history
  for (const imp of seedImpersonationSessions) {
    events.push({
      event_type: 'impersonation.started',
      actor_person_id: imp.impersonator_person_id,
      actor_type: 'IMPERSONATION',
      target_entity_type: 'Person',
      target_entity_id: imp.target_person_id,
      // Avery's primary tenant for the historical record is Iron Harbor.
      company_id: COMPANY_IRON_HARBOR_ID,
      scope_type: 'COMPANY',
      scope_id: COMPANY_IRON_HARBOR_ID,
      occurred_at: imp.started_at,
      after_value: { reason_code: imp.reason_code },
    })
    if (imp.status === 'TERMINATED') {
      events.push({
        event_type: 'impersonation.ended',
        actor_person_id: imp.impersonator_person_id,
        actor_type: 'IMPERSONATION',
        target_entity_type: 'Person',
        target_entity_id: imp.target_person_id,
        company_id: COMPANY_IRON_HARBOR_ID,
        scope_type: 'COMPANY',
        scope_id: COMPANY_IRON_HARBOR_ID,
        occurred_at: imp.expires_at,
        after_value: { status: 'TERMINATED' },
      })
    }
  }

  return events
}

/**
 * Hydrate the audit event store with backfilled history. Call once at app
 * boot. Subsequent calls are no-ops.
 */
export function bootstrapSeed(): void {
  if (__seeded) return
  __seeded = true

  const inputs = buildBackfill()
  const events: AuditEvent[] = inputs.map((e) => ({
    event_id: id() as AuditEventId,
    event_type: e.event_type,
    actor_person_id: e.actor_person_id,
    actor_type: e.actor_type ?? 'USER',
    target_entity_type: e.target_entity_type,
    target_entity_id: e.target_entity_id,
    company_id: e.company_id,
    scope_type: e.scope_type,
    scope_id: e.scope_id,
    occurred_at: e.occurred_at,
    payload_hash: fakeSha256(
      [
        e.event_type,
        e.actor_person_id,
        e.target_entity_type,
        e.target_entity_id,
        e.occurred_at,
      ].join('|'),
    ),
    before_value: e.before_value,
    after_value: e.after_value,
  }))

  useAuditStore.getState().hydrate(events)
}
