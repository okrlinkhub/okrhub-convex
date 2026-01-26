/**
 * Key Results Entity for OKRHub Component
 *
 * CRUD operations and queries for Key Results.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { generateExternalId } from "../externalId.js";
import { assertValidExternalId, generateSlug } from "../lib/validation.js";
import { keyResultPayloadValidator, SyncStatusSchema } from "../schema.js";

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
    objectiveExternalId: v.optional(v.string()),
    indicatorExternalId: v.string(),
    teamExternalId: v.string(),
    forecastValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("keyResults"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
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
      if (objectiveExternalId) {
        assertValidExternalId(objectiveExternalId, "objectiveExternalId");
      }

      const externalId = generateExternalId(sourceApp, "keyResult");
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
        syncStatus: "pending",
        createdAt: now,
      });

      // Create payload for sync (weight=0 always)
      const payload = JSON.stringify({
        externalId,
        objectiveExternalId,
        indicatorExternalId,
        teamExternalId,
        weight: 0, // Always 0, managed by linkhub
        forecastValue,
        targetValue,
        sourceUrl,
        createdAt: now,
      });

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
        localId: "" as Id<"keyResults">,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

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
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("keyResults")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// ============================================================================
// PUBLIC MUTATIONS - Entry points for consumers
// ============================================================================

/**
 * Insert a key result into LinkHub
 */
export const insertKeyResult = mutation({
  args: {
    keyResult: keyResultPayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { keyResult } = args;

    // Validate external IDs
    assertValidExternalId(keyResult.externalId, "keyResult.externalId");
    assertValidExternalId(keyResult.teamExternalId, "keyResult.teamExternalId");
    assertValidExternalId(
      keyResult.indicatorExternalId,
      "keyResult.indicatorExternalId"
    );
    if (keyResult.objectiveExternalId) {
      assertValidExternalId(
        keyResult.objectiveExternalId,
        "keyResult.objectiveExternalId"
      );
    }

    // Add to sync queue
    const payload = JSON.stringify(keyResult);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "keyResult",
      externalId: keyResult.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: keyResult.externalId,
      queueId,
    };
  },
});
