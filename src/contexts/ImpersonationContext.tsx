/**
 * ImpersonationContext.
 *
 * Per UUM §2.7 + XPI-AUTH-05/06: an ImpersonationSession lets PLATFORM_SUPPORT
 * act as another Person, with two non-negotiable invariants:
 *   1. A persistent banner is rendered on every UI surface while active.
 *   2. Every action emits AuditEvents attributed to BOTH the impersonator
 *      and the target (handled in AuditContext via actor_type='IMPERSONATION').
 *
 * Impersonation cannot escalate privileges — the target's RoleAssignments are
 * the upper bound. AuthContext already swaps `currentPerson` to the target
 * while leaving `baseActor` as the impersonator.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  ImpersonationSession,
  Person,
  PersonId,
} from '@/types/primitives'
import { getPersonById, useSessionsStore } from '@/mocks'
import { useAuth } from './AuthContext'

interface ImpersonationState {
  isImpersonating: boolean
  /** The original PLATFORM_SUPPORT actor. Same as AuthContext.baseActor. */
  impersonator?: Person
  /** The Person being acted-as. Same as AuthContext.currentPerson when active. */
  target?: Person
  /** Underlying session record. */
  session?: ImpersonationSession
}

interface ImpersonationActions {
  startImpersonation: (target_person_id: PersonId, reason_code: string) => void
  stopImpersonation: () => void
}

type ImpersonationContextValue = ImpersonationState & ImpersonationActions

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null)

interface ImpersonationProviderProps {
  children: ReactNode
}

export function ImpersonationProvider({ children }: ImpersonationProviderProps) {
  const { baseActor, currentCompanyId, __setImpersonationTarget } = useAuth()
  const startImpersonationStore = useSessionsStore((s) => s.startImpersonation)
  const endImpersonationStore = useSessionsStore((s) => s.endImpersonation)

  const [activeSessionId, setActiveSessionId] = useState<
    ImpersonationSession['session_id'] | null
  >(null)

  const session = useSessionsStore(
    useMemo(
      () => (s) =>
        activeSessionId
          ? s.impersonations.find((i) => i.session_id === activeSessionId)
          : undefined,
      [activeSessionId],
    ),
  )

  const isImpersonating = !!session && session.status === 'ACTIVE'
  const target = isImpersonating
    ? getPersonById(session!.target_person_id)
    : undefined

  const startImpersonation = useCallback(
    (target_person_id: PersonId, reason_code: string) => {
      const tgt = getPersonById(target_person_id)
      if (!tgt) {
        console.warn(`startImpersonation: target ${target_person_id} not found`)
        return
      }
      const next = startImpersonationStore(
        baseActor.person_id,
        target_person_id,
        reason_code,
        currentCompanyId,
      )
      setActiveSessionId(next.session_id)
      __setImpersonationTarget(tgt)
    },
    [baseActor.person_id, currentCompanyId, startImpersonationStore, __setImpersonationTarget],
  )

  const stopImpersonation = useCallback(() => {
    if (!activeSessionId) return
    endImpersonationStore(activeSessionId, baseActor.person_id, currentCompanyId)
    setActiveSessionId(null)
    __setImpersonationTarget(null)
  }, [activeSessionId, baseActor.person_id, currentCompanyId, endImpersonationStore, __setImpersonationTarget])

  const value: ImpersonationContextValue = {
    isImpersonating,
    impersonator: isImpersonating ? baseActor : undefined,
    target,
    session,
    startImpersonation,
    stopImpersonation,
  }

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation(): ImpersonationContextValue {
  const ctx = useContext(ImpersonationContext)
  if (!ctx) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider')
  }
  return ctx
}
