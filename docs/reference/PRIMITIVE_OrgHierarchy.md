PRIMITIVE: Organizational Hierarchy
Version 1.0 | Status: Authoritative | Last Updated: March 2026
AI INSTRUCTION: Load this file before implementing any feature that uses company_id, business_entity_id, location_id, department_id, scope enforcement, financial attribution, or configuration rolldown. Treat these contracts as ground truth.

1. Purpose and Scope
Defines the four-level organizational model that governs all tenant data isolation, financial attribution, operational context, and access scope. Every entity in the platform is anchored to at least one level of this hierarchy.


2. Hierarchy Levels
2.1 Company
The top-level tenant. All data, configuration, and operations are isolated per Company. RLS uses company_id as the tenant discriminator on all tables.


2.2 BusinessEntity
The legal and financial boundary within a Company. All transactions, bank accounts, merchant accounts, and tax configurations are scoped to Business Entity.



2.3 Location
A physical or virtual site belonging to a Business Entity. The operational context for all time-based activities.



2.4 Department
An operational subdivision within a Location. Optional. Used for staffing, scheduling segments, and revenue reporting within a site.


3. Snapshot Attribution (Immutable Financial Records)
All committed financial records (Charge, Refund, Adjustment) must carry the following snapshot fields. These are captured at commit time and are immutable thereafter.



4. Configuration Rolldown
Company Admins can define configuration templates at Company level and publish them to specific Locations. Locations may apply governed local overrides.


5. RBAC/ABAC Scope Enforcement
Every API endpoint enforces scope against the authenticated session's RoleAssignments. The scope header provided by the client is a hint — the server re-validates independently.


6. Audit Events — Minimum Required


7. Non-Functional Requirements


INVARIANT 1: Company is the tenant boundary. No cross-tenant data access is possible.
INVARIANT 2: Business Entity is the financial boundary. Revenue, taxes, banking, and settlement are separated by entity.
INVARIANT 3: Location is the operational anchor for all time-based operations (timezone, bookings, check-in, access control).
INVARIANT 4: Every committed financial record (charge, refund, adjustment) has immutable business_entity_id_at_sale, location_id_at_sale, department_id_at_sale. These cannot change after commit.
INVARIANT 5: A Location cannot be committed to a financial transaction without an active business_entity_id.
Field | Type | Required | Notes
company_id | UUID PK | Yes | Globally unique. System-generated. Never reused.
name | VARCHAR(255) | Yes | Legal company name.
slug | VARCHAR(100) | Yes | URL-safe identifier. Unique globally. Immutable after set.
status | ENUM | Yes | ACTIVE | SUSPENDED | DEACTIVATED
primary_timezone | IANA TZ | Yes | Default for notifications and reports. Can be overridden at Location level.
primary_locale | VARCHAR(10) | Yes | BCP-47. e.g. en-US, en-CA, en-NZ
primary_currency | VARCHAR(3) | Yes | ISO 4217. Single currency per tenant in v1. e.g. USD, CAD, NZD.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
Field | Type | Required | Notes
business_entity_id | UUID PK | Yes | System-generated.
company_id | UUID FK | Yes | Parent tenant. Immutable after creation.
name | VARCHAR(255) | Yes | Legal entity name.
legal_name | VARCHAR(255) | No | Formal legal name if different from display name.
tax_id | VARCHAR(50) | No | EIN, ABN, or equivalent. Encrypted at rest.
country_code | VARCHAR(3) | Yes | ISO 3166-1 alpha-3. Drives tax rules and banking formats.
status | ENUM | Yes | ACTIVE | DEACTIVATED
bank_account_config_id | UUID FK | No | References encrypted banking configuration. Set by Tax/Bank Config Admin.
default_tax_config_id | UUID FK | No | Default tax configuration for this entity.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
BUSINESS RULE: A Business Entity must have an active bank_account_config_id before financial transactions can be committed at any of its Locations.
BUSINESS RULE: Tax configuration (tax rates, GST/VAT/sales tax) is configured per Business Entity per country.
SoD: Changes to bank_account_config_id and tax_config_id require TAX_BANK_CONFIG_ADMIN role — FINANCE_ADMIN alone is insufficient.
Field | Type | Required | Notes
location_id | UUID PK | Yes | System-generated.
business_entity_id | UUID FK | Yes | Parent entity. Immutable after creation (except via explicit migration workflow).
company_id | UUID FK | Yes | Denormalized from entity for RLS efficiency.
name | VARCHAR(255) | Yes | Display name.
address_id | UUID FK | Yes | References Address & Geolocation Service. Validated and geocoded.
timezone | IANA TZ | Yes | Canonical timezone for all time-based operations at this location. Immutable without explicit migration workflow.
phone | VARCHAR(30) | No | Location contact number. E.164 format.
email | VARCHAR(255) | No | Location contact email.
status | ENUM | Yes | ACTIVE | DEACTIVATED
deactivated_at | TIMESTAMP(UTC) | No | Set on deactivation. Immutable after set.
deactivation_reason | VARCHAR(255) | No | Required on deactivation.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
DEACTIVATION GUARD: Locations with future bookings or unsettled transactions cannot be deactivated.
DEACTIVATION CASCADE: Deactivating a Location automatically deactivates all Departments within it.
TIMEZONE IMMUTABILITY: Timezone cannot be changed via normal update — requires explicit migration workflow with snapshot preservation.
Field | Type | Required | Notes
department_id | UUID PK | Yes | System-generated.
location_id | UUID FK | Yes | Parent location. Immutable after creation.
company_id | UUID FK | Yes | Denormalized for RLS. Immutable.
name | VARCHAR(100) | Yes | Unique within a Location. Cannot duplicate within same location_id.
description | TEXT | No | 
status | ENUM | Yes | ACTIVE | DEACTIVATED
created_at | TIMESTAMP(UTC) | Yes | Immutable.
Snapshot Field | Type | Constraint | Source
business_entity_id_at_sale | UUID FK | NOT NULL. DB constraint + app trigger blocks UPDATE. | Resolved from location.business_entity_id at commit time.
location_id_at_sale | UUID FK | NOT NULL. Immutable after commit. | From transaction context (location_id).
department_id_at_sale | UUID FK | Nullable. | From booking/transaction context. Null if no department assigned.
ENFORCEMENT: DB UPDATE trigger blocks modification of *_at_sale fields on committed records.
BLOCK: If location.business_entity_id is null at commit time, the transaction is blocked with a data integrity error.
REPORTING: All exports and reconciliation reports use *_at_sale fields exclusively — never current entity assignment.
Rule ID | Rule
OH-CR-001 | Configuration templates are created at Company scope by Company Admin.
OH-CR-002 | Templates are published to specific Locations (selective rollout). Locations not included do not receive the template.
OH-CR-003 | Location Managers may apply local overrides only to fields explicitly flagged as overridable in the template.
OH-CR-004 | All overrides are reason-coded, audited, and visible in the Variance Report.
OH-CR-005 | Template updates (re-publish) re-apply to all assigned Locations. Locations with active overrides are flagged in the Variance Report.
DEFAULT-DENY: No access without an explicit active RoleAssignment.
SCOPE ENFORCEMENT: Every API call includes X-Scope-Type and X-Scope-ID headers. Backend validates that the actor's RoleAssignment permits access to the requested scope_id.
ABAC ATTRIBUTE: scope_type and scope_id are required attributes on every RoleAssignment. A role without a scope cannot be assigned.
BACKEND INDEPENDENCE: Client-provided scope headers are hints only. The backend re-validates scope against the session's active RoleAssignments on every request.
Event Type | Trigger | Audited Fields
company.created | Company provisioned | name, slug, timezone, locale, currency
company.updated | Company fields changed | before/after for each changed field
entity.created | Business Entity created | name, country_code, company_id
entity.deactivated | Entity deactivated | reason_code, actor
location.created | Location created | name, timezone, address_id, business_entity_id
location.updated | Location fields changed | before/after for each changed field
location.deactivated | Location deactivated | reason_code, actor, cascade_departments_count
department.created | Department created | name, location_id
department.deactivated | Department deactivated | reason_code
config.template_published | Config rolldown published | template_id, target_location_ids
config.override_applied | Local override applied | field, before, after, reason_code
Dimension | Requirement
Performance | Hierarchy resolution (location → entity): < 10ms. Scope validation: < 20ms. Financial export generation (single entity, 1 month): < 30 seconds.
Availability | Org hierarchy service: 99.9% uptime SLA.
Security | RLS on all tables using company_id. Credentials (bank/merchant) encrypted at rest via Azure Key Vault. PHI-safe audit logging.
Compliance | HIPAA-like: audit trail, access controls, encryption at rest. SOC 2: separation of duties for bank/tax config, audit evidence exports.
Data Residency | All org hierarchy data stored in the tenant's designated Azure region.