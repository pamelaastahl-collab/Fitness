[DESIGN_TEMPLATE.md](https://github.com/user-attachments/files/27382147/DESIGN_TEMPLATE.md)
# DESIGN_TEMPLATE.md

*Reusable scaffold for every feature `design-{feature-slug}.md` in this prototyping effort. Authoritative — copy and fill, do not restructure.*

---

## How to use this template

Copy this file, rename to `design-{feature-slug}.md`, and fill every section. Sections marked **Required** must have substantive content; sections marked **Conditional** may be skipped only with an explicit "N/A — [reason]" line. Never delete a section header.

The structure is ordered to force synthesis-before-design: you state which primitives and roles are involved, *then* describe screens, *then* enumerate edge states. If you can't fill section 3 (Primitives & Entities Touched) cleanly, you don't yet understand the feature well enough to design it.

---

## Template structure and rationale

| # | Section | Required? | Why it exists |
|---|---|---|---|
| 1 | Feature summary | Required | Anchors everyone on what's being built and why it matters to the user. One paragraph max. |
| 2 | User value | Required | Forces a clear "who benefits and how" statement. Prevents feature drift. |
| 3 | Primitives & entities touched | Required | The composition checklist. Surfaces architectural risk early. |
| 4 | Roles & scope | Required | Names every role that can see or act on this feature, and at what scope. Catches permission gaps before they reach screens. |
| 5 | Cross-primitive invariants honored | Required | Explicitly cite invariants from PRIMITIVE_RELATIONSHIPS.md and the four primitive docs. Forces you to reason about immutability, idempotency, snapshot fields, SoD, scope. |
| 6 | Primary user flow | Required | Step-by-step happy path. Includes who acts at each step. |
| 7 | Key screens & states | Required | Lists every screen the prototype renders, and every state each screen can be in (default, empty, loading, error, permission-denied, success). |
| 8 | Immutability & snapshot affordances | Conditional | When the feature touches published OfferingVersions, committed Charges, or snapshot fields, describe the visual treatment. Skip with N/A only if the feature touches no immutable data. |
| 9 | Audit events emitted | Required | Lists each `AuditEvent.event_type` this feature emits, with trigger and payload-allowlisted fields. |
| 10 | Microcopy decisions | Conditional | Capture button labels, dialog titles, error messages where the choice matters. Skip if microcopy is fully derivable from the style guide. |
| 11 | Design system additions | Conditional | If the feature requires a new pattern not in the style guide, document it here for promotion. Skip with N/A if no new patterns. |
| 12 | Decisions log | Required | Date-stamped entries: "We chose X over Y because Z." Captures the *thinking* the prototype embodies. |
| 13 | Open questions | Required (may be empty) | Anything unresolved. Always present, even if "None at this time." |

---

## The template (copy from this point down)

# design-{feature-slug}

*Status: Draft │ In Review │ Approved* · *Owner: {name}* · *Last updated: {YYYY-MM-DD}*
*Companion prototype: `prototype-{feature-slug}`*

---

## 1. Feature summary

*One paragraph. What is this feature? What does it let someone do?*

> Example: This feature lets a Company Admin create, configure, and publish a CLASS offering — including time, capacity, staffing, and pricing modules — and select the Locations and channels where it appears.

---

## 2. User value

*Who benefits, and what specifically gets better for them. Frame as: "{Persona} can now {action} so that {outcome}."*

> Example: A Company Admin can publish a new yoga class offering across three Locations in under five minutes, replacing today's process of editing each location's schedule individually. Members see the class in the booking app the moment publish succeeds.

---

## 3. Primitives & entities touched

*Explicit list. Use the table format. Cite entity names exactly as they appear in the primitive docs.*

| Primitive | Entities | Read │ Write │ New |
|---|---|---|
| UUM | Person, RoleAssignment, Session | Read |
| OH | Company, BusinessEntity, Location | Read |
| UOM | Offering (new), OfferingVersion (new), ModuleAttachment (new), OfferingPublication (new) | Write / New |
| UCE | — | N/A |

---

## 4. Roles & scope

*Every role that can access this feature, with the scope at which they see or act. Cite UUM role codes exactly.*

| Role | Scope | Capability in this feature |
|---|---|---|
| `COMPANY_ADMIN` | COMPANY | Create, configure, publish, retire offerings |
| `REGIONAL_MANAGER` | COMPANY or ENTITY | View only |
| `LOCATION_MANAGER` | LOCATION | View published offerings at their Location; apply governed local overrides |
| `AUDITOR` | any | Read-only; sees publish history and config_hash |

*If a role is intentionally excluded, list it under "Excluded roles" with reason.*

**Excluded roles:** FRONT_DESK_STAFF (no catalog management responsibility), MEMBER (consumer-facing surface is separate).

---

## 5. Cross-primitive invariants honored

*Cite invariants from PRIMITIVE_RELATIONSHIPS.md (XPI-*) and any primitive-internal invariants (e.g. UOM INVARIANT 2). For each, state how the UI honors it.*

| Invariant | How this feature honors it |
|---|---|
| UOM INVARIANT 1 (runtime txns reference OfferingVersion) | The UI never lets you "edit a published offering" — edits create a new draft version. |
| UOM INVARIANT 2 (published versions immutable) | Published version cards show a lock icon and "as published" label. Edit button is replaced with "Create new version." |
| XPI-CAT-03 (publish requires location with active bank/tax) | Locations missing bank/tax config are shown but disabled in the location selector, with hover tooltip explaining why. |
| XPI-AUTH-03 (SoD pairs) | N/A — this feature does not assign roles. |

---

## 6. Primary user flow

*Step-by-step happy path. Number every step. Note who acts and which entity changes at each step.*

1. **Company Admin** clicks "New offering" from the catalog dashboard.
2. UI presents offering type picker. Admin selects CLASS. → System creates Offering (DRAFT) and OfferingVersion v1 (DRAFT).
3. Admin enters name and description.
4. Admin configures required modules per the type-module matrix: Time, Capacity, Pricing. Optional modules (Resource, Staffing) are visible and addable.
5. Admin sets reporting dimensions: category, tax_category, revenue_category. (All required.)
6. Admin selects target Locations and channels in the publication scope step. Locations without active bank/tax config are visible but disabled.
7. Admin reviews the publish summary screen with computed config_hash preview and the cross-module validation results.
8. Admin clicks "Publish offering." → System runs publish validation; on success, OfferingVersion v1 → PUBLISHED, OfferingPublication rows created, `offering.published` AuditEvent emitted.
9. Admin lands on the published offering's detail page with version badge "v1 · Published {date}."

---

## 7. Key screens & states

*Every screen in the prototype, and every state it can be in. Use a sub-heading per screen; bulleted states under each.*

### 7.1 Catalog dashboard

- **Default:** List of offerings with version badge and publication count.
- **Empty:** "No offerings yet" + Create New Offering CTA.
- **Loading:** Skeleton rows.
- **Filter active:** Filtered list with chip showing active filters.
- **Permission-denied:** Read-only mode for non-admin viewers; Create button hidden.

### 7.2 Offering builder (multi-step)

- **Step 1 — Type picker:** Default state with type options.
- **Step 2 — Module configuration:** Default, partially-configured, fully-configured states. Inline validation messages.
- **Step 3 — Reporting dimensions:** Default; "create new dimension" inline. Error if required dimension missing.
- **Step 4 — Publication scope:** Default Location list with disabled rows for ineligible Locations.
- **Step 5 — Publish review:** Validation summary; can be in pass / fail states with specific blockers listed.

### 7.3 Publish confirmation modal

- **Default:** Summary + Confirm Publish button.
- **Validating:** Spinner with "Running publish validation…"
- **Success:** Brief confirmation, redirect to detail page with toast.
- **Validation failed:** Modal stays open, errors listed inline with anchor links to fix-up.

### 7.4 Published offering detail page

- **Default:** v1 with version badge, lock affordance, all configuration shown read-only.
- **With prior version:** Version selector showing v1 (RETIRED) and v2 (PUBLISHED).
- **Permission-denied for editing:** Edit button absent for non-admins.

---

## 8. Immutability & snapshot affordances

*How does the UI make immutability legible? Lock icons, "as sold" / "as published" labels, version badges, etc. Skip with "N/A — feature touches no immutable data" if applicable.*

> Example:
> - Published OfferingVersion cards display a lock icon (Lucide `Lock`, 16px, color-text-muted) and a version badge ("v3 · Published Mar 12, 2026 · 9:00 AM").
> - The "Edit" action is removed from published versions and replaced with "Create new version" (which produces a new DRAFT child of the same Offering).
> - The config_hash is shown in monospace (DM Mono) in the detail page footer with a copy-to-clipboard affordance, for audit and dispute evidence.
> - Retired versions are visible in the version selector with a strikethrough badge and `RETIRED` chip.

---

## 9. Audit events emitted

*Every AuditEvent type this feature emits. Cite event_type exactly as it appears in the primitive doc. Note trigger and payload-allowlisted fields.*

| event_type | Trigger | Allowlisted payload fields |
|---|---|---|
| `offering.created` | New Offering and DRAFT v1 created | offering_id, offering_type, name, actor |
| `offering.draft_updated` | Any field on a DRAFT version changed | offering_version_id, changed_field_keys, actor |
| `offering.published` | Publish succeeds | offering_version_id, version_number, config_hash, target_location_ids, actor |
| `offering.retired` | Prior version retired due to supersession | offering_version_id, retired_at, retirement_reason, actor |

---

## 10. Microcopy decisions

*Capture decisions that aren't trivial. Skip if microcopy is fully derivable from style guide.*

> Example:
> - The publish CTA reads **"Publish offering"** (verb + object), not "Publish" alone. On the confirmation modal it becomes **"Confirm publish"** with the offering name shown in the modal body.
> - When publish validation fails, the inline error pattern is: "{Module name} must be configured before this offering can be published." Always names the specific blocker.
> - The "Create new version" button replaces "Edit" on PUBLISHED versions. Hover tooltip: "Published versions are immutable. Editing creates a new draft version."

---

## 11. Design system additions

*If this feature introduces a new pattern not in the style guide, document it here for review and promotion to the guide. Skip with "N/A — no new patterns" if applicable.*

> Example:
> - **Version badge component:** A pill containing `v{n}` plus status (`PUBLISHED` / `RETIRED` / `DRAFT`) plus relative date. Uses existing badge styles per status; adds the version number prefix in DM Mono. Proposing for promotion to style guide.

---

## 12. Decisions log

*Date-stamped, brief. Capture the thinking the prototype embodies. Format: `YYYY-MM-DD: {decision}. {Why}.`*

> Example:
> - 2026-04-12: Used a multi-step wizard for the offering builder rather than a single long form. Why: the type-module matrix means the field set differs by type; a wizard lets us reveal modules progressively and keep the validation surface scoped per step.
> - 2026-04-13: Validation runs on every step transition, not only at publish. Why: catching errors early is materially less frustrating than failing at the publish click.
> - 2026-04-14: Locations missing bank/tax config are shown disabled rather than hidden. Why: hiding them would mislead admins into thinking the location doesn't exist; showing them disabled with explanation makes the config gap actionable.

---

## 13. Open questions

*Always present. "None at this time" is a valid value but rarely accurate. Cite OQ-NN from PRIMITIVE_RELATIONSHIPS.md when applicable.*

> Example:
> - OQ-08 (config_hash collision on no-op republish) — currently the prototype treats it as a successful publish creating a new version with a duplicate hash. Needs product decision.
> - OQ-14 (where local overrides live) — out of scope for v1 of this feature; the local-override step is shown in the wizard but disabled with "Coming soon" label.

---

*End of design-{feature-slug}.md. Companion prototype must be linked at the top of this file.*
