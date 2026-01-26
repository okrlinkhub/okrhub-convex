/**
 * OKRHub Component Schema
 *
 * This file defines payload validators for the OKRHub component.
 * These are simplified versions of LinkHub's schema that use externalId
 * instead of Convex internal IDs.
 *
 * IMPORTANT: All references use externalId strings, not v.id() types,
 * because the component runs in a different Convex deployment.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// ENUMS - Matching LinkHub's schema
// ============================================================================

export const PrioritySchema = v.union(
  v.literal("lowest"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("highest")
);

export const PeriodicitySchema = v.union(
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("semesterly"),
  v.literal("yearly")
);

export const InitiativeStatusSchema = v.union(
  v.literal("ON_TIME"),
  v.literal("OVERDUE"),
  v.literal("FINISHED")
);

export const MilestoneStatusSchema = v.union(
  v.literal("ON_TIME"),
  v.literal("OVERDUE"),
  v.literal("ACHIEVED_ON_TIME"),
  v.literal("ACHIEVED_LATE")
);

export const IndicatorTypeSchema = v.union(
  v.literal("OUTPUT"),
  v.literal("OUTCOME")
);

// ============================================================================
// PAYLOAD VALIDATORS - For ingestion into LinkHub
// ============================================================================

/**
 * Objective payload for insertion/update
 * Maps to LinkHub's objectives table
 */
export const objectivePayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required fields
  title: v.string(),
  description: v.string(),
  teamExternalId: v.string(), // Reference to team via externalId

  // Optional metadata
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

/**
 * Key Result payload for insertion/update
 * Maps to LinkHub's keyResults table
 */
export const keyResultPayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Reference to parent objective (optional - can be orphaned)
  objectiveExternalId: v.optional(v.string()),

  // Required: Reference to indicator
  indicatorExternalId: v.string(),

  // Required: Reference to team
  teamExternalId: v.string(),

  // Required: Weight (percentage 0-100)
  weight: v.number(),

  // Optional values
  impact: v.optional(v.number()),
  forecastValue: v.optional(v.number()),
  targetValue: v.optional(v.number()),

  // Optional metadata
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

/**
 * Risk (KPI) payload for insertion/update
 * Maps to LinkHub's risks table
 */
export const riskPayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required fields
  description: v.string(),
  teamExternalId: v.string(),
  priority: PrioritySchema,

  // Optional: Reference to parent key result
  keyResultExternalId: v.optional(v.string()),

  // Optional: Reference to indicator for KPI trigger
  indicatorExternalId: v.optional(v.string()),

  // KPI trigger configuration
  triggerValue: v.optional(v.number()),
  triggeredIfLower: v.optional(v.boolean()),
  useForecastAsTrigger: v.optional(v.boolean()),

  // Optional status
  isRed: v.optional(v.boolean()),

  // Optional metadata
  createdAt: v.optional(v.number()),
});

/**
 * Initiative payload for insertion/update
 * Maps to LinkHub's initiatives table
 */
export const initiativePayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required fields
  description: v.string(),
  teamExternalId: v.string(),
  assigneeExternalId: v.string(), // User external ID
  createdByExternalId: v.string(), // User external ID
  priority: PrioritySchema,

  // Optional: Reference to parent risk
  riskExternalId: v.optional(v.string()),

  // Status
  status: v.optional(InitiativeStatusSchema),
  isNew: v.optional(v.boolean()),
  finishedAt: v.optional(v.number()),

  // Optional fields
  externalUrl: v.optional(v.string()),
  notes: v.optional(v.string()),

  // Optional metadata
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

/**
 * Indicator payload for insertion/update
 * Maps to LinkHub's indicators table
 */
export const indicatorPayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required: Reference to company
  companyExternalId: v.string(),

  // Required fields
  description: v.string(),
  symbol: v.string(),
  periodicity: PeriodicitySchema,

  // Optional: Assignee
  assigneeExternalId: v.optional(v.string()),

  // Optional fields
  isReverse: v.optional(v.boolean()),
  type: v.optional(IndicatorTypeSchema),
  notes: v.optional(v.string()),
  automationUrl: v.optional(v.string()),
  automationDescription: v.optional(v.string()),
  forecastDate: v.optional(v.number()),

  // Optional metadata
  createdAt: v.optional(v.number()),
});

/**
 * Indicator Value payload for tracking
 * Maps to LinkHub's indicatorValues table
 */
export const indicatorValuePayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required: Reference to indicator
  indicatorExternalId: v.string(),

  // Required: Value data
  value: v.number(),
  date: v.number(), // Timestamp

  // Optional metadata
  createdAt: v.optional(v.number()),
});

/**
 * Indicator Forecast payload
 * Maps to LinkHub's indicatorForecasts table
 */
export const indicatorForecastPayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required: Reference to indicator
  indicatorExternalId: v.string(),

  // Required: Forecast data
  value: v.number(),
  date: v.number(), // Timestamp

  // Optional metadata
  createdAt: v.optional(v.number()),
});

/**
 * Milestone payload for insertion/update
 * Maps to LinkHub's milestones table
 */
export const milestonePayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required: Reference to indicator
  indicatorExternalId: v.string(),

  // Required fields
  description: v.string(),
  value: v.number(),

  // Optional: Achievement tracking
  achievedAt: v.optional(v.number()),
  forecastDate: v.optional(v.number()),
  status: v.optional(MilestoneStatusSchema),

  // Optional metadata
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

/**
 * Team payload for reference mapping
 * Used to map external team IDs to LinkHub teams
 */
export const teamPayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required: Reference to company
  companyExternalId: v.string(),

  // Required fields
  name: v.string(),

  // Optional metadata
  createdAt: v.optional(v.number()),
});

/**
 * User payload for reference mapping
 * Used to map external user IDs to LinkHub users
 */
export const userPayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required fields
  email: v.string(),
  name: v.optional(v.string()),
  surname: v.optional(v.string()),

  // Optional metadata
  createdAt: v.optional(v.number()),
});

/**
 * Company payload for reference mapping
 * Used to map external company IDs to LinkHub companies
 */
export const companyPayloadValidator = v.object({
  // Required: External ID for mapping
  externalId: v.string(),

  // Required fields
  name: v.string(),

  // Optional metadata
  createdAt: v.optional(v.number()),
});

// ============================================================================
// BATCH PAYLOAD VALIDATORS
// ============================================================================

/**
 * Batch payload for inserting multiple entities at once
 */
export const batchPayloadValidator = v.object({
  // Optional: Companies to create/update
  companies: v.optional(v.array(companyPayloadValidator)),

  // Optional: Teams to create/update
  teams: v.optional(v.array(teamPayloadValidator)),

  // Optional: Users to create/update
  users: v.optional(v.array(userPayloadValidator)),

  // Optional: Indicators to create/update
  indicators: v.optional(v.array(indicatorPayloadValidator)),

  // Optional: Objectives to create/update
  objectives: v.optional(v.array(objectivePayloadValidator)),

  // Optional: Key Results to create/update
  keyResults: v.optional(v.array(keyResultPayloadValidator)),

  // Optional: Risks to create/update
  risks: v.optional(v.array(riskPayloadValidator)),

  // Optional: Initiatives to create/update
  initiatives: v.optional(v.array(initiativePayloadValidator)),

  // Optional: Milestones to create/update
  milestones: v.optional(v.array(milestonePayloadValidator)),

  // Optional: Indicator values to create
  indicatorValues: v.optional(v.array(indicatorValuePayloadValidator)),

  // Optional: Indicator forecasts to create
  indicatorForecasts: v.optional(v.array(indicatorForecastPayloadValidator)),
});

// ============================================================================
// SYNC STATUS ENUM
// ============================================================================

export const SyncStatusSchema = v.union(
  v.literal("pending"),
  v.literal("synced"),
  v.literal("failed")
);

// ============================================================================
// COMPONENT INTERNAL SCHEMA
// ============================================================================

/**
 * Component schema with local tables for OKR entities.
 * These tables store data locally before syncing to LinkHub.
 */
export default defineSchema({
  // =========================================================================
  // SYNC INFRASTRUCTURE
  // =========================================================================

  // Sync queue for pending items
  syncQueue: defineTable({
    entityType: v.string(), // objective, keyResult, risk, etc.
    externalId: v.string(),
    payload: v.string(), // JSON stringified payload
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed")
    ),
    attempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_external_id", ["externalId"])
    .index("by_entity_type_status", ["entityType", "status"]),

  // Sync log for tracking successful syncs
  syncLog: defineTable({
    entityType: v.string(),
    externalId: v.string(),
    linkHubId: v.optional(v.string()), // The ID returned from LinkHub
    syncedAt: v.number(),
    action: v.union(v.literal("create"), v.literal("update")),
  })
    .index("by_external_id", ["externalId"])
    .index("by_entity_type", ["entityType"])
    .index("by_synced_at", ["syncedAt"]),

  // =========================================================================
  // LOCAL OKR TABLES
  // =========================================================================

  // Objectives - local storage before sync
  objectives: defineTable({
    externalId: v.string(),
    title: v.string(),
    description: v.string(),
    teamExternalId: v.string(),
    slug: v.string(),
    syncStatus: SyncStatusSchema,
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_external_id", ["externalId"])
    .index("by_team", ["teamExternalId"])
    .index("by_slug", ["slug"])
    .index("by_sync_status", ["syncStatus"]),

  // Key Results - local storage before sync
  keyResults: defineTable({
    externalId: v.string(),
    objectiveExternalId: v.optional(v.string()),
    indicatorExternalId: v.string(),
    teamExternalId: v.string(),
    forecastValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    slug: v.string(),
    syncStatus: SyncStatusSchema,
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_external_id", ["externalId"])
    .index("by_objective", ["objectiveExternalId"])
    .index("by_team", ["teamExternalId"])
    .index("by_indicator", ["indicatorExternalId"])
    .index("by_slug", ["slug"])
    .index("by_sync_status", ["syncStatus"]),

  // Risks - local storage before sync
  risks: defineTable({
    externalId: v.string(),
    description: v.string(),
    teamExternalId: v.string(),
    keyResultExternalId: v.optional(v.string()),
    priority: PrioritySchema,
    indicatorExternalId: v.optional(v.string()),
    triggerValue: v.optional(v.number()),
    triggeredIfLower: v.optional(v.boolean()),
    useForecastAsTrigger: v.optional(v.boolean()),
    isRed: v.optional(v.boolean()),
    slug: v.string(),
    syncStatus: SyncStatusSchema,
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_external_id", ["externalId"])
    .index("by_key_result", ["keyResultExternalId"])
    .index("by_team", ["teamExternalId"])
    .index("by_slug", ["slug"])
    .index("by_sync_status", ["syncStatus"]),

  // Initiatives - local storage before sync
  initiatives: defineTable({
    externalId: v.string(),
    description: v.string(),
    teamExternalId: v.string(),
    riskExternalId: v.optional(v.string()),
    assigneeExternalId: v.string(),
    createdByExternalId: v.string(),
    status: InitiativeStatusSchema,
    priority: PrioritySchema,
    finishedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    slug: v.string(),
    syncStatus: SyncStatusSchema,
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_external_id", ["externalId"])
    .index("by_risk", ["riskExternalId"])
    .index("by_team", ["teamExternalId"])
    .index("by_assignee", ["assigneeExternalId"])
    .index("by_slug", ["slug"])
    .index("by_sync_status", ["syncStatus"]),

  // Indicators - local storage before sync
  indicators: defineTable({
    externalId: v.string(),
    companyExternalId: v.string(),
    description: v.string(),
    symbol: v.string(),
    periodicity: PeriodicitySchema,
    assigneeExternalId: v.optional(v.string()),
    isReverse: v.optional(v.boolean()),
    type: v.optional(IndicatorTypeSchema),
    notes: v.optional(v.string()),
    slug: v.string(),
    syncStatus: SyncStatusSchema,
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_external_id", ["externalId"])
    .index("by_company", ["companyExternalId"])
    .index("by_slug", ["slug"])
    .index("by_sync_status", ["syncStatus"]),

  // Indicator Values - local storage before sync
  indicatorValues: defineTable({
    externalId: v.string(),
    indicatorExternalId: v.string(),
    value: v.number(),
    date: v.number(),
    syncStatus: SyncStatusSchema,
    createdAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_indicator", ["indicatorExternalId"])
    .index("by_sync_status", ["syncStatus"]),

  // Indicator Forecasts - local storage before sync
  indicatorForecasts: defineTable({
    externalId: v.string(),
    indicatorExternalId: v.string(),
    value: v.number(),
    date: v.number(),
    syncStatus: SyncStatusSchema,
    createdAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_indicator", ["indicatorExternalId"])
    .index("by_sync_status", ["syncStatus"]),

  // Milestones - local storage before sync
  milestones: defineTable({
    externalId: v.string(),
    indicatorExternalId: v.string(),
    description: v.string(),
    value: v.number(),
    forecastDate: v.optional(v.number()),
    status: v.optional(MilestoneStatusSchema),
    achievedAt: v.optional(v.number()),
    slug: v.string(),
    syncStatus: SyncStatusSchema,
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_external_id", ["externalId"])
    .index("by_indicator", ["indicatorExternalId"])
    .index("by_slug", ["slug"])
    .index("by_sync_status", ["syncStatus"]),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ObjectivePayload = typeof objectivePayloadValidator.type;
export type KeyResultPayload = typeof keyResultPayloadValidator.type;
export type RiskPayload = typeof riskPayloadValidator.type;
export type InitiativePayload = typeof initiativePayloadValidator.type;
export type IndicatorPayload = typeof indicatorPayloadValidator.type;
export type IndicatorValuePayload = typeof indicatorValuePayloadValidator.type;
export type IndicatorForecastPayload =
  typeof indicatorForecastPayloadValidator.type;
export type MilestonePayload = typeof milestonePayloadValidator.type;
export type TeamPayload = typeof teamPayloadValidator.type;
export type UserPayload = typeof userPayloadValidator.type;
export type CompanyPayload = typeof companyPayloadValidator.type;
export type BatchPayload = typeof batchPayloadValidator.type;
export type SyncStatus = typeof SyncStatusSchema.type;
