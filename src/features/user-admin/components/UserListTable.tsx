import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RoleBadge } from '@/components/ui-extensions/RoleBadge'
import { MaskedField } from '@/components/ui-extensions/MaskedField'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DirectoryRow } from '../queries'
import { StatusBadge } from './StatusBadge'

interface UserListTableProps {
  rows: DirectoryRow[]
  canReadContact: boolean
  loading?: boolean
}

export function UserListTable({ rows, canReadContact, loading }: UserListTableProps) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%]">Name</TableHead>
            <TableHead className="w-[24%]">Email</TableHead>
            <TableHead className="w-[12%]">Status</TableHead>
            <TableHead className="w-[24%]">Roles</TableHead>
            <TableHead className="w-[12%] text-right">Last activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}>
                  <div className="h-6 w-full animate-pulse rounded bg-[color:var(--color-surface)]" />
                </TableCell>
              </TableRow>
            ))
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.person.person_id}
                className={cn(
                  'group cursor-pointer hover:bg-[color:var(--color-primary-light)]',
                )}
              >
                <TableCell className="font-medium">
                  <Link
                    to={`/people/directory/${row.person.person_id}`}
                    className="flex items-center gap-2 text-[color:var(--color-text-primary)] group-hover:text-[color:var(--color-primary)]"
                  >
                    <span>
                      {row.person.given_name} {row.person.family_name}
                    </span>
                    {row.primary_location_name && (
                      <span className="rounded-sm bg-[color:var(--color-surface)] px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[color:var(--color-text-muted)]">
                        {row.primary_location_name}
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <MaskedField
                    value={row.person.primary_email}
                    kind="email"
                    revealed={canReadContact}
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    {row.roles.slice(0, 3).map((r) => (
                      <RoleBadge key={r.assignment_id} role={r.role_code} />
                    ))}
                    {row.roles.length > 3 && (
                      <span className="text-xs text-[color:var(--color-text-muted)]">
                        +{row.roles.length - 3}
                      </span>
                    )}
                    {row.masked_role_count > 0 && (
                      <span
                        title="Roles outside your scope"
                        className="rounded-full border border-dashed border-[color:var(--color-border-strong)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]"
                      >
                        +{row.masked_role_count} scoped
                      </span>
                    )}
                    {row.roles.length === 0 && row.status === 'INVITED' && (
                      <span className="text-xs text-[color:var(--color-text-muted)] italic">
                        Pending acceptance
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-xs text-[color:var(--color-text-muted)]">
                    {formatRelative(row.person.updated_at)}
                  </span>
                  <ChevronRight
                    size={14}
                    className="ml-2 inline opacity-0 transition group-hover:opacity-100"
                    aria-hidden
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
