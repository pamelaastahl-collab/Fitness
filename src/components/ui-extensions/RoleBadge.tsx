/**
 * RoleBadge — small inline pill showing a role-code (and optionally the
 * scope it's at). Used in the top bar near the avatar and reusable in
 * lists, audit log entries, and the People & Access feature.
 */

import { cn } from '@/lib/utils'
import { formatRole, formatScopeType } from '@/lib/format'
import type { RoleCode, ScopeType } from '@/types/primitives'

interface RoleBadgeProps {
  role: RoleCode
  scopeType?: ScopeType
  scopeLabel?: string
  className?: string
}

/**
 * Visual weight roughly tracks privilege:
 *   tier-A — admin / governance (filled, primary palette)
 *   tier-B — managers / leads (outline, primary palette)
 *   tier-C — staff (outline, neutral)
 *   tier-D — members / guardians (subtle)
 *   tier-X — platform support (warning treatment)
 */
const TIER_BY_ROLE: Record<RoleCode, 'A' | 'B' | 'C' | 'D' | 'X'> = {
  PLATFORM_SUPPORT: 'X',
  COMPANY_ADMIN: 'A',
  SECURITY_ADMIN: 'A',
  FINANCE_ADMIN: 'A',
  TAX_BANK_CONFIG_ADMIN: 'A',
  AUDITOR: 'A',
  REGIONAL_MANAGER: 'B',
  LOCATION_MANAGER: 'B',
  DEPARTMENT_LEAD: 'B',
  INSTRUCTOR_COACH: 'C',
  FRONT_DESK_STAFF: 'C',
  GUARDIAN: 'D',
  MEMBER: 'D',
}

const TIER_CLASSES: Record<'A' | 'B' | 'C' | 'D' | 'X', string> = {
  A: 'bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] border-transparent',
  B: 'border-[color:var(--color-primary)] text-[color:var(--color-primary)] bg-[color:var(--color-primary-light)]',
  C: 'border-[color:var(--color-border-strong)] text-[color:var(--color-foreground)] bg-[color:var(--color-card)]',
  D: 'border-[color:var(--color-border)] text-[color:var(--color-text-secondary)] bg-[color:var(--color-card)]',
  X: 'border-amber-400 text-amber-900 bg-amber-50',
}

export function RoleBadge({ role, scopeType, scopeLabel, className }: RoleBadgeProps) {
  const tier = TIER_BY_ROLE[role]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TIER_CLASSES[tier],
        className,
      )}
    >
      <span>{formatRole(role)}</span>
      {scopeLabel && (
        <span className="text-[10px] uppercase opacity-70">
          @ {scopeLabel}
        </span>
      )}
      {!scopeLabel && scopeType && (
        <span className="text-[10px] uppercase opacity-70">
          @ {formatScopeType(scopeType)}
        </span>
      )}
    </span>
  )
}
