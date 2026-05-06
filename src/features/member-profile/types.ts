/**
 * Feature-local types for Member Profile Extended Data (FRD MPE-F01–F02 slice).
 *
 * EmergencyContact, ConditionType, and MemberCondition are FRD-local
 * (not promotable to primitives). Lives here so src/types/primitives.ts
 * stays aligned with the four primitive docs only.
 */

import type {
  CompanyId,
  IsoDate,
  IsoTimestamp,
  PersonId,
} from '@/types/primitives'

export type EmergencyContactId = string & {
  readonly __brand: 'EmergencyContactId'
}
export type ConditionTypeId = string & { readonly __brand: 'ConditionTypeId' }
export type MemberConditionId = string & {
  readonly __brand: 'MemberConditionId'
}

export interface EmergencyContact {
  emergency_contact_id: EmergencyContactId
  /** One per Person. Uniqueness enforced at the mutation seam. */
  person_id: PersonId
  company_id: CompanyId
  name: string
  relationship: string
  /** E.164. At least one phone field required across the three. */
  phone_home?: string
  phone_work?: string
  phone_mobile?: string
  created_at: IsoTimestamp
  updated_at: IsoTimestamp
  created_by_person_id: PersonId
  updated_by_person_id: PersonId
}

export type ConditionSeverity = 'INFORMATIONAL' | 'WARNING' | 'ALERT'

export interface ConditionType {
  condition_type_id: ConditionTypeId
  company_id: CompanyId
  /** Internal stable code, e.g. ALLERGY_NUTS. */
  code: string
  label: string
  severity: ConditionSeverity
  is_active: boolean
}

export interface MemberCondition {
  member_condition_id: MemberConditionId
  person_id: PersonId
  company_id: CompanyId
  condition_type_id: ConditionTypeId
  is_active: boolean
  note?: string
  /** When set and in the past, the record is treated as auto-deactivated on read. */
  expiry_date?: IsoDate
  applied_at: IsoTimestamp
  applied_by_person_id: PersonId
  deactivated_at?: IsoTimestamp
  deactivated_by_person_id?: PersonId
}

/**
 * Tenant-level field-visibility config for Emergency Contact (FRD US-MPE-001).
 * Real config UI is a deferred Tenant Settings story; this is the hardcoded
 * default policy until that surface exists.
 */
export interface EmergencyContactFieldConfig {
  name: 'Required' | 'Optional' | 'Hidden'
  relationship: 'Required' | 'Optional' | 'Hidden'
  phone_home: 'Required' | 'Optional' | 'Hidden'
  phone_work: 'Required' | 'Optional' | 'Hidden'
  phone_mobile: 'Required' | 'Optional' | 'Hidden'
}

export const DEFAULT_EMERGENCY_CONTACT_CONFIG: EmergencyContactFieldConfig = {
  name: 'Required',
  relationship: 'Required',
  phone_home: 'Optional',
  phone_work: 'Optional',
  phone_mobile: 'Optional',
}
