/**
 * Risks Entity for OKRHub Component
 *
 * CRUD operations and queries for Risks.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import { generateScopedDescriptionExternalId } from "../externalId.js";
import { assertValidExternalId, generateSlug } from "../lib/validation.js";
import { stripLinkHubManagedFields } from "../lib/payloadPolicy.js";
import {
  PrioritySchema,
  SyncStatusSchema,
} from "../schema.js";

// ============================================================================
// LOCAL CRUD MUTATIONS
// ============================================================================

/**
 * Creates a risk locally and queues for sync
 */
export const createRisk = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.string(),
    description: v.string(),
    teamExternalId: v.string(),
    keyResultExternalId: v.string(), // Required: Reference to key result
    priority: PrioritySchema,
    indicatorExternalId: v.optional(v.string()),
    triggerValue: v.optional(v.number()),
    triggeredIfLower: v.optional(v.boolean()),
    useForecastAsTrigger: v.optional(v.boolean()),
    isRed: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.optional(v.id("risks")),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
    existing: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      description,
      teamExternalId,
      keyResultExternalId,
      priority,
      indicatorExternalId,
      triggerValue,
      triggeredIfLower,
      useForecastAsTrigger,
      isRed,
    } = args;

    try {
      assertValidExternalId(teamExternalId, "teamExternalId");
      assertValidExternalId(keyResultExternalId, "keyResultExternalId");
      if (indicatorExternalId) {
        assertValidExternalId(indicatorExternalId, "indicatorExternalId");
      }

      const externalId = generateScopedDescriptionExternalId(
        sourceApp,
        "risk",
        teamExternalId,
        description
      );

      // Idempotency check: always check resolved externalId
      const existing = await ctx.db
        .query("risks")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();
      if (existing) {
        return {
          success: true,
          externalId: existing.externalId,
          localId: existing._id,
          existing: true,
        };
      }

      // Validate parent hierarchy: keyResult must exist in local tables
      const parentKeyResult = await ctx.db
        .query("keyResults")
        .withIndex("by_external_id", (q) =>
          q.eq("externalId", keyResultExternalId)
        )
        .first();

      if (!parentKeyResult) {
        return {
          success: false,
          externalId: "",
          localId: undefined,
          queueId: undefined,
          error: `Parent keyResult not found in component tables: ${keyResultExternalId}. Create it first via createKeyResult().`,
        };
      }

      // externalId already resolved above
      const slug = generateSlug(sourceApp, description.substring(0, 30));
      const now = Date.now();

      const localId = await ctx.db.insert("risks", {
        externalId,
        description,
        teamExternalId,
        keyResultExternalId,
        priority,
        indicatorExternalId,
        triggerValue,
        triggeredIfLower,
        useForecastAsTrigger,
        isRed,
        slug,
        metadata: args.metadata,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify(stripLinkHubManagedFields("risk", {
        externalId,
        description,
        teamExternalId,
        keyResultExternalId,
        priority,
        indicatorExternalId,
        triggerValue,
        triggeredIfLower,
        useForecastAsTrigger,
        isRed,
        sourceUrl,
        createdAt: now,
      }));

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "risk",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: undefined,
        queueId: undefined,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

/**
 * Gets a single risk by its externalId
 */
export const getRiskByExternalId = query({
  args: {
    externalId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("risks"),
      _creationTime: v.number(),
      externalId: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      keyResultExternalId: v.string(),
      priority: PrioritySchema,
      indicatorExternalId: v.optional(v.string()),
      triggerValue: v.optional(v.number()),
      triggeredIfLower: v.optional(v.boolean()),
      useForecastAsTrigger: v.optional(v.boolean()),
      isRed: v.optional(v.boolean()),
      slug: v.string(),
      metadata: v.optional(v.any()),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("risks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

/**
 * Gets all local risks for a team
 */
export const getRisksByTeam = query({
  args: {
    teamExternalId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("risks"),
      _creationTime: v.number(),
      externalId: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      keyResultExternalId: v.string(),
      priority: PrioritySchema,
      indicatorExternalId: v.optional(v.string()),
      triggerValue: v.optional(v.number()),
      triggeredIfLower: v.optional(v.boolean()),
      useForecastAsTrigger: v.optional(v.boolean()),
      isRed: v.optional(v.boolean()),
      slug: v.string(),
      metadata: v.optional(v.any()),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("risks")
      .withIndex("by_team", (q) => q.eq("teamExternalId", args.teamExternalId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local risks for a key result
 */
export const getRisksByKeyResult = query({
  args: {
    keyResultExternalId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("risks"),
      _creationTime: v.number(),
      externalId: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      keyResultExternalId: v.string(), // Required
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
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("risks")
      .withIndex("by_key_result", (q) =>
        q.eq("keyResultExternalId", args.keyResultExternalId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local risks
 */
export const getAllRisks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("risks"),
      _creationTime: v.number(),
      externalId: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      keyResultExternalId: v.string(), // Required
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
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("risks")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// ============================================================================
// UPDATE MUTATIONS
// ============================================================================

/**
 * Soft-deletes a risk by setting deletedAt
 */
export const deleteRisk = mutation({
  args: {
    externalId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { externalId } = args;

    try {
      const risk = await ctx.db
        .query("risks")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!risk) {
        return {
          success: false,
          externalId,
          error: `Risk not found: ${externalId}`,
        };
      }

      await ctx.db.patch(risk._id, { deletedAt: Date.now() });

      return {
        success: true,
        externalId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId,
        error: errorMessage,
      };
    }
  },
});

/**
 * Updates a risk locally and queues for sync
 * Resets syncStatus to "pending"
 */
export const updateRisk = mutation({
  args: {
    externalId: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(PrioritySchema),
    keyResultExternalId: v.optional(v.string()),
    indicatorExternalId: v.optional(v.string()),
    triggerValue: v.optional(v.number()),
    triggeredIfLower: v.optional(v.boolean()),
    useForecastAsTrigger: v.optional(v.boolean()),
    isRed: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      externalId,
      description,
      priority,
      keyResultExternalId,
      indicatorExternalId,
      triggerValue,
      triggeredIfLower,
      useForecastAsTrigger,
      isRed,
    } = args;

    try {
      // Find the risk by externalId
      const risk = await ctx.db
        .query("risks")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!risk) {
        return {
          success: false,
          externalId,
          error: `Risk not found: ${externalId}`,
        };
      }

      // Validate external IDs if provided
      if (keyResultExternalId) {
        assertValidExternalId(keyResultExternalId, "keyResultExternalId");
      }
      if (indicatorExternalId) {
        assertValidExternalId(indicatorExternalId, "indicatorExternalId");
      }

      const now = Date.now();

      // Update the risk
      await ctx.db.patch(risk._id, {
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(keyResultExternalId !== undefined && { keyResultExternalId }),
        ...(indicatorExternalId !== undefined && { indicatorExternalId }),
        ...(triggerValue !== undefined && { triggerValue }),
        ...(triggeredIfLower !== undefined && { triggeredIfLower }),
        ...(useForecastAsTrigger !== undefined && { useForecastAsTrigger }),
        ...(isRed !== undefined && { isRed }),
        ...(args.metadata !== undefined && { metadata: args.metadata }),
        syncStatus: "pending",
      });

      // Build full payload from current state, then apply managed-field policy
      const updatedRisk = stripLinkHubManagedFields("risk", {
        externalId,
        description: description ?? risk.description,
        teamExternalId: risk.teamExternalId,
        keyResultExternalId: keyResultExternalId ?? risk.keyResultExternalId,
        priority: priority ?? risk.priority,
        indicatorExternalId: indicatorExternalId ?? risk.indicatorExternalId,
        triggerValue: triggerValue ?? risk.triggerValue,
        triggeredIfLower: triggeredIfLower ?? risk.triggeredIfLower,
        useForecastAsTrigger: useForecastAsTrigger ?? risk.useForecastAsTrigger,
        isRed: isRed ?? risk.isRed,
      });

      const payload = JSON.stringify(updatedRisk);

      // Add to sync queue
      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "risk",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId,
        error: errorMessage,
      };
    }
  },
});

