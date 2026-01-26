/**
 * Risks Entity for OKRHub Component
 *
 * CRUD operations and queries for Risks.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { generateExternalId } from "../externalId.js";
import { assertValidExternalId, generateSlug } from "../lib/validation.js";
import {
  riskPayloadValidator,
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
    sourceUrl: v.optional(v.string()),
    description: v.string(),
    teamExternalId: v.string(),
    keyResultExternalId: v.string(), // Required: Reference to key result
    priority: PrioritySchema,
    indicatorExternalId: v.optional(v.string()),
    triggerValue: v.optional(v.number()),
    triggeredIfLower: v.optional(v.boolean()),
    useForecastAsTrigger: v.optional(v.boolean()),
    isRed: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("risks"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
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

      const externalId = generateExternalId(sourceApp, "risk");
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
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
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
      });

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
        localId: "" as Id<"risks">,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

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
        syncStatus: "pending",
      });

      // Create payload for sync with updated values
      const updatedRisk = {
        externalId,
        description: description ?? risk.description,
        teamExternalId: risk.teamExternalId,
        priority: priority ?? risk.priority,
        keyResultExternalId: keyResultExternalId ?? risk.keyResultExternalId,
        indicatorExternalId: indicatorExternalId ?? risk.indicatorExternalId,
        triggerValue: triggerValue ?? risk.triggerValue,
        triggeredIfLower: triggeredIfLower ?? risk.triggeredIfLower,
        useForecastAsTrigger: useForecastAsTrigger ?? risk.useForecastAsTrigger,
        isRed: isRed ?? risk.isRed,
      };

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

// ============================================================================
// PUBLIC MUTATIONS - Entry points for consumers
// ============================================================================

/**
 * Insert a risk into LinkHub
 */
export const insertRisk = mutation({
  args: {
    risk: riskPayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { risk } = args;

    // Validate external IDs
    assertValidExternalId(risk.externalId, "risk.externalId");
    assertValidExternalId(risk.teamExternalId, "risk.teamExternalId");
    assertValidExternalId(
      risk.keyResultExternalId,
      "risk.keyResultExternalId"
    );
    if (risk.indicatorExternalId) {
      assertValidExternalId(
        risk.indicatorExternalId,
        "risk.indicatorExternalId"
      );
    }

    // Add to sync queue
    const payload = JSON.stringify(risk);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "risk",
      externalId: risk.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: risk.externalId,
      queueId,
    };
  },
});
