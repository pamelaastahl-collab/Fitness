PRIMITIVE: Unified Charge Engine (UCE)
Version 1.0 | Status: Authoritative | Last Updated: March 2026
AI INSTRUCTION: Load this file before implementing any feature that involves pricing, quoting, checkout, refunds, adjustments, credits, subsidies, or financial exports. All commerce flows — web, POS, admin, and backoffice — must use UCE as the single source of charge truth. Never implement ad-hoc pricing logic outside this engine.

1. Purpose and Scope
The Unified Charge Engine is the single, authoritative service for computing, committing, and adjusting all economic events on the platform. It ensures that the same inputs always produce the same financial outcome regardless of channel (web, POS, admin, billing job).


2. Core Entities
2.1 Charge
The canonical, immutable record of an economic event. Created by Commit. Never edited — only referenced by Adjustments and Refunds.


2.2 ChargeLineItem
One or more line items per Charge. Immutable after commit. Each line item carries full reporting dimensions.


2.3 ChargePolicySnapshot
Immutable record of the pricing and policy rules active at commit time. Enables deterministic replay and audit evidence for disputes.


2.4 Adjustment
A post-commit modification to a Charge. Does NOT modify the original Charge or its line items. Creates a new record with full attribution and reason.


2.5 Refund
A financial reversal of a committed Charge. Always references the original Charge. Over-refund is blocked.


3. Core Operation Contracts
3.1 Quote (Stateless)



3.2 Commit (Idempotent Write)



3.3 Refund


4. Business Rules Summary


5. API Contract Summary


6. Non-Functional Requirements


INVARIANT 1: Quote is the ONLY entry point for pricing. No channel may compute prices independently.
INVARIANT 2: Commit is IDEMPOTENT. Duplicate idempotency_key returns the existing Charge — no new record created.
INVARIANT 3: Committed Charges and ChargeLineItems are IMMUTABLE. All post-commit changes are Adjustments or Refunds.
INVARIANT 4: Every Charge has immutable org snapshot fields (business_entity_id_at_sale, location_id_at_sale).
INVARIANT 5: A Charge CANNOT be committed if the Location has no active business_entity_id.
INVARIANT 6: Over-refund is blocked. Refund total cannot exceed original Charge total.
Field | Type | Required | Notes
charge_id | UUID PK | Yes | System-generated. Stable identifier for all downstream references.
idempotency_key | UUID | Yes | Caller-supplied. Unique per commit attempt. Duplicate key → return existing Charge.
company_id | UUID FK | Yes | Tenant isolation. RLS enforced.
customer_id | UUID FK | Yes | References Person (Unified User Model).
actor_id | UUID FK | Yes | Person or system that initiated the commit.
channel | ENUM | Yes | WEB | POS | ADMIN | BILLING_JOB | API
location_id | UUID FK | Yes | Operational context. Used for org snapshot resolution.
business_entity_id_at_sale | UUID FK | Yes | IMMUTABLE. Captured at commit. NOT NULL constraint.
location_id_at_sale | UUID FK | Yes | IMMUTABLE. Captured at commit.
department_id_at_sale | UUID FK | No | IMMUTABLE. Null if no department context.
status | ENUM | Yes | COMMITTED | VOIDED (void is only pre-payment, same day)
payment_posture | ENUM | Yes | PAY_NOW | PAY_LATER | COMP
invoice_status | ENUM | No | PENDING | PAID | OVERDUE | WAIVED. Required when payment_posture=PAY_LATER.
gross_total | DECIMAL(12,4) | Yes | Sum of all gross line item amounts.
discount_total | DECIMAL(12,4) | Yes | Sum of all discount line items. Negative.
tax_total | DECIMAL(12,4) | Yes | Sum of all tax line items.
credit_applied | DECIMAL(12,4) | Yes | Credits offset from customer balance. Negative.
subsidy_applied | DECIMAL(12,4) | Yes | Subsidies applied. Negative.
customer_due | DECIMAL(12,4) | Yes | Final amount due from customer. May be $0.00.
currency | VARCHAR(3) | Yes | ISO 4217. Derived from Company.primary_currency.
committed_at | TIMESTAMP(UTC) | Yes | Immutable.
policy_snapshot_id | UUID FK | Yes | References ChargePolicySnapshot.
Field | Type | Required | Notes
line_item_id | UUID PK | Yes | System-generated. Immutable.
charge_id | UUID FK | Yes | Parent Charge. Immutable.
offering_version_id | UUID FK | Yes | The exact OfferingVersion sold. Immutable. References as-sold state.
line_type | ENUM | Yes | BASE_PRICE | DISCOUNT | TAX | CREDIT | SUBSIDY | COMP | FEE
description | VARCHAR(255) | Yes | Human-readable. Used in receipts and charge explainability.
category | VARCHAR(100) | Yes | Offering category. Reporting dimension. Immutable.
revenue_category | VARCHAR(100) | Yes | Revenue reporting dimension. GL mapping hook. Immutable.
tax_category | VARCHAR(100) | Yes | Tax reporting dimension. Drives tax rate lookup. Immutable.
amount | DECIMAL(12,4) | Yes | Positive for charges, negative for discounts/credits/subsidies.
quantity | INTEGER | Yes | Default 1. For retail: units sold.
unit_price | DECIMAL(12,4) | Yes | Per-unit price before adjustments.
policy_rule_id | VARCHAR(100) | No | Reference to the pricing rule that produced this line item.
policy_rule_hash | VARCHAR(64) | No | SHA-256 of the rule configuration at commit time.
Field | Type | Required | Notes
snapshot_id | UUID PK | Yes | System-generated. Referenced by Charge.
charge_id | UUID FK | Yes | One-to-one with Charge.
rules_json | JSONB | Yes | All active pricing rules and their configurations at commit time.
rules_hash | VARCHAR(64) | Yes | SHA-256 of rules_json. For integrity verification.
captured_at | TIMESTAMP(UTC) | Yes | Immutable. Server-set at commit time.
Field | Type | Required | Notes
adjustment_id | UUID PK | Yes | System-generated.
charge_id | UUID FK | Yes | References the original Charge. Immutable.
line_item_id | UUID FK | No | References specific ChargeLineItem if line-item-level. Null for charge-level.
adjustment_type | ENUM | Yes | NO_SHOW_FEE | GOODWILL_CREDIT | ADMIN_CORRECTION | SAVE_OFFER_DISCOUNT | SAVE_OFFER_CREDIT | CONTRACT_EXTENSION
amount | DECIMAL(12,4) | Yes | Net effect. Positive = additional charge. Negative = credit/reduction.
reason_code | VARCHAR(100) | Yes | Always required. From controlled vocabulary.
reason_detail | TEXT | No | Free text. Optional additional context.
actor_id | UUID FK | Yes | Person making the adjustment.
approval_required | BOOLEAN | Yes | True if amount exceeds override threshold.
approved_by_id | UUID FK | No | Required when approval_required=true.
idempotency_key | UUID | Yes | Caller-supplied. Duplicate key → return existing Adjustment.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
Field | Type | Required | Notes
refund_id | UUID PK | Yes | System-generated.
charge_id | UUID FK | Yes | References original Charge. Immutable.
refund_type | ENUM | Yes | FULL | PARTIAL
amount | DECIMAL(12,4) | Yes | Must be positive. Cannot exceed (original customer_due - prior refunds).
reason_code | VARCHAR(100) | Yes | Always required.
actor_id | UUID FK | Yes | Person initiating the refund.
approved_by_id | UUID FK | No | Required when amount exceeds location override threshold.
processor_refund_reference | VARCHAR(255) | No | External processor reference. Set after successful payment reversal.
status | ENUM | Yes | PENDING | PROCESSING | COMPLETED | FAILED
idempotency_key | UUID | Yes | Duplicate key → return existing Refund.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
Quote is STATELESS. No database writes. Optional short-lived ephemeral token (valid 5 minutes) for commit reference.
Quote is DETERMINISTIC. Same inputs always produce same outputs.
Quote does NOT reserve inventory or create holds.
Quote references the current published OfferingVersion and current active pricing policies.
Input / Output | Specification
Input: cart_items | Array of { offering_version_id, quantity, customer_id, location_id }
Input: pricing_context | { member_status, active_credits, promo_codes, applicable_subsidies }
Output: line_items | Array of ChargeLineItem-shaped objects with all dimensions populated
Output: totals | { gross_total, discount_total, tax_total, credit_total, subsidy_total, customer_due }
Output: effective_policy | Summary of pricing rules applied, with rule_ids for traceability
Error: invalid offering_version_id | HTTP 400 per item. Other items computed normally.
Error: location not found | HTTP 400. Quote blocked.
Error: ineligible item | Line item shows ineligible status with reason. Other items proceed.
Commit requires an idempotency_key. Missing key → HTTP 400.
Duplicate idempotency_key → return existing Charge with HTTP 200. No new record.
Concurrent commit for the same booking → first wins. Second returns HTTP 409 (unless idempotency_key matches).
Commit is channel-agnostic. Web, POS, Admin, BillingJob all use the same endpoint.
Input / Output | Specification
Input: required fields | cart_items (or quote_token), idempotency_key, actor_id, channel, location_id, customer_id, payment_posture
Output: success | { charge_id, line_items_summary, customer_due, status: COMMITTED }
State change: Charge | Created with status=COMMITTED. Immutable after this point.
State change: ChargeLineItems | Created. Immutable.
State change: ChargePolicySnapshot | Captured with hash.
State change: Org snapshot | business_entity_id_at_sale, location_id_at_sale, department_id_at_sale captured from location context.
Domain event emitted | charge.committed
Error: missing idempotency_key | HTTP 400
Error: location has no business_entity_id | HTTP 500. Block. Alert. Do not commit.
Error: comp posture without permission | HTTP 403
Rule | Specification
Over-refund guard | System validates: refund.amount <= (charge.customer_due - sum(prior refunds)). Exceeds → HTTP 409.
Approval threshold | Refunds above location-configured threshold require approved_by_id. Missing → HTTP 403.
Payment reversal | Calls Payments Domain refund API. Stores processor_refund_reference on success.
Comp charges | Comp charges (customer_due=$0) can be refunded to $0; no payment reversal needed.
Idempotency | Duplicate idempotency_key returns existing Refund. No duplicate payment reversal.
Rule ID | Rule | Enforcement Point
UCE-BR-001 | Quote is the only entry point for pricing. No ad-hoc pricing in channels. | Architecture convention + code review
UCE-BR-002 | Idempotency keys are required on all Commit, Adjustment, and Refund operations. | API validation layer
UCE-BR-003 | Committed Charges are immutable. DB trigger blocks UPDATE on charge records. | DB constraint + app layer
UCE-BR-004 | Org snapshot fields are NOT NULL and immutable. DB trigger prevents UPDATE. | DB constraint
UCE-BR-005 | Over-refund is blocked. Validated before Payments Domain call. | App layer before payment call
UCE-BR-006 | Comp posture requires explicit actor permission (comp_charge permission). | RBAC check at commit
UCE-BR-007 | Adjustment and Refund approval thresholds are configurable per Company. | Company configuration
UCE-BR-008 | All currency amounts are stored as DECIMAL(12,4). No floating point. | Schema definition
UCE-BR-009 | Multi-item quotes: if one item fails pricing, that item shows error. Other items compute normally. | Quote service
UCE-BR-010 | Tax is computed at commit time and stored immutably. Tax quotes in ChargePolicySnapshot. | UCE commit path
Operation | Method | Path | Auth | Idempotency Key
Quote | POST | /v1/charges/quote | Session (any channel) | Not required
Commit charge | POST | /v1/charges/commit | Session (any channel) | Required
Adjust charge | POST | /v1/charges/{charge_id}/adjust | LOCATION_MANAGER+ | Required
Refund charge (partial) | POST | /v1/charges/{charge_id}/refund | FRONT_DESK_STAFF+ | Required
Refund charge (full) | POST | /v1/charges/{charge_id}/refund | LOCATION_MANAGER+ | Required
View charge detail | GET | /v1/charges/{charge_id} | FRONT_DESK_STAFF+ | N/A
Generate reconciliation export | POST | /v1/charges/export/reconciliation | FINANCE_ADMIN | Idempotent by params
View audit trail (charges) | GET | /v1/charges/audit | AUDITOR+ | N/A
Dimension | Requirement
Performance | Quote computation: p99 < 200ms. Commit: p99 < 500ms. Export generation (1 month / 1 entity): < 30 seconds.
Correctness | Same inputs always produce same quote output. Zero silent mutations on committed records.
Idempotency | All write operations are idempotent. Retry-safe for all network failure scenarios.
Audit | Every commit, adjustment, refund, and export emits an immutable AuditEvent.
Security | Comp posture requires explicit permission. Approval thresholds enforced. All sensitive actions step-up authenticated.
Compliance | Reconciliation exports with integrity hashes. Tax quote immutability for tax compliance. Append-only audit trail.