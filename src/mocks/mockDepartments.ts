/**
 * Mock Departments — operational subdivision within a Location (OH §2.4).
 *
 * Five departments across three locations. Departments are optional —
 * Wellington, Queens, Manhattan, Boulder don't have any (also intentional —
 * exercises the "no departments" branch in nav and offering publication UIs).
 */

import { create } from 'zustand'
import type {
  Department,
  DepartmentId,
  LocationId,
  PersonId,
} from '@/types/primitives'
import { daysAgo, id, isoNow } from './_helpers'
import {
  LOC_FITFLOW_AUCKLAND_ID,
  LOC_IRON_BROOKLYN_ID,
} from './mockLocations'
import { COMPANY_FITFLOW_PACIFIC_ID, COMPANY_IRON_HARBOR_ID } from './mockCompanies'
import { emitAuditEvent } from './mockAuditEvents'

export const DEPT_AUCKLAND_YOGA_ID =
  'd0000001-0000-0000-0000-000000000001' as DepartmentId
export const DEPT_AUCKLAND_STRENGTH_ID =
  'd0000001-0000-0000-0000-000000000002' as DepartmentId
export const DEPT_AUCKLAND_PILATES_ID =
  'd0000001-0000-0000-0000-000000000003' as DepartmentId
export const DEPT_BROOKLYN_PT_ID =
  'd0000001-0000-0000-0000-000000000004' as DepartmentId
export const DEPT_BROOKLYN_AQUATICS_ID =
  'd0000001-0000-0000-0000-000000000005' as DepartmentId

export const seedDepartments: Department[] = [
  {
    department_id: DEPT_AUCKLAND_YOGA_ID,
    location_id: LOC_FITFLOW_AUCKLAND_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'Yoga Studio',
    description: 'Heated and unheated mat-based classes.',
    status: 'ACTIVE',
    created_at: daysAgo(390),
  },
  {
    department_id: DEPT_AUCKLAND_STRENGTH_ID,
    location_id: LOC_FITFLOW_AUCKLAND_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'Strength Floor',
    description: 'Free weights, racks, and small-group lifting.',
    status: 'ACTIVE',
    created_at: daysAgo(390),
  },
  {
    department_id: DEPT_AUCKLAND_PILATES_ID,
    location_id: LOC_FITFLOW_AUCKLAND_ID,
    company_id: COMPANY_FITFLOW_PACIFIC_ID,
    name: 'Reformer Pilates',
    description: '8-bed reformer studio. Capped at 8 per session.',
    status: 'ACTIVE',
    created_at: daysAgo(280),
  },
  {
    department_id: DEPT_BROOKLYN_PT_ID,
    location_id: LOC_IRON_BROOKLYN_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Personal Training',
    description: '1:1 and 2:1 coached sessions.',
    status: 'ACTIVE',
    created_at: daysAgo(325),
  },
  {
    department_id: DEPT_BROOKLYN_AQUATICS_ID,
    location_id: LOC_IRON_BROOKLYN_ID,
    company_id: COMPANY_IRON_HARBOR_ID,
    name: 'Aquatics',
    description: '25m pool. Lap lanes, swim school, aqua aerobics.',
    status: 'ACTIVE',
    created_at: daysAgo(325),
  },
]

interface DepartmentsStore {
  departments: Department[]
  list: () => Department[]
  listByLocation: (loc: LocationId) => Department[]
  getById: (dept: DepartmentId) => Department | undefined
  create: (
    input: Omit<Department, 'department_id' | 'created_at'>,
    actor_id: PersonId,
  ) => Department
  update: (
    dept: DepartmentId,
    patch: Partial<Omit<Department, 'department_id' | 'location_id' | 'company_id' | 'created_at'>>,
    actor_id: PersonId,
  ) => Department | undefined
  deactivate: (
    dept: DepartmentId,
    actor_id: PersonId,
    reason: string,
  ) => Department | undefined
}

export const useDepartmentsStore = create<DepartmentsStore>((set, get) => ({
  departments: seedDepartments,
  list: () => get().departments,
  listByLocation: (loc) =>
    get().departments.filter((d) => d.location_id === loc),
  getById: (dept) =>
    get().departments.find((d) => d.department_id === dept),

  create: (input, actor_id) => {
    const department: Department = {
      ...input,
      department_id: id() as DepartmentId,
      created_at: isoNow(),
    }
    set((s) => ({ departments: [...s.departments, department] }))
    emitAuditEvent({
      event_type: 'department.created',
      actor_person_id: actor_id,
      target_entity_type: 'Department',
      target_entity_id: department.department_id,
      company_id: department.company_id,
      scope_type: 'DEPARTMENT',
      scope_id: department.department_id,
      after_value: { name: department.name, location_id: department.location_id },
    })
    return department
  },

  update: (dept, patch, actor_id) => {
    const before = get().departments.find((d) => d.department_id === dept)
    if (!before) return undefined
    const after = { ...before, ...patch }
    set((s) => ({
      departments: s.departments.map((d) =>
        d.department_id === dept ? after : d,
      ),
    }))
    emitAuditEvent({
      event_type: 'department.updated',
      actor_person_id: actor_id,
      target_entity_type: 'Department',
      target_entity_id: dept,
      company_id: before.company_id,
      scope_type: 'DEPARTMENT',
      scope_id: dept,
      before_value: { name: before.name, status: before.status },
      after_value: { name: after.name, status: after.status },
    })
    return after
  },

  deactivate: (dept, actor_id, reason) => {
    const before = get().departments.find((d) => d.department_id === dept)
    if (!before) return undefined
    const after: Department = { ...before, status: 'DEACTIVATED' }
    set((s) => ({
      departments: s.departments.map((d) =>
        d.department_id === dept ? after : d,
      ),
    }))
    emitAuditEvent({
      event_type: 'department.deactivated',
      actor_person_id: actor_id,
      target_entity_type: 'Department',
      target_entity_id: dept,
      company_id: before.company_id,
      scope_type: 'DEPARTMENT',
      scope_id: dept,
      before_value: { status: before.status },
      after_value: { status: after.status, reason_code: reason },
    })
    return after
  },
}))

export function listDepartments() {
  return useDepartmentsStore.getState().list()
}
export function listDepartmentsByLocation(loc: LocationId) {
  return useDepartmentsStore.getState().listByLocation(loc)
}
export function getDepartmentById(dept: DepartmentId) {
  return useDepartmentsStore.getState().getById(dept)
}
