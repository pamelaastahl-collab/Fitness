/**
 * ScopeContext.
 *
 * Holds the active (scope_type, scope_id) pair that drives every page's view
 * of data, and resolves it up the OH hierarchy so consumers don't need to do
 * the joins themselves.
 *
 * Per OQ-06 the spec doesn't include active scope on Session — the prototype
 * persists it in localStorage instead. On boot we hydrate from storage, then
 * fall back to a sensible default derived from the current Person's
 * RoleAssignments (LOCATION-scoped first, then ENTITY, then COMPANY).
 *
 * Switching base actor (dev-mode user switcher) resets the scope to that
 * actor's most-specific assignment so the screen reflects "what would Y see".
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  BusinessEntity,
  BusinessEntityId,
  Company,
  CompanyId,
  Department,
  DepartmentId,
  Location,
  LocationId,
  RoleAssignment,
  ScopeType,
} from '@/types/primitives'
import {
  getBusinessEntityById,
  getCompanyById,
  getDepartmentById,
  getLocationById,
} from '@/mocks'
import { useAuth } from './AuthContext'

interface ScopeState {
  scope_type: ScopeType
  scope_id: string
  scopedCompany: Company
  scopedBusinessEntity?: BusinessEntity
  scopedLocation?: Location
  scopedDepartment?: Department
}

interface ScopeActions {
  setScope: (scope_type: ScopeType, scope_id: string) => void
  /** Convenience: shortcut to a specific level. */
  setCompanyScope: (id: CompanyId) => void
  setEntityScope: (id: BusinessEntityId) => void
  setLocationScope: (id: LocationId) => void
  setDepartmentScope: (id: DepartmentId) => void
  /** Resolvers used outside JSX (e.g. inside emit calls). */
  resolveCompany: () => Company
  resolveBusinessEntity: () => BusinessEntity | undefined
  resolveLocation: () => Location | undefined
  resolveDepartment: () => Department | undefined
}

type ScopeContextValue = ScopeState & ScopeActions

const ScopeContext = createContext<ScopeContextValue | null>(null)

const STORAGE_KEY = 'fitflow:scope'
const SCOPE_TYPE_PRECEDENCE: Record<ScopeType, number> = {
  COMPANY: 1,
  ENTITY: 2,
  LOCATION: 3,
  DEPARTMENT: 4,
}

interface PersistedScope {
  scope_type: ScopeType
  scope_id: string
  /** Stored so we don't restore a scope from a different tenant after a switch. */
  company_id: CompanyId
  /** Stored so we don't restore a stale scope after a person switch. */
  person_id: string
}

function readPersisted(): PersistedScope | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedScope
  } catch {
    return null
  }
}

function writePersisted(value: PersistedScope) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Pick the most specific scope from a set of RoleAssignments.
 * If multiple assignments share the most-specific scope_type, pick the first
 * (assignments are seed-ordered chronologically).
 */
function deriveDefaultScope(
  assignments: RoleAssignment[],
  fallbackCompanyId: CompanyId,
): { scope_type: ScopeType; scope_id: string } {
  if (assignments.length === 0) {
    return { scope_type: 'COMPANY', scope_id: fallbackCompanyId }
  }
  const sorted = [...assignments].sort(
    (a, b) =>
      SCOPE_TYPE_PRECEDENCE[b.scope_type] - SCOPE_TYPE_PRECEDENCE[a.scope_type],
  )
  return { scope_type: sorted[0].scope_type, scope_id: sorted[0].scope_id }
}

interface ScopeProviderProps {
  children: ReactNode
}

export function ScopeProvider({ children }: ScopeProviderProps) {
  const {
    currentPerson,
    currentCompanyId,
    currentRoleAssignments,
  } = useAuth()

  const initial = useMemo(() => {
    const persisted = readPersisted()
    if (
      persisted &&
      persisted.company_id === currentCompanyId &&
      persisted.person_id === currentPerson.person_id
    ) {
      return { scope_type: persisted.scope_type, scope_id: persisted.scope_id }
    }
    return deriveDefaultScope(currentRoleAssignments, currentCompanyId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only run once
  }, [])

  const [scope_type, setScopeType] = useState<ScopeType>(initial.scope_type)
  const [scope_id, setScopeId] = useState<string>(initial.scope_id)

  // When the base actor or active company changes, derive a fresh default —
  // we never want to leak a scope from a previous identity into the new one.
  const lastIdentity = useRef(`${currentPerson.person_id}:${currentCompanyId}`)
  useEffect(() => {
    const identity = `${currentPerson.person_id}:${currentCompanyId}`
    if (identity === lastIdentity.current) return
    lastIdentity.current = identity
    const next = deriveDefaultScope(currentRoleAssignments, currentCompanyId)
    setScopeType(next.scope_type)
    setScopeId(next.scope_id)
  }, [currentPerson.person_id, currentCompanyId, currentRoleAssignments])

  // Persist on every change.
  useEffect(() => {
    writePersisted({
      scope_type,
      scope_id,
      company_id: currentCompanyId,
      person_id: currentPerson.person_id,
    })
  }, [scope_type, scope_id, currentCompanyId, currentPerson.person_id])

  const setScope = useCallback((next_type: ScopeType, next_id: string) => {
    setScopeType(next_type)
    setScopeId(next_id)
  }, [])

  // Hierarchy resolution. We always want the *full* path even when scope is
  // narrower than COMPANY — e.g., if scope is LOCATION, we still know the BE
  // and Company by walking up.
  const resolved = useMemo(() => {
    let dept: Department | undefined
    let loc: Location | undefined
    let be: BusinessEntity | undefined
    let company: Company | undefined

    if (scope_type === 'DEPARTMENT') {
      dept = getDepartmentById(scope_id as DepartmentId)
      if (dept) loc = getLocationById(dept.location_id)
    } else if (scope_type === 'LOCATION') {
      loc = getLocationById(scope_id as LocationId)
    } else if (scope_type === 'ENTITY') {
      be = getBusinessEntityById(scope_id as BusinessEntityId)
    } else if (scope_type === 'COMPANY') {
      company = getCompanyById(scope_id as CompanyId)
    }
    if (loc && !be) be = getBusinessEntityById(loc.business_entity_id)
    if (be && !company) company = getCompanyById(be.company_id)
    if (!company) company = getCompanyById(currentCompanyId)

    if (!company) {
      throw new Error(`Cannot resolve company for scope ${scope_type}/${scope_id}`)
    }

    return { dept, loc, be, company }
  }, [scope_type, scope_id, currentCompanyId])

  const value: ScopeContextValue = {
    scope_type,
    scope_id,
    scopedCompany: resolved.company,
    scopedBusinessEntity: resolved.be,
    scopedLocation: resolved.loc,
    scopedDepartment: resolved.dept,
    setScope,
    setCompanyScope: (id) => setScope('COMPANY', id),
    setEntityScope: (id) => setScope('ENTITY', id),
    setLocationScope: (id) => setScope('LOCATION', id),
    setDepartmentScope: (id) => setScope('DEPARTMENT', id),
    resolveCompany: () => resolved.company,
    resolveBusinessEntity: () => resolved.be,
    resolveLocation: () => resolved.loc,
    resolveDepartment: () => resolved.dept,
  }

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext)
  if (!ctx) {
    throw new Error('useScope must be used within a ScopeProvider')
  }
  return ctx
}
