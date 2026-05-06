> **Note**
> This file is a plain-text extraction of `Member_Profile_Extended_Data_FRD.docx`
> (in this same folder). The `.docx` is the authoritative source — this
> markdown copy exists so the FRD content is greppable, diffable, and
> linkable from design.md files. Regenerate this file (don't hand-edit)
> if the `.docx` is updated.

---

FITNESS & RECREATION PLATFORM
Member Profile — Extended Data
Functional Requirements Document (FRD)
Version 1.0  |  May 2026  |  Classification: Internal — Confidential
Document Owner
Product Management
Status
Draft
Companion Doc
Member_Profile_Extended_Data_BRD_PRD.docx (BRD + PRD)
Audience
Engineering, QA, Claude Code
Scope
User stories, acceptance criteria, functional requirements, and data models for all 46 user stories in the Member Profile Extended Data module (MPE-F01 through MPE-F15).
Dependencies
Unified User Model, Admin Console, Member Portal, Custom Fields Engine, Notification Engine, Check-in & Gate Access, B2B Scheduling, Financial Operations Engine, Security Posture (RBAC/ABAC), Org Hierarchy
Classification
Internal — Confidential
# FRD READING GUIDE
Each user story in this document follows the same structure:
- Story header table — ID, feature, role, story text, priority, dependencies, BR mapping.
- Acceptance criteria table — GIVEN / WHEN / THEN, edge cases, error states, permissions, data notes.
- Functional requirements table — system inputs, outputs, validation rules, business rules, state changes, API shape, permissions enforcement.
- Data entities section — per feature, covering all entities, fields, types, and audit requirements.
Stories are AI-build ready. The Functional Requirements table for each story is the authoritative specification for Claude Code.
# Feature MPE-F01: Emergency Contact
Structured emergency contact record on the member Person record. One emergency contact per member in Phase 1. All fields PHI-adjacent — PHI-safe audit logging enforced.
## Data Entities — MPE-F01
Field
Type
Required
Notes
emergency_contact_id
UUID PK
Y
Auto-generated
person_id
UUID FK
Y
References Person. Unique constraint — one per person.
name
VARCHAR(200)
Y
Full name of emergency contact
relationship
VARCHAR(100)
Y
Relationship to member (e.g. Spouse, Parent, Friend)
phone_home
VARCHAR(30)
N
E.164 format. At least one phone required on save.
phone_work
VARCHAR(30)
N
E.164 format
phone_mobile
VARCHAR(30)
N
E.164 format
created_at
TIMESTAMP
Y
System-set on insert
updated_at
TIMESTAMP
Y
System-set on update
created_by_person_id
UUID FK
Y
Actor who created the record
updated_by_person_id
UUID FK
Y
Actor who last updated the record
company_id
UUID FK
Y
RLS anchor — tenant isolation
Audit event: person.emergency_contact_created / person.emergency_contact_updated — payload: { field_names_changed[], actor_person_id, target_person_id, timestamp }. PHI-safe: old/new values NOT in payload.
## US-MPE-001: Configure Emergency Contact Fields
Story ID
US-MPE-001
Feature
MPE-F01
Role
Company Admin
User Story
As a Company Admin, I want to configure which emergency contact fields are required, optional, or hidden for my tenant, so that data collection matches my operational policy.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-001
Scenario
Condition
GIVEN
Company Admin is authenticated and navigates to Admin Console > Settings > Member Profile > Emergency Contact.
WHEN
Admin sets each field (name, relationship, phone_home, phone_work, phone_mobile) to Required / Optional / Hidden and saves.
THEN
System saves the field visibility configuration per tenant. Configuration is applied at the point of emergency contact data entry by staff and member self-serve. Audit event: tenant.profile_config_updated emitted.
Edge Case 1
Admin sets all phone fields to Hidden: system blocks save with validation error 'At least one phone field must be displayed.'
Edge Case 2
Admin sets name to Hidden: system blocks save with validation error 'Name is required and cannot be hidden.'
Error State 1
Save fails: prior config retained, error toast shown.
Permissions
Company Admin only. All other roles: read configuration only, no write access.
Data Notes
Writes: TenantProfileConfig { entity: 'emergency_contact', field_visibility_json }. Audit: tenant.profile_config_updated.
### Functional Requirements — US-MPE-001
System Inputs
PUT /admin/tenants/{company_id}/profile-config/emergency-contact — body: { name: Required|Optional|Hidden, relationship: Required|Optional|Hidden, phone_home: Required|Optional|Hidden, phone_work: Required|Optional|Hidden, phone_mobile: Required|Optional|Hidden }
System Outputs
200: { company_id, entity: 'emergency_contact', field_visibility, updated_at }
Validation Rules
name: cannot be Hidden. At least one of phone_home, phone_work, phone_mobile must be Required or Optional (not all Hidden). relationship: cannot be Hidden.
Business Rules
Configuration applies to all staff-side and member-side emergency contact entry flows for this tenant.
State Changes
TenantProfileConfig record upserted. Audit event emitted.
Permissions
COMPANY_ADMIN: write. All other roles: 403.
Data Touched
Write: TenantProfileConfig. Audit: tenant.profile_config_updated { entity, field_visibility, actor_person_id, company_id, timestamp }.
## US-MPE-002: View Emergency Contact
Story ID
US-MPE-002
Feature
MPE-F01
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view the emergency contact for a member, so that I can contact the right person in case of an incident.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-003 (emergency contact must exist to view)
Maps to BR
BR-MPE-001
Scenario
Condition
GIVEN
Staff is authenticated. Member record is open in Admin Console.
WHEN
Staff navigates to the Emergency Contact section of the member profile.
THEN
System displays: name, relationship, phone_home, phone_work, phone_mobile. Only fields configured as Required or Optional are shown. Fields with no value display 'Not provided'. Audit event: person.emergency_contact_viewed emitted.
Edge Case 1
Member has no emergency contact record: section displays 'No emergency contact on file' with an Add button.
Edge Case 2
Company Admin has hidden phone_work: that field is not rendered.
Error State 1
Emergency contact section fails to load: show inline error with retry. Do not block the rest of the member profile.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin, Security Admin, Auditor (read-only). Member: cannot view via admin console. Instructor: read-only.
Data Notes
Reads: EmergencyContact record for person_id. Audit: person.emergency_contact_viewed { actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-002
System Inputs
GET /admin/members/{person_id}/emergency-contact
System Outputs
200: { emergency_contact_id, name, relationship, phone_home, phone_work, phone_mobile, updated_at, updated_by_display_name } | 404 if no record exists.
Validation Rules
person_id must be within actor's RBAC scope.
Business Rules
Field visibility governed by TenantProfileConfig. Fields set to Hidden are omitted from response.
State Changes
None. Read-only.
Permissions
FRONT_DESK, LOCATION_MANAGER, COMPANY_ADMIN, SECURITY_ADMIN, AUDITOR: read. INSTRUCTOR: read. MEMBER: 403 on this endpoint (member portal uses separate endpoint).
Data Touched
Read: EmergencyContact, TenantProfileConfig. Audit: person.emergency_contact_viewed.
## US-MPE-003: Add Emergency Contact
Story ID
US-MPE-003
Feature
MPE-F01
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to add an emergency contact for a member who does not have one, so that we have safety information on file.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-001 (config), US-MPE-002 (view)
Maps to BR
BR-MPE-001, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Emergency Contact section. Member has no existing emergency contact record.
WHEN
Staff enters name, relationship, and at least one phone number and saves.
THEN
System validates all required fields per TenantProfileConfig. EmergencyContact record is created. Confirmation shown. Audit event: person.emergency_contact_created emitted.
Edge Case 1
Staff saves with no phone number provided: validation error 'At least one phone number is required.'
Edge Case 2
Member already has an emergency contact: system rejects creation with 409 CONFLICT 'An emergency contact already exists. Use Edit to update it.'
Edge Case 3
Phone number format invalid: inline validation error with format hint.
Error State 1
Save fails server-side: no record created, error toast shown, form state preserved for retry.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin. Auditor: DENY. Instructor: DENY.
Data Notes
Write: EmergencyContact (new record). Audit: person.emergency_contact_created { field_names_present[], actor_person_id, target_person_id, timestamp }. PHI-safe: phone values NOT in payload.
### Functional Requirements — US-MPE-003
System Inputs
POST /admin/members/{person_id}/emergency-contact — body: { name: string, relationship: string, phone_home?: string, phone_work?: string, phone_mobile?: string }
System Outputs
201: { emergency_contact_id, name, relationship, phone_home, phone_work, phone_mobile, created_at } | 409 if record already exists.
Validation Rules
name: required, max 200 chars. relationship: required, max 100 chars. At least one phone field must be non-empty. Phone fields: E.164 format validated. person_id must be within actor's RBAC scope.
Business Rules
Only one EmergencyContact record permitted per person_id. Uniqueness enforced at DB level with unique constraint.
State Changes
EmergencyContact record inserted. Audit event emitted.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER (scoped), COMPANY_ADMIN: write. AUDITOR, INSTRUCTOR, MEMBER: 403.
Data Touched
Write: EmergencyContact. Audit: person.emergency_contact_created { field_names_present, actor_person_id, target_person_id, timestamp }.
## US-MPE-004: Edit Emergency Contact
Story ID
US-MPE-004
Feature
MPE-F01
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to edit an existing emergency contact for a member, so that I can keep the information current when a member reports a change.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-003
Maps to BR
BR-MPE-001, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Emergency Contact section. Member has an existing emergency contact record.
WHEN
Staff edits one or more fields and saves.
THEN
System validates changed fields. EmergencyContact record is updated. Audit event: person.emergency_contact_updated emitted with list of field names changed (not values).
Edge Case 1
Staff clears all phone numbers: validation error 'At least one phone number is required.'
Edge Case 2
Concurrent edit by another staff member: last-write-wins. No merge conflict detection required in Phase 1.
Error State 1
Save fails: prior values retained in database, error toast shown.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin. Auditor: DENY. Instructor: DENY.
Data Notes
Write: EmergencyContact (update). Audit: person.emergency_contact_updated { field_names_changed[], actor_person_id, target_person_id, timestamp }. PHI-safe: old/new values NOT in payload.
### Functional Requirements — US-MPE-004
System Inputs
PATCH /admin/members/{person_id}/emergency-contact — body: { name?: string, relationship?: string, phone_home?: string, phone_work?: string, phone_mobile?: string }. At least one field required.
System Outputs
200: { emergency_contact_id, name, relationship, phone_home, phone_work, phone_mobile, updated_at } | 404 if no record exists.
Validation Rules
Same as US-MPE-003. After applying patch, at least one phone field must remain non-empty.
Business Rules
Partial update: only fields present in request body are updated.
State Changes
EmergencyContact record updated. updated_at and updated_by_person_id refreshed. Audit event emitted.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write. All others: 403.
Data Touched
Write: EmergencyContact. Audit: person.emergency_contact_updated { field_names_changed[], actor_person_id, target_person_id, timestamp }.
## US-MPE-005: Member Self-Serve View and Edit Emergency Contact
Story ID
US-MPE-005
Feature
MPE-F01
Role
Member
User Story
As a member, I want to view and update my own emergency contact from the member portal, so that I can keep my safety information current without visiting the front desk.
Priority
P1
Sprint Estimate
1 sprint
Depends On
US-MPE-003
Maps to BR
BR-MPE-001, BR-MPE-017
Scenario
Condition
GIVEN
Member is authenticated in the member portal. Member is viewing their profile.
WHEN
Member navigates to the Emergency Contact section, makes changes, and saves.
THEN
System validates fields per TenantProfileConfig. EmergencyContact record created or updated. Confirmation shown. Audit event emitted with channel = MEMBER_SELF_SERVE.
Edge Case 1
Member has no existing emergency contact: Add form shown.
Edge Case 2
Member clears all phone fields: validation error 'At least one phone number is required.'
Error State 1
Save fails: prior values retained, error message shown with retry.
Permissions
Authenticated member (own record only). Guardian (dependent record where delegated). Staff cannot edit via member portal surface.
Data Notes
Write: EmergencyContact (create or update). Audit: person.emergency_contact_updated { channel: MEMBER_SELF_SERVE, field_names_changed[], actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-005
System Inputs
GET /portal/me/emergency-contact (view) | PUT /portal/me/emergency-contact (create or update) — body: { name, relationship, phone_home?, phone_work?, phone_mobile? }
System Outputs
200 (GET): emergency contact object or empty state. 200 (PUT): updated emergency contact object.
Validation Rules
Same as US-MPE-003. person_id derived from authenticated session — member cannot target another person's record.
Business Rules
PUT upserts: creates if no record exists, updates if one exists. One record per person enforced.
State Changes
EmergencyContact created or updated. Audit event with channel = MEMBER_SELF_SERVE.
Permissions
Authenticated member (own record). Guardian (delegated dependent). All staff roles: 403 on /portal/ endpoints.
Data Touched
Write: EmergencyContact. Audit: person.emergency_contact_updated { channel: MEMBER_SELF_SERVE }.
# Feature MPE-F02: Client Conditions
Structured list of flagged conditions per member. Condition types are operator-configured. Each condition has severity (Informational/Warning/Alert), active state, optional note, and optional expiry. Surfaced at check-in and on class roster.
## Data Entities — MPE-F02
Field
Type
Required
Notes
condition_type_id
UUID PK
Y
ConditionType lookup — company-scoped
company_id
UUID FK
Y
RLS anchor
code
VARCHAR(50)
Y
Internal code (e.g. ALLERGY_NUTS)
label
VARCHAR(200)
Y
Display label
severity
ENUM
Y
INFORMATIONAL | WARNING | ALERT
is_active
BOOLEAN
Y
Soft-delete for type — false = archived
Field
Type
Required
Notes
member_condition_id
UUID PK
Y
Auto-generated
person_id
UUID FK
Y
Member this condition is applied to
condition_type_id
UUID FK
Y
References ConditionType
is_active
BOOLEAN
Y
true = currently flagged; false = deactivated
note
TEXT
N
Optional free-text context
expiry_date
DATE
N
If set: system auto-deactivates on this date
applied_at
TIMESTAMP
Y
System-set on insert
applied_by_person_id
UUID FK
Y
Staff who applied the condition
deactivated_at
TIMESTAMP
N
Set when is_active set to false
deactivated_by_person_id
UUID FK
N
Staff who deactivated
company_id
UUID FK
Y
RLS anchor
Audit: person.condition_added / person.condition_deactivated { condition_type_code, severity, actor_person_id, target_person_id, timestamp }.
## US-MPE-006: Configure Condition Types
Story ID
US-MPE-006
Feature
MPE-F02
Role
Company Admin
User Story
As a Company Admin, I want to configure the list of condition types available for my tenant (codes, labels, severity), so that staff can flag only the conditions relevant to my operation.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-002
Scenario
Condition
GIVEN
Company Admin is in Admin Console > Settings > Condition Types.
WHEN
Admin creates, edits, or archives a condition type.
THEN
ConditionType record is created/updated/archived. Change is immediately reflected in the condition selection UI for staff. Audit event: tenant.condition_type_updated emitted.
Edge Case 1
Admin archives a condition type that is currently active on one or more members: archive is permitted. Existing MemberCondition records retain their condition_type_id reference. The condition type no longer appears as an option for new flags but existing flags remain visible.
Edge Case 2
Admin sets severity to ALERT: the condition will display prominently at check-in and on class roster.
Error State 1
Save fails: prior state retained, error toast shown.
Permissions
Company Admin only.
Data Notes
Write: ConditionType. Audit: tenant.condition_type_updated { code, label, severity, action: created|updated|archived, actor_person_id, company_id, timestamp }.
### Functional Requirements — US-MPE-006
System Inputs
POST /admin/condition-types — body: { code, label, severity } | PATCH /admin/condition-types/{id} | DELETE /admin/condition-types/{id} (soft-archive)
System Outputs
201/200: ConditionType object | 409 if code already exists for company.
Validation Rules
code: unique per company_id, max 50 chars, alphanumeric + underscore. label: required, max 200 chars. severity: must be INFORMATIONAL | WARNING | ALERT.
Business Rules
DELETE soft-archives (sets is_active=false). Hard delete not permitted. Archived types cannot be applied to new members but existing records are retained.
State Changes
ConditionType created / updated / archived.
Permissions
COMPANY_ADMIN only. All others: 403.
Data Touched
Write: ConditionType. Audit: tenant.condition_type_updated.
## US-MPE-007: View Member Conditions
Story ID
US-MPE-007
Feature
MPE-F02
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view all active conditions flagged against a member, so that I can assess relevant safety context before providing service.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-002
Scenario
Condition
GIVEN
Staff is on the member profile in Admin Console.
WHEN
Staff opens the Conditions section.
THEN
System displays all active MemberCondition records for this member: condition label, severity badge, note (if any), applied date, expiry date (if set). ALERT severity conditions are displayed first and visually prominent. Inactive conditions shown in a collapsed 'Historical Conditions' section.
Edge Case 1
Member has no conditions: section displays 'No conditions on file' with an Add button.
Edge Case 2
A condition has expired (expiry_date <= today): system has auto-deactivated it; it appears in historical section.
Error State 1
Conditions section fails to load: inline error with retry.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin, Security Admin, Auditor. Instructor: read-only. Member: cannot view via admin console.
Data Notes
Read: MemberCondition (is_active=true) + ConditionType JOIN. Audit: person.conditions_viewed { actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-007
System Inputs
GET /admin/members/{person_id}/conditions?active=true|false|all
System Outputs
200: { active: MemberCondition[], historical: MemberCondition[] }. Each item includes condition_type: { code, label, severity }.
Business Rules
Default query: active=true. Conditions with expiry_date < today and is_active=true are auto-deactivated by a nightly job before this read.
Permissions
FRONT_DESK, LOCATION_MANAGER, COMPANY_ADMIN, SECURITY_ADMIN, AUDITOR, INSTRUCTOR: read. MEMBER: 403.
Data Touched
Read: MemberCondition, ConditionType. Audit: person.conditions_viewed.
## US-MPE-008: Add Condition to Member
Story ID
US-MPE-008
Feature
MPE-F02
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to add a condition flag to a member's record, so that instructors and other staff are aware of the member's relevant health or safety context.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-006, US-MPE-007
Maps to BR
BR-MPE-002, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Conditions section of the member profile.
WHEN
Staff selects a condition type, optionally adds a note and expiry date, and saves.
THEN
MemberCondition record created with is_active=true. Condition appears immediately in the active conditions list. Audit event emitted.
Edge Case 1
Condition type already active on this member: system blocks with 409 'This condition is already active for this member.'
Edge Case 2
Staff selects ALERT severity condition: system prompts 'This is an ALERT-level condition. It will be displayed prominently at check-in and on class rosters. Confirm?' — requires affirmative confirmation before save.
Error State 1
Save fails: no record created, error toast, form state preserved.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin. Auditor: DENY. Instructor: DENY.
Data Notes
Write: MemberCondition (new). Audit: person.condition_added { condition_type_code, severity, actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-008
System Inputs
POST /admin/members/{person_id}/conditions — body: { condition_type_id, note?: string, expiry_date?: date }
System Outputs
201: MemberCondition object including condition_type { code, label, severity } | 409 if condition already active.
Validation Rules
condition_type_id: must exist and be active (is_active=true) for this company. note: max 1000 chars. expiry_date: must be in the future if provided.
Business Rules
One active MemberCondition per person_id + condition_type_id. Unique constraint enforced at DB level on (person_id, condition_type_id, is_active=true).
State Changes
MemberCondition inserted with is_active=true.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write. All others: 403.
Data Touched
Write: MemberCondition. Audit: person.condition_added { condition_type_code, severity, actor_person_id, target_person_id, timestamp }.
## US-MPE-009: Deactivate Condition
Story ID
US-MPE-009
Feature
MPE-F02
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to deactivate a condition flag on a member's record, so that outdated conditions do not cause unnecessary alerts.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-008
Maps to BR
BR-MPE-002, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Conditions section. Member has an active condition.
WHEN
Staff selects 'Deactivate' on a condition and confirms.
THEN
MemberCondition is_active set to false, deactivated_at and deactivated_by_person_id set. Condition moves to historical section. Audit event emitted.
Edge Case 1
Condition already inactive: Deactivate action is not shown.
Error State 1
Update fails: condition remains active, error toast shown.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin. Auditor: DENY.
Data Notes
Write: MemberCondition (update is_active=false). Audit: person.condition_deactivated { condition_type_code, actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-009
System Inputs
PATCH /admin/members/{person_id}/conditions/{member_condition_id} — body: { is_active: false }
System Outputs
200: updated MemberCondition object | 404 if condition not found | 409 if already inactive.
Business Rules
Soft-deactivate only. MemberCondition record is never hard-deleted.
State Changes
MemberCondition.is_active = false, deactivated_at = now(), deactivated_by_person_id = actor.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write. All others: 403.
Data Touched
Write: MemberCondition. Audit: person.condition_deactivated.
## US-MPE-010: View Conditions on Class Roster
Story ID
US-MPE-010
Feature
MPE-F02
Role
Instructor
User Story
As an Instructor, I want to see active conditions for members on my class roster, so that I can adjust the session appropriately for their safety needs.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-008, Epic D Scheduling (class roster)
Maps to BR
BR-MPE-002
Scenario
Condition
GIVEN
Instructor is viewing the roster for an upcoming or in-progress class session.
WHEN
Instructor views a member's row on the roster.
THEN
System displays condition severity badges inline on each roster row. ALERT conditions shown with a red badge. WARNING with amber. INFORMATIONAL with blue. Clicking a badge shows the condition label and note. Conditions are read-only on this surface.
Edge Case 1
Member has no conditions: no badge shown. Member has multiple conditions: all severity badges shown, ALERT first.
Error State 1
Condition data fails to load for a member: show empty badge state; do not block roster display.
Permissions
Instructor (own sessions only). Location Manager: all sessions at location. Company Admin: all sessions.
Data Notes
Read: MemberCondition (is_active=true), ConditionType. No writes. No separate audit event — roster view event is covered by Epic D audit.
### Functional Requirements — US-MPE-010
System Inputs
GET /admin/sessions/{session_id}/roster — existing Epic D endpoint, extended to include conditions.
System Outputs
Each roster member object extended with: conditions: [{ condition_type_code, label, severity, note }]. Only is_active=true conditions included.
Business Rules
Conditions are appended to the existing roster response. If the conditions lookup fails, the roster still returns without conditions (graceful degradation).
Permissions
INSTRUCTOR (own sessions), LOCATION_MANAGER, COMPANY_ADMIN: read. FRONT_DESK: read. MEMBER: 403.
Data Touched
Read: MemberCondition, ConditionType. No writes.
## US-MPE-011: View Conditions at Check-In Screen
Story ID
US-MPE-011
Feature
MPE-F02
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to see a member's ALERT-level conditions displayed at the check-in screen, so that I am immediately aware of critical health or safety flags when they present at the gate.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-008, Epic H Check-in & Gate Access
Maps to BR
BR-MPE-002
Scenario
Condition
GIVEN
A member has been identified at the check-in point (QR scan, fob, or manual lookup).
WHEN
The check-in decision engine produces a GRANT or GRANT_WITH_ALERT for the member.
THEN
If the member has any ALERT-level active conditions, the check-in screen displays an alert banner listing the condition labels. WARNING and INFORMATIONAL conditions are available via a 'View Conditions' link but do not generate a prominent banner. Conditions are read-only on this surface.
Edge Case 1
Member has no conditions: no banner shown. Normal check-in flow continues.
Edge Case 2
Member has only INFORMATIONAL conditions: no banner; 'View Conditions' link shown.
Edge Case 3
Condition data lookup fails: log warning; proceed with check-in; do not block gate decision. Surface failure indicator to staff.
Error State 1
Conditions service unavailable: check-in proceeds; staff sees 'Conditions unavailable — verify manually' indicator.
Permissions
Front Desk Staff (location-scoped), Location Manager.
Data Notes
Read: MemberCondition (is_active=true, severity=ALERT), ConditionType. No writes. Condition display is part of the CheckInEvent context.
### Functional Requirements — US-MPE-011
System Inputs
GET /admin/members/{person_id}/conditions?active=true&severity=ALERT — called by check-in UI after gate decision.
System Outputs
200: { alert_conditions: [{ label, note }] }. Empty array if none.
Business Rules
This call must not block the gate decision. It is made async after GRANT/GRANT_WITH_ALERT is issued. Response must arrive within 300ms at p95 or a timeout state is shown.
Performance
p95 response time: 300ms. On timeout: check-in UI shows 'Conditions unavailable' and proceeds.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER: read. All others: 403.
Data Touched
Read: MemberCondition, ConditionType. No writes.
# Feature MPE-F03: Proficiencies
Proficiency records per member. Operator-configured proficiency types. Used as booking eligibility gate when OfferingVersion has required_proficiency_type_id set. Expired proficiencies treated as not held.
## Data Entities — MPE-F03
Field
Type
Required
Notes
proficiency_type_id
UUID PK
Y
Lookup — company-scoped
company_id
UUID FK
Y
RLS anchor
code
VARCHAR(50)
Y
e.g. SWIM_LEVEL_3
label
VARCHAR(200)
Y
Display name
description
TEXT
N
Optional detail
is_active
BOOLEAN
Y
false = archived
Field
Type
Required
Notes
member_proficiency_id
UUID PK
Y
Auto-generated
person_id
UUID FK
Y
Member
proficiency_type_id
UUID FK
Y
References ProficiencyType
achieved_date
DATE
Y
Date proficiency was earned
expiry_date
DATE
N
If set, proficiency is invalid after this date
notes
TEXT
N
e.g. certificate number, awarding body
recorded_at
TIMESTAMP
Y
System-set
recorded_by_person_id
UUID FK
Y
Staff who recorded it
company_id
UUID FK
Y
RLS anchor
Note: OfferingVersion entity (Unified Offering Model) extended with optional field: required_proficiency_type_id UUID FK → ProficiencyType.
## US-MPE-012: Configure Proficiency Types
Story ID
US-MPE-012
Feature
MPE-F03
Role
Company Admin
User Story
As a Company Admin, I want to configure the list of proficiency types for my tenant, so that staff can record the certifications and skill levels relevant to my programs.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-003
Scenario
Condition
GIVEN
Admin is in Admin Console > Settings > Proficiency Types.
WHEN
Admin creates, edits, or archives a proficiency type.
THEN
ProficiencyType record created/updated/archived. Immediately available in proficiency selection UI. Audit event emitted.
Edge Case 1
Archiving a type that is referenced by a published OfferingVersion: system warns 'This proficiency type is required by [N] published offerings. Archive those offerings first or remove the requirement before archiving this type.' Archive is blocked until resolved.
Error State 1
Save fails: prior state retained.
Permissions
Company Admin only.
Data Notes
Write: ProficiencyType. Audit: tenant.proficiency_type_updated.
### Functional Requirements — US-MPE-012
System Inputs
POST /admin/proficiency-types | PATCH /admin/proficiency-types/{id} | DELETE /admin/proficiency-types/{id} (soft-archive)
System Outputs
201/200: ProficiencyType object | 409 if code already exists | 422 if archive blocked by active OfferingVersion reference.
Validation Rules
code: unique per company, max 50 chars. label: required, max 200 chars.
Business Rules
Soft-archive only. Active OfferingVersion references block archival.
Permissions
COMPANY_ADMIN only.
Data Touched
Write: ProficiencyType. Audit: tenant.proficiency_type_updated.
## US-MPE-013: View Member Proficiencies
Story ID
US-MPE-013
Feature
MPE-F03
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view the proficiencies held by a member, so that I can confirm their eligibility for a class or service.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-003
Scenario
Condition
GIVEN
Staff is on the member profile in Admin Console.
WHEN
Staff opens the Proficiencies section.
THEN
System displays active (non-expired) proficiencies: label, achieved date, expiry date (with expiry warning if within 30 days), notes. Expired proficiencies shown in collapsed historical section.
Edge Case 1
Member has no proficiencies: 'No proficiencies on file' with Add button. Expiry within 30 days: amber 'Expiring soon' badge shown.
Error State 1
Section fails to load: inline error with retry.
Permissions
Front Desk Staff, Location Manager, Company Admin, Auditor, Instructor: read. Member: read-only (own portal view).
Data Notes
Read: MemberProficiency, ProficiencyType. Active = expiry_date IS NULL OR expiry_date > today.
### Functional Requirements — US-MPE-013
System Inputs
GET /admin/members/{person_id}/proficiencies?status=active|expired|all
System Outputs
200: { active: MemberProficiency[], expired: MemberProficiency[] }. Each item includes proficiency_type { code, label }.
Business Rules
active = expiry_date IS NULL OR expiry_date >= today. expired = expiry_date < today.
Permissions
FRONT_DESK, LOCATION_MANAGER, COMPANY_ADMIN, AUDITOR, INSTRUCTOR: read. MEMBER: 403 (use /portal/me/proficiencies).
Data Touched
Read: MemberProficiency, ProficiencyType. Audit: person.proficiencies_viewed.
## US-MPE-014: Add Proficiency to Member
Story ID
US-MPE-014
Feature
MPE-F03
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to record a proficiency for a member, so that they are eligible for classes and services that require that certification.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-012, US-MPE-013
Maps to BR
BR-MPE-003, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Proficiencies section. Member does not hold the selected proficiency type (or holds an expired instance).
WHEN
Staff selects a proficiency type, enters achieved date, optional expiry date, and optional notes, then saves.
THEN
MemberProficiency record created. Proficiency is immediately effective for booking eligibility checks. Audit event emitted.
Edge Case 1
Member already holds an active (non-expired) instance of this proficiency type: 409 'Member already holds this proficiency. Use Edit to update the existing record.'
Edge Case 2
expiry_date before achieved_date: validation error.
Error State 1
Save fails: no record created, error toast, form preserved.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin.
Data Notes
Write: MemberProficiency. Audit: person.proficiency_added { proficiency_type_code, achieved_date, expiry_date, actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-014
System Inputs
POST /admin/members/{person_id}/proficiencies — body: { proficiency_type_id, achieved_date, expiry_date?, notes? }
System Outputs
201: MemberProficiency object | 409 if active proficiency of same type already exists.
Validation Rules
proficiency_type_id: must be active for company. achieved_date: required, must be <= today. expiry_date: if provided, must be > achieved_date. notes: max 500 chars.
Business Rules
Unique constraint on (person_id, proficiency_type_id) where expiry_date IS NULL OR expiry_date >= today.
State Changes
MemberProficiency inserted. Booking eligibility cache invalidated for this person_id.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write. Others: 403.
Data Touched
Write: MemberProficiency. Audit: person.proficiency_added.
## US-MPE-015: Expire or Remove a Proficiency
Story ID
US-MPE-015
Feature
MPE-F03
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to mark a proficiency as expired or remove an incorrectly entered one, so that the member's eligibility reflects their actual current certification status.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-014
Maps to BR
BR-MPE-003, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Proficiencies section. Member has an active proficiency.
WHEN
Staff sets expiry_date to today or a past date (expire) or explicitly removes an incorrect record (soft-delete).
THEN
Proficiency moves to the historical/expired section. Booking eligibility is recalculated immediately. Audit event emitted.
Edge Case 1
Removing a proficiency that is the required_proficiency_type_id for a booking the member already holds: system warns but permits. Booking status is not retroactively changed.
Error State 1
Update fails: proficiency remains active.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin.
Data Notes
Write: MemberProficiency (update expiry_date or soft-delete). Audit: person.proficiency_expired or person.proficiency_removed.
### Functional Requirements — US-MPE-015
System Inputs
PATCH /admin/members/{person_id}/proficiencies/{id} — body: { expiry_date: date } (expire) | DELETE /admin/members/{person_id}/proficiencies/{id} (soft-delete — sets deleted_at).
System Outputs
200: updated MemberProficiency | 204 on delete.
Business Rules
PATCH to set expiry_date in the past effectively expires the proficiency. DELETE is a soft-delete — record retained for audit.
State Changes
MemberProficiency updated or soft-deleted. Booking eligibility cache invalidated for person_id.
Permissions
FRONT_DESK, LOCATION_MANAGER, COMPANY_ADMIN: write. Others: 403.
Data Touched
Write: MemberProficiency. Audit: person.proficiency_expired | person.proficiency_removed.
## US-MPE-016: Enforce Proficiency Eligibility Gate at Booking
Story ID
US-MPE-016
Feature
MPE-F03
Role
Booking Engine (System)
User Story
As the booking engine, I need to check a member's proficiency before confirming a booking for a proficiency-gated offering, so that only eligible members can book skill-restricted classes.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-014, Unified Offering Model (required_proficiency_type_id field on OfferingVersion)
Maps to BR
BR-MPE-003
Scenario
Condition
GIVEN
A booking request is made for an OfferingVersion that has required_proficiency_type_id set.
WHEN
The booking engine processes the booking request.
THEN
System checks: does the member hold an active (non-expired) MemberProficiency record for the required_proficiency_type_id? If YES: booking proceeds. If NO: booking is rejected with error code PROFICIENCY_NOT_MET and message 'You do not hold the required proficiency for this class: [proficiency_label].'
Edge Case 1
OfferingVersion has no required_proficiency_type_id: no proficiency check performed.
Edge Case 2
Staff overrides booking for ineligible member (with override permission): booking created with override_reason recorded. Audit event includes override flag.
Edge Case 3
Member's proficiency expires between booking creation and class date: existing booking is not cancelled. No retroactive enforcement.
Error State 1
Proficiency lookup fails: booking engine returns 503 PROFICIENCY_CHECK_UNAVAILABLE. Do not default to permit.
Permissions
System (booking engine). Staff with booking_override permission can bypass for specific bookings.
Data Notes
Read: MemberProficiency (active for person_id + proficiency_type_id). No writes. Audit: booking.proficiency_check_failed { person_id, offering_id, required_proficiency_type_id, timestamp } on rejection.
### Functional Requirements — US-MPE-016
System Inputs
Internal booking engine call: checkProficiencyEligibility(person_id, offering_version_id)
System Outputs
{ eligible: boolean, required_proficiency_type_id?, proficiency_label?, member_proficiency_id? }
Business Rules
Eligible = MemberProficiency exists for (person_id, proficiency_type_id) WHERE (expiry_date IS NULL OR expiry_date >= today) AND deleted_at IS NULL. If OfferingVersion.required_proficiency_type_id IS NULL: return eligible=true immediately.
Performance
Proficiency check must complete within 100ms at p95. Use read replica for this query.
Error Handling
On DB timeout or error: return { eligible: false, error: 'PROFICIENCY_CHECK_UNAVAILABLE' }. Booking engine returns 503. Do NOT permit by default on error.
Data Touched
Read: OfferingVersion.required_proficiency_type_id, MemberProficiency. Audit on rejection only.
# Feature MPE-F04: Per-Member Restrictions
Business rule restrictions applied on a per-member basis. Types are operator-configured. Active restrictions are enforced by booking and gate access engines.
## Data Entities — MPE-F04
Field
Type
Required
Notes
restriction_type_id
UUID PK
Y
Lookup — company-scoped
company_id
UUID FK
Y
RLS anchor
code
VARCHAR(50)
Y
e.g. MUST_COMPLETE_INDUCTION
label
VARCHAR(200)
Y
Display label
enforcement_scope
ENUM
Y
BOOKING | GATE_ACCESS | BOTH
is_active
BOOLEAN
Y
false = archived
Field
Type
Required
Notes
member_restriction_id
UUID PK
Y
Auto-generated
person_id
UUID FK
Y
Member
restriction_type_id
UUID FK
Y
References RestrictionType
is_active
BOOLEAN
Y
true = currently enforced
applied_reason
TEXT
N
Staff note explaining why applied
applied_at
TIMESTAMP
Y
System-set
applied_by_person_id
UUID FK
Y
Staff who applied
removed_at
TIMESTAMP
N
Set when removed
removed_by_person_id
UUID FK
N
Staff who removed
company_id
UUID FK
Y
RLS anchor
## US-MPE-017: Configure Restriction Types
Story ID
US-MPE-017
Feature
MPE-F04
Role
Company Admin
User Story
As a Company Admin, I want to configure per-member restriction types with their enforcement scope, so that staff can apply the right restrictions to the right situations.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-004
Scenario
Condition
GIVEN
Admin is in Admin Console > Settings > Restriction Types.
WHEN
Admin creates, edits, or archives a restriction type and sets its enforcement_scope.
THEN
RestrictionType record created/updated/archived. Immediately available for application to members.
Edge Case 1
Archiving a type active on members: warn 'This restriction is applied to [N] members. Archiving will not remove those restrictions but the type cannot be applied to new members.' Permit archive.
Error State 1
Save fails: prior state retained.
Permissions
Company Admin only.
Data Notes
Write: RestrictionType. Audit: tenant.restriction_type_updated.
### Functional Requirements — US-MPE-017
System Inputs
POST /admin/restriction-types | PATCH /admin/restriction-types/{id} | DELETE /admin/restriction-types/{id}
System Outputs
201/200: RestrictionType | 409 on code conflict.
Validation Rules
code: unique per company, max 50 chars. label: required. enforcement_scope: BOOKING | GATE_ACCESS | BOTH.
Permissions
COMPANY_ADMIN only.
Data Touched
Write: RestrictionType. Audit: tenant.restriction_type_updated.
## US-MPE-018: Apply Restriction to Member
Story ID
US-MPE-018
Feature
MPE-F04
Role
Location Manager
User Story
As a Location Manager, I want to apply a restriction to a specific member's record, so that business rules specific to that member are enforced at booking or gate access.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-017
Maps to BR
BR-MPE-004, BR-MPE-017
Scenario
Condition
GIVEN
Location Manager is on the member profile > Restrictions section.
WHEN
Manager selects a restriction type, enters an optional reason, and saves.
THEN
MemberRestriction record created with is_active=true. Restriction is immediately enforced by booking and gate engines. Audit event emitted.
Edge Case 1
Restriction of this type already active on member: 409 'This restriction is already applied to this member.'
Edge Case 2
Restriction with enforcement_scope=GATE_ACCESS applied: gate access engine enforces it on next check-in attempt.
Error State 1
Save fails: no record created.
Permissions
Location Manager (location-scoped), Company Admin. Front Desk Staff: DENY. Auditor: DENY.
Data Notes
Write: MemberRestriction. Audit: person.restriction_applied { restriction_type_code, enforcement_scope, applied_reason, actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-018
System Inputs
POST /admin/members/{person_id}/restrictions — body: { restriction_type_id, applied_reason?: string }
System Outputs
201: MemberRestriction object | 409 if same type already active.
Validation Rules
restriction_type_id: must be active for company. applied_reason: max 500 chars.
Business Rules
One active MemberRestriction per (person_id, restriction_type_id). Unique constraint enforced.
State Changes
MemberRestriction inserted. Enforcement engines pick up on next check.
Permissions
LOCATION_MANAGER (scoped), COMPANY_ADMIN: write. Others: 403.
Data Touched
Write: MemberRestriction. Audit: person.restriction_applied.
## US-MPE-019: Remove Restriction from Member
Story ID
US-MPE-019
Feature
MPE-F04
Role
Location Manager
User Story
As a Location Manager, I want to remove a restriction from a member's record when it is no longer applicable, so that the member regains full access to the services they are entitled to.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-018
Maps to BR
BR-MPE-004, BR-MPE-017
Scenario
Condition
GIVEN
Location Manager is on the Restrictions section. Member has an active restriction.
WHEN
Manager selects Remove and confirms.
THEN
MemberRestriction is_active set to false. Restriction is immediately lifted. Audit event emitted.
Edge Case 1
Restriction already inactive: Remove action is not available.
Error State 1
Update fails: restriction remains active.
Permissions
Location Manager (location-scoped), Company Admin.
Data Notes
Write: MemberRestriction (update is_active=false). Audit: person.restriction_removed { restriction_type_code, actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-019
System Inputs
PATCH /admin/members/{person_id}/restrictions/{id} — body: { is_active: false }
System Outputs
200: updated MemberRestriction.
State Changes
MemberRestriction.is_active=false, removed_at=now(), removed_by_person_id=actor.
Permissions
LOCATION_MANAGER, COMPANY_ADMIN: write. Others: 403.
Data Touched
Write: MemberRestriction. Audit: person.restriction_removed.
## US-MPE-020: Enforce Member Restrictions at Booking and Gate
Story ID
US-MPE-020
Feature
MPE-F04
Role
Booking/Access Engine (System)
User Story
As the booking and gate access engines, I need to check for active per-member restrictions before permitting a booking or granting facility access, so that operator-defined restrictions are enforced at the point of action.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-018
Maps to BR
BR-MPE-004
Scenario
Condition
GIVEN
A booking request or gate access check is made for a member.
WHEN
The engine processes the request.
THEN
System checks for active MemberRestriction records for this member with enforcement_scope matching the action (BOOKING, GATE_ACCESS, or BOTH). If any active restriction matches: action is blocked with error MEMBER_RESTRICTION_ACTIVE and the restriction label is returned. If no matching restriction: action proceeds normally.
Edge Case 1
Multiple active restrictions: all are returned in the error response.
Edge Case 2
Staff with restriction_override permission initiates booking: system permits with override_reason recorded.
Error State 1
Restriction lookup fails: return 503 RESTRICTION_CHECK_UNAVAILABLE. Do NOT default to permit.
Permissions
System. Staff with restriction_override permission can bypass.
Data Notes
Read: MemberRestriction (is_active=true, enforcement_scope matches action). No writes. Audit on block: person.restriction_enforced.
### Functional Requirements — US-MPE-020
System Inputs
Internal call: checkMemberRestrictions(person_id, action_scope: 'BOOKING'|'GATE_ACCESS')
System Outputs
{ blocked: boolean, restrictions: [{ restriction_type_code, label, applied_reason }] }
Business Rules
Query: SELECT * FROM MemberRestriction WHERE person_id=? AND is_active=true AND enforcement_scope IN (action_scope, 'BOTH'). If any rows returned: blocked=true.
Performance
Must complete within 100ms at p95.
Error Handling
On error: return blocked=true with error=RESTRICTION_CHECK_UNAVAILABLE. Caller returns 503.
Data Touched
Read: MemberRestriction, RestrictionType.
# Feature MPE-F05: Staff Notes
Internal free-text notes per member. Each note has date, author, category, and body. Not visible to members. Soft-delete only.
## Data Entities — MPE-F05
Field
Type
Required
Notes
note_category_id
UUID PK
Y
Lookup — company-scoped
company_id
UUID FK
Y
label
VARCHAR(100)
Y
e.g. Follow-up, Sales, Medical, General
is_active
BOOLEAN
Y
Field
Type
Required
Notes
member_note_id
UUID PK
Y
person_id
UUID FK
Y
Member the note is about
note_category_id
UUID FK
Y
body
TEXT
Y
Free-text note content. Max 4000 chars.
location_id
UUID FK
Y
Location of authoring staff (for scoping)
created_at
TIMESTAMP
Y
created_by_person_id
UUID FK
Y
Staff author
deleted_at
TIMESTAMP
N
Set on soft-delete
deleted_by_person_id
UUID FK
N
company_id
UUID FK
Y
RLS anchor
## US-MPE-021: Configure Note Categories
Story ID
US-MPE-021
Feature
MPE-F05
Role
Company Admin
User Story
As a Company Admin, I want to configure the note categories available to staff, so that notes are consistently classified for filtering and reporting.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-005
Scenario
Condition
GIVEN
Admin is in Admin Console > Settings > Note Categories.
WHEN
Admin creates, edits, or archives a note category.
THEN
NoteCategory record created/updated/archived.
Edge Case 1
System must ship with at least these default categories: General, Follow-up, Medical, Sales, Complaint. Operator may rename but not delete defaults.
Error State 1
Save fails: prior state retained.
Permissions
Company Admin only.
Data Notes
Write: NoteCategory. Audit: tenant.note_category_updated.
### Functional Requirements — US-MPE-021
System Inputs
POST/PATCH/DELETE /admin/note-categories
System Outputs
201/200: NoteCategory | 409 on label conflict.
Business Rules
Default categories seeded on tenant creation. Defaults: label is editable; is_active can be set to false. Hard delete blocked for any category with existing MemberNote records.
Permissions
COMPANY_ADMIN only.
Data Touched
Write: NoteCategory. Audit: tenant.note_category_updated.
## US-MPE-022: View Notes on Member Record
Story ID
US-MPE-022
Feature
MPE-F05
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view all internal notes on a member's record, so that I have the context I need to provide informed service.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-005
Scenario
Condition
GIVEN
Staff is on the member profile in Admin Console.
WHEN
Staff opens the Notes section.
THEN
System displays all non-deleted MemberNote records for this member, ordered most-recent first. Each row shows: date, author name, category, and note body preview (first 200 chars; expandable). Staff at this location see all notes. Company Admin sees notes from all locations.
Edge Case 1
Member has no notes: 'No notes on file' with Add button.
Edge Case 2
Note was deleted (deleted_at set): not shown in main list. Company Admin may view deleted notes in a separate 'Deleted Notes' collapsible section.
Error State 1
Notes section fails to load: inline error with retry.
Permissions
Front Desk Staff (sees notes from own location only), Location Manager (sees notes from their location(s)), Company Admin (all locations), Security Admin (all), Auditor (all, read-only). Member: cannot see notes.
Data Notes
Read: MemberNote (deleted_at IS NULL), NoteCategory, created_by Person (display_name). Audit: person.notes_viewed.
### Functional Requirements — US-MPE-022
System Inputs
GET /admin/members/{person_id}/notes?category_id=&location_id=&page=&page_size=
System Outputs
200: paginated list of MemberNote objects. Each includes: note_category { label }, created_by { display_name }, location { name }.
Business Rules
FRONT_DESK and LOCATION_MANAGER: results filtered to their location_id(s). COMPANY_ADMIN and above: all locations. Default sort: created_at DESC. Default page_size: 20.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN, SECURITY_ADMIN, AUDITOR: read. MEMBER, INSTRUCTOR: 403.
Data Touched
Read: MemberNote, NoteCategory, Person (author). Audit: person.notes_viewed.
## US-MPE-023: Add Note to Member Record
Story ID
US-MPE-023
Feature
MPE-F05
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to add an internal note to a member's record, so that my colleagues have the context they need when they next interact with this member.
Priority
P0
Sprint Estimate
1 sprint
Depends On
US-MPE-021, US-MPE-022
Maps to BR
BR-MPE-005, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Notes section of the member profile.
WHEN
Staff selects a category, writes a note, and saves.
THEN
MemberNote record created. Note appears at the top of the list immediately. Audit event emitted.
Edge Case 1
Note body exceeds 4000 characters: inline validation error with character count.
Error State 1
Save fails: no record created, error toast, form state preserved.
Permissions
Front Desk Staff, Location Manager, Company Admin, Instructor (read-only access to notes; DENY on add for Instructor unless explicit permission granted).
Data Notes
Write: MemberNote (new). Audit: person.note_added { note_category_label, actor_person_id, target_person_id, location_id, timestamp }.
### Functional Requirements — US-MPE-023
System Inputs
POST /admin/members/{person_id}/notes — body: { note_category_id, body }
System Outputs
201: MemberNote object.
Validation Rules
note_category_id: must be active for company. body: required, max 4000 chars.
Business Rules
location_id set to actor's current location assignment. created_by_person_id set to actor.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write. INSTRUCTOR, AUDITOR, MEMBER: 403.
Data Touched
Write: MemberNote. Audit: person.note_added { note_category_label, location_id }.
## US-MPE-024: Soft-Delete a Note
Story ID
US-MPE-024
Feature
MPE-F05
Role
Location Manager
User Story
As a Location Manager, I want to soft-delete an incorrect or inappropriate note on a member's record, so that the main notes view shows only relevant information.
Priority
P1
Sprint Estimate
1 sprint
Depends On
US-MPE-023
Maps to BR
BR-MPE-005, BR-MPE-017
Scenario
Condition
GIVEN
Location Manager is on the Notes section. A note is present that needs to be removed.
WHEN
Manager selects 'Delete' on a note and confirms.
THEN
MemberNote.deleted_at set to now(). Note disappears from main list. Note is retained in the database and visible to Company Admin in 'Deleted Notes'. Audit event emitted.
Edge Case 1
Manager attempts to delete a note written by a staff member from a different location: DENY — manager can only delete notes from their own location(s). Company Admin can delete any note.
Error State 1
Delete fails: note remains visible.
Permissions
Location Manager (own location notes only), Company Admin (all notes).
Data Notes
Write: MemberNote (update deleted_at, deleted_by_person_id). Audit: person.note_deleted { note_id, actor_person_id, target_person_id, timestamp }.
### Functional Requirements — US-MPE-024
System Inputs
DELETE /admin/members/{person_id}/notes/{note_id}
System Outputs
204 on success | 403 if actor does not own the note's location scope | 404 if not found.
Business Rules
Soft-delete only. Sets deleted_at = now(), deleted_by_person_id = actor. Record is retained. Hard delete not permitted.
Permissions
LOCATION_MANAGER: notes where MemberNote.location_id in actor's assigned locations. COMPANY_ADMIN: all. Others: 403.
Data Touched
Write: MemberNote (deleted_at, deleted_by_person_id). Audit: person.note_deleted.
# Feature MPE-F06: Activity Timeline
Read-only aggregated feed assembled from existing event sources. No new event table. p95 response target: 1000ms for 12-month window.
## US-MPE-025: View Member Activity Timeline
Story ID
US-MPE-025
Feature
MPE-F06
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to see a single chronological activity timeline for a member covering all activity types, so that I can quickly understand their recent history without navigating multiple modules.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-006
Scenario
Condition
GIVEN
Staff is on the member profile in Admin Console.
WHEN
Staff opens the Activity Timeline section, selecting a date range.
THEN
System returns a paginated, chronological list of events for this member in the selected window. Event types included: FACILITY_CHECKIN, CLASS_BOOKING, CLASS_ATTENDANCE, SERVICE_BOOKING, PRODUCT_PURCHASE, PACKAGE_PURCHASE, MEMBERSHIP_STATE_CHANGE. Each event shows: type, timestamp, description, location, and a link to the source record. Activity types shown are filtered by TenantActivityConfig (US-MPE-026).
Edge Case 1
No activity in selected window: empty state 'No activity in this period.'
Edge Case 2
Event source record has been deleted: event still shown with '[Record deleted]' as description.
Edge Case 3
Member has activity at multiple locations: all shown (location-scoped staff see only their location's events).
Error State 1
One event source is unavailable: events from that source are omitted; a banner indicates 'Some activity types could not be loaded.'
Permissions
Front Desk Staff (location-scoped — own location events only), Location Manager (all their location(s)), Company Admin (all locations), Auditor (all, read-only).
Data Notes
Read: Aggregated from CheckInEvent, BookingRecord, ChargeRecord, MembershipStateChangeEvent. No writes. Audit: person.activity_timeline_viewed.
### Functional Requirements — US-MPE-025
System Inputs
GET /admin/members/{person_id}/activity-timeline?from=&to=&event_types=&page=&page_size=
System Outputs
200: { events: [{ event_type, event_id, source_module, timestamp, description, location_id, location_name, source_url }], total_count, page, page_size }
Validation Rules
from and to: required. Max range: 366 days per request. page_size: max 50.
Business Rules
Events assembled from: CheckInEvent (Epic H), BookingRecord (Epic D), ChargeRecord (UCE), MembershipStateChangeEvent (Membership Management). FRONT_DESK and LOCATION_MANAGER: events filtered to actor's location_id(s). Results ordered by timestamp DESC.
Performance
p95 response time: 1000ms for 12-month window. Use read replicas. Parallel fetch from event sources with 800ms timeout per source.
Error Handling
If any event source times out: exclude that source from results; include degraded_sources[] in response.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN, AUDITOR: read. MEMBER, INSTRUCTOR: 403.
Data Touched
Read only. Audit: person.activity_timeline_viewed.
## US-MPE-026: Configure Timeline Activity Types
Story ID
US-MPE-026
Feature
MPE-F06
Role
Company Admin
User Story
As a Company Admin, I want to configure which activity types appear on the member activity timeline, so that the view shows only the event types relevant to my operation.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-006
Scenario
Condition
GIVEN
Admin is in Admin Console > Settings > Activity Timeline.
WHEN
Admin toggles event types on or off and saves.
THEN
TenantActivityConfig updated. Timeline endpoint respects configuration from next request.
Edge Case 1
Admin turns off all types: system warns 'Disabling all event types will result in an always-empty timeline.' Permit but warn.
Error State 1
Save fails: prior config retained.
Permissions
Company Admin only.
Data Notes
Write: TenantActivityConfig { event_types_enabled[] }. Audit: tenant.activity_config_updated.
### Functional Requirements — US-MPE-026
System Inputs
PUT /admin/tenants/{company_id}/activity-config — body: { event_types_enabled: [FACILITY_CHECKIN|CLASS_BOOKING|CLASS_ATTENDANCE|SERVICE_BOOKING|PRODUCT_PURCHASE|PACKAGE_PURCHASE|MEMBERSHIP_STATE_CHANGE] }
System Outputs
200: { company_id, event_types_enabled[], updated_at }
Business Rules
Default config: all types enabled. Config is cached for 60 seconds on the timeline read path.
Permissions
COMPANY_ADMIN only.
Data Touched
Write: TenantActivityConfig. Audit: tenant.activity_config_updated.
# Feature MPE-F07: Booking and Course History
Read-only historical view of all bookings and course enrolments for a member. Assembled from existing Scheduling records.
## US-MPE-027: View Booking History (Admin Console)
Story ID
US-MPE-027
Feature
MPE-F07
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view a member's complete booking history, so that I can resolve disputes, answer questions about past bookings, and understand their usage patterns.
Priority
P0
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-007
Scenario
Condition
GIVEN
Staff is on the member profile. Booking History section is open.
WHEN
Staff selects a date range and optional location filter and loads.
THEN
System returns all BookingRecord entries for this member in the selected range: booking ID, item name (class/service/course), booking date, event date, status (CONFIRMED/CANCELLED/ATTENDED/NO_SHOW/WAITLISTED), location, and line value. Sorted by event date DESC.
Edge Case 1
No bookings in range: empty state 'No bookings in this period.'
Edge Case 2
FRONT_DESK staff: see only bookings at their location.
Error State 1
Booking history fails to load: inline error with retry.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin, Auditor. Member: via portal only (US-MPE-028).
Data Notes
Read: BookingRecord (Epic D), OfferingVersion (name). No writes. Audit: person.booking_history_viewed.
### Functional Requirements — US-MPE-027
System Inputs
GET /admin/members/{person_id}/booking-history?from=&to=&location_id=&page=&page_size=
System Outputs
200: paginated BookingRecord list. Each: { booking_id, offering_name, offering_type, booking_status, booking_created_at, event_date, location_name, line_value_cents, currency }.
Validation Rules
from/to required. Max range: 730 days. page_size max 50.
Business Rules
FRONT_DESK, LOCATION_MANAGER: filtered to actor's location_id(s). COMPANY_ADMIN: all locations. All statuses included.
Performance
p95: 800ms for 24-month window.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN, AUDITOR: read. MEMBER: 403.
Data Touched
Read: BookingRecord, OfferingVersion. Audit: person.booking_history_viewed.
## US-MPE-028: Member Views Own Booking History (Portal)
Story ID
US-MPE-028
Feature
MPE-F07
Role
Member
User Story
As a member, I want to view my booking history in the member portal, so that I can review past classes and services and confirm what I have attended.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-007
Scenario
Condition
GIVEN
Member is authenticated in the member portal, viewing their profile or activity section.
WHEN
Member selects Booking History.
THEN
System returns the member's own BookingRecord history, most recent first, with: item name, event date, status, location, and line value. Cancelled bookings included.
Edge Case 1
No bookings: 'You have no booking history yet.'
Error State 1
Fails to load: error message with retry.
Permissions
Authenticated member (own records only). Guardian (dependent records where delegated).
Data Notes
Read: BookingRecord (person_id = authenticated member). Audit: person.booking_history_viewed { channel: MEMBER_PORTAL }.
### Functional Requirements — US-MPE-028
System Inputs
GET /portal/me/booking-history?from=&to=&page=&page_size=
System Outputs
200: paginated BookingRecord list (own records only).
Business Rules
person_id derived from session. member cannot query another person's history. Default: last 12 months.
Permissions
Authenticated member only. Staff: 403 on /portal/ endpoints.
Data Touched
Read: BookingRecord. Audit: person.booking_history_viewed { channel: MEMBER_PORTAL }.
# Features MPE-F08 through MPE-F15: P1/P2 Stories
The following user stories follow the same format as the P0 stories above. Full acceptance criteria, FR tables, and data entities are provided for each.
## Data Entities — MPE-F08 Medical Details
Field
Type
Required
Notes
member_medical_id
UUID PK
Y
One per person_id (unique constraint)
person_id
UUID FK
Y
doctor_name
VARCHAR(200)
N
doctor_address_line1
VARCHAR(200)
N
doctor_address_line2
VARCHAR(200)
N
doctor_city
VARCHAR(100)
N
doctor_state
VARCHAR(100)
N
doctor_zip
VARCHAR(20)
N
doctor_phone
VARCHAR(30)
N
E.164
clearance_required
BOOLEAN
N
Flag: clearance certificate is required
clearance_received
BOOLEAN
N
Flag: certificate has been received
clearance_received_date
DATE
N
medical_notes
TEXT
N
Free-text. PHI-adjacent.
company_id
UUID FK
Y
RLS anchor
updated_at
TIMESTAMP
Y
updated_by_person_id
UUID FK
Y
Audit: person.medical_details_updated { field_names_changed[], actor_person_id, target_person_id, timestamp }. PHI-safe: values NOT in payload. Access gated by medical_data_access RBAC permission.
## US-MPE-029: View Medical Details
Story ID
US-MPE-029
Feature
MPE-F08
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view a member's medical details (doctor info and clearance status), so that I can verify clearance status before they access certain services.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-008
Scenario
Condition
GIVEN
Staff has medical_data_access permission and is on the member profile.
WHEN
Staff opens the Medical Details section.
THEN
System displays doctor details and clearance fields per TenantProfileConfig visibility settings. Medical Notes visible only to staff with medical_notes_view permission.
Edge Case 1
Member has no medical record: 'No medical details on file.'
Edge Case 2
Staff lacks medical_data_access: section not rendered; 403 on API call.
Error State 1
Section fails to load: inline error with retry.
Permissions
Front Desk Staff + medical_data_access permission (location-scoped), Location Manager + permission, Company Admin. Auditor: read-only with permission.
Data Notes
Read: MemberMedical. Audit: person.medical_details_viewed { actor_person_id, target_person_id }.
### Functional Requirements — US-MPE-029
System Inputs
GET /admin/members/{person_id}/medical
System Outputs
200: MemberMedical object with fields filtered by TenantProfileConfig | 403 if actor lacks medical_data_access | 404 if no record.
Permissions
Requires RBAC permission medical_data_access in addition to role. Without it: 403.
Data Touched
Read: MemberMedical. Audit: person.medical_details_viewed.
## US-MPE-030: Edit Medical Details
Story ID
US-MPE-030
Feature
MPE-F08
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to edit a member's doctor details and medical notes, so that the record reflects current information.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-008, BR-MPE-017
Scenario
Condition
GIVEN
Staff has medical_data_access permission and is on Medical Details section with existing record.
WHEN
Staff edits one or more fields and saves.
THEN
System validates and updates MemberMedical record. Audit event emitted. PHI-safe payload.
Edge Case 1
Record does not exist: POST creates it (upsert).
Edge Case 2
Staff without medical_notes_view attempts to edit notes field: field is not presented in UI; PATCH endpoint ignores medical_notes if actor lacks permission.
Error State 1
Save fails: prior values retained.
Permissions
Front Desk Staff + medical_data_access (location-scoped), Location Manager + permission, Company Admin.
Data Notes
Write: MemberMedical (upsert). Audit: person.medical_details_updated { field_names_changed[], actor_person_id, target_person_id }. PHI-safe.
### Functional Requirements — US-MPE-030
System Inputs
PATCH /admin/members/{person_id}/medical — body: any subset of MemberMedical fields.
System Outputs
200: updated MemberMedical object.
Business Rules
Upsert: creates record if none exists, updates if exists. At least one field required in body.
Permissions
medical_data_access RBAC permission required. Without it: 403.
Data Touched
Write: MemberMedical. Audit: person.medical_details_updated (PHI-safe).
## US-MPE-031: Record Clearance Certificate Received
Story ID
US-MPE-031
Feature
MPE-F08
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to mark a clearance certificate as received and record the date, so that the system reflects the member's current clearance status.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-008, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on Medical Details. clearance_required is true. clearance_received is false.
WHEN
Staff ticks 'Clearance Received' and enters the receipt date.
THEN
clearance_received set to true and clearance_received_date set. Audit event emitted.
Edge Case 1
Receipt date in the future: validation warning 'Date is in the future — confirm?' Permit after confirmation.
Error State 1
Save fails: status unchanged.
Permissions
Front Desk Staff + medical_data_access (location-scoped), Location Manager, Company Admin.
Data Notes
Write: MemberMedical { clearance_received=true, clearance_received_date }. Audit: person.clearance_certificate_received.
### Functional Requirements — US-MPE-031
System Inputs
PATCH /admin/members/{person_id}/medical — body: { clearance_received: true, clearance_received_date: date }
System Outputs
200: updated MemberMedical.
Permissions
medical_data_access required.
Data Touched
Write: MemberMedical. Audit: person.clearance_certificate_received.
## Data Entities — MPE-F09 Fitness Assessments
Field
Type
Required
Notes
assessment_type_id
UUID PK
Y
Operator-configured
company_id
UUID FK
Y
name
VARCHAR(200)
Y
e.g. Body Composition
fields_schema_json
JSONB
Y
Array of { field_key, label, unit, type: number|text|date }
is_active
BOOLEAN
Y
Field
Type
Required
Notes
assessment_id
UUID PK
Y
person_id
UUID FK
Y
Member assessed
assessment_type_id
UUID FK
Y
assessed_by_person_id
UUID FK
Y
Staff who conducted it
assessed_at
TIMESTAMP
Y
When assessment was taken
values_json
JSONB
Y
{ field_key: value } matching fields_schema_json
notes
TEXT
N
company_id
UUID FK
Y
RLS anchor
## US-MPE-032: Configure Assessment Types
Story ID
US-MPE-032
Feature
MPE-F09
Role
Company Admin
User Story
As a Company Admin, I want to configure assessment types and their measurement fields, so that staff can record standardised fitness assessments for members.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-009
Scenario
Condition
GIVEN
Admin is in Admin Console > Settings > Assessment Types.
WHEN
Admin creates an assessment type with a name and one or more measurement fields (label, unit, type).
THEN
AssessmentType saved with fields_schema_json. Immediately available for recording assessments.
Edge Case 1
Admin attempts to archive an assessment type with existing Assessment records: permit archive; existing records retained; new assessments of this type cannot be created.
Error State 1
Save fails: prior state retained.
Permissions
Company Admin only.
Data Notes
Write: AssessmentType. Audit: tenant.assessment_type_updated.
### Functional Requirements — US-MPE-032
System Inputs
POST /admin/assessment-types — body: { name, fields: [{ field_key, label, unit?, type }] }
System Outputs
201: AssessmentType object.
Validation Rules
name: required, unique per company. fields: min 1 field. field_key: unique within type, alphanumeric + underscore. type: number | text | date.
Permissions
COMPANY_ADMIN only.
Data Touched
Write: AssessmentType. Audit: tenant.assessment_type_updated.
## US-MPE-033: Record Fitness Assessment
Story ID
US-MPE-033
Feature
MPE-F09
Role
Instructor
User Story
As an Instructor, I want to record a fitness assessment for a member, so that their progress is tracked over time.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-009, BR-MPE-017
Scenario
Condition
GIVEN
Instructor has assessment_record permission and is on the member profile > Assessments section.
WHEN
Instructor selects assessment type, fills in measurement values and optional notes, and saves.
THEN
Assessment record created with assessed_at = now() and assessed_by = actor. Record is immutable — corrections require a new assessment submission.
Edge Case 1
Instructor submits without values for all required fields: inline validation errors per missing field.
Error State 1
Save fails: no record created.
Permissions
Instructor + assessment_record permission (location-scoped), Location Manager, Company Admin.
Data Notes
Write: Assessment (immutable). Audit: person.assessment_recorded { assessment_type_name, actor_person_id, target_person_id, timestamp }. PHI-safe: values NOT in payload.
### Functional Requirements — US-MPE-033
System Inputs
POST /admin/members/{person_id}/assessments — body: { assessment_type_id, values_json, notes? }
System Outputs
201: Assessment object.
Business Rules
Immutable after insert. No PATCH or DELETE endpoint. Corrections = new record.
Permissions
INSTRUCTOR + assessment_record permission, LOCATION_MANAGER, COMPANY_ADMIN: write. Others: 403.
Data Touched
Write: Assessment. Audit: person.assessment_recorded (PHI-safe).
## US-MPE-034: View Assessment History
Story ID
US-MPE-034
Feature
MPE-F09
Role
Instructor
User Story
As an Instructor, I want to view a member's assessment history, so that I can track their progress and plan appropriate training.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-009
Scenario
Condition
GIVEN
Instructor is on the member profile > Assessments section.
WHEN
Instructor selects assessment type filter and date range and loads.
THEN
System displays all Assessment records for this member: type name, date, assessed by, measurement values, notes. Most recent first.
Edge Case 1
No assessments: 'No assessments on file.' Member has assessments of multiple types: filterable by type.
Error State 1
Fails to load: inline error with retry.
Permissions
Instructor + assessment_view permission (location-scoped), Location Manager, Company Admin, Auditor.
Data Notes
Read: Assessment, AssessmentType. Audit: person.assessment_history_viewed.
### Functional Requirements — US-MPE-034
System Inputs
GET /admin/members/{person_id}/assessments?assessment_type_id=&from=&to=&page=&page_size=
System Outputs
200: paginated Assessment list including assessment_type { name, fields_schema_json }.
Permissions
INSTRUCTOR + assessment_view, LOCATION_MANAGER, COMPANY_ADMIN, AUDITOR: read.
Data Touched
Read: Assessment, AssessmentType. Audit: person.assessment_history_viewed.
## US-MPE-035: View Member Communication Preferences (Admin)
Story ID
US-MPE-035
Feature
MPE-F10
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view a member's current communication preferences, so that I can understand what communications they have opted into before making a change on their behalf.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-010
Scenario
Condition
GIVEN
Staff is on the member profile in Admin Console.
WHEN
Staff opens the Communications Preferences section.
THEN
System displays all notification preference settings for this member per channel (email, SMS, push) and type (reminders, promotions, statements, newsletters). Shows current opt-in/opt-out state and the last modified date and actor for each preference.
Edge Case 1
Member has never set preferences: system shows the tenant default state for each preference type.
Error State 1
Fails to load: inline error with retry.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin. Auditor: read-only.
Data Notes
Read: NotificationPreference (from Notification Engine). Audit: person.comms_preferences_viewed.
### Functional Requirements — US-MPE-035
System Inputs
GET /admin/members/{person_id}/notification-preferences
System Outputs
200: { preferences: [{ channel, notification_type, opted_in, last_modified_at, last_modified_by_display_name, last_modified_channel }] }
Business Rules
If no explicit preference exists for a type: returns tenant default. last_modified_channel: MEMBER_SELF_SERVE | STAFF_ADMIN_OVERRIDE | SYSTEM_DEFAULT.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN, AUDITOR: read. MEMBER: 403.
Data Touched
Read: NotificationPreference. Audit: person.comms_preferences_viewed.
## US-MPE-036: Override Member Communication Preferences
Story ID
US-MPE-036
Feature
MPE-F10
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to update a member's communication preferences on their behalf when they call to request a change, so that their opt-in/opt-out state is immediately correct without requiring them to use the portal.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-010, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Communications Preferences section. Member has requested a preference change by phone.
WHEN
Staff toggles one or more preferences and saves.
THEN
System updates the member's notification preferences. Each changed preference records: new value, actor, timestamp, and channel = STAFF_ADMIN_OVERRIDE. Confirmation shown to staff. Audit event emitted per preference changed.
Edge Case 1
Staff attempts to opt member out of all communications including mandatory service messages: system prevents opting out of transaction/service notification types that are marked mandatory by operator config.
Error State 1
Save fails: prior preferences retained, error toast.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin.
Data Notes
Write: NotificationPreference (update). Audit: person.comms_preference_overridden { channel, notification_type, new_value, actor_person_id, target_person_id, modified_channel: STAFF_ADMIN_OVERRIDE, timestamp } — one event per preference changed.
### Functional Requirements — US-MPE-036
System Inputs
PATCH /admin/members/{person_id}/notification-preferences — body: { preferences: [{ channel, notification_type, opted_in }] }
System Outputs
200: { preferences: [updated preference objects] }
Business Rules
Mandatory notification types (transaction confirmations, membership state changes) cannot be opted out. These are flagged in the TenantNotificationConfig. STAFF_ADMIN_OVERRIDE recorded on each changed preference.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write. AUDITOR, MEMBER: 403.
Data Touched
Write: NotificationPreference. Audit: person.comms_preference_overridden (one per preference changed).
## US-MPE-037: View Per-Member Message History (Admin)
Story ID
US-MPE-037
Feature
MPE-F11
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view the history of notifications and messages sent to a member, so that I can verify what communications were sent and when, to resolve member disputes.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-011
Scenario
Condition
GIVEN
Staff is on the member profile in Admin Console.
WHEN
Staff opens the Message History section and selects a date range.
THEN
System displays a list of all messages sent to this member: send date, channel, notification type, template name, delivery status (DELIVERED / BOUNCED / PENDING / FAILED), and subject line (where applicable). Sorted most recent first.
Edge Case 1
No messages in range: 'No messages sent in this period.'
Edge Case 2
Staff attempts to view message body content: body is not displayed (privacy); only metadata shown unless actor has comms_history_content_view permission.
Error State 1
Fails to load: inline error with retry.
Permissions
Front Desk Staff (location-scoped) — metadata only. Location Manager — metadata. Company Admin + comms_history_content_view — full metadata.
Data Notes
Read: NotificationDeliveryLog (Notification Engine). Audit: person.message_history_viewed.
### Functional Requirements — US-MPE-037
System Inputs
GET /admin/members/{person_id}/message-history?from=&to=&channel=&page=&page_size=
System Outputs
200: paginated list of { message_id, sent_at, channel, notification_type, template_name, delivery_status, subject? }
Business Rules
Message body not included unless actor has comms_history_content_view permission. Default: last 90 days.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: read metadata. comms_history_content_view permission for body. MEMBER: 403.
Data Touched
Read: NotificationDeliveryLog. Audit: person.message_history_viewed.
# Features MPE-F12 & MPE-F13: Alternate Identity and Extended Biographical Fields
## Data Entities — MPE-F12 and MPE-F13
All fields below are additions to the existing Person entity in the Unified User Model. Each field is individually operator-configurable as Required / Optional / Hidden via TenantProfileConfig.
Field
Type
Required
Notes
preferred_name
VARCHAR(100)
N
Display name used in member-facing surfaces
title
VARCHAR(50)
N
Operator-configured lookup (Mr/Mrs/Dr/Mx etc)
suffix
VARCHAR(20)
N
Jr/Sr/III etc
middle_name
VARCHAR(100)
N
occupation
VARCHAR(200)
N
nationality
VARCHAR(100)
N
country_of_residence
VARCHAR(100)
N
preferred_contact_phone_type
ENUM
N
HOME | WORK | MOBILE — which phone is preferred
alternate_first_name
VARCHAR(100)
N
Maiden name, foreign-script name
alternate_last_name
VARCHAR(100)
N
alternate_suffix
VARCHAR(20)
N
alternate_address_line1
VARCHAR(200)
N
Holiday/billing address
alternate_address_line2
VARCHAR(200)
N
alternate_city
VARCHAR(100)
N
alternate_state
VARCHAR(100)
N
alternate_country
VARCHAR(100)
N
alternate_zip
VARCHAR(20)
N
alternate_phone_mobile
VARCHAR(30)
N
E.164
alternate_email
VARCHAR(255)
N
Audit: person.extended_fields_updated { field_names_changed[], actor_person_id, target_person_id, timestamp }. PHI-safe.
## US-MPE-038: View Alternate Identity and Address (Admin)
Story ID
US-MPE-038
Feature
MPE-F12
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view a member's alternate name and address, so that I have their complete contact information available.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-012
Scenario
Condition
GIVEN
Staff is on the member profile.
WHEN
Staff opens the Alternate Details section.
THEN
System displays alternate name fields and alternate address fields per TenantProfileConfig visibility settings.
Edge Case 1
All alternate fields are Hidden in config: section not rendered.
Edge Case 2
No alternate data entered: all fields show 'Not provided'.
Error State 1
Section fails to load: inline error.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin, Auditor.
Data Notes
Read: Person (alternate fields). Audit: person.extended_fields_viewed.
### Functional Requirements — US-MPE-038
System Inputs
GET /admin/members/{person_id}/extended-profile — returns Person extended fields subset.
System Outputs
200: { preferred_name, title, suffix, occupation, nationality, country_of_residence, preferred_contact_phone_type, alternate_first_name, alternate_last_name, alternate_suffix, alternate_address_*, alternate_phone_mobile, alternate_email }
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN, AUDITOR: read.
Data Touched
Read: Person (extended fields). Audit: person.extended_fields_viewed.
## US-MPE-039: Edit Alternate Identity and Address (Admin)
Story ID
US-MPE-039
Feature
MPE-F12
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to edit a member's alternate name and address details, so that I can keep their full contact information accurate.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-012, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Alternate Details section.
WHEN
Staff edits one or more alternate fields and saves.
THEN
Person record updated with changed fields. Audit event emitted.
Edge Case 1
alternate_email format invalid: inline validation error.
Edge Case 2
alternate_phone_mobile format invalid: E.164 validation error.
Error State 1
Save fails: prior values retained.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin.
Data Notes
Write: Person (alternate fields). Audit: person.extended_fields_updated { field_names_changed[] }. PHI-safe.
### Functional Requirements — US-MPE-039
System Inputs
PATCH /admin/members/{person_id}/extended-profile — body: any subset of extended fields.
System Outputs
200: updated extended profile object.
Validation Rules
alternate_email: valid email format if provided. alternate_phone_mobile: E.164 if provided. All string fields: max lengths as per data entity table.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write.
Data Touched
Write: Person (extended fields). Audit: person.extended_fields_updated (PHI-safe).
## US-MPE-040: Member Self-Serve Edit Alternate Contact and Address
Story ID
US-MPE-040
Feature
MPE-F12
Role
Member
User Story
As a member, I want to update my alternate contact and address in the member portal, so that I can keep my backup contact information current.
Priority
P2
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-012, BR-MPE-017
Scenario
Condition
GIVEN
Member is in the portal profile section.
WHEN
Member edits alternate name or alternate contact fields and saves.
THEN
Person record updated. Audit event with channel=MEMBER_SELF_SERVE.
Edge Case 1
Alternate email already in use on another Person: validation error 'This email is already in use on another account.'
Error State 1
Save fails: prior values retained.
Permissions
Authenticated member (own record). Guardian (dependent where delegated).
Data Notes
Write: Person (alternate fields). Audit: person.extended_fields_updated { channel: MEMBER_SELF_SERVE }.
### Functional Requirements — US-MPE-040
System Inputs
PATCH /portal/me/extended-profile — body: alternate field subset only (member cannot edit preferred_name, title from this endpoint — use separate story US-MPE-043).
System Outputs
200: updated extended profile.
Permissions
Authenticated member only.
Data Touched
Write: Person. Audit: person.extended_fields_updated { channel: MEMBER_SELF_SERVE }.
## US-MPE-041: View Extended Biographical Fields (Admin)
Story ID
US-MPE-041
Feature
MPE-F13
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view a member's extended biographical details (preferred name, title, occupation, nationality), so that I can address them correctly and have complete demographic context.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-013
Scenario
Condition
GIVEN
Staff is on the member profile.
WHEN
Staff views the biographical section including extended fields.
THEN
System displays all extended biographical fields per TenantProfileConfig. preferred_name shown prominently if set.
Edge Case 1
All extended fields hidden in config: section shows only standard name fields.
Error State 1
Section fails to load: inline error.
Permissions
Front Desk Staff, Location Manager, Company Admin, Auditor.
Data Notes
Read: Person (extended biographical fields). Audit: person.extended_fields_viewed.
### Functional Requirements — US-MPE-041
System Inputs
Covered by GET /admin/members/{person_id}/extended-profile (US-MPE-038).
System Outputs
Same endpoint — includes biographical fields alongside alternate identity fields.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN, AUDITOR: read.
Data Touched
Read: Person. Audit: person.extended_fields_viewed.
## US-MPE-042: Edit Extended Biographical Fields (Admin)
Story ID
US-MPE-042
Feature
MPE-F13
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to edit a member's extended biographical details, so that the record is complete and correctly personalised.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-013, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the biographical section.
WHEN
Staff edits preferred_name, title, occupation, nationality, or other extended fields and saves.
THEN
Person record updated. Audit event emitted.
Edge Case 1
preferred_name set to empty string: cleared; member-facing surfaces fall back to first_name.
Error State 1
Save fails: prior values retained.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin.
Data Notes
Write: Person (extended biographical fields). Audit: person.extended_fields_updated { field_names_changed[] }.
### Functional Requirements — US-MPE-042
System Inputs
PATCH /admin/members/{person_id}/extended-profile — body: biographical field subset.
System Outputs
200: updated extended profile.
Validation Rules
preferred_name: max 100 chars. title: must match an operator-configured TitleOption if the field is configured as a lookup. occupation: max 200 chars.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write.
Data Touched
Write: Person. Audit: person.extended_fields_updated.
## US-MPE-043: Member Self-Serve Edit Preferred Name and Biographical Fields
Story ID
US-MPE-043
Feature
MPE-F13
Role
Member
User Story
As a member, I want to update my preferred name and biographical details in the member portal, so that I am addressed correctly across all platform surfaces.
Priority
P1
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-013, BR-MPE-017
Scenario
Condition
GIVEN
Member is in the portal profile section.
WHEN
Member edits preferred_name, title, or other permitted biographical fields and saves.
THEN
Person record updated. preferred_name immediately reflected in member-facing surfaces. Audit event with channel=MEMBER_SELF_SERVE.
Edge Case 1
Member clears preferred_name: falls back to first_name on member-facing surfaces.
Error State 1
Save fails: prior values retained.
Permissions
Authenticated member (own record).
Data Notes
Write: Person (preferred_name, title, occupation — member-editable subset). Audit: person.extended_fields_updated { channel: MEMBER_SELF_SERVE }.
### Functional Requirements — US-MPE-043
System Inputs
PATCH /portal/me/extended-profile — body: { preferred_name?, title?, occupation? } (member-editable fields only; nationality and country_of_residence are staff-only in Phase 1).
System Outputs
200: updated extended profile.
Permissions
Authenticated member only.
Data Touched
Write: Person. Audit: person.extended_fields_updated { channel: MEMBER_SELF_SERVE }.
# Feature MPE-F14: Preferred Staff Assignment
## Data Entities — MPE-F14
Field
Type
Required
Notes
preferred_staff_id
UUID PK
Y
person_id
UUID FK
Y
Member
service_group_id
UUID FK
Y
Operator-configured service/health professional group
preferred_staff_person_id
UUID FK
Y
Staff member preferred
secondary_staff_person_id
UUID FK
N
Secondary preference
created_at
TIMESTAMP
Y
updated_by_person_id
UUID FK
Y
company_id
UUID FK
Y
RLS anchor
## US-MPE-044: View Preferred Staff Assignments
Story ID
US-MPE-044
Feature
MPE-F14
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to view a member's preferred staff for each service group, so that I can assign the right person when booking a service.
Priority
P2
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-014
Scenario
Condition
GIVEN
Staff is on the member profile.
WHEN
Staff opens the Preferences section.
THEN
System displays each service group with the member's primary and secondary preferred staff name (if set).
Edge Case 1
No preferences set: 'No preferred staff on file.'
Error State 1
Fails to load: inline error.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin, Auditor.
Data Notes
Read: PreferredStaff, ServiceGroup, Person (staff display_name). Audit: person.preferred_staff_viewed.
### Functional Requirements — US-MPE-044
System Inputs
GET /admin/members/{person_id}/preferred-staff
System Outputs
200: [{ service_group: { id, name }, preferred_staff: { person_id, display_name }, secondary_staff: { person_id, display_name }? }]
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN, AUDITOR: read.
Data Touched
Read: PreferredStaff, ServiceGroup, Person. Audit: person.preferred_staff_viewed.
## US-MPE-045: Set Preferred Staff Assignment
Story ID
US-MPE-045
Feature
MPE-F14
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to set or update a member's preferred staff for a service group, so that the booking system can suggest the right person.
Priority
P2
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-014, BR-MPE-017
Scenario
Condition
GIVEN
Staff is on the Preferences section.
WHEN
Staff selects a service group, selects primary (and optionally secondary) preferred staff from an active staff list, and saves.
THEN
PreferredStaff record created or updated for this member + service group combination. Preference is surfaced as advisory suggestion in booking flows. Audit event emitted.
Edge Case 1
Staff member selected is no longer active (archived): system removes from dropdown; existing preference not invalidated but shown with '[Staff no longer active]' label.
Error State 1
Save fails: prior preference retained.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin.
Data Notes
Write: PreferredStaff (upsert per person_id + service_group_id). Audit: person.preferred_staff_updated.
### Functional Requirements — US-MPE-045
System Inputs
PUT /admin/members/{person_id}/preferred-staff/{service_group_id} — body: { preferred_staff_person_id, secondary_staff_person_id? }
System Outputs
200: updated PreferredStaff object.
Business Rules
Upsert per (person_id, service_group_id). preferred_staff_person_id must be an active staff member at an accessible location.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: write.
Data Touched
Write: PreferredStaff. Audit: person.preferred_staff_updated.
# Feature MPE-F15: Forward Payment Schedule
## US-MPE-046: View Forward Payment Schedule
Story ID
US-MPE-046
Feature
MPE-F15
Role
Front Desk Staff
User Story
As a Front Desk Staff member, I want to see a member's upcoming scheduled payments, so that I can answer billing questions and proactively flag upcoming charges.
Priority
P2
Sprint Estimate
1 sprint
Depends On
—
Maps to BR
BR-MPE-015
Scenario
Condition
GIVEN
Staff is on the member profile.
WHEN
Staff opens the Payment Schedule section and selects a date window (default: next 90 days).
THEN
System displays all scheduled future charges for this member: date, description (offering or membership name), amount (gross), payment run status (SCHEDULED / SUSPENDED). Total outstanding shown at bottom. Ordered by date ASC.
Edge Case 1
No scheduled payments: 'No upcoming payments scheduled.'
Edge Case 2
Payment run is SUSPENDED (billing on hold): each scheduled payment in that run shows 'Suspended' status badge.
Error State 1
Fails to load: inline error with retry.
Permissions
Front Desk Staff (location-scoped), Location Manager, Company Admin. Member: not in Phase 1.
Data Notes
Read: PaymentRunSchedule (Financial Operations Engine), ChargeSchedule (UCE), MembershipFeeSchedule. No writes. Audit: person.payment_schedule_viewed.
### Functional Requirements — US-MPE-046
System Inputs
GET /admin/members/{person_id}/payment-schedule?from=&to=
System Outputs
200: { scheduled_payments: [{ scheduled_date, description, amount_cents, currency, payment_run_status, source_type: MEMBERSHIP|SERVICE|PAYMENT_PLAN }], total_outstanding_cents }
Business Rules
from defaults to today. to defaults to today + 90 days. Max window: 365 days. Only future payments shown (scheduled_date >= today). Read from FOE payment run schedule + UCE committed-but-unpaid charges.
Performance
p95: 800ms.
Permissions
FRONT_DESK (location-scoped), LOCATION_MANAGER, COMPANY_ADMIN: read. MEMBER: 403 in Phase 1.
Data Touched
Read: PaymentRunSchedule, ChargeSchedule. Audit: person.payment_schedule_viewed.
# Non-Functional Requirements
Category
Requirement
PHI-Safe Logging
All fields in EmergencyContact, MemberMedical, and Assessment entities must use PHI-safe audit logging. Field names changed are recorded; old/new values are NEVER recorded in audit payloads or structured logs.
RBAC — Medical Gate
Endpoints under MPE-F08 and MPE-F09 require medical_data_access RBAC permission in addition to role. 403 returned without this permission. Access attempt without permission generates a security audit event.
RLS
All new entities include company_id and are subject to Row Level Security. Cross-tenant reads are impossible at the DB layer.
DSAR Export
All entities introduced in this FRD must be included in the platform DSAR export workflow within 30 days of feature GA.
RTBF
Soft-delete only for MemberNote, Assessment, MemberCondition (deactivate), MemberRestriction (deactivate), PreferredStaff. Hard delete only permitted as part of RTBF redaction flow governed by Compliance BRD. Audit skeleton retained.
Audit Retention
All audit events for MPE module: minimum 3-year retention.
Performance — Timeline
GET /activity-timeline: p95 ≤ 1000ms for 12-month window. Parallel fetch with 800ms source timeout. Graceful degradation on source timeout.
Performance — Conditions at Check-in
GET conditions at check-in: p95 ≤ 300ms. Timeout state shown; check-in not blocked.
Performance — Proficiency Gate
checkProficiencyEligibility: p95 ≤ 100ms. Read replica. Fail-closed on error.
Performance — Restriction Gate
checkMemberRestrictions: p95 ≤ 100ms. Fail-closed on error.
Availability
All extended profile read endpoints: same SLA as core Person record per Azure HIPAA Architecture BRD.
Accessibility
All new admin console and portal surfaces: WCAG 2.1 AA. Full keyboard navigation. Screen reader support for all status badges and severity indicators.