/**
 * One-shot script: dump seed samples + counts for sanity-check.
 * Run via `npx tsx scripts/dump-seed.ts`.
 */

import {
  bootstrapSeed,
  listAddresses,
  listBusinessEntities,
  listCharges,
  listCompanies,
  listDepartments,
  listLineItemsByCharge,
  listLocations,
  listOfferings,
  listOfferingVersions,
  listPersons,
  listPendingRefunds,
  useAuditStore,
  useChargesStore,
  useTenantMembershipsStore,
  useRoleAssignmentsStore,
  useOfferingPublicationsStore,
  useAdjustmentsStore,
  useRefundsStore,
  useAuthIdentifiersStore,
  useSessionsStore,
  useModuleAttachmentsStore,
  useBankAccountConfigsStore,
  useTaxConfigsStore,
} from '../src/mocks/index.ts'

bootstrapSeed()

const counts = {
  Companies: listCompanies().length,
  BusinessEntities: listBusinessEntities().length,
  Locations: listLocations().length,
  Departments: listDepartments().length,
  Addresses: listAddresses().length,
  BankAccountConfigs: useBankAccountConfigsStore.getState().configs.length,
  TaxConfigs: useTaxConfigsStore.getState().configs.length,
  Persons: listPersons().length,
  AuthIdentifiers: useAuthIdentifiersStore.getState().identifiers.length,
  TenantMemberships: useTenantMembershipsStore.getState().memberships.length,
  RoleAssignments: useRoleAssignmentsStore.getState().assignments.length,
  Sessions: useSessionsStore.getState().sessions.length,
  ImpersonationSessions: useSessionsStore.getState().impersonations.length,
  Offerings: listOfferings().length,
  OfferingVersions: listOfferingVersions().length,
  ModuleAttachments: useModuleAttachmentsStore.getState().attachments.length,
  OfferingPublications: useOfferingPublicationsStore.getState().publications.length,
  Charges: listCharges().length,
  ChargeLineItems: useChargesStore
    .getState()
    .charges.reduce(
      (acc, c) => acc + listLineItemsByCharge(c.charge_id).length,
      0,
    ),
  Adjustments: useAdjustmentsStore.getState().adjustments.length,
  Refunds: useRefundsStore.getState().refunds.length,
  PendingRefunds: listPendingRefunds().length,
  AuditEvents: useAuditStore.getState().events.length,
}

console.log('=== Counts ===')
for (const [k, v] of Object.entries(counts)) {
  console.log(`  ${k.padEnd(22)} ${v}`)
}

console.log('\n=== Sample Persons (3) ===')
const persons = listPersons()
const samples = [
  persons.find((p) => p.given_name === 'Sarah'),
  persons.find((p) => p.given_name === 'Olivia'),
  persons.find((p) => p.given_name === 'Finn'),
]
console.log(JSON.stringify(samples, null, 2))

console.log('\n=== Sample Locations (3) ===')
const locs = listLocations().slice(0, 3)
console.log(JSON.stringify(locs, null, 2))

console.log('\n=== Sample Charges (3 with line items) ===')
const charges = listCharges()
const sampleCharges = [
  charges[0],
  charges.find((c) => c.payment_posture === 'COMP'),
  charges.find((c) => c.payment_posture === 'PAY_LATER'),
]
for (const c of sampleCharges) {
  if (!c) continue
  console.log('--- Charge ---')
  console.log(JSON.stringify(c, null, 2))
  console.log('  Line items:')
  for (const li of listLineItemsByCharge(c.charge_id)) {
    console.log(
      `    - ${li.line_type.padEnd(11)} ${li.description.padEnd(45)} qty=${li.quantity}  amount=${li.amount}  cat=${li.category}/${li.revenue_category}/${li.tax_category}`,
    )
  }
}

console.log('\n=== Sample audit events (last 5 by occurred_at) ===')
const events = useAuditStore.getState().events.slice().reverse().slice(0, 5)
for (const e of events) {
  console.log(
    `  ${e.occurred_at}  ${e.event_type.padEnd(28)} actor=${e.actor_person_id.slice(0, 8)}  target=${e.target_entity_type}/${String(e.target_entity_id).slice(0, 8)}`,
  )
}

console.log('\n=== Active impersonation? ===')
console.log(useSessionsStore.getState().activeImpersonation() ?? 'none')
