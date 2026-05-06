/**
 * Route configuration.
 *
 * AppLayout is the root layout. Every feature gets a placeholder route on
 * Day 2 so the sidebar nav works end-to-end. Real feature components
 * replace the placeholders on Days 3–5.
 *
 * /no-access renders PermissionDenied as a first-class screen. Per-route
 * role/scope checks (added with each feature) redirect here when the actor
 * lacks the right RoleAssignment.
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/shell/AppLayout'
import HomeRoute from './HomeRoute'
import { FeaturePlaceholder } from './FeaturePlaceholder'
import { PermissionDenied } from './PermissionDenied'
import { UserListRoute } from '@/features/user-admin/UserListRoute'
import { UserProfileRoute } from '@/features/user-admin/UserProfileRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomeRoute />} />

        <Route
          path="/dashboard"
          element={
            <FeaturePlaceholder
              name="Operations Dashboard"
              day={5}
              description="LOCATION_MANAGER's home: today's charges, upcoming bookings, pending refunds, draft offerings, audit timeline. Every panel reactive to the active scope."
            />
          }
        />
        <Route
          path="/pos"
          element={
            <FeaturePlaceholder
              name="Point of Sale"
              day={3}
              description="FRONT_DESK_STAFF rings up a member: cart → deterministic quote with explainability → idempotent commit → immutable receipt. Exercises Quote, Commit, snapshot fields."
            />
          }
        />
        <Route
          path="/offerings"
          element={
            <FeaturePlaceholder
              name="Offerings"
              day={4}
              description="COMPANY_ADMIN edits a draft, attaches required modules per type-module matrix, runs validation, publishes — creating an immutable OfferingVersion. Prior version auto-retires."
            />
          }
        />
        <Route
          path="/people/roles"
          element={
            <FeaturePlaceholder
              name="Roles & Access"
              day={3}
              description="SECURITY_ADMIN assigns roles to Persons within a tenant, with SoD validation, scope picker, and audit emission. Paired with Directory below."
            />
          }
        />
        <Route path="/people/directory" element={<UserListRoute />} />
        <Route
          path="/people/directory/:personId"
          element={<UserProfileRoute />}
        />
        <Route
          path="/finance/charges"
          element={
            <FeaturePlaceholder
              name="Charges"
              day={3}
              description="Read-only view of committed Charges at the active scope. Derives from POS feature data; Day 3 wires the list view."
            />
          }
        />
        <Route
          path="/finance/refunds"
          element={
            <FeaturePlaceholder
              name="Refunds"
              day={4}
              description="Initiate a refund on a Charge. Below threshold = staff role. Full or above-threshold = manager approval + reason code + step-up affordance."
            />
          }
        />
        <Route
          path="/finance/adjustments"
          element={
            <FeaturePlaceholder
              name="Adjustments"
              day={4}
              description="No-show fees, goodwill credits, admin corrections. Reason codes from controlled vocabulary. Approval-threshold gating."
            />
          }
        />
        <Route
          path="/admin/org"
          element={
            <FeaturePlaceholder
              name="Org Hierarchy"
              day={5}
              description="Company → BusinessEntity → Location → Department setup. BE bank/tax config status. Location deactivation guards. Visually rich Day 5 anchor."
            />
          }
        />
        <Route
          path="/admin/audit"
          element={
            <FeaturePlaceholder
              name="Audit Log"
              day={3}
              description="Append-only AuditEvent stream filtered by current scope. Read-only. AUDITOR + SECURITY_ADMIN can export."
            />
          }
        />

        <Route path="/no-access" element={<PermissionDenied />} />
        <Route path="*" element={<Navigate to="/no-access" replace />} />
      </Route>
    </Routes>
  )
}
