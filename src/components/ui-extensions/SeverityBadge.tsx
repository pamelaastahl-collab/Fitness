/**
 * SeverityBadge — visual treatment for INFORMATIONAL / WARNING / ALERT.
 *
 * Used on the member Conditions tab today; designed for reuse on the
 * future Class Roster (US-MPE-010) and Check-In (US-MPE-011) screens
 * where ALERT severity is required to be prominent.
 */

import { AlertTriangle, Info, OctagonAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConditionSeverity } from '@/features/member-profile/types'

const TONE: Record<
  ConditionSeverity,
  { className: string; label: string; icon: typeof Info }
> = {
  ALERT: {
    className:
      'border-[color:var(--color-error)] bg-[color:var(--color-error-light)] text-[color:var(--color-error)]',
    label: 'Alert',
    icon: OctagonAlert,
  },
  WARNING: {
    className: 'border-amber-400 bg-amber-50 text-amber-900',
    label: 'Warning',
    icon: AlertTriangle,
  },
  INFORMATIONAL: {
    className:
      'border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-text-secondary)]',
    label: 'Info',
    icon: Info,
  },
}

interface SeverityBadgeProps {
  severity: ConditionSeverity
  /** When true, renders the more prominent icon-led pill suitable for
   *  high-density surfaces (roster, check-in). Default is the compact pill. */
  prominent?: boolean
  className?: string
}

export function SeverityBadge({
  severity,
  prominent,
  className,
}: SeverityBadgeProps) {
  const t = TONE[severity]
  const Icon = t.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        t.className,
        prominent && 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <Icon size={prominent ? 14 : 12} strokeWidth={2.25} />
      {t.label}
    </span>
  )
}
