/**
 * ScopePicker.
 *
 * Drives the ScopeContext. Built as a Popover-anchored cascading list:
 *   Company → Business Entity → Location → Department
 *
 * Showing the full path inline (breadcrumb-style) doubles as the trigger
 * button so the current scope is always visible without opening the popover.
 *
 * Filtered by the current Person's RoleAssignments — a LOCATION_MANAGER
 * doesn't see other Locations they don't have a role at. AUDITOR sees the
 * whole tenant since the role spans every scope at read level.
 */

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuth, useScope } from '@/contexts'
import {
  listBusinessEntitiesByCompany,
  listDepartmentsByLocation,
  listLocationsByEntity,
} from '@/mocks'
import { cn } from '@/lib/utils'

export function ScopePicker() {
  const { currentRoleAssignments } = useAuth()
  const {
    scope_type,
    scope_id,
    scopedCompany,
    scopedBusinessEntity,
    scopedLocation,
    scopedDepartment,
    setScope,
  } = useScope()

  // Derive the full visible set, then mask by role-assignments.
  const allowedScopes = new Set<string>(
    currentRoleAssignments.map((r) => `${r.scope_type}:${r.scope_id}`),
  )
  const isAdmin = currentRoleAssignments.some(
    (r) => r.role_code === 'COMPANY_ADMIN' || r.role_code === 'AUDITOR',
  )
  const canSee = (type: string, id: string) =>
    isAdmin || allowedScopes.has(`${type}:${id}`)

  const entities = listBusinessEntitiesByCompany(scopedCompany.company_id)
  const locations = scopedBusinessEntity
    ? listLocationsByEntity(scopedBusinessEntity.business_entity_id)
    : []
  const departments = scopedLocation
    ? listDepartmentsByLocation(scopedLocation.location_id)
    : []

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 rounded-full border-[color:var(--color-border)] px-3 text-sm font-normal"
        >
          <span className="text-[color:var(--color-text-secondary)]">Scope:</span>
          <span className="ml-2 font-medium">{scopedCompany.name}</span>
          {scopedBusinessEntity && (
            <>
              <span className="mx-1.5 text-[color:var(--color-text-secondary)]">›</span>
              <span>{scopedBusinessEntity.name}</span>
            </>
          )}
          {scopedLocation && (
            <>
              <span className="mx-1.5 text-[color:var(--color-text-secondary)]">›</span>
              <span>{scopedLocation.name}</span>
            </>
          )}
          {scopedDepartment && (
            <>
              <span className="mx-1.5 text-[color:var(--color-text-secondary)]">›</span>
              <span>{scopedDepartment.name}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[680px] p-0">
        <div className="grid grid-cols-4 divide-x">
          <ScopeColumn
            label="Company"
            items={[{ id: scopedCompany.company_id, name: scopedCompany.name }]}
            selectedId={scope_type === 'COMPANY' ? scope_id : scopedCompany.company_id}
            onSelect={(id) => setScope('COMPANY', id)}
          />
          <ScopeColumn
            label="Business Entity"
            items={entities
              .filter((e) => canSee('ENTITY', e.business_entity_id))
              .map((e) => ({ id: e.business_entity_id, name: e.name }))}
            selectedId={
              scope_type === 'ENTITY'
                ? scope_id
                : scopedBusinessEntity?.business_entity_id ?? ''
            }
            onSelect={(id) => setScope('ENTITY', id)}
            empty="No business entities at this scope."
          />
          <ScopeColumn
            label="Location"
            items={locations
              .filter((l) => canSee('LOCATION', l.location_id))
              .map((l) => ({ id: l.location_id, name: l.name }))}
            selectedId={
              scope_type === 'LOCATION'
                ? scope_id
                : scopedLocation?.location_id ?? ''
            }
            onSelect={(id) => setScope('LOCATION', id)}
            empty={
              scopedBusinessEntity
                ? 'No locations under this entity.'
                : 'Pick an entity first.'
            }
          />
          <ScopeColumn
            label="Department"
            items={departments
              .filter((d) => canSee('DEPARTMENT', d.department_id))
              .map((d) => ({ id: d.department_id, name: d.name }))}
            selectedId={
              scope_type === 'DEPARTMENT'
                ? scope_id
                : scopedDepartment?.department_id ?? ''
            }
            onSelect={(id) => setScope('DEPARTMENT', id)}
            empty={
              scopedLocation
                ? 'No departments at this location.'
                : 'Pick a location first.'
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ScopeColumnProps {
  label: string
  items: Array<{ id: string; name: string }>
  selectedId: string
  onSelect: (id: string) => void
  empty?: string
}

function ScopeColumn({ label, items, selectedId, onSelect, empty }: ScopeColumnProps) {
  return (
    <div className="flex flex-col">
      <div className="border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)]">
        {label}
      </div>
      <div className="max-h-[280px] flex-1 overflow-y-auto py-1">
        {items.length === 0 && (
          <div className="px-3 py-2 text-xs text-[color:var(--color-text-secondary)]">
            {empty ?? '—'}
          </div>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              'block w-full px-3 py-1.5 text-left text-sm hover:bg-[color:var(--color-primary-light)]',
              item.id === selectedId &&
                'bg-[color:var(--color-primary-light)] font-medium text-[color:var(--color-primary)]',
            )}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  )
}
