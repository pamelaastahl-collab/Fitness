# FitFlow Prototype

A one-week prototyping sprint scaffold for an enterprise fitness/recreation
membership platform. Day 1 = thin shell, no features yet.

## Stack

- Vite + React 19 + TypeScript
- React Router v6
- Tailwind CSS v4 (CSS-first config in `src/index.css`)
- shadcn/ui (new-york-v4 style, themed against the FitFlow style guide)
- Zustand (cross-feature mutable state) — installed, not yet wired
- React Context (cross-cutting mocks: auth/scope/role/audit) — folder reserved
- Lucide icons
- Sonner for toasts

## Folder layout

```
src/
  components/
    ui/              shadcn primitives (do not hand-edit; regenerate via shadcn add)
    ui-extensions/   FitFlow-specific patterns (role badge, lock affordance, scope picker, …)
  features/          one folder per feature flow
  contexts/          cross-cutting mock providers (auth, scope, role, audit)
  routes/            React Router route components
  lib/               utilities (cn, formatters, etc.)
  mocks/             in-memory fixture data
  types/             TypeScript types — primitives.ts is the canonical entity contract
docs/
  reference/         authoritative source docs (PRIMITIVE_*, RELATIONSHIPS, style guide, DESIGN_TEMPLATE)
  design/            per-feature design.md files (copy from DESIGN_TEMPLATE.md)
```

## Authoritative docs

Always read from `docs/reference/`, never re-derive:

- `PRIMITIVE_UnifiedUserModel.md` — Person, AuthIdentifier, TenantMembership, RoleAssignment, Session, ImpersonationSession, AuditEvent
- `PRIMITIVE_OrgHierarchy.md` — Company, BusinessEntity, Location, Department, OrgSnapshot fields
- `PRIMITIVE_UnifiedOfferingModel.md` — Offering, OfferingVersion, ModuleAttachment, OfferingPublication
- `PRIMITIVE_UnifiedChargeEngine.md` — Charge, ChargeLineItem, ChargePolicySnapshot, Adjustment, Refund
- `PRIMITIVE_RELATIONSHIPS.md` — cross-primitive invariants (XPI-*) and the open-questions log (OQ-NN). Cite XPI/OQ IDs in every feature design.
- `style-guide.md` — design tokens (palette, type, spacing, radius, shadow), component patterns, motion, microcopy
- `DESIGN_TEMPLATE.md` — the per-feature `design.md` scaffold; copy and fill, do not restructure

## Scripts

```
npm run dev      # start the dev server
npm run build    # production build (also runs tsc -b)
npm run preview  # serve the production build
npm run lint     # eslint
```

## Day 1 status

Done: project scaffold, Tailwind v4 + style-guide tokens, shadcn primitives
installed and themed, React Router v6 wired, primitive type definitions
authored from the four primitive docs.

Not yet: feature flows, mock providers, ui-extensions components, design.md
files. Those land in Day 2 onward.
