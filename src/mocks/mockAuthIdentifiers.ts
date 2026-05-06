/**
 * Mock AuthIdentifiers — credential bindings (UUM §2.2).
 *
 * Per UUM-CONSTRAINT (line 88): type+value combination is globally unique.
 * Per UUM-BR rule, real values are hashed/tokenised — we use plaintext-shaped
 * stand-ins so the prototype can render "verified email" affordances.
 *
 * Seed strategy: one EMAIL identifier per Person that has one. A few staff
 * carry an additional PHONE identifier to demonstrate multi-identifier UIs.
 */

import { create } from 'zustand'
import type {
  AuthIdentifier,
  AuthIdentifierId,
  AuthIdentifierStatus,
  IsoTimestamp,
  PersonId,
} from '@/types/primitives'
import { id, isoNow } from './_helpers'
import {
  seedPersons,
  PERSON_AVERY_KIM_PLATFORM_ID,
  PERSON_LEILA_PATEL_ID,
  PERSON_MADELINE_FOSTER_ID,
  PERSON_SARAH_CHEN_ID,
} from './mockPersons'

function aid(suffix: string): AuthIdentifierId {
  return `i0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as AuthIdentifierId
}

const emailIdentifiers: AuthIdentifier[] = seedPersons
  .filter((p) => !!p.primary_email)
  .map((p, idx): AuthIdentifier => ({
    auth_identifier_id: aid(`e${idx + 1}`),
    person_id: p.person_id,
    type: 'EMAIL',
    value: p.primary_email!,
    verified_at: p.created_at,
    status: 'ACTIVE',
    created_at: p.created_at,
  }))

const phoneIdentifiers: AuthIdentifier[] = [
  PERSON_LEILA_PATEL_ID,
  PERSON_SARAH_CHEN_ID,
  PERSON_MADELINE_FOSTER_ID,
  PERSON_AVERY_KIM_PLATFORM_ID,
].flatMap((pid, idx): AuthIdentifier[] => {
  const person = seedPersons.find((p) => p.person_id === pid)
  if (!person?.primary_phone) return []
  return [
    {
      auth_identifier_id: aid(`p${idx + 1}`),
      person_id: pid,
      type: 'PHONE',
      value: person.primary_phone,
      verified_at: person.created_at,
      status: 'ACTIVE',
      created_at: person.created_at,
    },
  ]
})

export const seedAuthIdentifiers: AuthIdentifier[] = [
  ...emailIdentifiers,
  ...phoneIdentifiers,
]

interface AuthIdentifiersStore {
  identifiers: AuthIdentifier[]
  list: () => AuthIdentifier[]
  listByPerson: (pid: PersonId) => AuthIdentifier[]
  getById: (id: AuthIdentifierId) => AuthIdentifier | undefined
  create: (
    input: Omit<AuthIdentifier, 'auth_identifier_id' | 'created_at' | 'status'> &
      Partial<Pick<AuthIdentifier, 'status'>>,
  ) => AuthIdentifier
  setStatus: (id: AuthIdentifierId, status: AuthIdentifierStatus) => AuthIdentifier | undefined
  setVerified: (id: AuthIdentifierId, at?: IsoTimestamp) => AuthIdentifier | undefined
}

export const useAuthIdentifiersStore = create<AuthIdentifiersStore>((set, get) => ({
  identifiers: seedAuthIdentifiers,
  list: () => get().identifiers,
  listByPerson: (pid) =>
    get().identifiers.filter((i) => i.person_id === pid),
  getById: (iid) => get().identifiers.find((i) => i.auth_identifier_id === iid),

  create: (input) => {
    const identifier: AuthIdentifier = {
      ...input,
      auth_identifier_id: id() as AuthIdentifierId,
      status: input.status ?? 'ACTIVE',
      created_at: isoNow(),
    }
    set((s) => ({ identifiers: [...s.identifiers, identifier] }))
    return identifier
  },

  setStatus: (iid, status) => {
    const before = get().identifiers.find((i) => i.auth_identifier_id === iid)
    if (!before) return undefined
    const after: AuthIdentifier = { ...before, status }
    set((s) => ({
      identifiers: s.identifiers.map((i) =>
        i.auth_identifier_id === iid ? after : i,
      ),
    }))
    return after
  },

  setVerified: (iid, at) => {
    const before = get().identifiers.find((i) => i.auth_identifier_id === iid)
    if (!before) return undefined
    const after: AuthIdentifier = { ...before, verified_at: at ?? isoNow() }
    set((s) => ({
      identifiers: s.identifiers.map((i) =>
        i.auth_identifier_id === iid ? after : i,
      ),
    }))
    return after
  },
}))

export function listAuthIdentifiersByPerson(pid: PersonId) {
  return useAuthIdentifiersStore.getState().listByPerson(pid)
}
