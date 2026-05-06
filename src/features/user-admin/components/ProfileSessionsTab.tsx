import { Laptop, MonitorOff, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, useToast } from '@/contexts'
import { useSessionsStore } from '@/mocks'
import { formatRelative } from '@/lib/format'
import type { Person, Session, SessionSurface } from '@/types/primitives'
import type { Capability } from '../types'
import { terminateUserSession } from '../mutations'

const SURFACE_ICON: Record<SessionSurface, typeof Laptop> = {
  WEB: Laptop,
  MOBILE: Smartphone,
  SHARED_DEVICE: Laptop,
  ADMIN_CONSOLE: Laptop,
}

const SURFACE_LABEL: Record<SessionSurface, string> = {
  WEB: 'Web',
  MOBILE: 'Mobile',
  SHARED_DEVICE: 'Shared device',
  ADMIN_CONSOLE: 'Admin console',
}

interface ProfileSessionsTabProps {
  person: Person
  capabilities: Set<Capability>
}

export function ProfileSessionsTab({
  person,
  capabilities,
}: ProfileSessionsTabProps) {
  const { currentPerson, currentCompanyId } = useAuth()
  const toast = useToast()
  const allSessions = useSessionsStore((s) => s.sessions)
  const sessions = allSessions.filter((s) => s.person_id === person.person_id)
  const canTerminate = capabilities.has('users.terminate_session')

  function terminate(s: Session) {
    const result = terminateUserSession(
      { actor_id: currentPerson.person_id, company_id: currentCompanyId },
      s.session_id,
      'Admin-initiated termination from Profile > Sessions',
    )
    if (result) {
      toast.success('Session terminated', {
        description: `${SURFACE_LABEL[s.surface]} session was ended (simulated revocation).`,
      })
    }
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[color:var(--color-border-strong)] bg-white px-4 py-6 text-sm text-[color:var(--color-text-muted)]">
        No sessions on record for this person. Sessions appear here when the
        user signs in.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text-secondary)]">
          {sessions.filter((s) => s.status === 'ACTIVE').length} active ·{' '}
          {sessions.length} total
        </h2>
      </div>
      <ul className="divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)] bg-white">
        {sessions.map((s) => {
          const Icon = SURFACE_ICON[s.surface]
          return (
            <li
              key={s.session_id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={18}
                  className="text-[color:var(--color-text-secondary)]"
                />
                <div>
                  <div className="text-sm font-medium">
                    {SURFACE_LABEL[s.surface]} ·{' '}
                    <span className="text-[color:var(--color-text-secondary)]">
                      {s.auth_method.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--color-text-muted)]">
                    Established {formatRelative(s.established_at)} · last active{' '}
                    {formatRelative(s.last_active_at)} · status{' '}
                    {s.status.toLowerCase()}
                  </div>
                </div>
              </div>
              {s.status === 'ACTIVE' && canTerminate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => terminate(s)}
                >
                  <MonitorOff size={14} /> Terminate
                </Button>
              )}
              {s.status !== 'ACTIVE' && (
                <span className="rounded-full bg-[color:var(--color-surface)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  {s.status}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-[color:var(--color-text-muted)]">
        Termination here is simulated — production integration with the
        Security Posture session-revocation contract is logged in design.md
        §14.2 (US-UM-015).
      </p>
    </div>
  )
}
