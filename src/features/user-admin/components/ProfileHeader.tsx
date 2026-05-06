import { useState } from 'react'
import { ArrowLeft, Mail, MoreHorizontal, Phone, Pencil, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MaskedField } from '@/components/ui-extensions/MaskedField'
import { useAuth, useToast } from '@/contexts'
import { editPersonName } from '../mutations'
import type { Capability } from '../types'
import type { DirectoryRow } from '../queries'
import { StatusBadge } from './StatusBadge'

interface ProfileHeaderProps {
  row: DirectoryRow
  capabilities: Set<Capability>
}

export function ProfileHeader({ row, capabilities }: ProfileHeaderProps) {
  const { currentPerson, currentCompanyId } = useAuth()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [givenName, setGivenName] = useState(row.person.given_name)
  const [familyName, setFamilyName] = useState(row.person.family_name)

  const isSelf = row.person.person_id === currentPerson.person_id
  const canEditName = capabilities.has('users.edit_name') && !isSelf
  const canEditContact = capabilities.has('users.edit_contact') && !isSelf

  function save() {
    if (!givenName.trim() || !familyName.trim()) return
    const result = editPersonName(
      { actor_id: currentPerson.person_id, company_id: currentCompanyId },
      row.person.person_id,
      givenName.trim(),
      familyName.trim(),
    )
    if (result) {
      toast.success('Name updated', {
        description: `${result.given_name} ${result.family_name}`,
      })
      setEditing(false)
    }
  }

  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--color-border)] pb-4">
      <div className="flex-1">
        <Link
          to="/people/directory"
          className="mb-2 inline-flex items-center gap-1 text-xs text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-primary)]"
        >
          <ArrowLeft size={12} /> Directory
        </Link>
        {editing ? (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-[color:var(--color-text-muted)]">
                First name
              </label>
              <Input
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                className="w-40"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[color:var(--color-text-muted)]">
                Last name
              </label>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={save} size="sm">
              <Save size={14} /> Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGivenName(row.person.given_name)
                setFamilyName(row.person.family_name)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {row.person.given_name} {row.person.family_name}
            </h1>
            <StatusBadge status={row.status} />
            {isSelf && (
              <span className="rounded-full border border-dashed border-[color:var(--color-border-strong)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
                this is you
              </span>
            )}
            {canEditName && (
              <button
                onClick={() => setEditing(true)}
                className="rounded p-1 text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-primary)]"
                aria-label="Edit name"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[color:var(--color-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <Mail size={14} />
            <MaskedField
              value={row.person.primary_email}
              kind="email"
              revealed={capabilities.has('users.read_contact')}
              withToggle
            />
            {canEditContact && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={-1}>
                    <Pencil
                      size={12}
                      className="cursor-not-allowed text-[color:var(--color-text-muted)]"
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Contact-method changes require step-up auth — available next
                  sprint (US-UM-009).
                </TooltipContent>
              </Tooltip>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone size={14} />
            <MaskedField
              value={row.person.primary_phone}
              kind="phone"
              revealed={capabilities.has('users.read_contact')}
              withToggle
            />
          </span>
          {row.primary_location_name && (
            <span>
              Primary location:{' '}
              <strong className="text-[color:var(--color-text-primary)]">
                {row.primary_location_name}
              </strong>
            </span>
          )}
        </div>
      </div>
      {!isSelf && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem
                  disabled
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-not-allowed opacity-60"
                >
                  Deactivate user…
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side="left">
                Deactivation cascades to memberships and bookings — available
                once those modules ship (US-UM-012).
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem
                  disabled
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-not-allowed opacity-60"
                >
                  Delete user permanently…
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side="left">
                Requires compliance-holds clearance — available once the
                compliance module ships (US-UM-013).
              </TooltipContent>
            </Tooltip>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
