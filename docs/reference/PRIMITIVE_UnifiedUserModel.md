PRIMITIVE: Unified User Model
Version 1.0 | Status: Authoritative | Last Updated: March 2026
AI INSTRUCTION: Load this file first before implementing any feature that touches identity, authentication, roles, sessions, or audit. This spec is the single source of truth — do not infer or re-derive contracts from epic FRDs.

1. Purpose and Scope
This document defines the canonical data contracts, business rules, and invariants for all identity and access primitives. Every epic that references "Unified User Model", "Person", "AuthIdentifier", "RoleAssignment", "TenantMembership", or "AuditEvent" must treat this spec as authoritative.


2. Core Entities
2.1 Person
The global identity record for every human in the platform. One record per human — never duplicated.


2.2 AuthIdentifier
Links a Person to an authentication credential. A Person may have multiple AuthIdentifiers across different types.



2.3 TenantMembership
Links a Person to a Company (tenant). A Person may have memberships across multiple tenants.


2.4 RoleAssignment
Binds a Person to a role at a specific scope within a tenant. The source of all permission decisions.


2.5 Role Codes and Scope Compatibility



2.6 Session
Represents an authenticated session for any surface (web, mobile, shared device, admin console).


2.7 ImpersonationSession
Used by Platform Support for break-glass access. Requires step-up authentication. Cannot escalate privileges beyond the target person's roles.



2.8 AuditEvent
The immutable audit log record. Append-only. Never updated or deleted.



3. Authentication Business Rules


4. Duplicate Detection and Merge Rules


5. API Contract Summary
Full endpoint specs are in the FRD for each epic consuming these primitives. These are the canonical operation names — implementations must match exactly.


6. Non-Functional Requirements


INVARIANT 1: One Person record per human, globally. Never duplicated. Person identity persists across tenants.
INVARIANT 2: A Person may have multiple AuthIdentifiers (email, phone, Google, Apple, SSO). Each type+value combination is globally unique.
INVARIANT 3: A Person may have TenantMemberships at multiple companies. Data is tenant-isolated via Row-Level Security (RLS).
INVARIANT 4: RoleAssignments are scoped. A role + scope combination is unique per person per tenant.
INVARIANT 5: AuditEvents are append-only and immutable. Never updated or deleted. Retained minimum 3 years.
Field | Type | Required | Notes
person_id | UUID PK | Yes | Globally unique. System-generated. Never reused.
person_type | ENUM | Yes | MEMBER | STAFF | GUARDIAN | GUEST. Mutates as role changes.
given_name | VARCHAR(100) | Yes | Legal first name. PHI-safe logging: redacted in audit payloads.
family_name | VARCHAR(100) | Yes | Legal last name. PHI-safe logging: redacted in audit payloads.
date_of_birth | DATE | No | Used for minor detection (is_minor flag). PHI-safe.
is_minor | BOOLEAN | Derived | Computed from date_of_birth. If true: guardian consent required for data capture and communication consent.
primary_email | VARCHAR(255) | No | Denormalized for fast lookup. Source of truth is AuthIdentifier.
primary_phone | VARCHAR(30) | No | E.164 format. Denormalized. Source of truth is AuthIdentifier.
identity_photo_url | TEXT | No | Encrypted object storage reference. Set by Photo ID Capture module.
identity_photo_status | ENUM | No | ACTIVE | PENDING_REVIEW | REJECTED | NONE.
status | ENUM | Yes | ACTIVE | SUSPENDED | DEACTIVATED.
created_at | TIMESTAMP(UTC) | Yes | Immutable after creation.
updated_at | TIMESTAMP(UTC) | Yes | Updated on any field change.
merged_into_person_id | UUID FK | No | Set when this record is merged into another. Immutable after set.
Field | Type | Required | Notes
auth_identifier_id | UUID PK | Yes | System-generated.
person_id | UUID FK | Yes | References Person. Immutable after creation.
type | ENUM | Yes | EMAIL | PHONE | GOOGLE | APPLE | SSO_OIDC | SSO_SAML
value | TEXT | Yes | Hashed/tokenised. Never stored as plaintext. Globally unique per type.
verified_at | TIMESTAMP(UTC) | No | Null until verification is completed.
idp_subject | VARCHAR(255) | No | Required for SSO_OIDC, SSO_SAML, GOOGLE, APPLE. The external IdP user identifier.
idp_tenant_id | VARCHAR(255) | No | Required for SSO_OIDC and SSO_SAML. The IdP tenant/directory identifier.
status | ENUM | Yes | ACTIVE | REVOKED
created_at | TIMESTAMP(UTC) | Yes | Immutable.
CONSTRAINT: type + value combination is globally unique across all tenants.
CONSTRAINT: A Person may not have two ACTIVE AuthIdentifiers of the same type (except SSO where multiple IdPs may be configured).
BUSINESS RULE: Magic link tokens and OTP codes are NOT stored in AuthIdentifier — they are short-lived and stored hashed with expiry, deleted on use.
Field | Type | Required | Notes
membership_id | UUID PK | Yes | System-generated.
person_id | UUID FK | Yes | References Person. Immutable after creation.
company_id | UUID FK | Yes | References Company (Org Hierarchy). Immutable after creation.
status | ENUM | Yes | INVITED | ACTIVE | SUSPENDED | DEACTIVATED
invited_by_person_id | UUID FK | No | Actor who initiated the invite.
invite_expires_at | TIMESTAMP(UTC) | No | Required when status=INVITED. Invite links expire after 72 hours.
created_at | TIMESTAMP(UTC) | Yes | Immutable.
Field | Type | Required | Notes
assignment_id | UUID PK | Yes | System-generated.
person_id | UUID FK | Yes | References Person.
company_id | UUID FK | Yes | Tenant context. Enforces isolation.
role_code | ENUM | Yes | See Role Codes table below.
scope_type | ENUM | Yes | COMPANY | ENTITY | LOCATION | DEPARTMENT
scope_id | UUID FK | Yes | References the specific org object at scope_type level.
granted_by_person_id | UUID FK | Yes | Actor who made the assignment. Immutable.
granted_at | TIMESTAMP(UTC) | Yes | Immutable.
expires_at | TIMESTAMP(UTC) | No | Optional expiry. System revokes on expiry.
reason_code | VARCHAR(100) | No | Required for privileged roles and SoD-constrained pairs.
status | ENUM | Yes | ACTIVE | EXPIRED | REVOKED
revoked_at | TIMESTAMP(UTC) | No | Set on revocation.
revoked_by_person_id | UUID FK | No | Actor who revoked. Set on revocation.
Role Code | Company | Entity | Location | Department | Notes
COMPANY_ADMIN | Yes | — | — | — | Full tenant governance.
SECURITY_ADMIN | Yes | Yes | — | — | Identity, access, SSO, audit.
FINANCE_ADMIN | Yes | Yes | — | — | Financial ops, exports, reconciliation.
TAX_BANK_CONFIG_ADMIN | — | Yes | — | — | Tax and banking config. SoD-separated.
REGIONAL_MANAGER | Yes | Yes | — | — | Multi-location oversight.
LOCATION_MANAGER | — | — | Yes | — | Single-location operations.
FRONT_DESK_STAFF | — | — | Yes | — | POS, check-in, member service.
INSTRUCTOR_COACH | — | — | Yes | Yes | Class delivery, schedule view.
DEPARTMENT_LEAD | — | — | — | Yes | Department scheduling and staffing.
AUDITOR | Yes | Yes | Yes | — | Read-only. Audit log, evidence export.
MEMBER | — | — | Yes | — | Consumer role. Not a staff role.
GUARDIAN | — | — | Yes | — | Acts on behalf of a minor member.
PLATFORM_SUPPORT | System | — | — | — | Internal only. Break-glass via Epic E.
SoD CONSTRAINT: SECURITY_ADMIN + FINANCE_ADMIN cannot be assigned to the same person at the same scope.
SoD CONSTRAINT: SECURITY_ADMIN + TAX_BANK_CONFIG_ADMIN cannot be assigned to the same person at the same scope.
SoD CONSTRAINT: FINANCE_ADMIN + TAX_BANK_CONFIG_ADMIN cannot be assigned to the same person at the same scope.
ENFORCEMENT: SoD validation runs per-item. Attempted violation returns HTTP 409 with conflict details.
DEFAULT-DENY: A person with no role assignments has zero access to tenant data.
Field | Type | Required | Notes
session_id | UUID PK | Yes | System-generated.
person_id | UUID FK | Yes | Owner of the session.
company_id | UUID FK | Yes | Tenant context for the session.
surface | ENUM | Yes | WEB | MOBILE | SHARED_DEVICE | ADMIN_CONSOLE
auth_method | ENUM | Yes | MAGIC_LINK | PHONE_OTP | GOOGLE | APPLE | SSO_OIDC | SSO_SAML | PIN
established_at | TIMESTAMP(UTC) | Yes | Immutable.
last_active_at | TIMESTAMP(UTC) | Yes | Updated on each authenticated request.
expires_at | TIMESTAMP(UTC) | Yes | Idle timeout: 15 minutes (admin). Absolute: 12 hours (admin), 30 days (member mobile).
status | ENUM | Yes | ACTIVE | LOCKED | TERMINATED
reason_code | VARCHAR(100) | No | Set on termination.
ip_address_hash | VARCHAR(64) | No | Hashed. PHI-safe. For security event correlation only.
Field | Type | Required | Notes
session_id | UUID PK | Yes | System-generated.
impersonator_person_id | UUID FK | Yes | Must have PLATFORM_SUPPORT role. Immutable.
target_person_id | UUID FK | Yes | The person being impersonated. Immutable.
started_at | TIMESTAMP(UTC) | Yes | Immutable.
expires_at | TIMESTAMP(UTC) | Yes | Maximum 4 hours. Non-renewable.
reason_code | VARCHAR(255) | Yes | Required. Support case reference.
status | ENUM | Yes | ACTIVE | TERMINATED
INVARIANT: Impersonation banner is injected into every UI surface during an active ImpersonationSession.
INVARIANT: All actions taken during an ImpersonationSession are attributed to BOTH the impersonator and the target in audit events.
INVARIANT: Impersonation cannot escalate privileges beyond the target person's active RoleAssignments.
Field | Type | Required | Notes
event_id | UUID PK | Yes | System-generated. Immutable.
event_type | VARCHAR(100) | Yes | Dot-notation. e.g. user.invited, role.assigned, charge.committed.
actor_person_id | UUID FK | Yes | Person who triggered the event. For system events: system sentinel ID.
actor_type | ENUM | Yes | USER | SYSTEM | IMPERSONATION
target_entity_type | VARCHAR(100) | Yes | e.g. Person, RoleAssignment, Charge, Offering.
target_entity_id | UUID | Yes | ID of the affected entity.
company_id | UUID FK | Yes | Tenant context. RLS enforced.
scope_type | ENUM | No | COMPANY | ENTITY | LOCATION | DEPARTMENT. Null for global events.
scope_id | UUID FK | No | Scope context of the action.
occurred_at | TIMESTAMP(UTC) | Yes | Immutable. Server-set.
payload_hash | VARCHAR(64) | Yes | SHA-256 of the event payload. For integrity verification.
before_value | JSONB | No | Redacted per PHI-safe logging allowlist. No raw PII.
after_value | JSONB | No | Redacted per PHI-safe logging allowlist. No raw PII.
correlation_id | UUID | No | Links events in the same request chain.
ip_address_hash | VARCHAR(64) | No | Hashed. PHI-safe.
PHI-SAFE RULE: No raw PII in audit payloads. Use IDs and hashes only. Before/after values are redacted per allowlist.
RETENTION: Minimum 3 years. Controlled by company audit retention policy. Expired events are not returned on queries.
INDEX: (company_id, occurred_at DESC) is the primary query path.
IMMUTABILITY: No UPDATE or DELETE operations exist on AuditEvent. Enforced at DB constraint level.
Rule ID | Rule | Applies To
UUM-BR-001 | Magic link tokens are single-use and expire in 15 minutes. Stored hashed. Deleted on use. | Email auth
UUM-BR-002 | Phone OTP codes are 6 digits, expire in 5 minutes. Max 5 requests per phone per hour. | Phone auth
UUM-BR-003 | Social login (Google/Apple): if idp_subject matches existing AuthIdentifier → sign in. If email matches verified AuthIdentifier → link and sign in. Otherwise → create new Person. | Social auth
UUM-BR-004 | SSO (OIDC/SAML): certificate expiry < 90 days triggers admin warning. Configuration saved in draft until test login succeeds. | SSO config
UUM-BR-005 | Step-up authentication is required for: exports, role changes, merges, refunds above threshold, access exceptions, break-glass elevation. | All privileged actions
UUM-BR-006 | Session idle timeout: 15 minutes (admin console). Absolute session limit: 12 hours (admin), 30 days (member mobile). | Sessions
UUM-BR-007 | Error messages on auth failures must not reveal whether an account exists (enumeration-safe). | All auth surfaces
UUM-BR-008 | Brute-force protection: lockout after 5 failed PIN attempts per device. Email/phone auth: rate limited as per UUM-BR-002. | All auth surfaces
Rule ID | Rule
UUM-DUP-001 | Duplicate detection runs at registration and staff invite. Signals: matching email (exact), matching phone (exact), matching name + DOB proximity.
UUM-DUP-002 | Detected duplicates produce a DedupeCandidatePair with a confidence_score and signals_json. Status starts as PENDING_REVIEW.
UUM-DUP-003 | Merge requires explicit actor confirmation. Merge preview shows which record becomes primary and which fields will be merged/discarded.
UUM-DUP-004 | Merge is irreversible. The secondary record is flagged merged_into_person_id. Historical records referencing the secondary person_id are NOT rewritten — they retain their original attribution.
UUM-DUP-005 | Merge emits AuditEvent: person.merged with full before/after diff of merged fields.
UUM-DUP-006 | Unsafe merge flags block merge: active disputes, security flags, concurrent active sessions on both records.
Operation | Method | Path | Auth Required | Notes
Register member (email) | POST | /v1/auth/register/email | None | Creates Person + AuthIdentifier (EMAIL)
Register member (phone) | POST | /v1/auth/register/phone | None | Creates Person + AuthIdentifier (PHONE)
Social login | POST | /v1/auth/social | None | GOOGLE | APPLE. Creates or links.
Verify magic link | POST | /v1/auth/verify/email-link | None | Validates token. Creates session.
Verify phone OTP | POST | /v1/auth/verify/phone-otp | None | Validates OTP. Creates session.
Invite staff | POST | /v1/staff/invite | SECURITY_ADMIN | COMPANY_ADMIN | Creates Person if needed. Creates RoleAssignment.
Assign role | POST | /v1/roles/assign | SECURITY_ADMIN | SoD validated. Audited.
Revoke role | DELETE | /v1/roles/{assignment_id} | SECURITY_ADMIN | Audited. Sets status=REVOKED.
View effective access | GET | /v1/persons/{person_id}/effective-access | SECURITY_ADMIN | COMPANY_ADMIN | Computed. Not cached.
Detect duplicates | POST | /v1/persons/dedup/detect | SECURITY_ADMIN | COMPANY_ADMIN | Returns DedupeCandidatePairs.
Execute merge | POST | /v1/persons/dedup/merge | SECURITY_ADMIN | COMPANY_ADMIN | Step-up required. Audited.
Start impersonation | POST | /v1/impersonation/start | PLATFORM_SUPPORT + step-up | Max 4 hours. Audited.
End impersonation | POST | /v1/impersonation/{session_id}/end | PLATFORM_SUPPORT | Audited.
Configure SSO | POST | /v1/sso/configure | SECURITY_ADMIN | Draft until test login succeeds.
Dimension | Requirement
Performance | Auth endpoints (login, token verify): p99 < 300ms. Role resolution: < 50ms. Effective access computation: < 200ms.
Security | All tokens hashed. No PII in logs. PHI-safe audit payloads. Row-Level Security on all tenant data. NIST SP 800-63B/C compliance for authentication strength.
Availability | Auth service: 99.9% uptime. Auth service degradation blocks login — no silent fallback to insecure paths.
Audit | Every authentication event, role change, and merge emits an AuditEvent. Minimum 3-year retention.
Compliance | OWASP ASVS v4.0.3 for authentication. NIST SP 800-63A/B/C for identity assurance levels.