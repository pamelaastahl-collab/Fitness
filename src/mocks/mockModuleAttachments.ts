/**
 * Mock ModuleAttachments — bind module configurations to OfferingVersions
 * (UOM §3.3, type-module matrix §4).
 *
 * Each PUBLISHED version has all its required modules attached. DRAFT versions
 * may or may not — F4 will surface the validation engine which checks
 * completeness against the type-module matrix.
 *
 * Module configurations themselves (TimeModule, PricingModule, etc.) are
 * type-specific and live alongside the F4 feature when it lands. Day 2 keeps
 * `module_id` as a generated UUID — a stable handle without backing config.
 */

import { create } from 'zustand'
import type {
  ModuleAttachment,
  ModuleAttachmentId,
  ModuleId,
  ModuleType,
  OfferingType,
  OfferingVersionId,
} from '@/types/primitives'
import { daysAgo, id } from './_helpers'
import {
  OV_FF_BRAND_TEE_V1_ID,
  OV_FF_HEATED_VINYASA_V1_ID,
  OV_FF_PT_SESSION_DRAFT_ID,
  OV_FF_REFORMER_8PACK_V1_ID,
  OV_FF_UNLIMITED_V1_ID,
  OV_IH_ALL_ACCESS_V1_ID,
  OV_IH_ALL_ACCESS_V2_ID,
  OV_IH_ALL_ACCESS_V3_ID,
  OV_IH_BOULDER_DAY_PASS_DRAFT_ID,
  OV_IH_FUNCTIONAL_STRENGTH_DRAFT_ID,
  OV_IH_GIFT_CARD_V1_ID,
  OV_IH_LAP_LANE_V1_ID,
} from './mockOfferingVersions'

/**
 * The required-module mask per offering type, sourced from UOM §4.1.
 * R = required, O = optional. Optional modules aren't seeded by default —
 * features can attach them when relevant.
 */
export const REQUIRED_MODULES_BY_TYPE: Record<OfferingType, ModuleType[]> = {
  MEMBERSHIP: ['PRICING', 'ENTITLEMENT'],
  CLASS: ['TIME', 'CAPACITY', 'PRICING'],
  APPOINTMENT: ['TIME', 'STAFFING', 'PRICING'],
  FACILITY_RENTAL: ['TIME', 'RESOURCE', 'PRICING'],
  RETAIL: ['GOODS', 'PRICING'],
  GIFT_CARD: ['GOODS', 'PRICING'],
  PACKAGE_CREDIT_PACK: ['PRICING', 'ENTITLEMENT'],
}

function ma(suffix: string): ModuleAttachmentId {
  return `n0000001-0000-0000-0000-${suffix.padStart(12, '0')}` as ModuleAttachmentId
}

function buildAttachments(
  version_id: OfferingVersionId,
  required: ModuleType[],
  baseSuffix: number,
  createdDaysAgoVal: number,
): ModuleAttachment[] {
  return required.map((module_type, idx): ModuleAttachment => ({
    attachment_id: ma(`${baseSuffix + idx}`),
    offering_version_id: version_id,
    module_type,
    module_id: id() as ModuleId,
    is_required: true,
    created_at: daysAgo(createdDaysAgoVal),
  }))
}

export const seedModuleAttachments: ModuleAttachment[] = [
  ...buildAttachments(OV_FF_UNLIMITED_V1_ID, REQUIRED_MODULES_BY_TYPE.MEMBERSHIP, 100, 380),
  ...buildAttachments(OV_FF_HEATED_VINYASA_V1_ID, REQUIRED_MODULES_BY_TYPE.CLASS, 110, 290),
  ...buildAttachments(OV_FF_REFORMER_8PACK_V1_ID, REQUIRED_MODULES_BY_TYPE.PACKAGE_CREDIT_PACK, 120, 230),
  ...buildAttachments(OV_FF_BRAND_TEE_V1_ID, REQUIRED_MODULES_BY_TYPE.RETAIL, 130, 200),
  // PT 1:1 DRAFT — only TIME + PRICING attached, missing STAFFING.
  // Exercises F4 validation engine surfacing "STAFFING required for APPOINTMENT".
  ...buildAttachments(OV_FF_PT_SESSION_DRAFT_ID, ['TIME', 'PRICING'], 140, 14),

  ...buildAttachments(OV_IH_ALL_ACCESS_V1_ID, REQUIRED_MODULES_BY_TYPE.MEMBERSHIP, 200, 340),
  ...buildAttachments(OV_IH_ALL_ACCESS_V2_ID, REQUIRED_MODULES_BY_TYPE.MEMBERSHIP, 210, 200),
  ...buildAttachments(OV_IH_ALL_ACCESS_V3_ID, REQUIRED_MODULES_BY_TYPE.MEMBERSHIP, 220, 60),
  ...buildAttachments(OV_IH_LAP_LANE_V1_ID, REQUIRED_MODULES_BY_TYPE.FACILITY_RENTAL, 230, 180),
  ...buildAttachments(OV_IH_GIFT_CARD_V1_ID, REQUIRED_MODULES_BY_TYPE.GIFT_CARD, 240, 150),
  // Functional Strength DRAFT — fully configured, ready to publish.
  ...buildAttachments(OV_IH_FUNCTIONAL_STRENGTH_DRAFT_ID, REQUIRED_MODULES_BY_TYPE.CLASS, 250, 7),
  // Boulder Day Pass DRAFT — fully configured at the version level, but BE
  // bank/tax config will block publish per XPI-CAT-03. F4 surfaces the block.
  ...buildAttachments(OV_IH_BOULDER_DAY_PASS_DRAFT_ID, REQUIRED_MODULES_BY_TYPE.APPOINTMENT, 260, 3),
]

interface ModuleAttachmentsStore {
  attachments: ModuleAttachment[]
  list: () => ModuleAttachment[]
  listByVersion: (vid: OfferingVersionId) => ModuleAttachment[]
}

export const useModuleAttachmentsStore = create<ModuleAttachmentsStore>((_set, get) => ({
  attachments: seedModuleAttachments,
  list: () => get().attachments,
  listByVersion: (vid) =>
    get().attachments.filter((a) => a.offering_version_id === vid),
}))
