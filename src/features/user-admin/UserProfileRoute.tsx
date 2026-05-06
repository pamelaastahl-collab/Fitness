/**
 * User Profile route — `/people/directory/:personId`.
 *
 * Tabs: Overview · Roles · Sessions · Audit. Audit emits
 * `admin.user_profile_viewed` once per mount.
 *
 * Permission-denied surfaces as Navigate to /no-access when the actor cannot
 * see this person under their scope (UUM-INVARIANT 4 enforced by
 * getDirectoryEntry).
 */

import { useEffect, useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth, useAudit } from '@/contexts'
import {
  useRoleAssignmentsStore,
  usePersonsStore,
  useTenantMembershipsStore,
} from '@/mocks'
import type { PersonId } from '@/types/primitives'
import { getCapabilities } from './capabilities'
import { getDirectoryEntry } from './queries'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileOverviewTab } from './components/ProfileOverviewTab'
import { ProfileRolesTab } from './components/ProfileRolesTab'
import { ProfileSessionsTab } from './components/ProfileSessionsTab'
import { ProfileAuditTab } from './components/ProfileAuditTab'

export function UserProfileRoute() {
  const { personId } = useParams<{ personId: string }>()
  const { currentCompanyId, currentRoleAssignments } = useAuth()
  const audit = useAudit()
  const caps = useMemo(
    () => getCapabilities(currentRoleAssignments),
    [currentRoleAssignments],
  )

  // Subscribe so re-renders happen on mutations
  useRoleAssignmentsStore((s) => s.assignments)
  usePersonsStore((s) => s.persons)
  useTenantMembershipsStore((s) => s.memberships)

  const row = useMemo(() => {
    if (!personId) return undefined
    return getDirectoryEntry(
      {
        company_id: currentCompanyId,
        actor_assignments: currentRoleAssignments,
      },
      personId as PersonId,
    )
  }, [personId, currentCompanyId, currentRoleAssignments])

  useEffect(() => {
    if (row) {
      audit.emit({
        event_type: 'admin.user_profile_viewed',
        target_entity_type: 'Person',
        target_entity_id: row.person.person_id,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId])

  if (!personId) return <Navigate to="/people/directory" replace />
  if (!row) return <Navigate to="/no-access" replace />

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto w-full max-w-[var(--container-content)] p-6 md:p-8">
        <ProfileHeader row={row} capabilities={caps} />

        <Tabs defaultValue="overview">
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            {caps.has('users.view_audit') && (
              <TabsTrigger value="audit">Audit</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="overview">
            <ProfileOverviewTab
              person={row.person}
              assignments={row.roles}
              capabilities={caps}
            />
          </TabsContent>
          <TabsContent value="roles">
            <ProfileRolesTab person={row.person} assignments={row.roles} />
          </TabsContent>
          <TabsContent value="sessions">
            <ProfileSessionsTab person={row.person} capabilities={caps} />
          </TabsContent>
          {caps.has('users.view_audit') && (
            <TabsContent value="audit">
              <ProfileAuditTab person={row.person} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
