import { cn } from '@/lib/utils'
import type { DirectoryStatus } from '../queries'

const STATUS_CLASSES: Record<DirectoryStatus, string> = {
  ACTIVE:
    'border-[color:var(--color-success)] bg-[color:var(--color-success-light)] text-[color:var(--color-success)]',
  INVITED:
    'border-amber-400 bg-amber-50 text-amber-900',
  INACTIVE:
    'border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-text-muted)]',
}

const STATUS_LABEL: Record<DirectoryStatus, string> = {
  ACTIVE: 'Active',
  INVITED: 'Invited',
  INACTIVE: 'Inactive',
}

export function StatusBadge({ status }: { status: DirectoryStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
