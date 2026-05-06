/**
 * Filter chips for the User List. Renders dismissible chips for each active
 * filter and popovers to add/edit. Filter values are owned by the parent
 * route — this component is presentational.
 */

import { ChevronDown, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { formatRole } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  Location,
  RoleCode,
} from '@/types/primitives'
import type { DirectoryFilters, DirectoryStatus } from '../queries'

const STATUS_OPTIONS: DirectoryStatus[] = ['ACTIVE', 'INVITED', 'INACTIVE']

const ROLE_OPTIONS: RoleCode[] = [
  'COMPANY_ADMIN',
  'SECURITY_ADMIN',
  'FINANCE_ADMIN',
  'TAX_BANK_CONFIG_ADMIN',
  'AUDITOR',
  'REGIONAL_MANAGER',
  'LOCATION_MANAGER',
  'DEPARTMENT_LEAD',
  'INSTRUCTOR_COACH',
  'FRONT_DESK_STAFF',
  'MEMBER',
  'GUARDIAN',
  'PLATFORM_SUPPORT',
]

interface UserListFiltersProps {
  filters: DirectoryFilters
  onChange: (next: DirectoryFilters) => void
  availableLocations: Location[]
}

function FilterChipButton({
  label,
  active,
  onClear,
  children,
}: {
  label: string
  active: boolean
  onClear?: () => void
  children?: React.ReactNode
}) {
  return (
    <Popover>
      <div className="inline-flex items-center">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 rounded-full border-dashed',
              active &&
                'border-solid border-[color:var(--color-primary)] bg-[color:var(--color-primary-light)] text-[color:var(--color-primary)]',
            )}
          >
            {label}
            <ChevronDown size={14} strokeWidth={1.75} />
          </Button>
        </PopoverTrigger>
        {active && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            className="-ml-1 inline-flex h-8 w-6 items-center justify-center rounded-r-full border border-l-0 border-solid border-[color:var(--color-primary)] bg-[color:var(--color-primary-light)] text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)] hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-64 p-3">
        {children}
      </PopoverContent>
    </Popover>
  )
}

export function UserListFilters({
  filters,
  onChange,
  availableLocations,
}: UserListFiltersProps) {
  const roleActive = (filters.role?.length ?? 0) > 0
  const statusActive = (filters.status?.length ?? 0) > 0
  const locationActive = (filters.location_id?.length ?? 0) > 0
  const dateActive = Boolean(filters.created_from || filters.created_to)
  const anyActive = roleActive || statusActive || locationActive || dateActive

  function toggle<T>(arr: T[] | undefined, val: T): T[] {
    const set = new Set(arr ?? [])
    if (set.has(val)) set.delete(val)
    else set.add(val)
    return Array.from(set)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChipButton
        label={
          roleActive
            ? `Role · ${filters.role!.length}`
            : 'Role'
        }
        active={roleActive}
        onClear={() => onChange({ ...filters, role: undefined })}
      >
        <div className="space-y-1.5">
          {ROLE_OPTIONS.map((r) => {
            const checked = filters.role?.includes(r) ?? false
            return (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() =>
                    onChange({ ...filters, role: toggle(filters.role, r) })
                  }
                />
                {formatRole(r)}
              </label>
            )
          })}
        </div>
      </FilterChipButton>

      <FilterChipButton
        label={
          statusActive
            ? `Status · ${filters.status!.length}`
            : 'Status'
        }
        active={statusActive}
        onClear={() => onChange({ ...filters, status: undefined })}
      >
        <div className="space-y-1.5">
          {STATUS_OPTIONS.map((s) => {
            const checked = filters.status?.includes(s) ?? false
            return (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() =>
                    onChange({ ...filters, status: toggle(filters.status, s) })
                  }
                />
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </label>
            )
          })}
        </div>
      </FilterChipButton>

      {availableLocations.length > 0 && (
        <FilterChipButton
          label={
            locationActive
              ? `Location · ${filters.location_id!.length}`
              : 'Location'
          }
          active={locationActive}
          onClear={() => onChange({ ...filters, location_id: undefined })}
        >
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {availableLocations.map((loc) => {
              const checked =
                filters.location_id?.includes(loc.location_id) ?? false
              return (
                <label
                  key={loc.location_id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() =>
                      onChange({
                        ...filters,
                        location_id: toggle(filters.location_id, loc.location_id),
                      })
                    }
                  />
                  {loc.name}
                </label>
              )
            })}
          </div>
        </FilterChipButton>
      )}

      <FilterChipButton
        label={dateActive ? 'Created · range' : 'Created'}
        active={dateActive}
        onClear={() =>
          onChange({ ...filters, created_from: undefined, created_to: undefined })
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs">From</Label>
            <input
              type="date"
              value={filters.created_from?.slice(0, 10) ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  created_from: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
              className="w-full rounded-md border border-[color:var(--color-border)] bg-white px-2 py-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <input
              type="date"
              value={filters.created_to?.slice(0, 10) ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  created_to: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
              className="w-full rounded-md border border-[color:var(--color-border)] bg-white px-2 py-1 text-sm"
            />
          </div>
        </div>
      </FilterChipButton>

      {anyActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ q: filters.q })}
          className="h-8 text-xs text-[color:var(--color-text-secondary)]"
        >
          Clear all
        </Button>
      )}
    </div>
  )
}
