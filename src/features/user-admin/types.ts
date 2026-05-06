/**
 * Feature-local types for Admin User Management.
 *
 * InviteToken is FRD-local (epic EPIC-UM, not a primitive). It lives here
 * rather than in src/types/primitives.ts so the primitives file stays
 * aligned with the four authoritative primitive docs only.
 */

import type {
  CompanyId,
  IsoTimestamp,
  PersonId,
  RoleAssignmentId,
  UUID,
} from '@/types/primitives'

export type InviteTokenId = string & { readonly __brand: 'InviteTokenId' }

export type InviteTokenStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

export interface InviteToken {
  token_id: InviteTokenId
  person_id: PersonId
  company_id: CompanyId
  role_assignment_id: RoleAssignmentId
  status: InviteTokenStatus
  created_at: IsoTimestamp
  /** created_at + 7 days. */
  expires_at: IsoTimestamp
  accepted_at?: IsoTimestamp
  /** Links the invite + membership + role-assignment writes. */
  correlation_id: UUID
}

/** Capability strings used for permission checks across this feature. */
export type Capability =
  | 'users.list'
  | 'users.list.location_scoped'
  | 'users.list.entity_scoped'
  | 'users.read_contact'
  | 'users.invite'
  | 'users.assign_role.unrestricted'
  | 'users.assign_role.location_only'
  | 'users.revoke_role.unrestricted'
  | 'users.revoke_role.location_only'
  | 'users.edit_name'
  | 'users.edit_contact'
  | 'users.terminate_session'
  | 'users.deactivate'
  | 'users.delete'
  | 'users.export'
  | 'users.view_effective_permissions'
  | 'users.view_audit'
