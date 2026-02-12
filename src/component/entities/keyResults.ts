/**
 * Key Results Entity for OKRHub Component
 *
 * CRUD operations and queries for Key Results.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import { generateExternalId } from "../externalId.js";
import { assertValidExternalId, generateSlug } from "../lib/validation.js";
import { stripLinkHubManagedFields } from "../lib/payloadPolicy.js";
import { SyncStatusSchema } from "../schema.js";

// ============================================================================
// LOCAL CRUD MUTATIONS
// ============================================================================

/**
 * Creates a key result locally and queues for sync
 * Note: weight is always set to 0, managed only by linkhub
 */
export const createKeyResult = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    externalId: v.optional(v.string()),
    objectiveExternalId: v.string(), // Required: Reference to objective
    indicatorExternalId: v.string(),
    teamExternalId: v.string(),
    forecastValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.optional(v.id("keyResults")),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
    existing: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      objectiveExternalId,
      indicatorExternalId,
      teamExternalId,
      forecastValue,
      targetValue,
    } = args;

    try {
      // Validate external IDs
      assertValidExternalId(teamExternalId, "teamExternalId");
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");
      assertValidExternalId(objectiveExternalId, "objectiveExternalId");

      // Idempotency check: if externalId provided, check if already exists
      if (args.externalId) {
        const existing = await ctx.db
          .query("keyResults")
          .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId!))
          .first();
        if (existing) {
          return {
            success: true,
            externalId: existing.externalId,
            localId: existing._id,
            existing: true,
          };
        }
      }

      // Validate parent hierarchy: objective must exist in local tables
      const parentObjective = await ctx.db
        .query("objectives")
        .withIndex("by_external_id", (q) =>
          q.eq("externalId", objectiveExternalId)
        )
        .first();

      if (!parentObjective) {
        return {
          success: false,
          externalId: "",
          localId: undefined,
          queueId: undefined,
          error: `Parent objective not found in component tables: ${objectiveExternalId}. Create it first via createObjective().`,
        };
      }

      // Validate parent hierarchy: indicator must exist in local tables
      const parentIndicator = await ctx.db
        .query("indicators")
        .withIndex("by_external_id", (q) =>
          q.eq("externalId", indicatorExternalId)
        )
        .first();

      if (!parentIndicator) {
        return {
          success: false,
          externalId: "",
          localId: undefined,
          queueId: undefined,
          error: `Parent indicator not found in component tables: ${indicatorExternalId}. Create it first via createIndicator().`,
        };
      }

      // Use provided externalId or generate a new one
      const externalId = args.externalId ?? generateExternalId(sourceApp, "keyResult");
      const slug = generateSlug(sourceApp, `kr-${sourceApp}`);
      const now = Date.now();

      // Save locally
      const localId = await ctx.db.insert("keyResults", {
        externalId,
        objectiveExternalId,
        indicatorExternalId,
        teamExternalId,
        forecastValue,
        targetValue,
        slug,
        metadata: args.metadata,
        syncStatus: "pending",
        createdAt: now,
      });

      // Build full payload, then apply managed-field policy
      const payload = JSON.stringify(stripLinkHubManagedFields("keyResult", {
        externalId,
        objectiveExternalId,
        indicatorExternalId,
        teamExternalId,
        weight: 0,
        forecastValue,
        targetValue,
        sourceUrl,
        createdAt: now,
      }));

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "keyResult",
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
 * Gets a single key result by its externalId
 */
export const getKeyResultByExternalId = query({
  args: {
    externalId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("keyResults"),
      _creationTime: v.number(),
      externalId: v.string(),
      objectiveExternalId: v.string(),
      indicatorExternalId: v.string(),
      teamExternalId: v.string(),
      forecastValue: v.optional(v.number()),
      targetValue: v.optional(v.number()),
      slug: v.string(),
      metadata: v.optional(v.any()),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("keyResults")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

/**
 * Gets all local key results for an objective
 */
export const getKeyResultsByObjective = query({
  args: {
    objectiveExternalId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("keyResults"),
      _creationTime: v.number(),
      externalId: v.string(),
      objectiveExternalId: v.string(), // Required
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
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("keyResults")
      .withIndex("by_objective", (q) =>
        q.eq("objectiveExternalId", args.objectiveExternalId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local key results
 */
export const getAllKeyResults = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("keyResults"),
      _creationTime: v.number(),
      externalId: v.string(),
      objectiveExternalId: v.string(), // Required
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
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("keyResults")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// ============================================================================
// UPDATE MUTATIONS
// ============================================================================

/**
 * Updates a key result locally and queues for sync
 * Resets syncStatus to "pending"
 */
export const updateKeyResult = mutation({
  args: {
    externalId: v.string(),
    objectiveExternalId: v.optional(v.string()),
    forecastValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { externalId, objectiveExternalId, forecastValue, targetValue } = args;

    try {
      // Find the key result by externalId
      const keyResult = await ctx.db
        .query("keyResults")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!keyResult) {
        return {
          success: false,
          externalId,
          error: `Key result not found: ${externalId}`,
        };
      }

      // Validate objectiveExternalId if provided
      if (objectiveExternalId) {
        assertValidExternalId(objectiveExternalId, "objectiveExternalId");
      }

      const now = Date.now();

      // Update the key result
      await ctx.db.patch(keyResult._id, {
        ...(objectiveExternalId !== undefined && { objectiveExternalId }),
        ...(forecastValue !== undefined && { forecastValue }),
        ...(targetValue !== undefined && { targetValue }),
        ...(args.metadata !== undefined && { metadata: args.metadata }),
        syncStatus: "pending",
        updatedAt: now,
      });

      const existingWeight =
        typeof (keyResult as Record<string, unknown>).weight === "number"
          ? ((keyResult as Record<string, unknown>).weight as number)
          : undefined;

      // Build full payload from current state, then apply managed-field policy
      const updatedKeyResult = stripLinkHubManagedFields("keyResult", {
        externalId,
        objectiveExternalId: objectiveExternalId ?? keyResult.objectiveExternalId,
        indicatorExternalId: keyResult.indicatorExternalId,
        teamExternalId: keyResult.teamExternalId,
        weight: existingWeight,
        forecastValue: forecastValue ?? keyResult.forecastValue,
        targetValue: targetValue ?? keyResult.targetValue,
        updatedAt: now,
      });

      const payload = JSON.stringify(updatedKeyResult);

      // Add to sync queue
      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "keyResult",
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

