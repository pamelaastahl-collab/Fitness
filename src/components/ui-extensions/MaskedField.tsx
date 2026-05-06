/**
 * MaskedField — PHI-safe value display.
 *
 * Renders a sensitive value (email, phone) in masked form unless the actor
 * holds a `revealed`-permitting capability. The `kind` prop determines the
 * masking pattern; consumers pass `revealed` from their own capability check
 * — this component does not reach into AuthContext to keep it pure.
 *
 * Per FRD US-UM-001 BR2: primary_email rendered as user@***.*** unless actor
 * holds `manage_users:read_contact`. Phone numbers masked to last 4 digits.
 */

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MaskedFieldProps {
  value: string | undefined
  kind: 'email' | 'phone'
  revealed: boolean
  /** When true, ignore `revealed` and always mask. */
  forceMask?: boolean
  /** Show eye-toggle when revealed=true; lets the user re-mask for screen-share. */
  withToggle?: boolean
  className?: string
}

function maskEmail(value: string): string {
  const [local, domain] = value.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, 1)
  const tld = domain.split('.').pop() ?? '***'
  return `${visible}***@***.${tld}`
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  return `••• ••• ${digits.slice(-4)}`
}

export function MaskedField({
  value,
  kind,
  revealed,
  forceMask,
  withToggle,
  className,
}: MaskedFieldProps) {
  const [userMask, setUserMask] = useState(false)
  if (!value) {
    return (
      <span className={cn('text-[color:var(--color-text-muted)]', className)}>
        —
      </span>
    )
  }
  const showMasked = forceMask || !revealed || userMask
  const text = showMasked
    ? kind === 'email'
      ? maskEmail(value)
      : maskPhone(value)
    : value
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'font-mono text-[13px]',
          showMasked && 'text-[color:var(--color-text-secondary)]',
        )}
      >
        {text}
      </span>
      {withToggle && revealed && !forceMask && (
        <button
          type="button"
          aria-label={userMask ? 'Show value' : 'Mask value'}
          onClick={() => setUserMask((v) => !v)}
          className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)]"
        >
          {userMask ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      )}
    </span>
  )
}
