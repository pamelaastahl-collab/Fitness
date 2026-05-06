# design-app-shell

*Status: Approved (Day 2 build) · Owner: Day 2 prototype team · Last updated: 2026-05-06*
*Companion prototype: `prototype-app-shell` (the `claude/app-shell-mock-data-RrmpD` branch at HEAD `93647c3+`)*

> Note on shape: the app shell isn't a feature in the user-flow sense — it's the chrome that wraps every feature. This design.md still follows the template so the same structure carries through to every Day 3-5 feature. Sections that don't apply are marked **N/A** with reason.

---

## 1. Feature summary

The app shell is the persistent chrome that every FitFlow feature route renders inside: an impersonation banner (when active), a top bar with logo + scope picker + notification bell + role badge + avatar dropdown, a role-filtered sidebar with five section groups, and a main content region. It establishes the cross-cutting context machinery (Auth, Scope, Impersonation, Audit, Toast) that features consume, plus a placeholder route per Day 3-5 feature so the sidebar nav works end-to-end before any feature ships.

---

## 2. User value

**Any acting Person** can immediately see *who they're acting as*, *at what scope*, and *what they can navigate to*, without scanning the page. **PLATFORM_SUPPORT actors** see an impossible-to-miss banner whenever they're impersonating another Person, with the dual-attribution copy required by the audit trail. **Reviewers** can click the entire sitemap on Day 2 — every placeholder loads — so the engineering hand-off can be evaluated without waiting on feature completion.

---

## 3. Primitives & entities touched

| Primitive | Entities | Read / Write / New |
|---|---|---|
| UUM | Person, Session, TenantMembership, RoleAssignment, ImpersonationSession, AuditEvent | Read (all) · Write (ImpersonationSession via Start/Stop · AuditEvent via every state-changing context call) |
| OH | Company, BusinessEntity, Location, Department, Address, BankAccountConfig, TaxConfig | Read |
| UOM | — | N/A (read-only sitemap entry only) |
| UCE | AuditEvent emissions; the bell counts events scoped to active company | Read |

---

## 4. Roles & scope

The shell renders for **every authenticated Person regardless of role**. What differs by role is which sidebar items are visible.

| Role | Scope | Capability in the shell |
|---|---|---|
| `COMPANY_ADMIN` | COMPANY | Sees all five sidebar sections |
| `SECURITY_ADMIN` | COMPANY | People (Roles & Access, Directory) + Audit Log |
| `FINANCE_ADMIN` | ENTITY | Finance + read-only Charges |
| `TAX_BANK_CONFIG_ADMIN` | ENTITY | (none in Day 2 nav; visible from Org Hierarchy on Day 5) |
| `REGIONAL_MANAGER` | ENTITY | Operations, Catalog, Org Hierarchy |
| `LOCATION_MANAGER` | LOCATION | Operations, People (Directory), Finance |
| `FRONT_DESK_STAFF` | LOCATION | Operations (Dashboard, POS), Directory, Charges/Refunds |
| `INSTRUCTOR_COACH` | DEPARTMENT | Operations (Dashboard) — per OQ-13 default of "department implies parent location read" |
| `DEPARTMENT_LEAD` | DEPARTMENT | Operations (Dashboard) — same as above |
| `AUDITOR` | COMPANY | Read access to almost every section, Audit Log explicitly |
| `MEMBER`, `GUARDIAN` | LOCATION | Default-deny on the admin shell — sidebar is empty, "no active roles" message renders. (Member-facing surfaces are out of scope for this prototype.) |
| `PLATFORM_SUPPORT` | COMPANY (per OQ-X simplification) | Sees the same as a normal user; the impersonation banner is the differentiator. |

**Excluded from shell:** none — every Person at minimum sees the chrome, even if they have zero RoleAssignments at the active company (the empty-state copy explains how to request access).

---

## 5. Cross-primitive invariants honored

| Invariant | How the shell honors it |
|---|---|
| UUM INVARIANT 1 (one Person per human) | AuthContext exposes `currentPerson` as a single source of truth; impersonation swaps the *target* in but preserves `baseActor` separately. |
| UUM INVARIANT 4 (RoleAssignment requires scope) | Sidebar filtering joins on `(role_code, scope_type, scope_id)` triples; default-deny when no assignment matches. |
| UUM §2.7 (impersonation banner mandatory) | `ImpersonationBanner` renders above TopBar inside `AppLayout`, full-width, on every route. Cannot be dismissed except by Stop. |
| XPI-AUTH-01 (every privileged call validates against RoleAssignments) | The shell's filter is client-side only — comments in code state explicitly that real auth re-validates server-side. |
| XPI-AUTH-02 (default-deny) | Persons with no active assignments get an empty sidebar + a copy line directing them to request access. |
| XPI-AUTH-05 (impersonation cannot escalate) | Impersonation flips `currentPerson` to the target; the target's *own* RoleAssignments drive what the sidebar shows. |
| XPI-AUTH-06 (dual-attribution) | AuditContext sets `actor_type='IMPERSONATION'` automatically when active; the banner copy names both impersonator and target. |
| XPI-AUD-01 (every state-changing op emits an AuditEvent) | All context-managed mutations (start/stop impersonation) call `emitAuditEvent`. Mock store CRUD methods do the same. |
| XPI-AUD-02 (PHI-safe payloads) | Audit payloads carry IDs and hashes only; `before_value` / `after_value` are field-level allowlisted. |

---

## 6. Primary user flow

The shell isn't a flow per se — it's *constant context*. The flows it enables are:

1. **Land** — Person navigates to `/`. Shell renders with their identity, scope, and role-filtered nav.
2. **Switch scope** — Person clicks the ScopePicker; cascading 4-column popover lets them pick Company → BE → Location → Department. Selection updates ScopeContext, persists to `localStorage['fitflow:scope']`, and triggers a soft re-render of the active route.
3. **Switch acting person (dev mode)** — Person presses ⌘⇧U or selects "Switch acting person…" from the avatar menu. UserSwitcher dialog opens with all seeded Persons grouped by tenant and sorted by role precedence. Selection swaps `baseActor`, resets scope to the new person's most-specific assignment.
4. **Start impersonation** — (Day 3+ via the People feature) PLATFORM_SUPPORT calls `useImpersonation().startImpersonation(targetId, reasonCode)`. Banner appears, `currentPerson` becomes the target, audit events thereafter carry `actor_type='IMPERSONATION'`.
5. **Hit a permission-denied route** — Per-feature route guards (Day 3+) call `<Navigate to="/no-access" state={{ requiredRoles: [...] }} />`. PermissionDenied renders explaining what role would unlock it and offering a mocked "Request access" toast.

---

## 7. Key screens & states

| Screen | Default | Empty | Loading | Error | Permission-denied |
|---|---|---|---|---|---|
| `/` HomeRoute | Build status board: actor identity + role list + recent audit events + sitemap | If actor has no RoleAssignments, role list shows the default-deny copy | Synchronous render; no loading state | Render-time errors caught by Vite/React error overlay (dev) — no error boundary on Day 2 | N/A — every actor can see this page |
| AppLayout | Banner (when active) + TopBar + Sidebar + Outlet | Sidebar can be empty (default-deny) | N/A | N/A | Wraps the PermissionDenied screen at `/no-access` |
| TopBar | Logo + scope picker (full path) + bell + role badge + avatar | Bell shows no badge if no recent events | N/A | N/A | N/A |
| Sidebar | 5 sections, role-filtered | "No roles" copy when filter empties | N/A | N/A | N/A |
| ScopePicker | 4-column cascading popover with breadcrumb-trigger | Empty columns show "No X at this scope" | N/A | N/A | Columns hide rows the actor lacks role at |
| ImpersonationBanner | Hidden | N/A — only renders when active | N/A | N/A | N/A |
| `/no-access` PermissionDenied | Heading + attempted route + roles needed + Request access | N/A | N/A | N/A | N/A — this *is* the denied state |
| Feature placeholders (10 routes) | Day badge + name + description + "Coming Day N" card | N/A | N/A | N/A | (Per-route guards added with each feature, Day 3+) |

---

## 8. Immutability & snapshot affordances

**N/A** for the shell itself — no immutable records are surfaced or edited in this layer. The shell *enables* immutability affordances by exposing `formatRole` / scope helpers in `lib/format.ts` and the `RoleBadge` ui-extension; features that show committed Charges or published OfferingVersions will introduce an `ImmutabilityLock` ui-extension as part of their work (proposed for Day 3 with F2 POS Sale).

---

## 9. Audit events emitted

The shell emits events through ImpersonationContext + indirectly via the mock CRUD layer. AuditContext auto-fills actor / scope / company on every emission. Per XPI-AUD-02, payloads are ID-only.

| `event_type` | Trigger | After-value fields |
|---|---|---|
| `impersonation.started` | `ImpersonationProvider.startImpersonation()` | `reason_code`, `target_person_id` |
| `impersonation.ended` | `ImpersonationProvider.stopImpersonation()` | `status: 'TERMINATED'` |

Other audit events emitted by the seed-time backfill on bootstrap (120 events covering company/entity/location/department creation, role assignments, offering lifecycle, charge commits, adjustments, refunds) populate the recent-activity card on HomeRoute and the bell counter.

---

## 10. Microcopy decisions

- **Bootstrap actor name** is shown as "Welcome, {given_name}." — first-name only per style guide §Microcopy.
- **Sidebar empty state**: "You have no active roles in this tenant. Contact your admin to request access." — explicit about scope (this tenant) so the actor knows the issue isn't global.
- **PermissionDenied heading**: "You don't have access to this view." — second-person, declarative, names the scope problem in body copy not the heading.
- **PermissionDenied request-access toast**: "Request submitted" + body "Your administrator will review the request. (Mocked in prototype.)" — explicit "(Mocked)" disclosure so demos don't accidentally promise behavior the prototype can't deliver.
- **Impersonation banner**: "Acting as {target} — {role}. Signed in as {impersonator}. All actions emit dual-attributed audit events." — front-loads who, then who, then audit promise. Stop button is labeled "Stop impersonating" not "Stop" or "Cancel".
- **Avatar dropdown dev-switcher item**: "Switch acting person…" — ellipsis signals dialog opens, "acting" matches AuthContext terminology.
- **Day badges in sidebar**: "D3" / "D4" / "D5" — short for sidebar density; expanded to "Day N" in placeholder bodies.

---

## 11. Design system additions

Three reusable primitives introduced this day. All belong in the design system; documented here for promotion in the next pass.

### `RoleBadge` (`src/components/ui-extensions/RoleBadge.tsx`)
Pill displaying a role-code with optional scope label. Tier-driven palette:
- **A — admin / governance** (filled primary): COMPANY_ADMIN, SECURITY_ADMIN, FINANCE_ADMIN, TAX_BANK_CONFIG_ADMIN, AUDITOR
- **B — managers / leads** (outline primary on light primary bg): REGIONAL_MANAGER, LOCATION_MANAGER, DEPARTMENT_LEAD
- **C — staff** (outline neutral): INSTRUCTOR_COACH, FRONT_DESK_STAFF
- **D — members / guardians** (subtle neutral): MEMBER, GUARDIAN
- **X — platform support** (warning treatment): PLATFORM_SUPPORT

### `ImpersonationBanner` (`src/components/ui-extensions/ImpersonationBanner.tsx`)
Full-width persistent warning banner. Treatment: `--color-warning-light` background, 2px `--color-warning` bottom border, 3px inset left accent (also warning), `AlertTriangle` icon, "Stop impersonating" outline button. Renders only when `useImpersonation().isImpersonating === true`.

### Day-tag affordance (used inline in Sidebar + FeaturePlaceholder + HomeRoute sitemap)
Dashed-border 10px uppercase mini-pill ("D3" / "D5") for "this isn't shipped yet" markers. **Proposal**: extract to `<DayTag day={n} />` once a third Day 3 feature reaches for it. Keeping inline today to avoid premature abstraction.

---

## 12. Decisions log

- **2026-05-06** — Branched off `claude/setup-prototyping-sprint-zi2hT` (Day 1 scaffold) by hard-resetting `claude/app-shell-mock-data-RrmpD`. Day 1 was on a separate orphan root from `main`; reset was cleanest path. CLAUDE.md was preserved across the reset.
- **2026-05-06** — Working set locked to **6 features** (F1+F7 paired People & Access, F2 POS, F3 Refund, F4 Offering Publish, F5 Dashboard, F6 Org Setup). Pairing F1+F7 keeps us within CLAUDE.md's 4-6 envelope without dropping Dashboard's value as a cross-cutting demo surface.
- **2026-05-06** — Added three support types to `primitives.ts` (`Address`, `BankAccountConfig`, `TaxConfig`) since the spec references them via FK but defers the schema to other primitive docs. Marked prototype-scope in code comments.
- **2026-05-06** — Relaxed `AuditEvent.target_entity_id` and `scope_id` from `UUID` brand to plain `string`. The fields are inherently polymorphic (Person, Charge, Location, OfferingVersion all live there) and branded types are not interconvertible. The `target_entity_type` discriminator names which kind of ID is present.
- **2026-05-06** — Mocks built **before** contexts (reverse of Day 2 prompt's order). Contexts can't be meaningful without seed data to read. Worked cleanly.
- **2026-05-06** — `PLATFORM_SUPPORT` role assigned at `COMPANY` scope on each tenant rather than `SYSTEM`. The spec says "System" scope but `ScopeType` enum doesn't include it. Avery Kim has a row per tenant. Logged in `mockRoleAssignments.ts` as a known prototype simplification — gap to escalate during engineering handoff.
- **2026-05-06** — `Module` configuration shapes left as opaque UUIDs (`module_id`); per-type module configs (TimeModule, PricingModule, …) deferred to F4 Offering Publish.
- **2026-05-06** — Iron Harbor Mountain LLC seeded *without* bank/tax config, intentionally. Lets F2 (XPI-FIN-02) and F4 (XPI-CAT-03) demo their guards on real seed state rather than synthetic test cases.
- **2026-05-06** — Active scope persisted in `localStorage['fitflow:scope']` instead of on Session, per OQ-06 prototype fill-in. Hydration ignores stale entries from a different person/company so dev-mode person switching doesn't leak scope across identities.
- **2026-05-06** — Sidebar role-filter checks role membership only (not scope match) to keep Day 2 simple. F1 will introduce a `usePermission()` hook that does both checks together.
- **2026-05-06** — Toast position is top-right per style guide §Notifications. Was bottom-right initially (sonner default).

---

## 13. Open questions

| # | Question | Affects | Resolution path |
|---|---|---|---|
| AQ-01 | Should the `<DayTag>` component be promoted to the design system on Day 3, or remain inline until a feature actually needs it elsewhere? | Visual consistency | Watch for the third use site; promote when it appears. |
| AQ-02 | Notification bell currently counts every audit event in the last 24h, scoped to tenant. Real notifications would filter by relevance to the actor. Defer to F5 Dashboard? | TopBar | Yes — F5 needs to define what "notification-worthy" means; bell is a stub until then. |
| AQ-03 | Sidebar "you have no roles" copy includes "Contact your admin." Should this link to a real "request access" flow on Day 3 (paired with PermissionDenied's button)? | F1+F7 People & Access | Yes — single mocked endpoint shared between both surfaces. |
| AQ-04 | Profile link in avatar menu is disabled. Real profile management is out of scope this week — should the menu item even render? | TopBar | Keep disabled with "soon" affordance — surfaces the eventual structure to demo viewers. |
| AQ-05 | PermissionDenied currently shows raw `pathname` for the attempted route. Should it humanize ("the Refunds screen") instead? | PermissionDenied | Defer to F3 — F3 hits the route guard most often, will know what reads naturally. |
| AQ-06 | OQ-13 (department-scoped roles imply parent-location read) is implemented in the sidebar via role membership; not enforced at scope-match level. Acceptable for Day 2; F1 should formalize. | Sidebar + per-route guards | F1 introduces `usePermission()` + scope ladder helper. |
| AQ-07 | OQ-15 (admin-density variant of style guide) — Day 2 uses style-guide defaults throughout. Admin tables and dashboards will need denser rows. | Day 4-5 features | Capture density spec as we hit a real density-needing surface (Charges list on Day 3 will be the first). |

---

*End of design-app-shell.md.*
