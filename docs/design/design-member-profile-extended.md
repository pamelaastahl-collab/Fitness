# design-member-profile-extended

*Status: Draft · Owner: Day-3-extension build · Last updated: 2026-05-06*
*Companion prototype: `src/features/member-profile/` + member-aware tabs in `src/features/user-admin/UserProfileRoute.tsx`*
*Source FRD: `docs/requirements/Member_Profile_Extended_Data_FRD.{docx,md}` (46 stories across MPE-F01–F15)*

---

## 1. Feature summary

A member-aware extension of the existing User Profile route. When the Person being viewed has `person_type === 'MEMBER'`, two new tabs appear — Emergency Contact and Conditions — implementing 6 of the 46 stories from the Member Profile Extended Data FRD as a tractable Day-3-extension slice. The remaining 40 stories are explicitly deferred and tracked in §14.

Architectural choice: **the existing User Profile becomes the Member Profile when the Person is a member**, rather than spinning up a separate route. Same URL, same `queries`/`mutations` data-seam pattern, same scope-filter invariant — extended with member-specific entities.

---

## 2. User value

- **Front Desk Staff** can find and call the right emergency contact when something goes wrong, without bouncing between systems.
- **Front Desk + Location Manager** can flag health and safety conditions on a member record in seconds, with an enforced confirmation step for ALERT-severity conditions (so they don't escape into operations un-noticed).
- **Instructors** (when their read-only access lands) and other staff get the safety context they need *before* engaging with the member.
- **Operators** see PHI-safe audit trails of all changes — phone number values and condition note text never appear in audit payloads, only field-change names — which lines up with the operational privacy posture this primitive demands.

---

## 3. Primitives & entities touched

| Primitive | Entities | Read · Write · New |
|---|---|---|
| UUM | Person (read-only context only) | Read |
| OH | Company, Location, Department (scope check via existing user-admin queries) | Read |
| **This epic** | **EmergencyContact** (new, FRD-local) | New / read · write |
| **This epic** | **ConditionType** (new, FRD-local lookup) | New / read |
| **This epic** | **MemberCondition** (new, FRD-local) | New / read · write |

Three new mock stores (`mockEmergencyContacts.ts`, `mockConditions.ts` containing both ConditionType and MemberCondition). All new types in `src/features/member-profile/types.ts` — not promoted to `src/types/primitives.ts` (these are FRD-local, not authoritative primitives).

---

## 4. Roles & scope

Same scope-filter as the parent User Profile (UUM-INVARIANT 4) — if you can't *see* the member, you can't read their emergency contact or conditions.

| Role | Emergency Contact | Conditions |
|---|---|---|
| `COMPANY_ADMIN` | Read + Write | Read + Write |
| `SECURITY_ADMIN` | Read + Write | Read + Write |
| `LOCATION_MANAGER` | Read + Write (location-scoped persons only) | Read + Write (same) |
| `FRONT_DESK_STAFF` | Read + Write (location-scoped) — *will need sidebar+route to enable in a later iteration; today this audience is gated by directory access* | Read + Write (same) |
| `AUDITOR` | Read-only, contact values masked unless they hold `users.read_contact` | Read-only |
| `INSTRUCTOR_COACH` | Read-only (contact values masked) | Read-only per FRD §F02 — write denied |

**Excluded:** MEMBER (can't see admin-side endpoints; member-portal stories US-MPE-005 are deferred), GUARDIAN, FINANCE_ADMIN (no operational responsibility for these flags), TAX_BANK_CONFIG_ADMIN, DEPARTMENT_LEAD.

The current sidebar gates `/people/directory` to admin tier only (no FRONT_DESK_STAFF), so in this prototype the Front-Desk experience is exercised via dev-mode persona switching to a Location Manager.

---

## 5. Cross-primitive invariants honored

| Invariant | How this feature honors it |
|---|---|
| **UUM-INVARIANT 4** (scope-filter every read) | All reads go through `member-profile/queries.ts`; the route's existing `getDirectoryEntry` check gates access to the personId before any member-profile read fires. |
| **PHI-safe audit** (FRD §F01 BR3, §F02 BR3) | Mutations never include phone numbers or note text in audit payloads. EmergencyContact emits `field_names_present` (create) or `field_names_changed` (update). MemberCondition emits `condition_type_id` + booleans for `has_note` / `has_expiry` — text values omitted. The mutations module is the chokepoint that enforces this. |
| **Uniqueness** (one EmergencyContact per Person; one active MemberCondition per (person, type)) | Enforced at both the mock store and surfaced in the UI before submit (Add Contact button hidden when one exists; Add Condition's submit disables when a duplicate would result). |
| **ALERT-severity prominence** (FRD §F02 US-MPE-008 edge 2) | The Add Condition dialog detects `severity === 'ALERT'` on selection and: (a) swaps the CTA copy to "Confirm — flag as ALERT", (b) styles it red, (c) renders an inline warning explaining the visibility consequences (roster + check-in). On the Conditions tab, ALERT rows render at the top with red border, prominent SeverityBadge, and an octagon-alert icon. |
| **Lazy expiry handling** | Real implementation runs nightly auto-deactivation. Prototype evaluates `expiry_date <= today` lazily on read inside `useMemberConditionsStore.listActiveByPerson`. Records past expiry are surfaced in the Historical section with `auto-expired` reason. |
| **Tenant boundary** | Both stores carry `company_id` on every record; queries filter by it. ConditionType seed is duplicated per-tenant (FitFlow Pacific + Iron Harbor) so Iron Harbor never sees FitFlow types and vice-versa. |

---

## 6. Primary user flow

1. A staff actor (e.g. **Leila Patel**, LOCATION_MANAGER) opens `/people/directory`, finds **Olivia Reid** (member), clicks the row.
2. Profile route opens. Because `person_type === 'MEMBER'`, tabs are **Overview · Emergency · Conditions · Roles · Sessions · Audit**.
3. Staff opens **Emergency** tab. Olivia's seeded contact (James Reid, Spouse, mobile + home) renders with masked phone numbers; Leila has `users.read_contact` so the eye-toggle reveals values on demand.
4. Staff edits the contact — clicks Edit → dialog opens pre-filled → updates the work-phone field → Save. The audit payload records `{ field_names_changed: ['phone_work'] }` — not the value.
5. Staff opens **Conditions** tab. Two active rows: HEART_CONDITION (ALERT, red-bordered, pinned to top) and PREVIOUS_INJURY_BACK (INFORMATIONAL). The ALERT row uses the prominent SeverityBadge.
6. Staff clicks **Add condition**. Picks ALLERGY_NUTS (ALERT severity). The dialog renders an inline warning ("This is an ALERT-level condition…") and the CTA changes to a red "Confirm — flag as ALERT". Staff confirms; condition appears at the top of the active list.
7. Later, a different actor needs to deactivate an outdated condition. Click Deactivate → confirmation modal → confirm. Condition moves to the Historical section with `deactivated · {time}` label. Audit emits `person.condition_deactivated`.
8. Auditor persona (via dev switcher) opens the same profile. Both tabs are visible, but Add/Edit/Deactivate buttons are absent. Phone values stay masked unless the eye-toggle is invoked.

---

## 7. Key screens & states

### 7.1 Emergency tab (`EmergencyContactTab`)

- **Default (with contact):** Card with name, relationship, then a phones section listing Mobile / Home / Work — masked or revealed per actor capability. Footer line: "Last updated {time} by {name}. Phone values are excluded from the audit payload — only field-change names are recorded." Edit button visible to writeable roles.
- **Empty:** dashed-border card with shield-check icon, copy "No emergency contact on file. Adding an emergency contact ensures we can reach the right person if something goes wrong." Add Contact button visible to writeable roles.
- **Read-only (Auditor):** card renders identically; no Edit button.
- **Add/Edit dialog:** Inputs for name (required), relationship (required), three phones. Submit disables until at least one phone is present and all phone values are E.164. Inline error when phones invalid; submit-time toast for duplicate-create or missing-phone race.

### 7.2 Conditions tab (`ConditionsTab`)

- **Default:** Active list (severity-ordered: ALERT → WARNING → INFORMATIONAL, then most-recent-first within tier). Each row shows SeverityBadge, label, internal code, optional note, applied-by + applied-when, optional expiry date. Add Condition button.
- **ALERT row:** red border around the card, prominent (icon-led) SeverityBadge, applied first regardless of insertion order.
- **Historical section:** collapsed by default. Header "Historical · {n}" with chevron. Expanded list shows reason (`auto-expired` or `deactivated`) and time.
- **Empty:** "No conditions on file. Use Add condition to flag health or safety context for staff."
- **Read-only (Auditor / Instructor):** Add and Deactivate buttons absent.
- **Add Condition dialog:**
  - Default: Select condition (rendered with inline SeverityBadge per option). Optional note (max 1000 chars). Optional expiry date (must be in future).
  - **Duplicate detected:** alert "Already active" naming the condition; submit disabled.
  - **ALERT chosen:** red alert with octagon-alert icon "This is an ALERT-level condition…"; CTA copy changes to "Confirm — flag as ALERT" with red styling.
  - **Expiry in the past:** inline error, submit disabled.

---

## 8. Immutability & snapshot affordances

N/A — these entities are mutable (EmergencyContact updates in place; MemberCondition is soft-deactivated). No financial commits, no version snapshots.

The audit trail is immutable per the platform-wide AuditEvent contract — that's an existing primitive concern, not specific to this feature.

---

## 9. Audit events emitted

| event_type | Trigger | Allowlisted payload fields |
|---|---|---|
| `person.emergency_contact_created` | Add Emergency Contact submit | actor, scope, target_person_id, `field_names_present[]` (no values) |
| `person.emergency_contact_updated` | Edit Emergency Contact submit | actor, scope, target_person_id, `field_names_changed[]` (no values, no before/after) |
| `person.condition_added` | Add Condition submit | actor, scope, target_person_id, `member_condition_id`, `condition_type_id`, `has_note` (boolean), `has_expiry` (boolean) — note text and expiry date excluded |
| `person.condition_deactivated` | Deactivate confirm | actor, scope, target_person_id, `member_condition_id`, `condition_type_id` |

**Emergency Contact view-event** (`person.emergency_contact_viewed`) and **Conditions view-event** (`person.conditions_viewed`) are specified by the FRD but not yet emitted — the existing `admin.user_profile_viewed` covers profile-mount; per-tab view-events can land alongside the tab-specific audit-throttling decision (logged as OQ in §13).

---

## 10. Microcopy decisions

- **PHI-safe footer line** on the Emergency Contact card calls out the audit posture explicitly: *"Phone values are excluded from the audit payload — only field-change names are recorded."* This is the kind of operator-trust copy that makes the privacy promise legible in-product.
- **ALERT CTA**: copy and color shift on the Add Condition button — *"Confirm — flag as ALERT"* in red — make the elevated nature of the action unmistakable. Same pattern as the elsewhere-used `<StepUpConfirmDialog>` but inline rather than modal-on-modal.
- **ALERT warning copy** names the consequences specifically: *"It will be displayed prominently at check-in and on class rosters"* — even though those screens don't yet exist in the prototype, the wording sets the operator's expectation correctly for the future.
- **Empty-state copy** for Emergency Contact pivots from a transactional message to a value statement: *"Adding an emergency contact ensures we can reach the right person if something goes wrong."* This matches the rest of the prototype's empty-state voice.
- **Historical reason labels** (`auto-expired` / `deactivated`) keep the cause visible without forcing a click; for the FRD's expected nightly auto-deactivation, the prototype's lazy-on-read implementation surfaces the same reason text.

---

## 11. Design system additions

- **`<SeverityBadge>`** — `src/components/ui-extensions/SeverityBadge.tsx`. Three tones (INFORMATIONAL / WARNING / ALERT). Compact pill by default; `prominent` prop renders the icon-led variant for high-density surfaces. Designed to be reused on the future Roster (US-MPE-010) and Check-In (US-MPE-011) screens — that's where ALERT-prominence is *required* by the FRD. Promoted before slipping into the feature folder per CLAUDE.md.

`<MaskedField>` and `<StepUpConfirmDialog>` (added in Day 3) are reused without modification — `MaskedField` for the phone display, and the StepUpConfirm pattern is the conceptual sibling of the inline ALERT confirmation here.

---

## 12. Decisions log

- **2026-05-06**: Member-aware tabs live inside the existing `UserProfileRoute` (gated by `person_type === 'MEMBER'`) rather than a separate Member route. Why: the prototype already treats both staff and members as Persons under `/people/directory`; splitting routes by type would create a divergent navigation model with no operational benefit. Cost: the User Admin tab set bleeds into member profiles (Roles tab is mostly just a `MEMBER` row). Acceptable for the prototype; revisit if production wants distinct surfaces.
- **2026-05-06**: New folder `src/features/member-profile/` rather than expanding `user-admin/`. Why: keeps the user-admin surface focused on staff governance; member-profile concerns are conceptually distinct (PHI-safe audit, ALERT severity, expiry semantics). The `UserProfileRoute` imports from both, which is fine.
- **2026-05-06**: Configure-stories US-MPE-001 (emergency-contact field config) and US-MPE-006 (condition types config) deferred. Why: both require a Tenant Settings surface that doesn't exist. Hardcoded a sensible default config (`DEFAULT_EMERGENCY_CONTACT_CONFIG`) and a canonical seed list of 14 condition types (mix of ALERT / WARNING / INFORMATIONAL). When the Settings surface lands these stories slot in cleanly: replace the constants with reads from a `TenantProfileConfig` store.
- **2026-05-06**: Member self-serve stories (US-MPE-005) deferred until the Member Portal surface exists. The Admin-side stories don't depend on the portal; the data shapes are designed so portal-side reuse will be straightforward.
- **2026-05-06**: Roster (US-MPE-010) and Check-In (US-MPE-011) deferred — their surfaces don't exist. Built `<SeverityBadge>` with a `prominent` variant *now* so those screens get the design-system primitive ready to go. The ALERT prominence pattern is exercised on the Conditions tab itself in the meantime.
- **2026-05-06**: Auto-deactivation on expiry runs lazily on read rather than via a scheduler. Why: no scheduler in the prototype, and the demo gets the same observable behaviour (expired records appear in Historical with `auto-expired` reason). Real implementation is a nightly job per FRD §F02 BR.
- **2026-05-06**: PHI-safe audit emission is the load-bearing rule. The mutation seam is the chokepoint — `field_names_changed` for updates, `field_names_present` for creates, condition payload includes `has_note`/`has_expiry` booleans only. No phone values, no note text, no before/after for sensitive fields. This rule applies to every future MPE story and should be lifted to a primitives-doc invariant if MPE expands further.

---

## 13. Open questions

- **OQ-MPE-1 (per-tab view audit)** — FRD specifies `person.emergency_contact_viewed` and `person.conditions_viewed` events. Currently the parent `admin.user_profile_viewed` covers profile-mount. Decision needed: emit per-tab events on tab activation, on first reveal of sensitive content, or rely on the parent? Throttling matters — naive emit-on-tab-click floods the log.
- **OQ-MPE-2 (ALERT prominence on profile header)** — Should ALERT-level conditions surface in the Profile header (always-visible, before any tab opens), so staff see them on any profile click — not just the Conditions tab? FRD scopes ALERT prominence to roster + check-in, not the profile, but the analog argument applies. Resolve when Roster / Check-In are built and we can test the difference.
- **OQ-MPE-3 (Instructor read-only access)** — FRD §F02 grants Instructor read-only on Conditions. Today the prototype gates `/people/directory` to admin-tier only via the sidebar; an Instructor persona can't reach a member profile. To exercise the read-only state, we'd need either (a) a different entry point for Instructors (e.g., class-roster → member detail), or (b) widen sidebar `/people/directory` to include Instructor. (a) is cleaner but requires Roster.
- **OQ-MPE-4 (Tenant config UX shape)** — When the Settings surface ships, will field-visibility config and condition-type config live on the same page, in different sub-areas, or as a dedicated "Member Profile Configuration" section? Affects discoverability for Company Admins.
- **OQ-MPE-5 (Note text PHI exposure on display)** — Note text is shown in the Conditions tab (e.g., "Mitral valve prolapse — cleared by cardiologist"). It's gated by who can read the profile, but doesn't get the per-field reveal-toggle treatment of contact phones. Decision: should note text also be masked-by-default for actors who don't hold a stronger capability than `users.read_contact`?

---

## 14. Deferred work — to be brought back later

*Same convention as `design-user-admin.md`: mark `LANDED in {sprint}` once shipped; do not delete entries.*

### 14.1 Deferred user stories (40 of 46 in the FRD)

| Group | Stories | Why deferred | What's needed |
|---|---|---|---|
| **F01 Configure** | US-MPE-001 | No Tenant Settings surface | Build Settings → Member Profile → Emergency Contact Fields page; replace `DEFAULT_EMERGENCY_CONTACT_CONFIG` with a per-tenant store read |
| **F01 Self-serve** | US-MPE-005 | No Member Portal surface | Build member-portal route + emergency-contact view/edit endpoints |
| **F02 Configure** | US-MPE-006 | No Tenant Settings surface | Build Settings → Member Profile → Condition Types page; replace seeded constants with per-tenant `useConditionTypesStore` writes |
| **F02 Roster + Check-in** | US-MPE-010, 011 | No Roster / Check-In surfaces | Build those screens; reuse `<SeverityBadge prominent>` for ALERT display |
| **F03 Proficiencies (entire feature)** | US-MPE-012 → 016 | Not in this slice; F03's booking-gate story (US-MPE-016) needs the Booking surface | New `mockProficiencyTypes` + `mockMemberProficiencies` stores; new tab on member profile; booking-gate logic against booking system |
| **F04 Restrictions (entire feature)** | US-MPE-017 → 020 | Not in this slice; restriction-gate story (US-MPE-020) needs Booking + Gate surfaces | New stores + tab + booking integration |
| **F05 Notes (entire feature)** | US-MPE-021 → 024 | Not in this slice — would have been Option B's third feature; deferred to keep scope honest | New `mockNoteCategories` + `mockMemberNotes` stores; Notes tab on member profile |
| **F06 Activity Timeline** | US-MPE-025, 026 | Not in this slice; Configure-types story needs Settings surface | New `mockActivityEvents` store; Activity tab on member profile |
| **F07 Booking History** | US-MPE-027 (admin), 028 (portal) | No Booking system data | Booking system + member-portal route |
| **F08 Medical Details** | US-MPE-029 → 031 | P1, deferred | New `mockMedicalDetails` store + clearance-certificate model |
| **F09 Fitness Assessments** | US-MPE-032 → 034 | P1, deferred; configure-types needs Settings | New `mockAssessmentTypes` + `mockFitnessAssessments` stores |
| **F10 Comm Preferences** | US-MPE-035 → 037 | P1, deferred; needs Notification Engine integration for message history | New `mockCommunicationPreferences` + `mockMessageHistory` stores |
| **F12 Alternate Identity** | US-MPE-038 → 040 | P1/P2, deferred | New `mockAlternateIdentity` store + member-portal route for self-serve |
| **F13 Extended Bio** | US-MPE-041 → 043 | P1, deferred | New fields on Person or sidecar `mockBiographicalFields` store |
| **F14 Preferred Staff** | US-MPE-044, 045 | P2, deferred | New `mockPreferredStaffAssignments` store |
| **F15 Forward Payment Schedule** | US-MPE-046 | P2, deferred; reads from financial primitive (UCE) which is Day 4–5 territory | Materialise upcoming charges from UCE schedule data |

### 14.2 Within-story deferrals (the 6 we *did* build)

| Where | Built | Deferred | Why |
|---|---|---|---|
| US-MPE-002 view audit | Profile-level `admin.user_profile_viewed` only | Per-tab `person.emergency_contact_viewed`, `person.conditions_viewed` | Throttling decision needed (OQ-MPE-1) |
| US-MPE-003/004 phone validation | E.164 best-effort regex (`^\+\d{8,15}$`) | Real libphonenumber-js parsing with country-aware formatting | Library cost vs prototype value |
| US-MPE-003 audit | `field_names_present[]` in payload | Production audit shape with full `correlation_id` chain | Acceptable for prototype |
| US-MPE-008 ALERT confirm | Inline alert + CTA color/copy change | Modal-style "are you sure" double-confirm | The inline pattern is sufficient for legibility; modal-on-modal is overkill |
| US-MPE-008 expiry handling | Lazy filter on read | Nightly auto-deactivation job + audit-on-deactivation event | No scheduler in prototype |
| US-MPE-009 deactivation | Direct mutation with confirm dialog | Soft-undo affordance ("Just deactivated — Undo" toast) | Nice-to-have; FRD doesn't require |

### 14.3 Story-by-story map

| Story | Status |
|---|---|
| US-MPE-002 View Emergency Contact | ✅ Emergency tab |
| US-MPE-003 Add Emergency Contact | ✅ Add dialog |
| US-MPE-004 Edit Emergency Contact | ✅ Edit dialog |
| US-MPE-007 View Member Conditions | ✅ Conditions tab (active + historical) |
| US-MPE-008 Add Condition | ✅ Add Condition dialog with ALERT prompt |
| US-MPE-009 Deactivate Condition | ✅ Deactivate confirm |
| (40 others) | Deferred — see §14.1 |

---

*End of design-member-profile-extended.md.*
