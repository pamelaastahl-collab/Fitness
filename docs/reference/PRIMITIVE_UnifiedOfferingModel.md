PRIMITIVE: Unified Offering Model (UOM)
Version 1.0 | Status: Authoritative | Last Updated: March 2026
AI INSTRUCTION: Load this file before implementing any feature that creates, edits, publishes, prices, books, or retires a product/service/class/appointment/membership/rental/retail item. All catalog operations reference these contracts. Never create offering-type-specific pricing tables — all types flow through UOM.

1. Purpose and Scope
Defines the canonical catalog model. All sellable and bookable products are Offerings. Every runtime transaction references an OfferingVersion — the immutable snapshot of configuration at the time of publish. This ensures historical reporting remains correct when an operator edits prices, policies, or schedules.


2. Offering Types


3. Core Entities
3.1 Offering
The stable identity for a product. Never used directly in runtime transactions. Parent of all OfferingVersions.


3.2 OfferingVersion
The immutable published configuration snapshot. All bookings, charges, and entitlements reference offering_version_id — never offering_id alone.



3.3 ModuleAttachment
Binds a module instance to an OfferingVersion. Module instances are per-version — not shared across versions.


3.4 OfferingPublication
Controls which Locations (and optionally Departments) an OfferingVersion is available at, and on which channels.


4. Module Type Definitions
4.1 Type-Module Matrix
Required (R) modules must be configured before an OfferingVersion can be published. Optional (O) modules may be attached. (—) = not applicable for this type.


4.2 Cross-Module Constraints
Enforced at publish-time by the validation engine. Publish is blocked if any constraint is violated.


5. Publish Lifecycle


6. Audit Events — Minimum Required


7. Non-Functional Requirements


INVARIANT 1: All runtime transactions (bookings, charges, entitlements) reference an OfferingVersion — NEVER the mutable Offering parent.
INVARIANT 2: Published OfferingVersions are IMMUTABLE. No in-place edits after publish.
INVARIANT 3: Publishing creates a new OfferingVersion. The prior version is RETIRED automatically.
INVARIANT 4: An Offering cannot be published without: category, tax_category, revenue_category, at least one Location, required Modules configured.
INVARIANT 5: Module instances are per-OfferingVersion, not shared across versions.
Type | Description | Key Modules Required
MEMBERSHIP | Recurring or fixed-term subscription granting entitlements. | Pricing, Entitlement
CLASS | Group session with fixed capacity and schedule. | Time, Pricing, Capacity (via resource or explicit)
APPOINTMENT | One-on-one scheduled service with a specific staff member. | Time, Staffing, Pricing
FACILITY_RENTAL | Resource-exclusive booking for a fixed time period. | Time, Resource, Pricing
RETAIL | Physical product sold at POS or online. | Goods, Pricing
GIFT_CARD | Purchasable credit with redemption rules. | Goods (virtual), Pricing, Redemption rules
PACKAGE_CREDIT_PACK | Pre-paid bundle of sessions or credits. | Redemption mapping, Pricing
Field | Type | Required | Notes
offering_id | UUID PK | Yes | System-generated. Stable across all versions.
company_id | UUID FK | Yes | Tenant isolation. Immutable.
offering_type | ENUM | Yes | MEMBERSHIP | CLASS | APPOINTMENT | FACILITY_RENTAL | RETAIL | GIFT_CARD | PACKAGE_CREDIT_PACK. Immutable after creation.
name | VARCHAR(255) | Yes | Display name. Can be edited (edits create a new draft version).
description | TEXT | No | Marketing description.
status | ENUM | Yes | DRAFT | PUBLISHED | RETIRED
created_by | UUID FK | Yes | Person who created the Offering.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
Field | Type | Required | Notes
offering_version_id | UUID PK | Yes | System-generated. Immutable forever.
offering_id | UUID FK | Yes | Parent Offering. Immutable.
version_number | INTEGER | Yes | Increments on each publish. Immutable after publish.
status | ENUM | Yes | DRAFT | PUBLISHED | RETIRED
config_hash | VARCHAR(64) | Yes | SHA-256 of full module configuration. Computed at publish. Immutable.
category | VARCHAR(100) | Yes | Required for publish. Reporting dimension.
tax_category | VARCHAR(100) | Yes | Required for publish. Drives tax rate lookup.
revenue_category | VARCHAR(100) | Yes | Required for publish. GL mapping hook.
published_at | TIMESTAMP(UTC) | No | Set on publish. Immutable.
published_by | UUID FK | No | Person who published. Set on publish. Immutable.
retired_at | TIMESTAMP(UTC) | No | Set when superseded by new published version.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
DRAFT STATE: Only one DRAFT version exists per Offering at a time.
PUBLISH TRANSITION: DRAFT → PUBLISHED. Prior PUBLISHED version → RETIRED simultaneously (atomic).
RETIRE TRANSITION: PUBLISHED → RETIRED (also via explicit retirement with reason code).
REACTIVATION: RETIRED Offering → create new DRAFT version. Prior versions remain RETIRED.
IMMUTABILITY: No UPDATE on PUBLISHED or RETIRED OfferingVersion records. Enforced at DB constraint.
Field | Type | Required | Notes
attachment_id | UUID PK | Yes | System-generated.
offering_version_id | UUID FK | Yes | References OfferingVersion in DRAFT state only. Immutable after publish.
module_type | ENUM | Yes | TIME | CAPACITY | RESOURCE | STAFFING | LOCATION | GOODS | PRICING | TAX | ENTITLEMENT | POLICY_PACK
module_id | UUID FK | Yes | References the specific module configuration record.
is_required | BOOLEAN | Yes | Derived from type-module matrix. Shown in UI as required/optional indicator.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
Field | Type | Required | Notes
publication_id | UUID PK | Yes | System-generated.
offering_version_id | UUID FK | Yes | References the PUBLISHED version.
location_id | UUID FK | Yes | The Location this publication applies to.
department_id | UUID FK | No | Optional department-level scoping within the Location.
channels | ENUM[] | Yes | Array: WEB | POS | ADMIN. Controls where offering appears.
is_active | BOOLEAN | Yes | False = offering hidden at this location without retiring it.
local_override_allowed | BOOLEAN | Yes | If true: Location Manager may set location-specific price or schedule within governed bounds.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
Offering Type | Time | Capacity | Resource | Staffing | Goods | Pricing | Entitlement
MEMBERSHIP | O | O | O | — | — | R | R
CLASS | R | R | O | O | — | R | —
APPOINTMENT | R | — | O | R | — | R | —
FACILITY_RENTAL | R | — | R | O | — | R | —
RETAIL | — | — | — | — | R | R | —
GIFT_CARD | — | — | — | — | R | R | —
PACKAGE_CREDIT_PACK | — | — | — | — | O | R | R
Constraint ID | Rule
UOM-CM-001 | CLASS: If resource.exclusive=true, capacity is derived from resource; explicit CapacityModule is ignored.
UOM-CM-002 | FACILITY_RENTAL: Requires Resource module. Resource must not be shared with a concurrent booking at the same time slot.
UOM-CM-003 | APPOINTMENT: Staffing module must reference at least one active INSTRUCTOR_COACH at the Publishing Location.
UOM-CM-004 | PACKAGE_CREDIT_PACK: Entitlement module must define redemption mapping (which offering types credits apply to).
UOM-CM-005 | GIFT_CARD: Must define redemption rules (expiry, partial redemption allowed, offering type restrictions).
UOM-CM-006 | All types with Time module: Location timezone must be set. Missing timezone → publish blocked.
UOM-CM-007 | Pricing module completeness: at least one price tier must be configured. Zero-price offerings must explicitly set price=$0 (not null).
Step | Action | Validation Required
1. Create Offering | Company Admin creates Offering from template. Selects offering_type. System creates DRAFT OfferingVersion. | offering_type is valid.
2. Configure modules | Attach and configure required modules per type-module matrix. | Each module config validates independently. Draft validation preview available without publishing.
3. Set reporting dimensions | Set category, tax_category, revenue_category on the OfferingVersion. | All three required. Validated against active reporting dimension lists.
4. Select locations | Add OfferingPublications for target locations and channels. | At least one active Location required. Business Entity of Location must have active tax and bank config.
5. Publish | Company Admin triggers publish. System runs full validation engine. | All required modules present. Cross-module constraints satisfied. Reporting dimensions set. At least one location. No competing concurrent publish in progress.
6. Confirmation | System creates immutable OfferingVersion (PUBLISHED), computes config_hash, retires prior version. | Emit offering.published AuditEvent.
Event Type | Trigger
offering.created | New Offering and first DRAFT version created.
offering.draft_updated | Any field on a DRAFT OfferingVersion changed.
offering.published | OfferingVersion transitioned to PUBLISHED.
offering.retired | Offering or OfferingVersion retired. Includes reason_code.
offering.publication_scope_changed | Locations added or removed from publication.
offering.location_override_applied | Location-level override set on a published offering.
reporting_dimension.created | New category, tax_category, or revenue_category created.
reporting_dimension.updated | Dimension name or GL mapping changed.
Dimension | Requirement
Immutability | Published OfferingVersions have DB-level UPDATE trigger enforcement. Zero tolerance for in-place mutation.
Consistency | 100% of committed charges reference a valid offering_version_id. Validated at UCE commit.
Performance | Catalog browse (member portal): p99 < 150ms. Publish validation: < 3 seconds. OfferingVersion lookup (by ID): < 10ms.
Audit | All catalog lifecycle events are audited. PHI-safe payloads. Exportable via Epic E.
Reporting Stability | Reporting dimensions (category, tax_category, revenue_category) are governed. Deletion is blocked if referenced by active OfferingVersions.