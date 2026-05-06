# Project Context for Claude Code

This file is read automatically at the start of every Claude Code session. It establishes standing context: what this project is, what's authoritative, how we work, and what to do (and not do).

---

## What this project is

A one-week thin-shell prototype for an enterprise product. The goal is a demoable integrated app hosting 4–6 feature flows that exercise the four core primitives. The prototype's job is **stakeholder demos and engineering-handoff foundation**, not production code — but the code should be clean enough that engineers extending it later don't have to start over.

The prototype is the thinking tool. The paired `design-{feature-slug}.md` files are the durable deliverable.

---

## Authoritative reference docs

The following files in `/docs/` are **ground truth**. Their invariants are inviolable. If a request would cause a feature to imply behavior that violates an invariant, flag it explicitly before proceeding and propose a compliant alternative.

- `PRIMITIVE_UnifiedUserModel.md` — identity, auth, roles, sessions, audit (UUM)
- `PRIMITIVE_OrgHierarchy.md` — Company → BusinessEntity → Location → Department; scope and financial attribution
- `PRIMITIVE_UnifiedOfferingModel.md` — catalog, offerings, versions, modules, publication (UOM)
- `PRIMITIVE_UnifiedChargeEngine.md` — quote, commit, adjust, refund (UCE)
- `PRIMITIVE_RELATIONSHIPS.md` — cross-primitive entity map and shared invariants
- `DESIGN_TEMPLATE.md` — the structure every `design-*.md` file follows
- The style guide (filename varies)

When starting a new feature, read these as needed. When in doubt about a schema, role, scope rule, or financial behavior, the primitive doc wins over your prior assumptions.

---

## Key invariants to internalize

These are the rules most likely to be accidentally violated. Treat them as load-bearing.

**Identity and access**
- A Person can hold many roles across many scopes; a RoleAssignment without a scope is invalid (default-deny).
- SoD constraints (e.g., FINANCE_ADMIN + TAX_BANK_CONFIG_ADMIN cannot co-exist for the same Person at the same scope) must be enforced in any role-assignment UI and surfaced before the conflict is committed.
- Impersonation is always visible — a banner is non-negotiable when an admin is acting as another Person.
- Every state-changing action emits an AuditEvent carrying actor, scope, and before/after.

**Org hierarchy**
- Company is the tenant boundary. No cross-tenant data ever surfaces.
- BusinessEntity is the financial boundary. A Charge cannot commit unless its Location's BusinessEntity has active bank/tax config.
- Committed financial records carry immutable `*_at_sale` snapshot fields. UI showing historical charges must use these, never current attribution.
- Scope headers from the client are hints; the server re-validates. UI should reflect this by never assuming permission — always check.

**Offerings**
- Offering → OfferingVersion. Published versions are immutable. Editing a published offering creates a new draft version. The UI must make this transition explicit, never silent.
- Publication binds an OfferingVersion to specific Locations. A Location not in the publication doesn't see the offering.
- Type-module compatibility matters: each offering type (MEMBERSHIP, CLASS, APPOINTMENT, FACILITY_RENTAL, RETAIL, GIFT_CARD, PACKAGE_CREDIT_PACK) accepts a specific set of modules. Configuration UIs are type-driven.

**Charges**
- Quote is stateless and free; Commit is idempotent and creates an immutable record.
- Refunds and Adjustments cannot exceed the original charge. Approval thresholds gate large refunds — the UI must route to the approval path, not silently allow.
- Reason codes are required on all refunds and adjustments. The vocabulary is defined in the UCE primitive.
- Line items must show category, revenue_category, tax_category, and the policy_rule that produced them — explainability is a product requirement, not a nice-to-have.

If you're ever about to write code that touches one of these areas, re-read the relevant primitive section first.

---

## Stack

- **Build:** Vite
- **Language:** TypeScript (strict mode)
- **UI:** React 18, React Router v6
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (installed via CLI, owned in repo), themed against the style guide tokens
- **Cross-cutting state:** React Context for auth, scope, role, impersonation, audit event bus
- **Cross-feature mutable state:** Zustand stores
- **Mock data:** in-memory stores in `/src/mocks/`, seeded with realistic data shaped to the primitive schemas

No backend. No real auth. No real persistence. State resets on page reload (acceptable for prototype).

---

## Folder structure

```
/docs/
  /design/                   # design-{feature-slug}.md files
  PRIMITIVE_*.md             # the four primitives + relationships map
  DESIGN_TEMPLATE.md
  style-guide.*

/src/
  /components/
    /ui/                     # shadcn components (don't edit unless extending)
    /ui-extensions/          # custom components built on shadcn (role badge, scope picker, impersonation banner, immutability lock, etc.)
    /shell/                  # app shell pieces (sidebar, top bar, layout)
  /features/
    /{feature-slug}/         # one folder per feature; pages, sub-components, feature-local types
  /contexts/                 # AuthContext, ScopeContext, AuditContext, etc.
  /mocks/                    # in-memory stores and seed data per primitive
  /lib/                      # utilities, formatters, validators
  /types/
    primitives.ts            # TypeScript interfaces matching the primitive schemas
  /routes/                   # React Router route config
  App.tsx
  main.tsx
```

---

## How we work

### Synthesis-first per feature

Before writing any feature code, do a synthesis pass:

1. Restate what the feature does in your own words
2. List which primitives and entities it touches
3. List which roles can access it and at what scope
4. List which invariants apply and which are most at risk
5. Reference any patterns from `PRIMITIVE_RELATIONSHIPS.md` that match
6. Flag ambiguities, conflicts, or missing requirements

**Then pause.** Wait for confirmation before building. This catches misunderstandings cheaply.

### Pair every feature with a design.md

Every feature ships with `/docs/design/design-{feature-slug}.md` following `DESIGN_TEMPLATE.md`. The design doc is updated as decisions are made through iteration — not written from scratch at the end. If a decision gets made mid-build, capture it in the design.md before moving on.

### Reuse the design system; propose additions explicitly

Use existing components from `/src/components/ui/` and `/src/components/ui-extensions/`. If a feature needs a new shared component, **propose it as an addition to the design system before adding it** — don't quietly slip new patterns into a feature folder. The point of a thin shell is consistency, and consistency dies one shortcut at a time.

If a feature needs a one-off component that genuinely doesn't generalize, put it in the feature folder and note in the design.md why it isn't shared.

### Make scope, permissions, and immutability visible

Enterprise UX rule: the chrome is the product.

- The current scope (Company / BusinessEntity / Location / Department) is always visible in the top bar
- The current role is always visible (badge near the user avatar)
- Impersonation shows a persistent banner across the top of the viewport
- Immutable records (committed charges, published offering versions, snapshot fields) carry a visual affordance — lock icon, "as sold" label, version badge, etc.
- Permission-denied states are first-class screens, not generic 403s

### One feature at a time, end to end

Build a feature to demoable completion before starting the next. "Demoable" means: route renders, happy path works, key states (empty, loading, error, permission-denied) are designed, design.md is updated, and a non-developer could click through it without things breaking visibly.

### Mock data shaped to the primitives

Mock data lives in `/src/mocks/` as in-memory stores per primitive. Use realistic seed data — real names, plausible amounts, varied dates, multiple locations. Bad seed data ("Test User 1", "$1.00") makes demos feel hollow. Good seed data ("Sarah Chen", "$87.50") makes the prototype feel real.

The mock layer should support the operations features need: query by id, list with filters, create, update, soft-delete. Mutations dispatch to the audit event bus so cross-feature reactions work.

---

## What not to do

- **Don't violate primitive invariants to ship faster.** If you find yourself wanting to, the design is wrong — flag it instead.
- **Don't propose backend, infra, or API changes.** This is a UX prototyping effort. Implementation concerns become open questions in the design.md.
- **Don't invent fields not in the primitive schemas.** If a feature seems to need one, flag it as a gap before adding it.
- **Don't create generic UX boilerplate in design.md files.** Every section should reflect a real decision specific to the feature.
- **Don't skip the synthesis pass to save time.** It's the cheapest part of the workflow and the highest leverage.
- **Don't sprawl features across multiple routes prematurely.** A feature is a coherent flow; a route is a screen within that flow. Multiple routes per feature is normal; multiple features per route is a smell.
- **Don't leave TODOs in committed code.** If something needs attention, log it as an open question in the relevant design.md.

---

## Naming conventions

- **Features:** lowercase, hyphenated (`refund-approval`, `offering-publish`, `role-assignment`)
- **Design docs:** `design-{feature-slug}.md`
- **Routes:** `/{feature-slug}` or `/{area}/{feature-slug}` for grouped flows
- **Components:** PascalCase, descriptive (`RoleBadge`, `ScopePicker`, `ImmutabilityLock`)
- **Files:** match component name (`RoleBadge.tsx`)
- **Types:** match primitive doc names exactly (`Person`, `Charge`, `OfferingVersion`)
- **Mock store files:** `mock{Entity}.ts` (`mockPersons.ts`, `mockCharges.ts`)

---

## Code style

- TypeScript strict mode on. No `any` unless genuinely necessary and commented.
- Functional components, hooks-based. No class components.
- One component per file, named export matching filename.
- Tailwind utility classes for styling. Use `cn()` (clsx + tailwind-merge) for conditional classes.
- Prefer composition over prop explosion. If a component has more than ~7 props, it's probably two components.
- Markdown in design docs uses ATX headings (`#`, `##`), no underline-style headings.

---

## When in doubt

- If a primitive is ambiguous, propose an interpretation, build against it, log the question in the relevant design.md.
- If a requirement and a primitive conflict, the primitive wins. Note the conflict in the design.md.
- If a request can't be done without violating an invariant, say so directly and propose a compliant alternative.
- If you're not sure whether to ask or just decide, ask. Wrong-direction time is more expensive than clarification time.

---

## Day-by-day plan (this week)

- **Day 1:** Scaffold + design system module
- **Day 2:** App shell + mock data layer + cross-cutting contexts
- **Day 3:** Features 1 and 2 (one admin/governance, one transactional)
- **Day 4:** Features 3 and 4 (build on patterns; refactor design system if needed)
- **Day 5:** Feature 5 (visually impressive — usually a dashboard or rich list view), polish, demo prep

Stay disciplined about scope. The week works only if each day's goal is finished before the next day starts.
