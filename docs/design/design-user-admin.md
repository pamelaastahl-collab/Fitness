# design-user-admin

*Status: Draft · Owner: Day-3 build · Last updated: 2026-05-06*
*Companion prototype: `src/features/user-admin/`*
*Source FRD: `docs/requirements/Admin_User_Management_FRD.{docx,md}` (EPIC-UM v1.0)*

---

## 1. Feature summary

Admin User Management is the governance surface inside the Admin Console for configuring who has access to a Company. Authorised operators (Company Admin, Security Admin, Location Manager, Auditor, Finance Admin) can list and search every Person with a TenantMembership in their authorised scope, drill into a profile, invite a new person with a starting role, change roles, view active sessions, and inspect effective permissions. The full FRD covers 17 stories across 11 sub-features; this prototype implements 13 of them at thin-shell quality and explicitly defers 4 with visible disabled affordances rather than hidden capability.

---

## 2. User value

- A **Company Admin** can find any user in their tenant, audit who has access, invite new staff with a starting role, and revoke role assignments without leaving the directory — replacing today's process of multiple admin tools and email coordination.
- A **Security Admin** can enforce SoD and sole-admin policy directly in the UI: a violating role assignment is blocked *before* the click with a plain-language explanation, not via a post-hoc 422.
- A **Location Manager** sees only the staff in their authorised locations and can only assign the roles they are entitled to grant — making the principle of least privilege legible.
- An **Auditor** has read-only company-wide visibility and can trace any state change back to its actor through the audit tab on every profile.

---

## 3. Primitives & entities touched

| Primitive | Entities | Read · Write · New |
|---|---|---|
| UUM | Person, AuthIdentifier, TenantMembership, RoleAssignment, Session, AuditEvent, ImpersonationSession | Read · Write |
| OH | Company, BusinessEntity, Location, Department | Read |
| UOM | — | N/A |
| UCE | — | N/A |
| **This epic** | **InviteToken** (token_id, person_id, company_id, role_assignment_id, status, created_at, expires_at, accepted_at) | New |

`InviteToken` is FRD-local — defined in `src/features/user-admin/types.ts`, not promoted to `src/types/primitives.ts`.

---

## 4. Roles & scope

| Role | Scope | Capability in this feature |
|---|---|---|
| `COMPANY_ADMIN` | COMPANY | Full read/write on all stories. Can assign any role. |
| `SECURITY_ADMIN` | COMPANY | Full read/write on all stories. Can assign any role. |
| `LOCATION_MANAGER` | LOCATION (multi) | Sees only Persons with a RoleAssignment in their authorised Locations. May assign/revoke only `FRONT_DESK_STAFF` and `INSTRUCTOR_COACH` within their Locations. |
| `AUDITOR` | COMPANY | Read-only on every screen. No write affordances rendered. |
| `FINANCE_ADMIN` | ENTITY | Read-only, entity-scoped. List filtered to Persons with at least one role under that BusinessEntity's Locations. |

**Excluded roles:** `FRONT_DESK_STAFF`, `INSTRUCTOR_COACH`, `DEPARTMENT_LEAD`, `MEMBER`, `GUARDIAN`, `PLATFORM_SUPPORT`, `TAX_BANK_CONFIG_ADMIN` — these have no admin-user-management responsibility. Hitting `/people/directory` shows the PermissionDenied screen.

**Day 2 sidebar pre-wiring** included `FRONT_DESK_STAFF` for `/people/directory` — that's over-permissive vs the FRD; this feature narrows the sidebar entry to the role list above.

---

## 5. Cross-primitive invariants honored

| Invariant | How this feature honors it |
|---|---|
| **UUM-INVARIANT 4** (default-deny scope; every read scope-filtered server-side) | All list/search/profile reads go through `userAdminQueries.ts`, the single seam that enforces actor-scope filtering against the mocks. Components never reach into `mockPersons` directly. |
| **UUM-INVARIANT 5** (SoD: SECURITY_ADMIN + FINANCE_ADMIN cannot coexist on same Person at same scope) | The role picker pre-checks SoD against the target Person's existing active assignments. Conflicting roles are rendered disabled with an inline explanation; submission is impossible. |
| **UUM-SOLE-ADMIN** (cannot revoke last SECURITY_ADMIN at a Company) | The Roles tab pre-computes whether each role is the last admin of its kind for the Company. Revoke buttons on the last `SECURITY_ADMIN` are disabled with a plain-language tooltip naming the constraint. Backend revoke also re-checks. |
| **Tenant boundary (UUM Company)** | Every mock query takes `company_id` explicitly. No store function leaks across tenants. |
| **PHI-safe display** (FRD BR-UM-002) | `<MaskedField>` ui-extension renders email as `user@***.***` and phone as last-4 unless actor holds a `manage_users:read_contact`-equivalent capability. The capability check sits in `userAdminQueries.ts`. |
| **Audit completeness** (UUM-INVARIANT 8) | Every state change funnels through `userAdminMutations.ts` which calls `useAudit().emit()` before resolving. Multi-write actions (invite = Person + Membership + RoleAssignment + InviteToken) share a `correlation_id`. |
| **Step-up for privileged role assignments** (FRD BR-UM-005) | Privileged role assignments (`SECURITY_ADMIN`, `COMPANY_ADMIN`, `FINANCE_ADMIN`) and contact-method edits go through `<StepUpConfirmDialog>` (a new ui-extension) which simulates the step-up token by requiring confirmation + reason and stamps a fake `step_up_token` on the AuditEvent. The dialog is visibly distinct from a normal confirm — explicit "elevated action" framing. |

---

## 6. Primary user flow

The canonical demo path — a Company/Security Admin invites a new Front Desk staff member, then the Roles tab demonstrates SoD + sole-admin enforcement.

1. **Admin** lands on `/people/directory`. Header shows "{visible} of {total} people in this company, within your scope." Sidebar entry is gated to admin roles per FRD §3 (FRONT_DESK_STAFF removed from Day 2 placeholder).
2. Admin types into search; results narrow at 3 chars, debounced. Filter chips for Role / Status / Location / Created allow combining facets. "Clear all" pill appears when any filter is active.
3. Admin clicks **Invite user**. Dialog opens at step 1 (email).
4. Admin types an email. After 300 ms idle, a duplicate check runs against `mockPersons`:
   - **No match** → "Continue" enables, given/family-name fields appear.
   - **Match without membership in this company** → blue alert "Email already in our platform" with the existing person's name; "Continue" goes to step 2 to add a role to the existing Person (single-write path).
   - **Match with membership in this company** → blocking alert "Already a user in this company" with a deep-link to the existing profile; "Continue" disabled.
5. Admin advances to step 2. Role select shows only roles the actor is permitted to assign (Location Manager: only Front Desk + Instructor). Privileged roles carry a "step-up" pill in the option label.
6. Admin selects **Front Desk Staff** and a Location. A scope picker (`<Select>`) shows ACTIVE locations in this company. SoD pre-check runs on every change; if a conflict exists with this Person's existing roles, an `<Alert>` appears with the conflicting role named — submit button disables.
7. Admin clicks **Send invite** (or **Add role** for the existing-person path). For non-privileged roles, the action commits directly. For privileged roles, the StepUpConfirmDialog opens with: amber header chip "Elevated action — step-up required", action label, impact bullets, required reason field (≥10 chars), and an amber "Confirm with elevated auth" button.
8. On commit:
   - **New person path:** `Person` is created (`person.created` audit), `TenantMembership(INVITED)` (`user.invited` audit), `RoleAssignment(ACTIVE)` (`role.assigned` audit), `InviteToken(PENDING)`. All four writes share a `correlation_id`. A wrapping `admin.user_invited` event references the membership_id with `step_up_token` if applicable. Toast: "Invite sent (simulated). Expires in 7 days."
   - **Existing person path:** A single `RoleAssignment` is added; `admin.role_assigned` audit. Toast: "{Role} granted to {Name}."
9. Directory list re-renders (the route subscribes to `useRoleAssignmentsStore` + `useTenantMembershipsStore`). The new person appears with `INVITED` status badge and a "Pending acceptance" inline label.
10. Admin clicks the row → navigates to `/people/directory/:personId`. Header shows name, status, primary location. Tabs Overview · Roles · Sessions · Audit. The Pending Invite card on Overview offers **Resend invite** (revokes the old token, creates a new one with fresh 7-day TTL, audited as `admin.invite_resent`).
11. On the **Roles** tab, the actor can Assign or Revoke. Revoke is disabled with a tooltip when (a) the actor's role doesn't permit revoking that target role, or (b) the target is the only `SECURITY_ADMIN` at COMPANY scope. The disabled affordance is the demo-load-bearing thing — the constraint is legible *before* the click. The Revoke dialog requires a reason ≥5 chars; on commit, `admin.role_revoked`.
12. Switching dev users (Cmd+Shift+U) to a different role-persona changes the directory contents and the affordances. Auditor sees full list, no write buttons. Location Manager sees a smaller list and only Front Desk + Instructor in the role picker.

---

## 7. Key screens & states

### 7.1 `/people/directory` — User List (`UserListRoute`)

- **Default:** Header with visible/total count, search input, filter chips, Export (disabled with tooltip — US-UM-017 deferred), Invite button (gated on capability), data table with rows for every Person + Membership in scope.
- **Empty (no users in scope):** Dashed-border card with Users icon, copy "{Actor name}, you're seeing everyone you have authority over. Invite the first one to get started."
- **Empty (filters active, zero matches):** Same card, copy "No users match your filters. Try adjusting filters." Plus a "Clear all filters" outline button.
- **Search query <3 chars:** Inline amber notice "Search needs at least 3 characters." List remains rendered without query filter applied.
- **Loading:** `UserListTable` accepts a `loading` prop and renders 6 skeleton rows. (Currently unused since the prototype is sync; kept for the eventual real fetch.)
- **Permission-denied:** Actor with no list-capability → `Navigate` to `/no-access`. Sidebar entry is also hidden, so unauthorised actors don't normally reach the route.

### 7.2 `/people/directory/:personId` — User Profile (`UserProfileRoute`)

- **Header:** back-link to Directory, name with inline-edit pencil, status badge, "this is you" pill on self, contact row (email/phone via `MaskedField`, masked unless `users.read_contact` capability), Actions overflow menu (Deactivate / Delete disabled with deferred-story tooltips).
- **Tabs:** Overview · Roles · Sessions · Audit (Audit tab visible only with `users.view_audit`).
- **Overview tab:** Identity card (type, status, photo, DOB, minor pill, created/updated). Active roles card. Pending invite card (amber-tinted, only when an active token exists; offers Resend). Effective Permissions card (collapsible, emits `admin.effective_permissions_viewed` on first reveal).
- **Roles tab:** Active-roles list. Each row: `RoleBadge` with scope label, granted-by + granted-at, optional reason code, "Sole admin" amber pill when applicable, Revoke button (disabled when actor lacks capability OR sole-admin guard fires). Assign Role button gated to actors with `assign_role.*` capability. Revoke modal with required reason ≥5 chars.
- **Sessions tab:** List of mock Sessions with surface icon, auth method, established/last-active, status. Active sessions get Terminate button (gated on capability). Footer note flags the simulation.
- **Audit tab:** Reverse-chrono list (latest 50 of N) of AuditEvents that touch this Person — as actor, as Person target, as role-assignment target, or as membership target. Each event shows event_type, actor, occurred_at, before/after JSON.
- **Permission-denied (person not in scope):** `Navigate` to `/no-access`. Renders identically whether the personId is bogus or merely out-of-scope — the FRD's "404 vs 403" distinction is collapsed for the prototype.
- **Self profile:** Same shell, but Edit Name and Actions overflow are suppressed. (Open question OQ-UM-5: where does self-profile editing live? Logged.)

### 7.3 Invite User dialog (`InviteUserDialog`)

- **Step 1 default:** Email input with mail icon. Below: dynamic alert depending on duplicate-check state (idle → no alert; checking → "Checking…"; reusable → blue alert with reusable-person name; blocked → red alert with deep-link to existing profile).
- **Step 1 ready (no duplicate):** Given-name + family-name inputs appear. Continue enabled when both filled and email present.
- **Step 1 ready (reusable):** Given/family inputs hidden — we'll reuse the existing Person.
- **Step 2 default:** Role select with assignable-set filter, scope select when role requires non-COMPANY scope, SoD pre-check alert (red) when violated, privileged-role alert (yellow) when role triggers step-up.
- **Step 2 SoD-blocked:** Submit disabled, alert names existing+proposed role.
- **Step 2 step-up required:** Submit opens `StepUpConfirmDialog`; commit happens after dialog confirm.
- **Submit success:** Dialog closes, toast confirms, list refreshes.
- **Permission-denied:** Component returns `null` when actor lacks `users.invite` (additionally the trigger button isn't rendered in the list header).

### 7.4 StepUpConfirmDialog (shared `ui-extension`)

- **Default:** Amber-tinted "Elevated action" pill, action label, description, impact bullets, required reason textarea (≥10 chars), "Confirm with elevated auth" amber CTA.
- **Reason invalid (<10 chars):** Confirm disabled.
- **Confirm:** Synthesizes a `prototype-stepup-{uuid}` token, fires `onConfirm({step_up_token, reason})`, closes.
- **Cancel:** Resets reason, closes.

---

## 8. Immutability & snapshot affordances

N/A — Admin User Management does not commit immutable financial records. RoleAssignments are revocable (status changes); they don't carry snapshot fields. AuditEvents are immutable, but rendered as a feed (no "edit" affordance to suppress).

---

## 9. Audit events emitted

| event_type | Trigger | Allowlisted payload fields |
|---|---|---|
| `admin.user_list_viewed` | First mount of `/people/directory` per session | actor, scope, `result_count`, `filters_applied` (keys only — no PII values per FRD §FR US-UM-001) |
| `admin.user_profile_viewed` | Mount of `/people/directory/:personId` for a visible person | actor, scope, `target_entity_id` (person_id) |
| `admin.user_invited` | Successful invite submit (wraps the multi-write) | actor, scope, `target_entity_id` (membership_id), `correlation_id`, `after_value: { person_id, role_code, invite_token_id, step_up_token? }` |
| `admin.invite_resent` | Resend on Pending Invite card | actor, scope, `target_entity_id` (new token_id), `correlation_id`, `after_value: { person_id, expires_at }` |
| `admin.user_name_edited` | Name save in profile header | actor, scope, before/after `{given_name, family_name}` |
| `admin.role_assigned` | Successful role-assign mutation (wraps the underlying `role.assigned` from the mocks) | actor, scope, `target_entity_id` (assignment_id), `after_value: { person_id, role_code, step_up_token?, reason? }` |
| `admin.role_revoked` | Successful revoke from the Roles tab | actor, scope, `target_entity_id` (assignment_id), before/after `{role_code, status}` plus reason |
| `admin.session_terminated` | Terminate button on Sessions tab | actor, scope, `target_entity_id` (session_id), before/after `{status}` plus reason |
| `admin.effective_permissions_viewed` | First expand of the Effective Permissions panel | actor, scope, `target_entity_id` (person_id) |

**Not yet emitted** (deferred with their stories):
- `admin.user_contact_edited` — US-UM-009
- `admin.user_deactivated` — US-UM-012
- `admin.user_deleted` (immutable, never-purge) — US-UM-013
- `admin.user_export_generated` — US-UM-017

The mock-store-level events (`person.created`, `user.invited`, `role.assigned`, `role.revoked`, `tenant_membership.activated`) still emit underneath the wrappers — feature-level emissions sit on top so the trail has a per-FRD-story granularity.

---

## 10. Microcopy decisions

- **Disabled-affordance tooltips name the upstream dependency**, not the story ID alone. Example: *"Deactivation cascades to memberships and bookings — available once those modules ship (US-UM-012)."* The story ID is the breadcrumb; the cause is the message.
- **Step-up dialog header** is "Elevated action — step-up required" (uppercase pill, amber tint), distinct from any normal confirm. The confirm button copy is **"Confirm with elevated auth"** rather than "Confirm" so the elevated moment is unmistakable.
- **Sole-admin guard tooltip:** *"Sole-admin protected — cannot revoke the only Security Admin."* Plus an inline "Sole admin" pill on the role row so the constraint is visible without hover.
- **SoD violation alert:** Names *both* the existing role and the proposed role, e.g., *"This person already holds Finance Admin at this scope. Granting Security Admin would violate platform SoD policy."* The user shouldn't have to remember which pair is illegal.
- **Duplicate-check copy** distinguishes three states explicitly:
  - *"Already a user in this company"* (blocking) with deep-link to profile
  - *"Email already in our platform"* (reusable, blue alert) — explains they aren't yet in *this* company
  - silent (no-match)
- **Pagination footer:** *"Pagination is in-memory for this prototype. Server-side pagination (page_size 25, max 100) is specified in FRD US-UM-001 §FR."* — honest about the prototype concession, references the FRD.
- **Resend invite toast:** *"Invite resent (simulated). New token expires {date}."* — the parenthetical "simulated" is consistent across all simulated actions.
- **Empty list (filters active):** *"No users match your filters."* — uses *match*, not *match your search*, since search is just one of several filter dimensions on the same screen.
- **Empty list (no filters):** addresses the actor by given name, e.g. *"Leila, you're seeing everyone you have authority over."* — turns the empty state into a positive about scope rather than implying broken data.

---

## 11. Design system additions

Two proposed additions, both promoted from this feature:

- **`<StepUpConfirmDialog>`** — `src/components/ui-extensions/StepUpConfirmDialog.tsx`. Used wherever an action requires elevated confirmation: privileged role assignment, contact edit, deactivate, delete. Visually distinct from a normal confirm (warning-tone header, required reason field, "Confirm with elevated auth" CTA). Even though the prototype's step-up is simulated, the affordance is the point.
- **`<MaskedField>`** — `src/components/ui-extensions/MaskedField.tsx`. Renders PHI-safe values (email, phone) with masked vs unmasked states and a permission-aware reveal hook. Used in the user list table, profile header, and role assignment review screen.

Both are proposed for promotion to the design system *before* being slipped into the feature folder, per CLAUDE.md.

---

## 12. Decisions log

- **2026-05-06**: Accepted FRD scope at 13 of 17 stories for the prototype. The deferred 4 (US-UM-009, US-UM-012, US-UM-013, US-UM-017) all depend on infrastructure not present in the prototype (notification engine, membership/booking cascade, compliance-hold service, async export queue). Building them as theatre would mismatch the FRD spec and mislead stakeholders. See §14 for the full deferral list.
- **2026-05-06**: List, filter, and search (US-UM-001, US-UM-002, US-UM-003) collapse onto a single screen rather than three. Filters and search are UI affordances on the list, not separate routes — the FRD's three-story split is a backlog artifact, not a UX claim.
- **2026-05-06**: Invite is a modal/sheet rather than a separate route. The two-step structure (US-UM-004 → US-UM-005) reflects the duplicate-check decision point, not a navigation transition.
- **2026-05-06**: Roles tab on the User Profile owns assign/revoke for this prototype since Day 4's Roles feature was deferred. If/when Day-4 Roles lands a dedicated role-assignment surface, the Roles tab here may become a deep-link into that feature instead of a self-contained editor. Logged so future-me knows why both surfaces exist.
- **2026-05-06**: Step-up is simulated via `<StepUpConfirmDialog>` with a required reason field. The prototype stamps a fake `step_up_token` on the resulting AuditEvent so the trail is complete-shaped, even though the token is not cryptographically real. The visible UI affordance is the load-bearing part for this week's stakeholder demo.
- **2026-05-06**: Bootstrap actor stays Leila Patel (LOCATION_MANAGER at Auckland) — chosen on Day 2 to exercise scope-filtering out of the gate. Cost: she sees a smaller directory than a Company Admin would. Benefit: every demo opens with the scope-aware UI legible. Use Cmd+Shift+U → Sarah Chen (COMPANY_ADMIN) to see the unrestricted view.
- **2026-05-06**: Roles tab on the Profile owns assign/revoke directly (instead of deep-linking to a separate "Roles" feature) because Day 4's Roles feature was deferred. When/if that feature lands, this Roles tab can either remain canonical for person-centric editing or become a deep-link wrapper — see OQ-UM-2.
- **2026-05-06**: Audit emissions sit at *two* layers — feature-level (`admin.*` events emitted by `mutations.ts`) and store-level (`person.created`, `role.assigned`, etc. emitted inside the mock stores). This is intentional duplication for the prototype: the feature layer carries FRD-story granularity (per US-UM-NNN), while the store layer carries primitive-level facts. In production these would be one or the other; the prototype demonstrates both shapes.
- **2026-05-06**: All scope-aware reads funnel through `queries.ts`, all writes through `mutations.ts`. Feature components do not import from `@/mocks` directly except for two cases where reactivity requires it (the route subscribes to specific stores so re-renders fire on mutation). This is the load-bearing rule for UUM-INVARIANT 4.

---

## 13. Open questions

- **OQ-UM-1 (duplicate detection breadth)** — FRD US-UM-004 specifies real duplicate detection across email, name+DOB, phone with a confidence-tiered match. Prototype implements email-equality only. Decide before engineering handoff: which matchers run, in what order, with what UX (auto-merge vs prompt vs warn-and-allow).
- **OQ-UM-2 (Day 4 Roles boundary)** — When the Roles feature lands, does it absorb assign/revoke entirely (this feature's Roles tab becomes a deep-link), or does it sit alongside (catalog-of-role-definitions + matrix view, with assign/revoke staying here)? Affects the Profile Roles tab's surface area.
- **OQ-UM-3 (LOCATION_MANAGER cross-location visibility)** — If a Person holds roles at both Location A and Location B, and the actor manages only Location A, do they see the Person at all? FRD implies yes (because they're partly in scope), but the Person card would show roles outside the actor's authority. Prototype shows the Person but masks out-of-scope role chips with a "scoped to {role}" placeholder. Confirm with security stakeholders.
- **OQ-UM-4 (Effective permissions presentation)** — US-UM-016 asks for "effective permissions" but doesn't specify the shape (flat capability list? grouped by surface? grouped by scope?). Prototype renders flat `capability:scope` strings grouped by scope. Easy to revisit.
- **OQ-UM-5 (Self-modification rules)** — FRD edge case in US-UM-010 covers self-assigning Security Admin. What about self-revoking, self-deactivating, self-renaming? Prototype disables all self-mutation actions on the actor's own Profile with a tooltip ("Use account settings to manage your own profile") and defers the actual settings surface.

---

## 14. Deferred work — to be brought back later

*This section is the source of truth for what this prototype intentionally did **not** build. Each entry must be addressable: when the upstream dependency lands, this list is the punch-list for completing the feature. Do not delete entries; mark them `LANDED in {sprint}` once shipped.*

### 14.1 Deferred user stories

| Story | Title | Why deferred | What's needed to bring it forward | Demo treatment in prototype |
|---|---|---|---|---|
| **US-UM-009** | Edit User Contact Method (Step-Up Required) | Requires real step-up auth + verification email via Notification Engine. Without those, the form is a stub that misleads about the security model. | (1) Real step-up token issuance per Security Posture §SP-F02. (2) Notification Engine integration with verification-email template and async queue. (3) `AuthIdentifier.verified_at` write contract. | Profile Overview shows email and phone with an "Edit" pencil icon; clicking opens a tooltip "Contact-method changes require step-up auth — available next sprint." |
| **US-UM-012** | Deactivate User Account | Requires membership-cancellation cascade + booking-cancellation cascade. Prototype mocks have no Memberships or Bookings, so the cascade is theatrical. The deactivation itself is simple, but the cascade is the point of the story. | (1) Membership entity + cancel API. (2) Booking entity + cancel API. (3) Session-revocation contract. (4) `TenantMembership.status = DEACTIVATED` transition rules. | Profile "Actions" overflow menu shows "Deactivate user…" disabled with tooltip "Deactivation cascades to memberships and bookings — available once those modules ship." |
| **US-UM-013** | Permanently Delete User Account | Requires Compliance-Holds service for the pre-delete check. Without it the action is a hard-delete with no safety net — the opposite of what the FRD spec describes. | (1) Compliance-Holds service with `holds_block_deletion(person_id) → boolean`. (2) Hard-delete vs soft-delete decision per UUM-DUP-004 (`merged_into_person_id` pattern). (3) Step-up auth. (4) `person.deleted` immutable audit event. | "Delete user permanently…" in the Actions menu, disabled with tooltip "Requires compliance-holds clearance — available once compliance module ships." Visible at `INACTIVE` status only, per FRD precondition. |
| **US-UM-017** | Export User List as CSV | FRD specifies async export via Notification Engine (the user receives an email with a download link). Building a sync download instead would mismatch the spec; stubbing the async path adds infra we don't have. | (1) Notification Engine async-job contract. (2) Long-running export worker. (3) Signed download URL with TTL. (4) PHI-safe field allowlist for export. | List page shows an "Export" button enabled but rendering a tooltip on hover: "CSV export is sent by email — available once Notification Engine integration ships." |

### 14.2 Within-story deferrals

Items inside stories we *did* build, where we made a prototype-scope concession:

| Where | What we built | What we deferred | Why |
|---|---|---|---|
| US-UM-001 list | Filtering and pagination as in-memory mock query | Index `(company_id, status, created_at)` and P95 ≤ 2,000ms target | No DB. Prototype is small; no perf budget meaningful. |
| US-UM-001 audit | `admin.user_list_viewed` emitted on first list mount | Not throttled; FRD doesn't specify but production likely will | Spec gap; flag for product. |
| US-UM-003 search | Email-equality + name substring on the in-memory store | Real search-index partitioned by `company_id`, with token analysis | No search infra. Behaviour matches in single-tenant mock. |
| US-UM-004 invite | Duplicate check on email equality only | Name+DOB and phone matchers per UUM-DUP contract | See OQ-UM-1. |
| US-UM-005 invite | InviteToken status set to `PENDING` and never auto-expires | 7-day TTL + `EXPIRED` transition | No scheduler. We expose a "Mark expired (dev)" affordance on the invite for demo purposes. |
| US-UM-006 resend | New token created, old set to `REVOKED`, audit emitted | Real email send via Notification Engine | No notification infra. Toast confirms "Resent (simulated)." |
| US-UM-010 / 011 role assign/revoke | Sole-admin and SoD pre-checks, simulated step-up via `<StepUpConfirmDialog>` | Real step-up token per Security Posture §SP-F02; live session-refresh propagation within 60s | Step-up is simulated with audit-trail completeness. Sessions tab is read-only (US-UM-014/015 below). |
| US-UM-014 sessions list | Renders mock Session records for the target Person | Real session store, IP-hash correlation, device-fingerprint display | We have mock Sessions seeded; we display them. |
| US-UM-015 terminate session | Marks session `TERMINATED`, emits `admin.session_terminated` | Real revocation propagation via Security Posture's revocation contract | No live sessions to revoke; the UI affordance and audit trail are the demo. |
| US-UM-016 effective permissions | Computes from active RoleAssignments + a small in-feature role-permission matrix | Authoritative RBAC resolver shared with runtime authz | Prototype matrix lives in `src/features/user-admin/rolePermissions.ts`. Will need to converge with the production resolver — flagged for engineering handoff. |

### 14.3 Stories mapped to where they're satisfied

| Story | Where in this prototype |
|---|---|
| US-UM-001 View Paginated User List | `/people/directory` — table with pagination |
| US-UM-002 Filter User List | `/people/directory` — filter chips (role, status, location, date) |
| US-UM-003 Search Users | `/people/directory` — search input (debounced 300ms) |
| US-UM-004 Invite — Email & Duplicate Check | Invite modal step 1 |
| US-UM-005 Invite — Assign Role and Scope | Invite modal step 2 + step-up dialog |
| US-UM-006 Resend Invite | Invite row action on User List + invite-status modal |
| US-UM-007 View User Profile | `/people/directory/:personId` — Overview tab |
| US-UM-008 Edit User Name | Profile Overview — inline edit |
| US-UM-009 Edit Contact Method | **Deferred** — disabled affordance |
| US-UM-010 Assign Role to User | Profile Roles tab — Assign Role button + step-up |
| US-UM-011 Revoke Role from User | Profile Roles tab — per-row Revoke with sole-admin guard |
| US-UM-012 Deactivate User | **Deferred** — disabled menu item |
| US-UM-013 Permanently Delete User | **Deferred** — disabled menu item |
| US-UM-014 View Active Sessions | Profile Sessions tab |
| US-UM-015 Terminate Session(s) | Profile Sessions tab — per-row Terminate |
| US-UM-016 View Effective Permissions | Profile — "Effective permissions" expandable panel |
| US-UM-017 Export User List | **Deferred** — disabled button with tooltip |

---

*End of design-user-admin.md. Companion prototype: `src/features/user-admin/`.*
