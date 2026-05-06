/**
 * Small formatting helpers shared across the shell and features.
 */

import type { RoleCode, ScopeType } from '@/types/primitives'

const ROLE_LABELS: Record<RoleCode, string> = {
  COMPANY_ADMIN: 'Company Admin',
  SECURITY_ADMIN: 'Security Admin',
  FINANCE_ADMIN: 'Finance Admin',
  TAX_BANK_CONFIG_ADMIN: 'Tax & Bank Config Admin',
  REGIONAL_MANAGER: 'Regional Manager',
  LOCATION_MANAGER: 'Location Manager',
  FRONT_DESK_STAFF: 'Front Desk',
  INSTRUCTOR_COACH: 'Instructor / Coach',
  DEPARTMENT_LEAD: 'Department Lead',
  AUDITOR: 'Auditor',
  MEMBER: 'Member',
  GUARDIAN: 'Guardian',
  PLATFORM_SUPPORT: 'Platform Support',
}

export function formatRole(code: RoleCode): string {
  return ROLE_LABELS[code] ?? code
}

const SCOPE_LABELS: Record<ScopeType, string> = {
  COMPANY: 'Company',
  ENTITY: 'Business Entity',
  LOCATION: 'Location',
  DEPARTMENT: 'Department',
}

export function formatScopeType(type: ScopeType): string {
  return SCOPE_LABELS[type]
}

/** Currency formatter using the runtime Intl API. Defaults to en-US. */
export function formatMoney(
  amount: string | number,
  currency: string,
  locale = 'en-US',
): string {
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(n)) return String(amount)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Compact relative time: "3m ago", "2h ago", "5d ago". */
export function formatRelative(iso: string, now = new Date()): string {
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const sec = Math.round(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 45) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mon = Math.round(day / 30)
  if (mon < 12) return `${mon}mo ago`
  return `${Math.round(mon / 12)}y ago`
}
