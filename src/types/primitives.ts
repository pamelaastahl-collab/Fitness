/**
 * FitFlow primitive type definitions.
 *
 * Source of truth: /docs/reference/PRIMITIVE_*.md (authoritative).
 * Field names, types, and enum values match the specs verbatim.
 *
 * Cross-primitive map: /docs/reference/PRIMITIVE_RELATIONSHIPS.md.
 *
 * Conventions used in this file:
 *   - UUIDs are typed as branded strings to keep them distinct from raw strings.
 *   - All TIMESTAMP(UTC) fields are ISO-8601 strings.
 *   - DECIMAL(12,4) money fields are typed as `string` to preserve precision —
 *     never represent currency as JS number. UI helpers should parse on display.
 *   - Polymorphic FKs (e.g. RoleAssignment.scope_id) carry their entity intent
 *     via the accompanying scope_type discriminator; we model them as plain UUIDs
 *     and rely on the discriminator at the application layer per UUM-INVARIANT 4.
 *
 * Open-question fill-ins for the prototype (per PRIMITIVE_RELATIONSHIPS.md §4):
 *   - OQ-04 (no GuardianRelationship entity yet): deferred for this week.
 *   - OQ-06 (no active_scope on Session): the prototype persists active scope in
 *     ScopeContext + localStorage rather than mutating Session.
 *   - OQ-13 (Department-scoped roles vs parent Location read): default is that
 *     Department access implies read-only on the parent Location for nav purposes.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Branded ID types
// ──────────────────────────────────────────────────────────────────────────────

type Brand<TBase, TBrand extends string> = TBase & { readonly __brand: TBrand }

export type UUID = Brand<string, 'UUID'>
export type IsoTimestamp = Brand<string, 'IsoTimestamp'>
export type IsoDate = Brand<string, 'IsoDate'>
export type DecimalString = Brand<string, 'DecimalString'>
export type Sha256Hex = Brand<string, 'Sha256Hex'>

// Per-entity ID brands. Use these in interfaces; cast at the boundary
// (mocks, fetch responses) with `as PersonId` etc.
export type PersonId = Brand<string, 'PersonId'>
export type AuthIdentifierId = Brand<string, 'AuthIdentifierId'>
export type TenantMembershipId = Brand<string, 'TenantMembershipId'>
export type RoleAssignmentId = Brand<string, 'RoleAssignmentId'>
export type SessionId = Brand<string, 'SessionId'>
export type ImpersonationSessionId = Brand<string, 'ImpersonationSessionId'>
export type AuditEventId = Brand<string, 'AuditEventId'>

export type CompanyId = Brand<string, 'CompanyId'>
export type BusinessEntityId = Brand<string, 'BusinessEntityId'>
export type LocationId = Brand<string, 'LocationId'>
export type DepartmentId = Brand<string, 'DepartmentId'>
export type AddressId = Brand<string, 'AddressId'>
export type BankAccountConfigId = Brand<string, 'BankAccountConfigId'>
export type TaxConfigId = Brand<string, 'TaxConfigId'>

export type OfferingId = Brand<string, 'OfferingId'>
export type OfferingVersionId = Brand<string, 'OfferingVersionId'>
export type ModuleAttachmentId = Brand<string, 'ModuleAttachmentId'>
export type ModuleId = Brand<string, 'ModuleId'>
export type OfferingPublicationId = Brand<string, 'OfferingPublicationId'>

export type ChargeId = Brand<string, 'ChargeId'>
export type ChargeLineItemId = Brand<string, 'ChargeLineItemId'>
export type ChargePolicySnapshotId = Brand<string, 'ChargePolicySnapshotId'>
export type AdjustmentId = Brand<string, 'AdjustmentId'>
export type RefundId = Brand<string, 'RefundId'>
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>

// ──────────────────────────────────────────────────────────────────────────────
// Shared scope discriminators (UUM × OH)
// ──────────────────────────────────────────────────────────────────────────────

export type ScopeType = 'COMPANY' | 'ENTITY' | 'LOCATION' | 'DEPARTMENT'

// ============================================================================
// PRIMITIVE: Unified User Model (UUM)
// /docs/reference/PRIMITIVE_UnifiedUserModel.md
// ============================================================================

export type PersonType = 'MEMBER' | 'STAFF' | 'GUARDIAN' | 'GUEST'
export type PersonStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
export type IdentityPhotoStatus = 'ACTIVE' | 'PENDING_REVIEW' | 'REJECTED' | 'NONE'

export interface Person {
  person_id: PersonId
  person_type: PersonType
  given_name: string
  family_name: string
  date_of_birth?: IsoDate
  /** Derived from date_of_birth. */
  is_minor?: boolean
  primary_email?: string
  /** E.164 format. */
  primary_phone?: string
  identity_photo_url?: string
  identity_photo_status?: IdentityPhotoStatus
  status: PersonStatus
  created_at: IsoTimestamp
  updated_at: IsoTimestamp
  /** Set when this record is merged into another. Immutable after set. UUM-DUP-004. */
  merged_into_person_id?: PersonId
}

export type AuthIdentifierType =
  | 'EMAIL'
  | 'PHONE'
  | 'GOOGLE'
  | 'APPLE'
  | 'SSO_OIDC'
  | 'SSO_SAML'
export type AuthIdentifierStatus = 'ACTIVE' | 'REVOKED'

export interface AuthIdentifier {
  auth_identifier_id: AuthIdentifierId
  person_id: PersonId
  type: AuthIdentifierType
  /** Hashed/tokenised. Globally unique per type. */
  value: string
  verified_at?: IsoTimestamp
  /** Required for SSO_OIDC, SSO_SAML, GOOGLE, APPLE. */
  idp_subject?: string
  /** Required for SSO_OIDC and SSO_SAML. */
  idp_tenant_id?: string
  status: AuthIdentifierStatus
  created_at: IsoTimestamp
}

export type TenantMembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

export interface TenantMembership {
  membership_id: TenantMembershipId
  person_id: PersonId
  company_id: CompanyId
  status: TenantMembershipStatus
  invited_by_person_id?: PersonId
  /** Required when status=INVITED. Invite links expire after 72 hours. */
  invite_expires_at?: IsoTimestamp
  created_at: IsoTimestamp
}

export type RoleCode =
  | 'COMPANY_ADMIN'
  | 'SECURITY_ADMIN'
  | 'FINANCE_ADMIN'
  | 'TAX_BANK_CONFIG_ADMIN'
  | 'REGIONAL_MANAGER'
  | 'LOCATION_MANAGER'
  | 'FRONT_DESK_STAFF'
  | 'INSTRUCTOR_COACH'
  | 'DEPARTMENT_LEAD'
  | 'AUDITOR'
  | 'MEMBER'
  | 'GUARDIAN'
  | 'PLATFORM_SUPPORT'

export type RoleAssignmentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED'

export interface RoleAssignment {
  assignment_id: RoleAssignmentId
  person_id: PersonId
  company_id: CompanyId
  role_code: RoleCode
  scope_type: ScopeType
  /**
   * References the specific org object at scope_type level.
   * Polymorphic (Company | BusinessEntity | Location | Department) — enforced
   * at the app layer per OQ-05 / XPI-AUTH-04, not by DB FK.
   */
  scope_id: UUID
  granted_by_person_id: PersonId
  granted_at: IsoTimestamp
  expires_at?: IsoTimestamp
  /** Required for privileged roles and SoD-constrained pairs. */
  reason_code?: string
  status: RoleAssignmentStatus
  revoked_at?: IsoTimestamp
  revoked_by_person_id?: PersonId
}

export type SessionSurface = 'WEB' | 'MOBILE' | 'SHARED_DEVICE' | 'ADMIN_CONSOLE'
export type AuthMethod =
  | 'MAGIC_LINK'
  | 'PHONE_OTP'
  | 'GOOGLE'
  | 'APPLE'
  | 'SSO_OIDC'
  | 'SSO_SAML'
  | 'PIN'
export type SessionStatus = 'ACTIVE' | 'LOCKED' | 'TERMINATED'

export interface Session {
  session_id: SessionId
  person_id: PersonId
  company_id: CompanyId
  surface: SessionSurface
  auth_method: AuthMethod
  established_at: IsoTimestamp
  last_active_at: IsoTimestamp
  expires_at: IsoTimestamp
  status: SessionStatus
  reason_code?: string
  /** Hashed. PHI-safe. For security event correlation only. */
  ip_address_hash?: string
}

export type ImpersonationSessionStatus = 'ACTIVE' | 'TERMINATED'

export interface ImpersonationSession {
  /** Note: spec uses `session_id` as PK on this entity too. */
  session_id: ImpersonationSessionId
  /** Must have PLATFORM_SUPPORT role. */
  impersonator_person_id: PersonId
  target_person_id: PersonId
  started_at: IsoTimestamp
  /** Maximum 4 hours. Non-renewable. */
  expires_at: IsoTimestamp
  /** Required. Support case reference. */
  reason_code: string
  status: ImpersonationSessionStatus
}

export type AuditActorType = 'USER' | 'SYSTEM' | 'IMPERSONATION'

export interface AuditEvent {
  event_id: AuditEventId
  /** Dot-notation. e.g. user.invited, role.assigned, charge.committed. */
  event_type: string
  /** For system events: system sentinel ID. */
  actor_person_id: PersonId
  actor_type: AuditActorType
  /** e.g. Person, RoleAssignment, Charge, Offering. */
  target_entity_type: string
  /**
   * Polymorphic across all primitive entity types — use the raw string base
   * since branded IDs (PersonId, ChargeId, LocationId, …) all extend string
   * but are not interconvertible. The discriminator `target_entity_type`
   * names which kind of ID is here.
   */
  target_entity_id: string
  company_id: CompanyId
  /** Null for global events. */
  scope_type?: ScopeType
  /** Polymorphic over scope_type — see target_entity_id note. */
  scope_id?: string
  occurred_at: IsoTimestamp
  /** SHA-256 of the event payload. For integrity verification. */
  payload_hash: Sha256Hex
  /** Redacted per PHI-safe logging allowlist. No raw PII. */
  before_value?: Record<string, unknown>
  /** Redacted per PHI-safe logging allowlist. No raw PII. */
  after_value?: Record<string, unknown>
  /** Links events in the same request chain. */
  correlation_id?: UUID
  ip_address_hash?: string
}

// ============================================================================
// PRIMITIVE: Organizational Hierarchy (OH)
// /docs/reference/PRIMITIVE_OrgHierarchy.md
// ============================================================================

export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

export interface Company {
  company_id: CompanyId
  name: string
  /** URL-safe identifier. Unique globally. Immutable after set. */
  slug: string
  status: CompanyStatus
  /** IANA TZ. */
  primary_timezone: string
  /** BCP-47. e.g. en-US, en-CA, en-NZ. */
  primary_locale: string
  /** ISO 4217. Single currency per tenant in v1. */
  primary_currency: string
  created_at: IsoTimestamp
}

export type BusinessEntityStatus = 'ACTIVE' | 'DEACTIVATED'

export interface BusinessEntity {
  business_entity_id: BusinessEntityId
  company_id: CompanyId
  name: string
  legal_name?: string
  /** EIN, ABN, or equivalent. Encrypted at rest. */
  tax_id?: string
  /** ISO 3166-1 alpha-3. */
  country_code: string
  status: BusinessEntityStatus
  /**
   * Required (XPI-FIN-02) for any Location under this entity to commit Charges.
   */
  bank_account_config_id?: BankAccountConfigId
  default_tax_config_id?: TaxConfigId
  created_at: IsoTimestamp
}

export type LocationStatus = 'ACTIVE' | 'DEACTIVATED'

export interface Location {
  location_id: LocationId
  /** Immutable after creation (except via explicit migration workflow). */
  business_entity_id: BusinessEntityId
  /** Denormalized from entity for RLS efficiency. */
  company_id: CompanyId
  name: string
  /** References Address & Geolocation Service. Validated and geocoded. */
  address_id: AddressId
  /** IANA TZ. Immutable without explicit migration workflow. */
  timezone: string
  /** E.164 format. */
  phone?: string
  email?: string
  status: LocationStatus
  deactivated_at?: IsoTimestamp
  /** Required on deactivation. */
  deactivation_reason?: string
  created_at: IsoTimestamp
}

export type DepartmentStatus = 'ACTIVE' | 'DEACTIVATED'

export interface Department {
  department_id: DepartmentId
  /** Immutable after creation. */
  location_id: LocationId
  /** Denormalized for RLS. Immutable. */
  company_id: CompanyId
  /** Unique within a Location. */
  name: string
  description?: string
  status: DepartmentStatus
  created_at: IsoTimestamp
}

/**
 * Address is referenced by Location.address_id. The OH spec defers full schema
 * to an "Address & Geolocation Service" — this is a prototype-scope shape
 * sufficient to render Locations and run scope/timezone resolution.
 */
export interface Address {
  address_id: AddressId
  line1: string
  line2?: string
  city: string
  /** State / province / region. */
  region: string
  postal_code: string
  /** ISO 3166-1 alpha-3. */
  country_code: string
  lat?: number
  lng?: number
}

export type BankAccountConfigStatus = 'ACTIVE' | 'INACTIVE'

/**
 * BusinessEntity.bank_account_config_id points here. XPI-FIN-02 blocks Charge
 * commit if the BE has no ACTIVE config. Full schema (PCI scope, processor
 * keys, etc.) belongs in a payments primitive doc; the prototype tracks
 * presence and status only.
 */
export interface BankAccountConfig {
  bank_account_config_id: BankAccountConfigId
  business_entity_id: BusinessEntityId
  display_name: string
  /** Last 4 digits of account number, for UI affordance only. */
  last4?: string
  status: BankAccountConfigStatus
  created_at: IsoTimestamp
}

export type TaxConfigStatus = 'ACTIVE' | 'INACTIVE'

/**
 * BusinessEntity.default_tax_config_id points here. XPI-CAT-03 blocks
 * Offering publish if the publication target's BE has no ACTIVE tax config.
 * Prototype-scope: presence and country_code only.
 */
export interface TaxConfig {
  tax_config_id: TaxConfigId
  business_entity_id: BusinessEntityId
  display_name: string
  /** ISO 3166-1 alpha-3. Drives tax rate lookup by tax_category. */
  country_code: string
  status: TaxConfigStatus
  created_at: IsoTimestamp
}

/**
 * Snapshot fields stamped at commit time onto Charge / Refund / Adjustment.
 * Per OH section 3 + XPI-FIN-04: immutable after commit; reconciliation always
 * uses these, never current org assignments.
 */
export interface OrgSnapshot {
  /** NOT NULL. DB constraint + app trigger blocks UPDATE. */
  business_entity_id_at_sale: BusinessEntityId
  /** Immutable after commit. */
  location_id_at_sale: LocationId
  /** Nullable; null when no department context. */
  department_id_at_sale?: DepartmentId
}

// ============================================================================
// PRIMITIVE: Unified Offering Model (UOM)
// /docs/reference/PRIMITIVE_UnifiedOfferingModel.md
// ============================================================================

export type OfferingType =
  | 'MEMBERSHIP'
  | 'CLASS'
  | 'APPOINTMENT'
  | 'FACILITY_RENTAL'
  | 'RETAIL'
  | 'GIFT_CARD'
  | 'PACKAGE_CREDIT_PACK'

export type OfferingStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED'
export type OfferingVersionStatus = OfferingStatus

export interface Offering {
  offering_id: OfferingId
  company_id: CompanyId
  /** Immutable after creation. */
  offering_type: OfferingType
  /** Edits create a new draft version (UOM INVARIANT 2). */
  name: string
  description?: string
  status: OfferingStatus
  created_by: PersonId
  created_at: IsoTimestamp
}

export interface OfferingVersion {
  offering_version_id: OfferingVersionId
  offering_id: OfferingId
  /** Increments on each publish. Immutable after publish. */
  version_number: number
  status: OfferingVersionStatus
  /** SHA-256 of full module configuration. Computed at publish. Immutable. */
  config_hash: Sha256Hex
  /** Required for publish. Reporting dimension. */
  category: string
  /** Required for publish. Drives tax rate lookup. */
  tax_category: string
  /** Required for publish. GL mapping hook. */
  revenue_category: string
  /** Set on publish. Immutable. */
  published_at?: IsoTimestamp
  /** Set on publish. Immutable. */
  published_by?: PersonId
  /** Set when superseded by new published version. */
  retired_at?: IsoTimestamp
  created_at: IsoTimestamp
}

export type ModuleType =
  | 'TIME'
  | 'CAPACITY'
  | 'RESOURCE'
  | 'STAFFING'
  | 'LOCATION'
  | 'GOODS'
  | 'PRICING'
  | 'TAX'
  | 'ENTITLEMENT'
  | 'POLICY_PACK'

export interface ModuleAttachment {
  attachment_id: ModuleAttachmentId
  /** References OfferingVersion in DRAFT state only. Immutable after publish. */
  offering_version_id: OfferingVersionId
  module_type: ModuleType
  /** References the specific module configuration record. */
  module_id: ModuleId
  /** Derived from type-module matrix. */
  is_required: boolean
  created_at: IsoTimestamp
}

export type PublicationChannel = 'WEB' | 'POS' | 'ADMIN'

export interface OfferingPublication {
  publication_id: OfferingPublicationId
  /** References the PUBLISHED version. */
  offering_version_id: OfferingVersionId
  location_id: LocationId
  /** Optional department-level scoping within the Location. */
  department_id?: DepartmentId
  /** Controls where offering appears. */
  channels: PublicationChannel[]
  /** False = offering hidden at this location without retiring it. */
  is_active: boolean
  /** If true: Location Manager may set location-specific price or schedule. */
  local_override_allowed: boolean
  created_at: IsoTimestamp
}

// ============================================================================
// PRIMITIVE: Unified Charge Engine (UCE)
// /docs/reference/PRIMITIVE_UnifiedChargeEngine.md
// ============================================================================

export type ChargeChannel = 'WEB' | 'POS' | 'ADMIN' | 'BILLING_JOB' | 'API'
export type ChargeStatus = 'COMMITTED' | 'VOIDED'
export type PaymentPosture = 'PAY_NOW' | 'PAY_LATER' | 'COMP'
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED'

export interface Charge extends OrgSnapshot {
  charge_id: ChargeId
  /** Caller-supplied. Unique per commit attempt. UCE INVARIANT 2. */
  idempotency_key: IdempotencyKey
  company_id: CompanyId
  customer_id: PersonId
  /** Person or system that initiated the commit. */
  actor_id: PersonId
  channel: ChargeChannel
  /** Operational context. Used for org snapshot resolution. */
  location_id: LocationId
  status: ChargeStatus
  payment_posture: PaymentPosture
  /** Required when payment_posture=PAY_LATER. */
  invoice_status?: InvoiceStatus
  gross_total: DecimalString
  /** Negative. */
  discount_total: DecimalString
  tax_total: DecimalString
  /** Negative. */
  credit_applied: DecimalString
  /** Negative. */
  subsidy_applied: DecimalString
  customer_due: DecimalString
  /** ISO 4217. Derived from Company.primary_currency. */
  currency: string
  committed_at: IsoTimestamp
  policy_snapshot_id: ChargePolicySnapshotId
}

export type ChargeLineItemType =
  | 'BASE_PRICE'
  | 'DISCOUNT'
  | 'TAX'
  | 'CREDIT'
  | 'SUBSIDY'
  | 'COMP'
  | 'FEE'

export interface ChargeLineItem {
  line_item_id: ChargeLineItemId
  charge_id: ChargeId
  /** The exact OfferingVersion sold. References as-sold state. XPI-CAT-01. */
  offering_version_id: OfferingVersionId
  line_type: ChargeLineItemType
  description: string
  /** Offering category. Reporting dimension. Immutable. XPI-RPT-01. */
  category: string
  revenue_category: string
  tax_category: string
  /** Positive for charges, negative for discounts/credits/subsidies. */
  amount: DecimalString
  quantity: number
  unit_price: DecimalString
  policy_rule_id?: string
  policy_rule_hash?: Sha256Hex
}

export interface ChargePolicySnapshot {
  snapshot_id: ChargePolicySnapshotId
  /** One-to-one with Charge. */
  charge_id: ChargeId
  /** All active pricing rules and their configurations at commit time. */
  rules_json: Record<string, unknown>
  rules_hash: Sha256Hex
  captured_at: IsoTimestamp
}

export type AdjustmentType =
  | 'NO_SHOW_FEE'
  | 'GOODWILL_CREDIT'
  | 'ADMIN_CORRECTION'
  | 'SAVE_OFFER_DISCOUNT'
  | 'SAVE_OFFER_CREDIT'
  | 'CONTRACT_EXTENSION'

export interface Adjustment {
  adjustment_id: AdjustmentId
  charge_id: ChargeId
  /** References specific ChargeLineItem if line-item-level. Null for charge-level. */
  line_item_id?: ChargeLineItemId
  adjustment_type: AdjustmentType
  /** Net effect. Positive = additional charge. Negative = credit/reduction. */
  amount: DecimalString
  /** Always required. From controlled vocabulary. */
  reason_code: string
  reason_detail?: string
  actor_id: PersonId
  /** True if amount exceeds override threshold. */
  approval_required: boolean
  /** Required when approval_required=true. */
  approved_by_id?: PersonId
  idempotency_key: IdempotencyKey
  created_at: IsoTimestamp
}

export type RefundType = 'FULL' | 'PARTIAL'
export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Refund {
  refund_id: RefundId
  charge_id: ChargeId
  refund_type: RefundType
  /**
   * Must be positive. Cannot exceed (original customer_due − sum(prior refunds)).
   * UCE INVARIANT 6 / XPI-IDM-03.
   */
  amount: DecimalString
  reason_code: string
  actor_id: PersonId
  /** Required when amount exceeds location override threshold. */
  approved_by_id?: PersonId
  /** Set after successful payment reversal. */
  processor_refund_reference?: string
  status: RefundStatus
  idempotency_key: IdempotencyKey
  created_at: IsoTimestamp
}
