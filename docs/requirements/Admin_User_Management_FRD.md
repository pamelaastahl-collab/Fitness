> **Note**
> This file is a plain-text extraction of `Admin_User_Management_FRD.docx`
> (in this same folder). The `.docx` is the authoritative source — this
> markdown copy exists so the FRD content is greppable, diffable, and
> linkable from design.md files. Regenerate this file (don't hand-edit)
> if the `.docx` is updated.

---

FRD: ADMIN USER MANAGEMENT
Epic ID: EPIC-UM  |  Version: 1.0  |  Status: Draft
Fitness & Recreation Platform  |  March 2026
AI INSTRUCTION: This is the implementation-layer document. Read this file when building code. Load the PRIMITIVE files listed in Section 0 first, then this FRD. Ignore the companion BRD/PRD — those are for human stakeholders. This document defines system inputs, outputs, business rules, data contracts, and API specifications only. Every story in this FRD must be independently deliverable in one sprint.
Attribute
Detail
Document Owner
Product Management
Epic ID
EPIC-UM
Status
Draft
Companion BRD/PRD
Admin_User_Management_BRD_PRD_FRD.docx (human reference only — do not load when coding)
Scope
Admin site user configuration: list, search, invite, view profile, edit profile, assign role, revoke role, deactivate, delete, session management, effective permissions, export.
AI Build Target
Claude AI (Sonnet/Opus). Load primitives first. Build one user story at a time. Do not bundle stories.
# 0. Primitive Dependencies
AI INSTRUCTION: Load these primitive files before reading any story in this FRD. The schemas and rules defined in primitives are authoritative. Do not redefine or override them here.
Primitive
File
Why Needed
Unified User Model
PRIMITIVE_UnifiedUserModel.docx
Person, AuthIdentifier, TenantMembership, RoleAssignment, AuditEvent schemas. Auth rules. Role permission matrix. Duplicate-check contract. Step-up token contract.
Org Hierarchy
PRIMITIVE_OrgHierarchy.docx
Company, BusinessEntity, Location, Department schemas and scope enforcement rules. Required for all scope-filtering logic.
Security Posture
Security_Posture_BRD_PRD_FRD.docx §SP-F02, §SP-F03
Step-up authentication token contract. RBAC/ABAC enforcement rules. SoD constraints. Sole-admin guard. Session revocation contract.
Notification Engine
Notification_Engine_BRD_PRD_FRD.docx
Invite email and contact-method verification email delivery. Async queue contract.
Compliance & Regulatory
Compliance_Regulatory_Oversight_BRD_PRD_FRD.docx
Compliance holds check required before permanent user deletion (US-UM-013).
# 1. Epic Overview
This epic builds the Admin User Management module: the dedicated surface inside the Admin Console where authorised operators configure, govern, and audit all users within their organisational scope. The primary consumers are Company Admin, Security Admin, and Location Manager personas operating via the admin console. The primary integration dependencies are the Unified User Model (Person/Role data), Security Posture (RBAC enforcement and step-up), Org Hierarchy (scope resolution), and Notification Engine (invite and verification emails).
# 2. Data Entities
AI INSTRUCTION: Entities marked 'PRIMITIVE_UUM' or 'PRIMITIVE_OH' are defined in primitive files. Do not redefine their fields. Reference the primitive. Only entities marked 'This Epic' introduce new fields or tables.
Entity
Owned By
Required Fields
Optional Fields
Audit Events
Notes
Person
PRIMITIVE_UUM
— reference primitive
—
—
Do not redefine. See PRIMITIVE_UnifiedUserModel §2.1
AuthIdentifier
PRIMITIVE_UUM
— reference primitive
—
—
Purged on person deletion.
TenantMembership
PRIMITIVE_UUM
— reference primitive
—
—
Retain 7 years.
RoleAssignment
PRIMITIVE_UUM
— reference primitive
expires_at (nullable), revoke_reason
admin.role_assigned, admin.role_revoked
Retain 7 years. Status=DELETED on person deletion. No hard deletes.
InviteToken
This Epic
token_id UUID, person_id FK, company_id FK, role_assignment_id FK, status ENUM(PENDING|ACCEPTED|EXPIRED|REVOKED), created_at, expires_at
accepted_at
invite.sent, invite.resent, invite.accepted, invite.expired
Expires 7 days after creation. Retain 1 year.
Session
PRIMITIVE_UUM / Security Posture
— reference primitive
—
admin.session_terminated
Do not redefine. Read-only for this epic except terminate action.
AuditEvent
PRIMITIVE_UUM
— reference primitive
—
(all events listed per story below)
IMMUTABLE. Append-only. Never UPDATE or DELETE. Retain min 3 years.
### InviteToken — Field Definitions (This Epic Only)
Field
Type
Required
Rules
token_id
UUID
Yes
System-generated. Immutable after creation.
person_id
UUID FK
Yes
References Person.person_id. Set at invite creation.
company_id
UUID FK
Yes
References Company.company_id. Immutable.
role_assignment_id
UUID FK
Yes
References RoleAssignment created at invite time.
status
ENUM
Yes
PENDING → ACCEPTED (on first SSO assertion) | EXPIRED (TTL elapsed) | REVOKED (admin-cancelled). No other transitions.
created_at
TIMESTAMPTZ
Yes
Server-generated. Immutable.
expires_at
TIMESTAMPTZ
Yes
created_at + 7 days. Immutable after creation. A resend creates a new token; old token set to REVOKED.
accepted_at
TIMESTAMPTZ
No
Set when status transitions to ACCEPTED.
# 3. User Stories
AI INSTRUCTION: Build one story at a time. Each story = one independently deployable unit. Do not combine stories into a single implementation. Every story must pass its acceptance criteria before the next story begins.
## Feature UM-F01 — User List & Search
US-UM-001  |  View Paginated User List
Story ID
US-UM-001
Feature
UM-F01 — User List & Search
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER (scoped) | AUDITOR (read-only) | FINANCE_ADMIN (read-only, entity-scoped)
User story
As a Company Admin, I want to view a paginated list of all users within my authorised scope, so that I can get an operational overview of who has access to my organisation.
Priority
P0
Sprint estimate
1 sprint
Depends on
PRIMITIVE_UUM (Person, RoleAssignment, TenantMembership); PRIMITIVE_OH (Location); Session token with resolved RBAC scope
Maps to BR
BR-UM-001, BR-UM-010, BR-UM-011
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is authenticated with any admin role. RBAC scope is resolved from session token. Tenant has at least one user.
WHEN
Actor navigates to People > Staff Management > Users (GET /admin/users).
THEN
System returns a paginated result set (default page_size=25) containing: person_id, display_name, primary_email (masked: user@***.***), status badge (ACTIVE|INVITED|INACTIVE), roles[] (all assigned role_codes), primary_location_name, created_at, last_login_at. Response includes total_count, page, page_size. Scope enforced: Company Admin receives all users for company_id; Location Manager receives only users whose RoleAssignment.scope_id is within actor's authorised location_ids.
Edge case 1
Tenant has 0 users: returns 200 with empty users[] array and total_count=0. UI renders empty state.
Edge case 2
User holds multiple roles: all role badges rendered. Location Manager managing 3 locations: users from all 3 locations included in result set.
Error state 1
Actor session token is expired or invalid: 401 UNAUTHORIZED.
Error state 2
Actor has no admin roles (member-only): 403 FORBIDDEN. Redirect to member portal.
#### Functional Requirements
Requirement
Specification
System inputs
GET /admin/users with optional query params: role[] (multi), status[] (ACTIVE|INVITED|INACTIVE), location_id[] (multi), created_from (ISO8601 date), created_to (ISO8601 date), page (int, default 1), page_size (int, default 25, max 100), sort_by (enum: display_name|status|created_at|last_login_at, default created_at), sort_dir (ASC|DESC, default DESC). All params are optional.
System outputs
200: { users: [{ person_id, display_name, primary_email_masked, status, roles[], primary_location_name, created_at, last_login_at }], total_count, page, page_size, filters_applied }
Business rule 1
Scope enforcement: result set is always filtered by actor's company_id AND (if LOCATION_MANAGER) by actor's authorised location_ids from RoleAssignment. Enforced server-side. Client-side rendering is supplementary only.
Business rule 2
Email masking: primary_email rendered as user@***.*** unless actor holds permission manage_users:read_contact. Phone numbers masked to last 4 digits only.
Validation rules
page_size: integer 1–100; values >100 clamped to 100 with response header X-Clamped-Page-Size. sort_by: must be whitelisted field; invalid values default to created_at DESC without error. Date range: created_to must be >= created_from; if not, 400 INVALID_DATE_RANGE.
State changes
Read-only. No state changes.
Permissions
COMPANY_ADMIN: company-wide. SECURITY_ADMIN: company-wide. LOCATION_MANAGER: location-scoped. AUDITOR: company-wide, read-only. FINANCE_ADMIN: entity-scoped, read-only. FRONT_DESK, INSTRUCTOR: 403.
Data entities touched
Read: Person, RoleAssignment, TenantMembership, OrgHierarchy (location names). Audit: admin.user_list_viewed { actor_person_id, company_id, filter_params (no PII values), result_count, timestamp }
Performance
P95 response ≤ 2,000ms for tenant with up to 10,000 users. Required index: (company_id, status, created_at). Paginated; no full-table loads permitted.
US-UM-002  |  Filter User List
Story ID
US-UM-002
Feature
UM-F01 — User List & Search
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER | AUDITOR | FINANCE_ADMIN
User story
As a Security Admin, I want to filter the user list by role, status, and location, so that I can narrow down to a specific cohort for review or action.
Priority
P0
Sprint estimate
1 sprint
Depends on
US-UM-001 (user list endpoint)
Maps to BR
BR-UM-010, BR-UM-011
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on the User List page. At least one filter is available.
WHEN
Actor applies one or more filters: Role (multi-select from role_code enum), Status (ACTIVE|INVITED|INACTIVE), Location (multi-select, limited to actor's scope), Created Date (date range).
THEN
User list updates immediately (client triggers new GET /admin/users with filter params). Active filters shown as dismissible chips. Total count updates to reflect filtered set. 'Clear All' link resets all filters and reloads unfiltered list.
Edge case 1
All filters combined yield 0 results: 200 with empty users[] and total_count=0. UI shows: 'No users match your filters. Try adjusting filters.'
Edge case 2
No locations configured in tenant: location filter is not rendered. Date range spans >2 years: allowed; no server-side restriction on range size.
Error state 1
created_to before created_from: 400 INVALID_DATE_RANGE with field-level error on the date range control.
Error state 2
Filter service times out (>3,000ms): return partial results with response header X-Partial-Results: true. UI shows toast: 'Some results may be missing. Please try again.'
#### Functional Requirements
Requirement
Specification
System inputs
Same as US-UM-001. Filter params passed server-side; client never filters in-memory.
Business rule 1
All filter values are applied as AND conditions. Multiple values within a single filter type (e.g. role[]=FRONT_DESK&role[]=INSTRUCTOR) are applied as OR within that dimension.
Business rule 2
Location filter values are additionally constrained to actor's authorised scope. Actor cannot filter by a location they are not authorised for; such values are silently ignored.
Validation rules
role[]: values must be from the system role_code enum. Invalid values: 400 INVALID_ROLE_CODE. status[]: values must be ACTIVE|INVITED|INACTIVE. Invalid: 400 INVALID_STATUS.
State changes
Read-only. Filter state is not persisted server-side between sessions.
Permissions
Same as US-UM-001.
Data entities touched
Read: same as US-UM-001. Audit: admin.user_list_viewed (filter_params logged without PII values).
US-UM-003  |  Search Users
Story ID
US-UM-003
Feature
UM-F01 — User List & Search
Role
Any admin role
User story
As a Location Manager, I want to search for a user by name, email, or phone number, so that I can find a specific person quickly without scrolling the full list.
Priority
P0
Sprint estimate
1 sprint
Depends on
US-UM-001; search index on Person fields within tenant
Maps to BR
BR-UM-001, BR-UM-011
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is authenticated with any admin role. Search index is available.
WHEN
Actor types at least 3 characters into the search input (debounced 300ms client-side, then GET /admin/users?q={term}).
THEN
System returns up to 50 matching users scoped to actor's permissions. Each result: display_name, primary_email (masked per permission), roles[], status. Selecting a result navigates to the User Profile page (US-UM-007).
Edge case 1
Query matches >50 users: return first 50 with response header X-Results-Truncated: true. UI shows: 'Showing first 50 results. Narrow your search.'
Edge case 2
Query contains email or phone of a user outside actor's scope: result is not returned.
Error state 1
Search index unavailable: fallback to synchronous DB query. Response header X-Search-Mode: fallback. UI shows banner: 'Search is slower than usual.'
Error state 2
Query <3 characters: 400 QUERY_TOO_SHORT. No results: 200 with empty array.
#### Functional Requirements
Requirement
Specification
System inputs
q: string (min 3 chars, max 100 chars). All other filters may also be combined with q.
System outputs
Same shape as US-UM-001 user list item. Max 50 results.
Business rule 1
Search index covers: first_name, last_name (tokenised), primary_email (tokenised), phone (last 6 digits only). Index is partitioned by company_id. No cross-tenant data exposed.
Business rule 2
Full exact email match returns result regardless of masking rule (the record is returned; email field is still masked in output if actor lacks read_contact permission).
Validation rules
q: stripped of leading/trailing whitespace. Special characters treated as literals (no regex injection). min 3 chars after strip; if <3: 400 QUERY_TOO_SHORT.
State changes
Read-only.
Permissions
Same as US-UM-001. Scope enforced on search results identical to list.
Data entities touched
Read: Person (search index). Audit: search queries logged for analytics only (no PII values in telemetry, only query_hash and result_count).
Performance
P95 response ≤ 500ms for index search. Fallback DB query P95 ≤ 2,000ms.
## Feature UM-F02 — Invite User (Single)
US-UM-004  |  Invite New User — Email Entry & Duplicate Check
Story ID
US-UM-004
Feature
UM-F02 — Invite User
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER
User story
As a Company Admin, I want to enter an email address to start the invite flow and have the system check for duplicates, so that I never accidentally create a second account for someone who already exists.
Priority
P0
Sprint estimate
1 sprint
Depends on
PRIMITIVE_UUM (duplicate-check contract); Person read access
Maps to BR
BR-UM-002, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is authenticated with an inviting role. Invite flow is open (POST /admin/users/invite/check-email).
WHEN
Actor submits an email address.
THEN
System validates email format. System performs global duplicate check against Person.auth_identifiers for this company_id by email. If no match: return 200 { duplicate: false } and advance to role/scope step. If match found: return 200 { duplicate: true, existing_person_id, existing_status } — actor must explicitly confirm to continue (add role to existing person).
Edge case 1
Email belongs to a Person with status INACTIVE: response includes existing_status=INACTIVE and UI shows 'This user is currently inactive. Would you like to reactivate them?'
Edge case 2
Email belongs to a member (no staff RoleAssignment): response includes has_staff_role=false and UI shows 'This email belongs to a member. Inviting will add a staff role to their existing account.'
Error state 1
Invalid email format: 400 INVALID_EMAIL_FORMAT with field-level error.
Error state 2
Duplicate check service unavailable: 503 DUPLICATE_CHECK_UNAVAILABLE. Block invite; do not allow bypass.
#### Functional Requirements
Requirement
Specification
System inputs
email: string (required, RFC 5322 format).
System outputs
200: { duplicate: bool, existing_person_id?: UUID, existing_status?: ENUM, has_staff_role?: bool }
Business rule 1
Duplicate check uses exact case-insensitive email match against AuthIdentifier.value (hashed comparison) within company_id scope.
Validation rules
email: RFC 5322 format required. Stripped of whitespace. Max 254 characters.
State changes
Read-only. No records created at this step.
Permissions
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER. Others: 403.
Data entities touched
Read: AuthIdentifier (email lookup). No write. No audit event at this step.
US-UM-005  |  Invite New User — Assign Role and Scope
Story ID
US-UM-005
Feature
UM-F02 — Invite User
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER
User story
As a Company Admin, I want to assign a role and organisational scope during the invite flow and send the invite, so that the new user has the correct permissions from their very first login.
Priority
P0
Sprint estimate
1 sprint
Depends on
US-UM-004 (email step complete); PRIMITIVE_UUM (role assignment contract); Security Posture SP-F02 (step-up); Notification Engine (email delivery)
Maps to BR
BR-UM-002, BR-UM-005, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
US-UM-004 completed (no unresolved duplicate, or actor confirmed adding role to existing person). Actor is on role/scope selection step.
WHEN
Actor selects role_code from actor-filtered dropdown, selects scope_type and scope_ids, and submits (POST /admin/users/invite).
THEN
System validates: role is within actor's assignable-role set; scope_ids are within actor's scope boundary; no SoD violation; user does not already hold this role at this scope. If role_code is privileged (SECURITY_ADMIN, COMPANY_ADMIN, FINANCE_ADMIN): step-up token required. On all checks passed: transaction executes (see state changes). Response: 201 { person_id, invite_id, invite_expires_at }.
Edge case 1
Privileged role selected (SECURITY_ADMIN): step-up challenge presented before submission. Actor fails step-up: 403 STEP_UP_FAILED. Invite is not created.
Edge case 2
SoD violation (e.g. target person already has FINANCE_ADMIN and actor assigns SECURITY_ADMIN): 422 SOD_VIOLATION with message explaining conflict.
Error state 1
Role not in actor's assignable set: 403 ROLE_ASSIGNMENT_NOT_PERMITTED.
Error state 2
Transaction fails mid-execution (any step): full rollback. No partial state. 500 with error_code INVITE_TRANSACTION_FAILED.
#### Functional Requirements
Requirement
Specification
System inputs
email (from step 1), role_code (from role_code enum, required), scope_type (COMPANY|ENTITY|LOCATION, required), scope_ids[] (required if scope_type != COMPANY), step_up_token (required if privileged role), invited_by (actor person_id from session, server-resolved).
System outputs
201: { person_id, invite_id, invite_expires_at }. 409: { error_code: DUPLICATE_ROLE | SOLE_ADMIN_PROTECTED }. 422: { error_code: SOD_VIOLATION, message }. 403: { error_code: STEP_UP_REQUIRED | ROLE_ASSIGNMENT_NOT_PERMITTED }.
Business rule 1
Assignable-role enforcement: LOCATION_MANAGER may only assign [FRONT_DESK, INSTRUCTOR] to scope_ids within their authorised location_ids. COMPANY_ADMIN: all roles. SECURITY_ADMIN: all roles.
Business rule 2
SoD check: SECURITY_ADMIN and FINANCE_ADMIN cannot coexist on the same person_id within the same company_id. Check runs before any write.
Business rule 3
Step-up gate: role_code in [SECURITY_ADMIN, COMPANY_ADMIN, FINANCE_ADMIN] requires a valid step-up token. Step-up token must be: single-use, ≤5min old, action-bound to 'role_assign'. Without valid token: 403 STEP_UP_REQUIRED.
State changes (transaction)
All-or-nothing: (1) Create Person if not exists (person.created audit). (2) Create TenantMembership. (3) Create RoleAssignment (status=ACTIVE). (4) Create InviteToken (status=PENDING, expires_at=now+7d). (5) Enqueue invite email via Notification Engine. If any step fails: rollback all. No partial commits.
Permissions
COMPANY_ADMIN: all roles. SECURITY_ADMIN: all roles. LOCATION_MANAGER: FRONT_DESK and INSTRUCTOR within their locations only.
Data entities touched
Write: Person (if new), TenantMembership, RoleAssignment, InviteToken. Read: AuthIdentifier (dup check), OrgHierarchy (scope validation). Audit (all emitted atomically): person.created (if new), admin.role_assigned, invite.sent.
US-UM-006  |  Resend Invite
Story ID
US-UM-006
Feature
UM-F02 — Invite User
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER
User story
As a Company Admin, I want to resend an invite to a user whose invite has expired or was not received, so that they can complete onboarding without me re-entering all their details.
Priority
P1
Sprint estimate
1 sprint
Depends on
US-UM-005 (invite exists); Notification Engine
Maps to BR
BR-UM-002, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
A Person exists with an InviteToken in status PENDING or EXPIRED. Actor is on the User Profile page.
WHEN
Actor clicks 'Resend Invite' (POST /admin/users/{person_id}/invite/resend).
THEN
System sets existing InviteToken status to REVOKED. Creates a new InviteToken (status=PENDING, expires_at=now+7d). Enqueues invite email. Response: 200 { invite_id, invite_expires_at }. Audit event: invite.resent.
Edge case 1
Actor attempts to resend for a user whose status is ACTIVE (invite already accepted): 409 INVITE_ALREADY_ACCEPTED. 'Resend Invite' button is not rendered for ACTIVE users.
Edge case 2
Rate limit: >3 resends per actor per person_id within 1 hour: 429 RATE_LIMIT_EXCEEDED with Retry-After header.
Error state 1
Email delivery failure (Notification Engine returns error): 200 is still returned (invite record is created); response includes { email_sent: false }. UI shows: 'Invite created but email failed. You can resend from the user profile.'
Error state 2
Person not found or outside actor's scope: 404 NOT_FOUND.
#### Functional Requirements
Requirement
Specification
System inputs
person_id (path param).
System outputs
200: { invite_id, invite_expires_at, email_sent: bool }
Business rule 1
Old InviteToken is set to REVOKED (not deleted) before new token is created. Both records are retained for audit.
Business rule 2
Rate limit: 3 resend operations per actor_person_id per person_id per hour. Counter resets on hour boundary.
State changes
InviteToken (old): status → REVOKED. InviteToken (new): created with status=PENDING. Notification Engine: invite email enqueued.
Permissions
COMPANY_ADMIN, SECURITY_ADMIN: any user in company. LOCATION_MANAGER: only users in their location scope.
Data entities touched
Write: InviteToken (revoke old, create new). Read: Person. Audit: invite.resent { actor, target_person_id, old_invite_id, new_invite_id, timestamp }.
## Feature UM-F03 — User Profile (Admin View)
US-UM-007  |  View User Profile
Story ID
US-UM-007
Feature
UM-F03 — User Profile
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER (scoped) | AUDITOR (read-only) | FINANCE_ADMIN (read-only, entity-scoped)
User story
As a Security Admin, I want to view a user's complete administrative profile — identity, roles, sessions, and audit history — so that I can understand their full access state in one place.
Priority
P0
Sprint estimate
1 sprint
Depends on
US-UM-001; PRIMITIVE_UUM (Person, RoleAssignment, Session); Security Posture (session records)
Maps to BR
BR-UM-003, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is authenticated with a permitted role. Target Person exists within actor's scope.
WHEN
Actor navigates to GET /admin/users/{person_id}.
THEN
Response contains four data groups: (1) Identity: person_id, first_name, last_name, primary_email (masked), phone (masked), photo_url, status, home_location_name, created_at, last_login_at, mfa_enrolled (bool). (2) Roles: all active RoleAssignments (role_code, scope_type, scope_name, granted_by_name, granted_at). (3) Sessions: active sessions summary (count, last_active_at). (4) Audit history: last 50 AuditEvents where target_entity_id = person_id, sorted by occurred_at DESC.
Edge case 1
User has no profile photo: photo_url is null. UI renders avatar placeholder.
Edge case 2
User status is INACTIVE: all data groups returned. Destructive action endpoints (deactivate, delete) still present in API; UI renders 'Reactivate' instead.
Error state 1
person_id not found: 404 NOT_FOUND.
Error state 2
person_id exists but is outside actor's scope: 403 FORBIDDEN.
#### Functional Requirements
Requirement
Specification
System inputs
person_id (UUID, path param).
System outputs
200: { person: {identity fields}, roles: [RoleAssignment...], sessions_summary: {count, last_active_at}, audit_history: [last 50 AuditEvent...] }
Business rule 1
Scope check: GET /admin/users/{person_id} enforces actor.company_id = Person.company_id AND (if LOCATION_MANAGER) Person must have a RoleAssignment with scope_id in actor's authorised location_ids.
Business rule 2
Audit history shown on profile is scoped to events where target_entity_id = person_id OR target_entity_id IN person's RoleAssignment IDs. Not a full audit log view.
Validation rules
person_id: must be a valid UUID. Malformed UUID: 400 INVALID_PERSON_ID.
State changes
Read-only.
Permissions
COMPANY_ADMIN: all users. SECURITY_ADMIN: all users. LOCATION_MANAGER: scoped users only. AUDITOR: all users, read-only. FINANCE_ADMIN: entity-scoped users, read-only.
Data entities touched
Read: Person, AuthIdentifier (MFA status only, no credential data), TenantMembership, RoleAssignment, Session (summary), AuditEvent (last 50 targeting this person). Audit: admin.user_profile_viewed { actor, target_person_id, timestamp }.
## Feature UM-F04 — Edit Profile Fields
US-UM-008  |  Edit User Name
Story ID
US-UM-008
Feature
UM-F04 — Edit Profile Fields
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER (scoped)
User story
As a Company Admin, I want to edit a user's first and last name, so that I can correct data entry errors without requiring the user to do it themselves.
Priority
P1
Sprint estimate
1 sprint
Depends on
US-UM-007 (profile view)
Maps to BR
BR-UM-004, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on the User Profile — Identity section. User status is ACTIVE or INVITED.
WHEN
Actor submits PATCH /admin/users/{person_id} with { first_name?, last_name? }.
THEN
System validates fields. Person record is updated. Response: 200 { person_id, first_name, last_name, updated_at }. Audit event emitted.
Edge case 1
Actor clears both name fields: 400 VALIDATION_ERROR with field-level error 'first_name is required'.
Edge case 2
Concurrent edit by another admin: last-write-wins. No merge conflict detection required.
Error state 1
first_name or last_name exceeds 100 characters: 400 VALIDATION_ERROR.
Error state 2
Server error during save: 500. Client retains unsaved changes.
#### Functional Requirements
Requirement
Specification
System inputs
PATCH /admin/users/{person_id} body: { first_name?: string, last_name?: string }. At least one field required.
System outputs
200: { person_id, first_name, last_name, updated_at }
Validation rules
first_name: non-empty string, max 100 chars, trimmed. last_name: non-empty string, max 100 chars, trimmed. At least one of first_name or last_name must be present in request body.
State changes
Person.first_name and/or Person.last_name updated.
Permissions
COMPANY_ADMIN, SECURITY_ADMIN: any user. LOCATION_MANAGER: scoped users. AUDITOR, FINANCE_ADMIN, FRONT_DESK, INSTRUCTOR: 403.
Data entities touched
Write: Person (name fields). Audit: person.profile_updated { field_names_changed: ['first_name'|'last_name'], actor_person_id, target_person_id, timestamp }. PHI-safe: old/new values NOT included in audit payload.
US-UM-009  |  Edit User Contact Method (Step-Up Required)
Story ID
US-UM-009
Feature
UM-F04 — Edit Profile Fields
Role
COMPANY_ADMIN | SECURITY_ADMIN
User story
As a Security Admin, I want to update a user's primary email or phone number, so that the user can receive communications and complete authentication with their current contact details.
Priority
P1
Sprint estimate
1 sprint
Depends on
US-UM-007; Security Posture SP-F02 (step-up); Notification Engine (verification)
Maps to BR
BR-UM-004, BR-UM-008, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on the User Profile — Identity section. User status is ACTIVE. Actor presents a valid step-up token scoped to action 'contact_method_change'.
WHEN
Actor submits PATCH /admin/users/{person_id}/contact with { type, value }.
THEN
System validates format and checks for global duplicate. Step-up token validated. On success: new contact method added as AuthIdentifier (verified=false, is_primary=false). Verification message sent to new contact method. Old primary contact method retained. Response: 200 { person_id, contact_type, verification_sent: bool }.
Edge case 1
New email/phone already exists on another Person in any tenant: 409 CONTACT_IN_USE.
Edge case 2
Actor attempts to remove the last contact method: 409 LAST_CONTACT_METHOD. Not permitted.
Error state 1
Step-up token missing or invalid: 403 STEP_UP_REQUIRED.
Error state 2
Verification message delivery failure: 200 returned with verification_sent=false. Old contact method retained as primary until new one is verified.
#### Functional Requirements
Requirement
Specification
System inputs
PATCH /admin/users/{person_id}/contact body: { type: 'email'|'phone', value: string }. Header: X-StepUp-Token (required).
System outputs
200: { person_id, contact_type, new_value_masked, verification_sent: bool }
Business rule 1
Global duplicate check: value must not match any existing AuthIdentifier.value across all companies (hashed comparison). 409 CONTACT_IN_USE if matched.
Business rule 2
Verification flow: new contact method created as UNVERIFIED secondary. Verification token (TTL=7 days) sent via Notification Engine. On verification: new method promoted to PRIMARY. If unverified after 7 days: new AuthIdentifier removed; old primary unchanged.
Business rule 3
Step-up token must be: single-use, ≤5min old, action-bound to 'contact_method_change'. Reuse or wrong action binding: 403 STEP_UP_INVALID.
Validation rules
email: RFC 5322, max 254 chars. phone: E.164 format.
State changes
AuthIdentifier: new record created (verified=false, is_primary=false). Existing primary unchanged.
Permissions
COMPANY_ADMIN, SECURITY_ADMIN only. All other roles including LOCATION_MANAGER: 403.
Data entities touched
Write: AuthIdentifier (new record). Read: AuthIdentifier (dup check). Audit: person.contact_method_changed { field_type, actor_person_id, target_person_id, timestamp }. PHI-safe: no old/new values in payload.
## Feature UM-F05 — Assign Role
US-UM-010  |  Assign Role to User
Story ID
US-UM-010
Feature
UM-F05 — Assign Role
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER (scoped, restricted roles)
User story
As a Company Admin, I want to assign a role to a user with a defined organisational scope, so that the user gains the permissions required for their responsibilities.
Priority
P0
Sprint estimate
1 sprint
Depends on
US-UM-007; PRIMITIVE_UUM (RoleAssignment contract); Security Posture SP-F02 (step-up), SP-F03 (SoD, sole-admin guard)
Maps to BR
BR-UM-005, BR-UM-009, BR-UM-011
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on User Profile — Roles tab. Target person status is ACTIVE or INVITED.
WHEN
Actor submits POST /admin/users/{person_id}/roles with { role_code, scope_type, scope_ids[] }.
THEN
System validates assignable-role set, scope boundary, SoD constraints, and duplicate check. If role_code is privileged: step-up required. On success: RoleAssignment created (status=ACTIVE). Active sessions refreshed within 60s (eventual). Response: 201 { role_assignment_id, role_code, scope_type, scope_ids, granted_at }.
Edge case 1
Duplicate assignment (same person, role, scope already ACTIVE): 409 ROLE_ALREADY_ASSIGNED.
Edge case 2
Actor assigns Security Admin to themselves: allowed only if actor is COMPANY_ADMIN; otherwise 403.
Error state 1
SoD violation: 422 SOD_VIOLATION with plain-language message.
Error state 2
Step-up token missing for privileged role: 403 STEP_UP_REQUIRED.
#### Functional Requirements
Requirement
Specification
System inputs
POST /admin/users/{person_id}/roles body: { role_code (required, from enum), scope_type (required), scope_ids[] (required if scope_type != COMPANY), step_up_token (required if privileged role) }.
System outputs
201: { role_assignment_id, role_code, scope_type, scope_ids, granted_by, granted_at }
Business rule 1
Assignable-role set: LOCATION_MANAGER → [FRONT_DESK, INSTRUCTOR] within authorised locations only. SECURITY_ADMIN → all roles. COMPANY_ADMIN → all roles. Violation: 403 ROLE_ASSIGNMENT_NOT_PERMITTED.
Business rule 2
SoD check: SECURITY_ADMIN and FINANCE_ADMIN cannot coexist on same person_id in same company_id. Run before any write.
Business rule 3
Sole-admin guard: if role_code = SECURITY_ADMIN and no other active SECURITY_ADMIN exists at this company: assignment is allowed (this is the first one). Guard only prevents removal, not addition.
Business rule 4
Privileged role step-up: role_code in [SECURITY_ADMIN, COMPANY_ADMIN, FINANCE_ADMIN] requires step-up token (single-use, ≤5min, action='role_assign').
State changes
RoleAssignment created: status=ACTIVE, granted_by=actor.person_id, granted_at=now. Session refresh event published for person_id; sessions refresh within 60s.
Permissions
See business rule 1. Step-up required for privileged roles.
Data entities touched
Write: RoleAssignment. Publish: session_refresh event. Audit: admin.role_assigned { actor, target_person_id, role_code, scope_type, scope_ids, role_assignment_id, timestamp }.
## Feature UM-F06 — Revoke Role
US-UM-011  |  Revoke Role from User
Story ID
US-UM-011
Feature
UM-F06 — Revoke Role
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER (scoped, restricted roles)
User story
As a Security Admin, I want to revoke a specific role from a user, so that their access is immediately reduced when their responsibilities change.
Priority
P0
Sprint estimate
1 sprint
Depends on
US-UM-010; Security Posture SP-F03 (sole-admin guard); session invalidation service
Maps to BR
BR-UM-006, BR-UM-009, BR-UM-011
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on User Profile — Roles tab. Target person has at least one active RoleAssignment visible to actor.
WHEN
Actor submits DELETE /admin/users/{person_id}/roles/{role_assignment_id}.
THEN
System checks sole-admin guard. On pass: RoleAssignment.status = REVOKED. revoked_by = actor, revoked_at = now. Session refresh event published. Response: 200 { role_assignment_id, status: 'REVOKED', revoked_at }.
Edge case 1
Revoking the user's last role: allowed. User retains Person and TenantMembership records with no admin access.
Edge case 2
Actor attempts to revoke a role outside their assignable set (e.g. Location Manager revoking COMPANY_ADMIN): 403 ROLE_REVOCATION_NOT_PERMITTED.
Error state 1
Sole-admin guard triggered: 409 SOLE_ADMIN_PROTECTED with message 'This user is the only Security Admin. Assign another Security Admin before revoking this role.'
Error state 2
role_assignment_id not found or already REVOKED: 404 NOT_FOUND.
#### Functional Requirements
Requirement
Specification
System inputs
DELETE /admin/users/{person_id}/roles/{role_assignment_id}. No request body.
System outputs
200: { role_assignment_id, status: 'REVOKED', revoked_at }
Business rule 1
Sole-admin guard: before revocation, COUNT(RoleAssignment WHERE role_code='SECURITY_ADMIN' AND company_id=actor.company_id AND status='ACTIVE'). If count = 1 AND this assignment is that record: 409 SOLE_ADMIN_PROTECTED.
Business rule 2
Revocable-role set mirrors assignable-role set per actor role. LOCATION_MANAGER may only revoke FRONT_DESK and INSTRUCTOR within their location scope.
State changes
RoleAssignment: status → REVOKED, revoked_by = actor.person_id, revoked_at = now. Session refresh event published for person_id; sessions update within 60s.
Permissions
COMPANY_ADMIN: any role. SECURITY_ADMIN: any role. LOCATION_MANAGER: FRONT_DESK and INSTRUCTOR within scope. Others: 403.
Data entities touched
Write: RoleAssignment. Publish: session_refresh event. Audit: admin.role_revoked { actor, target_person_id, role_assignment_id, role_code, timestamp }.
## Feature UM-F07 — Deactivate User
US-UM-012  |  Deactivate User Account
Story ID
US-UM-012
Feature
UM-F07 — Deactivate User
Role
COMPANY_ADMIN | SECURITY_ADMIN | LOCATION_MANAGER (scoped)
User story
As a Company Admin, I want to deactivate a user account with cascading cancellation of their memberships and bookings, so that the user can no longer access the platform after leaving the organisation.
Priority
P0
Sprint estimate
1 sprint
Depends on
US-UM-007; Security Posture SP-F02 (step-up); Membership state machine; Booking service; session revocation
Maps to BR
BR-UM-007, BR-UM-008, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on the User Profile page. Target Person.status = ACTIVE. Actor presents a valid step-up token scoped to action 'user_deactivate'.
WHEN
Actor submits POST /admin/users/{person_id}/deactivate with { reason_code, reason_text? }.
THEN
Pre-deactivation checks pass (see business rules). Transaction executes: Person.status = INACTIVE, active memberships at actor's scope cancelled, upcoming bookings at actor's scope cancelled, all active sessions for this Person revoked. Response: 200 { person_id, status: 'INACTIVE', deactivated_at, cancelled_membership_ids[], cancelled_booking_ids[] }.
Edge case 1
Target is sole Security Admin: 409 SOLE_ADMIN_PROTECTED.
Edge case 2
Target has upcoming bookings outside actor's scope: bookings outside scope are NOT cancelled. Response includes out_of_scope_bookings_skipped: true with count.
Error state 1
Step-up token missing: 403 STEP_UP_REQUIRED.
Error state 2
Transaction fails mid-execution (membership or booking cancellation fails): full rollback. Person.status reverted to ACTIVE. 500 DEACTIVATION_TRANSACTION_FAILED.
#### Functional Requirements
Requirement
Specification
System inputs
POST /admin/users/{person_id}/deactivate body: { reason_code (required, ENUM: TERMINATED|SUSPENDED|LEFT_ORGANISATION|OTHER), reason_text (optional, max 500 chars, required if reason_code=OTHER) }. Header: X-StepUp-Token (required).
System outputs
200: { person_id, status, deactivated_at, cancelled_membership_ids[], cancelled_booking_ids[], out_of_scope_bookings_skipped: bool }
Business rule 1
Sole-admin guard: check before executing. Deactivating last SECURITY_ADMIN blocked: 409 SOLE_ADMIN_PROTECTED.
Business rule 2
Active impersonation session check: if target person has an active ImpersonationSession: terminate it first (ImpersonationSession.status = TERMINATED) before proceeding.
Business rule 3
Booking cascade scope: cancel only bookings where booking.location_id is in actor's authorised location_ids. Bookings outside scope are skipped and counted in response.
Business rule 4
Deactivation is reversible. Person.status transitions: ACTIVE → INACTIVE (reversible). INACTIVE → DELETED (irreversible, US-UM-013 only).
State changes (transaction)
(1) Person.status = INACTIVE. (2) Memberships at scope: status → CANCELLED. (3) Upcoming bookings at scope: status → CANCELLED. (4) All sessions: status → TERMINATED, tokens revoked. All steps or none (rollback on failure).
Permissions
COMPANY_ADMIN: any user company-wide. SECURITY_ADMIN: any user company-wide. LOCATION_MANAGER: only users within their location scope. Step-up required for all callers.
Data entities touched
Write: Person, Membership (cascade), Booking (cascade), Session (revoke). Audit: person.deactivated { actor, reason_code, cancelled_membership_ids, cancelled_booking_ids, deactivated_at }.
## Feature UM-F08 — Delete User (Permanent Erasure)
US-UM-013  |  Permanently Delete User Account
Story ID
US-UM-013
Feature
UM-F08 — Delete User
Role
SECURITY_ADMIN | COMPANY_ADMIN
User story
As a Security Admin, I want to permanently delete a user account when required by a right-to-erasure request, so that the platform complies with applicable data privacy regulations.
Priority
P1
Sprint estimate
1 sprint
Depends on
US-UM-012 (must be INACTIVE first); Security Posture SP-F02 (step-up); Compliance module (holds check)
Maps to BR
BR-UM-008, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
Target Person.status = INACTIVE. Actor is SECURITY_ADMIN or COMPANY_ADMIN. Actor has a valid step-up token scoped to 'user_delete'.
WHEN
Actor submits DELETE /admin/users/{person_id} with { confirmation_email } in body. Header: X-StepUp-Token.
THEN
Pre-deletion checks pass (status=INACTIVE, no compliance holds, no open financial obligations). PII fields are redacted on Person record. RoleAssignments soft-deleted. AuthIdentifiers purged. TenantMembership closed. Person.status = DELETED. Audit event person.deleted created (IMMUTABLE). Response: 200 { person_id, status: 'DELETED', deleted_at }.
Edge case 1
Person.status is ACTIVE (not yet deactivated): 409 DEACTIVATION_REQUIRED with message 'User must be deactivated before deletion.'
Edge case 2
Unsettled financial transactions exist: 409 OPEN_FINANCIAL_OBLIGATIONS with count of open items.
Error state 1
confirmation_email does not exactly match Person.primary_email (case-insensitive): 400 CONFIRMATION_EMAIL_MISMATCH.
Error state 2
Step-up token missing or invalid: 403 STEP_UP_REQUIRED.
#### Functional Requirements
Requirement
Specification
System inputs
DELETE /admin/users/{person_id} body: { confirmation_email: string (required, must match Person.primary_email case-insensitively) }. Header: X-StepUp-Token (required, action='user_delete').
System outputs
200: { person_id, status: 'DELETED', deleted_at }
Business rule 1
Pre-deletion checks (all must pass): (1) Person.status = INACTIVE. (2) No compliance holds on person_id (check Compliance module). (3) No open financial obligations (unsettled charges, active subscriptions). If any fail: 409 with specific error_code.
Business rule 2
Deletion is data redaction, NOT hard delete: Person record is retained as audit skeleton. Field redaction: first_name='[Deleted]', last_name='[Deleted]', primary_email='[deleted_{person_id}]@deleted', phone='[deleted]', photo_url=null. Person.status = DELETED.
Business rule 3
AuditEvent record for person.deleted is created and is itself IMMUTABLE — no application role may UPDATE or DELETE it. This record persists forever.
Business rule 4
Step-up token: single-use, ≤5min old, action-bound to 'user_delete'. Reuse or wrong binding: 403 STEP_UP_INVALID.
State changes
Person: PII fields redacted, status = DELETED. RoleAssignment: status = DELETED. AuthIdentifier: all records for person_id hard-deleted. TenantMembership: status = CLOSED.
Permissions
SECURITY_ADMIN and COMPANY_ADMIN only. Step-up required. LOCATION_MANAGER and all other roles: 403.
Data entities touched
Write: Person (redact), RoleAssignment (soft-delete), TenantMembership (close). Hard delete: AuthIdentifier. Audit: person.deleted { actor, person_id, deleted_at } — IMMUTABLE, never purged.
## Feature UM-F09 — Session Management
US-UM-014  |  View User's Active Sessions
Story ID
US-UM-014
Feature
UM-F09 — Session Management
Role
SECURITY_ADMIN | COMPANY_ADMIN
User story
As a Security Admin, I want to view all active sessions for a user, so that I can investigate suspicious activity or confirm session state during an incident.
Priority
P1
Sprint estimate
1 sprint
Depends on
US-UM-007; Security Posture (Session records)
Maps to BR
BR-UM-013
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on User Profile — Sessions tab. Target Person exists within scope.
WHEN
Actor loads GET /admin/users/{person_id}/sessions.
THEN
Response contains all Session records where person_id matches and status=ACTIVE. Each record: session_id (last 8 chars only), device_type, ip_geo_city (city-level geo-approximate, not raw IP), started_at, last_active_at, session_type (ADMIN|MEMBER|POS|IMPERSONATION). Sorted by last_active_at DESC.
Edge case 1
User has 0 active sessions: 200 with empty sessions[] array.
Edge case 2
An IMPERSONATION session is present: session returned with session_type=IMPERSONATION and a warning flag impersonation_active=true on the parent response.
Error state 1
Session service unavailable: 503 SESSION_SERVICE_UNAVAILABLE with retry-after.
Error state 2
person_id outside actor's scope: 403 FORBIDDEN.
#### Functional Requirements
Requirement
Specification
System inputs
GET /admin/users/{person_id}/sessions.
System outputs
200: { sessions: [{ session_id_masked, device_type, ip_geo_city, started_at, last_active_at, session_type }], impersonation_active: bool }
Business rule 1
Raw IP address must never be returned in API response or rendered in UI. Only city-level geo-approximate location.
Business rule 2
session_id returned as last 8 characters only (for display/reference). Full session_id never exposed in this endpoint.
State changes
Read-only.
Permissions
SECURITY_ADMIN, COMPANY_ADMIN only. All other roles: 403.
Data entities touched
Read: Session. Audit: admin.user_sessions_viewed { actor, target_person_id, session_count, timestamp }.
US-UM-015  |  Terminate User Session(s)
Story ID
US-UM-015
Feature
UM-F09 — Session Management
Role
SECURITY_ADMIN | COMPANY_ADMIN
User story
As a Security Admin, I want to terminate a specific session or all sessions for a user, so that I can force an immediate logout in response to a security incident.
Priority
P1
Sprint estimate
1 sprint
Depends on
US-UM-014; Security Posture (session revocation contract)
Maps to BR
BR-UM-013, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on Sessions tab. At least one active session exists. Actor is SECURITY_ADMIN or COMPANY_ADMIN.
WHEN
Actor submits DELETE /admin/users/{person_id}/sessions/{session_id} (single) or DELETE /admin/users/{person_id}/sessions (all).
THEN
Session.status = TERMINATED. Access token added to revocation store. Refresh token invalidated. Token revocation propagates to resource servers within 30s. Response: 200 { terminated_session_ids[], terminated_at }.
Edge case 1
Actor terminates their own session: allowed. Actor is redirected to login immediately.
Edge case 2
Target user immediately re-authenticates after termination: a new session is created. This is expected and not preventable.
Error state 1
session_id not found or already TERMINATED: 404 NOT_FOUND.
Error state 2
Token revocation service unavailable: 503 REVOCATION_SERVICE_UNAVAILABLE. Termination is blocked; no partial state.
#### Functional Requirements
Requirement
Specification
System inputs
DELETE /admin/users/{person_id}/sessions/{session_id} (single). DELETE /admin/users/{person_id}/sessions (all). Optional body: { reason?: string (max 200 chars) }.
System outputs
200: { terminated_session_ids[], terminated_at }
Business rule 1
Revocation SLA: access token revocation must propagate to all resource servers within 30 seconds. Revocation store is checked on every resource request (no bearer token trust beyond TTL without revocation check).
Business rule 2
'Terminate all' is atomic: either all sessions for person_id are terminated or none. No partial termination.
State changes
Session.status = TERMINATED. Access token added to revocation store. Refresh token record deleted/invalidated.
Permissions
SECURITY_ADMIN, COMPANY_ADMIN only.
Data entities touched
Write: Session (status update), revocation store (access token). Audit: admin.session_terminated { actor, target_person_id, session_ids[], reason?, terminated_at }.
Performance
Revocation store write P95 ≤ 200ms. Propagation to resource servers ≤ 30s.
## Feature UM-F10 — Effective Permissions Viewer
US-UM-016  |  View Effective Permissions for a User
Story ID
US-UM-016
Feature
UM-F10 — Effective Permissions Viewer
Role
SECURITY_ADMIN | COMPANY_ADMIN | LOCATION_MANAGER (scoped)
User story
As a Security Admin, I want to view the computed effective permissions for a user, so that I can verify access is correctly configured and produce evidence for an access review.
Priority
P1
Sprint estimate
1 sprint
Depends on
US-UM-007; Security Posture SP-F03 (RBAC resolution)
Maps to BR
BR-UM-012
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on User Profile — Roles tab. Target has at least one active RoleAssignment.
WHEN
Actor submits GET /admin/users/{person_id}/effective-permissions.
THEN
System computes effective access by resolving all active RoleAssignments for this person within actor's scope. Returns: per-module, per-action permission rows with: module, action, allow (bool), scope_type, scope_name, role_source (role_code that grants it), granted_by_name, granted_at. Union rule applied: if any role grants a permission, it is ALLOW. Conflicts (rare) are flagged with conflict=true.
Edge case 1
User has no active RoleAssignments: 200 with empty permissions[] array and message 'This user has no active role assignments.'
Edge case 2
LOCATION_MANAGER viewing: response limited to permissions within actor's authorised location_ids. Permissions for locations outside actor's scope are not returned.
Error state 1
Permission resolution service unavailable: 503 with retry-after.
Error state 2
person_id outside actor's scope: 403 FORBIDDEN.
#### Functional Requirements
Requirement
Specification
System inputs
GET /admin/users/{person_id}/effective-permissions.
System outputs
200: { permissions: [{ module, action, allow: bool, scope_type, scope_name, role_source, granted_by_name, granted_at, conflict?: bool }] }
Business rule 1
Computed at request time. Never cached. Every call resolves current RoleAssignment state.
Business rule 2
Union rule: if any active RoleAssignment grants a permission, the effective result is ALLOW. The most-permissive permission wins. Conflicts (one role allows, another denies) are flagged with conflict=true for human review.
Business rule 3
Scope filtering: LOCATION_MANAGER receives only permissions for scope_ids within their authorised location_ids. They cannot see company-wide or other-location permissions.
State changes
Read-only.
Permissions
SECURITY_ADMIN, COMPANY_ADMIN: all users. LOCATION_MANAGER: scoped users. AUDITOR: read-only all users. Others: 403.
Data entities touched
Read: RoleAssignment, role permission config. Audit: admin.effective_access_viewed { actor, target_person_id, timestamp } — emitted on every call.
## Feature UM-F11 — User List Export
US-UM-017  |  Export User List as CSV
Story ID
US-UM-017
Feature
UM-F11 — User List Export
Role
COMPANY_ADMIN | SECURITY_ADMIN | AUDITOR
User story
As a Company Admin, I want to export the current filtered user list as a CSV, so that I can reconcile user access with HR records and produce compliance evidence.
Priority
P2
Sprint estimate
1 sprint
Depends on
US-UM-001 (list and filter logic); Notification Engine (async delivery for large exports)
Maps to BR
BR-UM-014, BR-UM-009
#### Acceptance Criteria
Scenario
Condition
GIVEN
Actor is on User List page. Any filter combination may be applied.
WHEN
Actor submits GET /admin/users/export (Accept: text/csv) with same filter params as list.
THEN
For result sets <5,000 rows: synchronous CSV file returned. For ≥5,000 rows: 202 Accepted; async job queued; CSV delivered to actor's email via Notification Engine. CSV columns: person_id, display_name, primary_email (masked unless actor has manage_users:read_contact), status, roles (pipe-separated role_codes), primary_location, created_at, last_login_at. Filename: users_export_{company_id}_{YYYY-MM-DD}.csv.
Edge case 1
Filtered result is 0 rows: CSV returned with header row only. UI toast: 'Export contains 0 users. Check your filters.'
Edge case 2
Actor lacks manage_users:read_contact permission: primary_email column renders masked values (user@***.***)  for all rows.
Error state 1
Export generation failure: 500 EXPORT_GENERATION_FAILED with retry option.
Error state 2
Async email delivery failure: audit event records delivery_failed=true. Actor can retry export from the audit log entry.
#### Functional Requirements
Requirement
Specification
System inputs
GET /admin/users/export with same query params as US-UM-001 list. Accept header: text/csv.
System outputs
<5,000 rows: 200 with Content-Type: text/csv, Content-Disposition: attachment; filename=users_export_{company_id}_{YYYY-MM-DD}.csv. ≥5,000 rows: 202 Accepted: { job_id, estimated_delivery: 'email' }.
Business rule 1
Sync threshold: <5,000 rows → synchronous. ≥5,000 rows → async job enqueued, delivered by email. Threshold is enforced post-filter-application.
Business rule 2
PHI-safe: raw contact data (unmasked email, phone) included only if actor has explicit manage_users:read_contact permission. Default: masked.
Business rule 3
Export file is NOT stored server-side. It is streamed (sync) or emailed (async). No file storage required.
Business rule 4
Export scope matches actor's RBAC scope (identical enforcement as list endpoint).
State changes
Read-only. No data mutations.
Permissions
COMPANY_ADMIN: full export within scope. SECURITY_ADMIN: full export within scope. AUDITOR: export allowed, contact data always masked. LOCATION_MANAGER: export limited to their location scope, contact data masked. Others: 403.
Data entities touched
Read: Person, RoleAssignment, OrgHierarchy. Audit: admin.user_list_exported { actor, filter_params (no PII), row_count, sync_or_async, timestamp }. Emitted for both sync and async exports.
Performance
Sync export (<5,000 rows) P95 ≤ 5,000ms. Async export delivery SLA: ≤ 10 minutes after job creation.
# 4. API Contracts
AI INSTRUCTION: Every endpoint below must be implemented exactly as specified. Do not merge endpoints. Do not add undocumented response fields. All endpoints require a valid JWT session token. RBAC scope is enforced server-side for every request.
### List Users  —  GET /admin/users
Field
Value
Operation name
List Users
HTTP Method
GET
Path
/admin/users
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER, AUDITOR, FINANCE_ADMIN. Scope: enforced per role (see US-UM-001 business rules).
Idempotency key
Not required (read).
Request body
None. Query params: role[], status[], location_id[], created_from, created_to, page, page_size, sort_by, sort_dir.
Response 200
{ users: [...], total_count, page, page_size, filters_applied }
Response 400
INVALID_DATE_RANGE | INVALID_ROLE_CODE | INVALID_STATUS
Response 403
Insufficient role or outside scope.
Response 404
N/A
Response 409
N/A
Response 500
Database error — alert triggered.
Rate limit
300 requests per minute per tenant.
PHI-safe
Y — email masked in response by default.
### Check Email Duplicate  —  POST /admin/users/invite/check-email
Field
Value
Operation name
Check Email Duplicate
HTTP Method
POST
Path
/admin/users/invite/check-email
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER.
Idempotency key
Not required.
Request body
{ email: string (required) }
Response 200
{ duplicate: bool, existing_person_id?: UUID, existing_status?: ENUM, has_staff_role?: bool }
Response 400
INVALID_EMAIL_FORMAT
Response 403
Insufficient role.
Response 404
N/A
Response 409
N/A
Response 500
Duplicate check service failure.
Rate limit
60 requests per minute per actor.
PHI-safe
N — no PII in response beyond duplicate flag.
### Create Invite (Send)  —  POST /admin/users/invite
Field
Value
Operation name
Create Invite (Send)
HTTP Method
POST
Path
/admin/users/invite
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER. Step-up token required for privileged roles (header: X-StepUp-Token).
Idempotency key
Required (header: Idempotency-Key). Duplicate key within 24h returns original 201.
Request body
{ email, role_code, scope_type, scope_ids[], step_up_token? }
Response 200
N/A — use 201.
Response 400
INVALID_EMAIL_FORMAT | INVALID_ROLE_CODE | INVALID_SCOPE
Response 403
ROLE_ASSIGNMENT_NOT_PERMITTED | STEP_UP_REQUIRED | STEP_UP_INVALID
Response 404
N/A
Response 409
DUPLICATE_ROLE | SOLE_ADMIN_PROTECTED
Response 500
INVITE_TRANSACTION_FAILED — full rollback guaranteed.
Rate limit
30 invites per minute per actor.
PHI-safe
N — email not included in response.
### Resend Invite  —  POST /admin/users/{person_id}/invite/resend
Field
Value
Operation name
Resend Invite
HTTP Method
POST
Path
/admin/users/{person_id}/invite/resend
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER (scoped).
Idempotency key
Not required.
Request body
None.
Response 200
{ invite_id, invite_expires_at, email_sent: bool }
Response 400
N/A
Response 403
Insufficient role or outside scope.
Response 404
Person not found.
Response 409
INVITE_ALREADY_ACCEPTED
Response 500
Token creation failure.
Rate limit
3 resends per actor per person_id per hour.
PHI-safe
N
### Get User Profile  —  GET /admin/users/{person_id}
Field
Value
Operation name
Get User Profile
HTTP Method
GET
Path
/admin/users/{person_id}
Authentication
JWT required. All admin roles.
Idempotency key
Not required (read).
Request body
None.
Response 200
{ person: {...}, roles: [...], sessions_summary: {...}, audit_history: [...] }
Response 400
INVALID_PERSON_ID (malformed UUID)
Response 403
Outside scope.
Response 404
Person not found.
Response 409
N/A
Response 500
Data load failure.
Rate limit
120 per minute per actor.
PHI-safe
Y — email and phone masked by default.
### Edit User Name  —  PATCH /admin/users/{person_id}
Field
Value
Operation name
Edit User Name
HTTP Method
PATCH
Path
/admin/users/{person_id}
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER (scoped).
Idempotency key
Not required.
Request body
{ first_name?: string, last_name?: string }
Response 200
{ person_id, first_name, last_name, updated_at }
Response 400
VALIDATION_ERROR with field-level errors.
Response 403
Insufficient role.
Response 404
Person not found.
Response 409
N/A
Response 500
Write failure.
Rate limit
60 per minute per actor.
PHI-safe
N — no PII in response beyond name fields actor already has access to.
### Edit Contact Method  —  PATCH /admin/users/{person_id}/contact
Field
Value
Operation name
Edit Contact Method
HTTP Method
PATCH
Path
/admin/users/{person_id}/contact
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN only. Header: X-StepUp-Token (required, action=contact_method_change).
Idempotency key
Not required.
Request body
{ type: 'email'|'phone', value: string }
Response 200
{ person_id, contact_type, new_value_masked, verification_sent: bool }
Response 400
INVALID_EMAIL_FORMAT | INVALID_PHONE_FORMAT
Response 403
STEP_UP_REQUIRED | STEP_UP_INVALID | Insufficient role.
Response 404
Person not found.
Response 409
CONTACT_IN_USE | LAST_CONTACT_METHOD
Response 500
Write failure.
Rate limit
10 per minute per actor.
PHI-safe
Y — contact data handled; masked in response.
### Assign Role  —  POST /admin/users/{person_id}/roles
Field
Value
Operation name
Assign Role
HTTP Method
POST
Path
/admin/users/{person_id}/roles
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER. Step-up required for privileged roles (X-StepUp-Token).
Idempotency key
Required (Idempotency-Key). Prevents duplicate assignments on retry.
Request body
{ role_code, scope_type, scope_ids[], step_up_token? }
Response 200
N/A — use 201.
Response 400
INVALID_ROLE_CODE | INVALID_SCOPE
Response 403
ROLE_ASSIGNMENT_NOT_PERMITTED | STEP_UP_REQUIRED
Response 404
Person not found.
Response 409
ROLE_ALREADY_ASSIGNED | SOLE_ADMIN_PROTECTED
Response 500
Write failure.
Rate limit
60 per minute per actor.
PHI-safe
N
### Revoke Role  —  DELETE /admin/users/{person_id}/roles/{role_assignment_id}
Field
Value
Operation name
Revoke Role
HTTP Method
DELETE
Path
/admin/users/{person_id}/roles/{role_assignment_id}
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER (scoped).
Idempotency key
Idempotent by nature (DELETE). Already-revoked returns 404.
Request body
None.
Response 200
{ role_assignment_id, status: 'REVOKED', revoked_at }
Response 400
N/A
Response 403
ROLE_REVOCATION_NOT_PERMITTED
Response 404
role_assignment_id not found or already REVOKED.
Response 409
SOLE_ADMIN_PROTECTED
Response 500
Write failure.
Rate limit
60 per minute per actor.
PHI-safe
N
### Deactivate User  —  POST /admin/users/{person_id}/deactivate
Field
Value
Operation name
Deactivate User
HTTP Method
POST
Path
/admin/users/{person_id}/deactivate
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER. Header: X-StepUp-Token (required, action=user_deactivate).
Idempotency key
Required (Idempotency-Key).
Request body
{ reason_code: ENUM, reason_text?: string }
Response 200
{ person_id, status: 'INACTIVE', deactivated_at, cancelled_membership_ids[], cancelled_booking_ids[], out_of_scope_bookings_skipped: bool }
Response 400
INVALID_REASON_CODE
Response 403
STEP_UP_REQUIRED | STEP_UP_INVALID | Insufficient role.
Response 404
Person not found.
Response 409
SOLE_ADMIN_PROTECTED | ALREADY_INACTIVE
Response 500
DEACTIVATION_TRANSACTION_FAILED — full rollback guaranteed.
Rate limit
30 per minute per actor.
PHI-safe
N — no PII in response.
### Delete User  —  DELETE /admin/users/{person_id}
Field
Value
Operation name
Delete User
HTTP Method
DELETE
Path
/admin/users/{person_id}
Authentication
JWT required. Roles: SECURITY_ADMIN, COMPANY_ADMIN only. Header: X-StepUp-Token (required, action=user_delete).
Idempotency key
Not applicable — person.status=DELETED makes retry a 409.
Request body
{ confirmation_email: string (must match Person.primary_email, case-insensitive) }
Response 200
{ person_id, status: 'DELETED', deleted_at }
Response 400
CONFIRMATION_EMAIL_MISMATCH
Response 403
STEP_UP_REQUIRED | Insufficient role.
Response 404
Person not found.
Response 409
DEACTIVATION_REQUIRED | OPEN_FINANCIAL_OBLIGATIONS | COMPLIANCE_HOLD
Response 500
DELETE_TRANSACTION_FAILED.
Rate limit
5 per minute per actor.
PHI-safe
N — all PII is being removed, not returned.
### List Active Sessions  —  GET /admin/users/{person_id}/sessions
Field
Value
Operation name
List Active Sessions
HTTP Method
GET
Path
/admin/users/{person_id}/sessions
Authentication
JWT required. Roles: SECURITY_ADMIN, COMPANY_ADMIN only.
Idempotency key
Not required (read).
Request body
None.
Response 200
{ sessions: [{ session_id_masked, device_type, ip_geo_city, started_at, last_active_at, session_type }], impersonation_active: bool }
Response 400
INVALID_PERSON_ID
Response 403
Insufficient role.
Response 404
Person not found.
Response 409
N/A
Response 500
Session service failure.
Rate limit
60 per minute per actor.
PHI-safe
N — raw IP never returned; city-level geo only.
### Terminate Session(s)  —  DELETE /admin/users/{person_id}/sessions/{session_id} OR /admin/users/{person_id}/sessions
Field
Value
Operation name
Terminate Session(s)
HTTP Method
DELETE
Path
/admin/users/{person_id}/sessions/{session_id} OR /admin/users/{person_id}/sessions
Authentication
JWT required. Roles: SECURITY_ADMIN, COMPANY_ADMIN only.
Idempotency key
Idempotent — already-terminated session returns 404.
Request body
Optional: { reason?: string }
Response 200
{ terminated_session_ids[], terminated_at }
Response 400
N/A
Response 403
Insufficient role.
Response 404
Session not found or already terminated.
Response 409
N/A
Response 500
REVOCATION_SERVICE_UNAVAILABLE — no partial state.
Rate limit
30 per minute per actor.
PHI-safe
N
### View Effective Permissions  —  GET /admin/users/{person_id}/effective-permissions
Field
Value
Operation name
View Effective Permissions
HTTP Method
GET
Path
/admin/users/{person_id}/effective-permissions
Authentication
JWT required. Roles: SECURITY_ADMIN, COMPANY_ADMIN, LOCATION_MANAGER (scoped), AUDITOR (read-only).
Idempotency key
Not required (read).
Request body
None.
Response 200
{ permissions: [{ module, action, allow: bool, scope_type, scope_name, role_source, granted_by_name, granted_at, conflict?: bool }] }
Response 400
INVALID_PERSON_ID
Response 403
Insufficient role or outside scope.
Response 404
Person not found.
Response 409
N/A
Response 500
Permission resolution failure.
Rate limit
60 per minute per actor.
PHI-safe
N
### Export User List  —  GET /admin/users/export
Field
Value
Operation name
Export User List
HTTP Method
GET
Path
/admin/users/export
Authentication
JWT required. Roles: COMPANY_ADMIN, SECURITY_ADMIN, AUDITOR, LOCATION_MANAGER (scoped). Header: Accept: text/csv.
Idempotency key
Not required.
Request body
None. Query params: same as List Users.
Response 200
text/csv stream (<5,000 rows). Content-Disposition: attachment.
Response 400
Same as List Users.
Response 403
Insufficient role.
Response 404
N/A
Response 409
N/A
Response 500
EXPORT_GENERATION_FAILED.
Rate limit
10 export requests per actor per hour.
PHI-safe
Y — contact data masked unless actor has manage_users:read_contact.
# 5. Non-Functional Requirements
Dimension
Requirement
Performance
GET /admin/users (list): P95 ≤ 2,000ms for up to 10,000 users. GET /admin/users/{id} (profile): P95 ≤ 500ms. Search (/admin/users?q=): P95 ≤ 500ms index, ≤ 2,000ms fallback. Write endpoints (invite, deactivate): P95 ≤ 3,000ms. Token revocation: P95 ≤ 200ms write; ≤ 30s propagation.
Security
All scope checks enforced server-side — client filtering is supplementary only. API returns 403 on scope violation regardless of UI state. Step-up tokens: single-use, 5-minute TTL, action-bound. Reuse of step-up token: 403 STEP_UP_INVALID. All write endpoints require CSRF protection. All endpoints require TLS 1.2+.
PHI Safety
Audit event payloads must not contain raw PII values (email, phone, name values). Only field_names_changed and person_id references. Raw IP addresses never stored in audit events (hashed) and never returned in API responses. Session IDs truncated to last 8 characters in UI.
Idempotency
Invite (POST /admin/users/invite) and Role Assign (POST /admin/users/{id}/roles): Idempotency-Key header required. Duplicate key within 24h returns the original 201 response without re-executing. All DELETE endpoints are naturally idempotent.
Availability
User Management module: 99.9% monthly uptime SLA. Invite email delivery: best-effort with Notification Engine retry queue; not on the synchronous critical path (invite record is created regardless of email delivery). Session revocation: must not be a single point of failure; degrade gracefully if unavailable (block termination, do not silently succeed).
Audit Coverage
Required audit event types: admin.user_list_viewed, admin.user_profile_viewed, person.profile_updated, person.contact_method_changed, admin.role_assigned, admin.role_revoked, invite.sent, invite.resent, invite.accepted, invite.expired, person.deactivated, person.deleted, admin.session_terminated, admin.effective_access_viewed, admin.user_list_exported, admin.user_sessions_viewed. All events: append-only, minimum 3-year retention. person.deleted: IMMUTABLE, never purged.
Compliance
GDPR right-to-erasure: satisfied by data redaction (Person record retained as skeleton; PII fields zeroed). Audit skeleton is exempt from erasure as it is required for legal compliance. RoleAssignment and TenantMembership retained 7 years. Compliance holds on a person_id block deletion until hold is lifted by the Compliance module.
Accessibility
All user management pages must pass WCAG 2.1 AA. Keyboard navigation for all interactive elements. Screen reader support for status badges, role chips, and error messages. Colour-blind accessible: status indicators must use text labels in addition to colour.
Logging
Structured logs for all API requests: request_id, actor_person_id (hashed), endpoint, http_method, http_status_code, duration_ms, company_id, scope_type. No raw PII in logs. Logs retained minimum 90 days.
# 6. Flat Story Backlog
AI INSTRUCTION: Implement stories in the order listed below. Each story has explicit dependencies. Do not begin a story until all listed dependencies are complete and passing acceptance criteria.
Story ID
Title
Role(s)
Pri
Depends On
Sprint
US-UM-001
View Paginated User List
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER
P0
Primitives only
1
US-UM-002
Filter User List
COMPANY_ADMIN, SECURITY_ADMIN
P0
US-UM-001
1
US-UM-003
Search Users
Any admin role
P0
US-UM-001, search index
1
US-UM-004
Invite — Email Entry & Duplicate Check
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER
P0
Primitives only
2
US-UM-005
Invite — Assign Role and Scope
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER
P0
US-UM-004, step-up infra, notification engine
2
US-UM-007
View User Profile
COMPANY_ADMIN, SECURITY_ADMIN, AUDITOR
P0
US-UM-001
2
US-UM-010
Assign Role to User
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER
P0
US-UM-007, step-up infra
2
US-UM-011
Revoke Role from User
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER
P0
US-UM-010
2
US-UM-012
Deactivate User Account
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER
P0
US-UM-007, step-up infra, membership + booking cascade
3
US-UM-008
Edit User Name
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER
P1
US-UM-007
3
US-UM-014
View User's Active Sessions
SECURITY_ADMIN, COMPANY_ADMIN
P1
US-UM-007, session records
3
US-UM-015
Terminate User Session(s)
SECURITY_ADMIN, COMPANY_ADMIN
P1
US-UM-014, revocation service
3
US-UM-016
View Effective Permissions
SECURITY_ADMIN, COMPANY_ADMIN, LOCATION_MANAGER
P1
US-UM-007, RBAC resolver
3
US-UM-006
Resend Invite
COMPANY_ADMIN, SECURITY_ADMIN, LOCATION_MANAGER
P1
US-UM-005
4
US-UM-009
Edit Contact Method (Step-Up)
COMPANY_ADMIN, SECURITY_ADMIN
P1
US-UM-007, step-up infra
4
US-UM-013
Permanently Delete User
SECURITY_ADMIN, COMPANY_ADMIN
P1
US-UM-012, compliance holds check, step-up
4
US-UM-017
Export User List as CSV
COMPANY_ADMIN, SECURITY_ADMIN, AUDITOR
P2
US-UM-001, notification engine (async)
5
# 7. Quality Control Checklist
AI INSTRUCTION: Before marking any story as 'implementation complete', verify every row below for that story. A story fails QC if any row is unchecked.
Check
Status
Every business requirement maps to at least one user story
✓ Verified — all 14 BR-UM requirements mapped in backlog table
Every user story has acceptance criteria in Given/When/Then format
✓ Verified — all 17 stories have full GIVEN/WHEN/THEN + edge cases + error states
No story bundles multiple workflows or permissions
✓ Verified — each story = one CRUD operation or state change
No story requires more than one sprint
✓ Verified — all stories estimated at 1 sprint
All edge cases defined with expected system behaviour
✓ Verified — minimum 2 edge cases per story
All error states defined with HTTP status code and error code
✓ Verified — all error states include HTTP status + error_code constant
Permissions explicitly stated for every story
✓ Verified — permissions section in every story's functional requirements
All state changes listed with domain events emitted
✓ Verified — state changes and audit events specified per story
No ambiguous language (no 'fast', 'easy', 'user-friendly')
✓ Verified — all performance statements use measurable thresholds (P95, ms)
Dependencies on primitives are referenced, not redefined
✓ Verified — Section 0 lists all primitives; no primitive schema redefined in this document
API contracts include idempotency key requirements
✓ Verified — idempotency specified per endpoint in Section 4
PHI-safe posture confirmed for all endpoints and audit payloads
✓ Verified — PHI-safe field specified per API contract; audit payloads exclude raw PII
Sole-admin guard verified for deactivate and role-revoke paths
✓ Verified — US-UM-011 and US-UM-012 both include sole-admin guard business rules
Step-up token contract references Security Posture primitive
✓ Verified — Section 0 dependency on Security_Posture §SP-F02
person.deleted audit event marked IMMUTABLE and never-purge
✓ Verified — US-UM-013 business rule 3 and data entities section
Export endpoint enforces PHI-safe masking by default
✓ Verified — US-UM-017 business rule 2 and API contract
Document End — Admin User Management FRD v1.0 | EPIC-UM | Fitness & Recreation Platform | March 2026
