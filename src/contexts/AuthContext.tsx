/**
 * AuthContext.
 *
 * Tracks the current Person, Session, and active TenantMembership for the
 * prototype. Real auth doesn't exist; the app boots into a default actor
 * (Leila Patel, LOCATION_MANAGER at Auckland) and dev-mode lets us swap to
 * any other Person to demo the same screen as different role-personas.
 *
 * Active scope is owned by ScopeContext, not AuthContext — see OQ-06 for the
 * underlying spec gap. AuthContext exposes the current person's
 * RoleAssignments so the sidebar / scope picker can filter against them.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CompanyId,
  Person,
  PersonId,
  RoleAssignment,
  Session,
  TenantMembership,
} from '@/types/primitives'
import {
  DEFAULT_BOOTSTRAP_COMPANY_ID,
  DEFAULT_BOOTSTRAP_PERSON_ID,
  getPersonById,
  listActiveRoleAssignmentsInCompany,
  listTenantMembershipsByPerson,
  useSessionsStore,
} from '@/mocks'

interface AuthState {
  /** The Person currently driving the UI (the impersonation target if active). */
  currentPerson: Person
  /** The Person who originally signed in. Same as currentPerson when not impersonating. */
  baseActor: Person
  /** Active session for the base actor. */
  currentSession: Session
  /** TenantMembership in the active company. */
  currentMembership: TenantMembership
  /** Active company on the current membership. */
  currentCompanyId: CompanyId
  /** RoleAssignments for the currentPerson within the active company. */
  currentRoleAssignments: RoleAssignment[]
}

interface AuthActions {
  /** Dev-mode: swap the current person. Auto-picks a tenant the person belongs to. */
  switchToPerson: (personId: PersonId, companyId?: CompanyId) => void
  /** Dev-mode: hide reset back to bootstrap actor. */
  signOut: () => void
  /**
   * Set the current person to an impersonation target. Called by
   * ImpersonationContext — feature code should use that instead.
   */
  __setImpersonationTarget: (target: Person | null) => void
  /** Dev-switcher panel state. */
  isDevSwitcherOpen: boolean
  openDevSwitcher: () => void
  closeDevSwitcher: () => void
}

type AuthContextValue = AuthState & AuthActions

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [baseActorId, setBaseActorId] = useState<PersonId>(DEFAULT_BOOTSTRAP_PERSON_ID)
  const [currentCompanyId, setCurrentCompanyId] = useState<CompanyId>(
    DEFAULT_BOOTSTRAP_COMPANY_ID,
  )
  const [impersonationTarget, setImpersonationTarget] = useState<Person | null>(null)
  const [isDevSwitcherOpen, setDevSwitcherOpen] = useState(false)

  const baseActor = getPersonById(baseActorId)
  if (!baseActor) {
    throw new Error(`Bootstrap actor ${baseActorId} not found in seed`)
  }
  const currentPerson = impersonationTarget ?? baseActor

  // The seed's bootstrap session belongs to Leila Patel @ FitFlow Pacific.
  // For dev-mode persons we synthesize a stand-in by pulling the seed session
  // and rewriting the person/company to match.
  const seedSession = useSessionsStore((s) => s.sessions[0])
  const currentSession: Session = useMemo(
    () => ({
      ...seedSession,
      person_id: baseActorId,
      company_id: currentCompanyId,
    }),
    [seedSession, baseActorId, currentCompanyId],
  )

  const currentMembership = useMemo<TenantMembership>(() => {
    const memberships = listTenantMembershipsByPerson(baseActorId)
    const match =
      memberships.find(
        (m) => m.company_id === currentCompanyId && m.status === 'ACTIVE',
      ) ?? memberships.find((m) => m.status === 'ACTIVE')
    if (!match) {
      // Fallback: synthesize. Indicates a seed gap — real flow would 403.
      return {
        membership_id: '00000000-0000-0000-0000-000000000000' as TenantMembership['membership_id'],
        person_id: baseActorId,
        company_id: currentCompanyId,
        status: 'ACTIVE',
        created_at: '2026-05-06T00:00:00.000Z' as TenantMembership['created_at'],
      }
    }
    return match
  }, [baseActorId, currentCompanyId])

  const currentRoleAssignments = useMemo<RoleAssignment[]>(
    () => listActiveRoleAssignmentsInCompany(currentPerson.person_id, currentCompanyId),
    [currentPerson.person_id, currentCompanyId],
  )

  const switchToPerson = useCallback(
    (personId: PersonId, companyId?: CompanyId) => {
      const person = getPersonById(personId)
      if (!person) {
        console.warn(`switchToPerson: ${personId} not found`)
        return
      }
      // Clear any active impersonation when swapping the base actor.
      setImpersonationTarget(null)
      setBaseActorId(personId)
      // Pick a tenant the person belongs to. Caller can override.
      if (companyId) {
        setCurrentCompanyId(companyId)
      } else {
        const memberships = listTenantMembershipsByPerson(personId).filter(
          (m) => m.status === 'ACTIVE',
        )
        const next = memberships[0]?.company_id ?? DEFAULT_BOOTSTRAP_COMPANY_ID
        setCurrentCompanyId(next)
      }
      setDevSwitcherOpen(false)
    },
    [],
  )

  const signOut = useCallback(() => {
    setImpersonationTarget(null)
    setBaseActorId(DEFAULT_BOOTSTRAP_PERSON_ID)
    setCurrentCompanyId(DEFAULT_BOOTSTRAP_COMPANY_ID)
    setDevSwitcherOpen(false)
  }, [])

  // Cmd+Shift+U / Ctrl+Shift+U toggles the dev-mode switcher.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault()
        setDevSwitcherOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const value: AuthContextValue = {
    currentPerson,
    baseActor,
    currentSession,
    currentMembership,
    currentCompanyId,
    currentRoleAssignments,
    switchToPerson,
    signOut,
    __setImpersonationTarget: setImpersonationTarget,
    isDevSwitcherOpen,
    openDevSwitcher: () => setDevSwitcherOpen(true),
    closeDevSwitcher: () => setDevSwitcherOpen(false),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
