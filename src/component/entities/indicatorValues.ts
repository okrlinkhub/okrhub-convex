/**
 * Indicator Values Entity for OKRHub Component
 *
 * CRUD operations and queries for Indicator Values.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { assertValidExternalId } from "../lib/validation.js";
import { indicatorValuePayloadValidator, SyncStatusSchema } from "../schema.js";

// ============================================================================
// LOCAL CRUD MUTATIONS
// ============================================================================

/**
 * Creates an indicator value locally and queues for sync
 */
export const createIndicatorValue = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    indicatorExternalId: v.string(),
    value: v.number(),
    date: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("indicatorValues"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { sourceApp, sourceUrl, indicatorExternalId, value, date } = args;

    try {
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");

      const uuid = crypto.randomUUID();
      const externalId = `${sourceApp}:indicatorValue:${uuid}`;
      const now = Date.now();

      const localId = await ctx.db.insert("indicatorValues", {
        externalId,
        indicatorExternalId,
        value,
        date,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        indicatorExternalId,
        value,
        date,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "indicatorValue",
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
        localId: "" as Id<"indicatorValues">,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

/**
 * Gets all local indicator values
 */
export const getAllIndicatorValues = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("indicatorValues"),
      _creationTime: v.number(),
      externalId: v.string(),
      indicatorExternalId: v.string(),
      value: v.number(),
      date: v.number(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("indicatorValues").collect();
  },
});

// ============================================================================
// UPDATE MUTATIONS
// ============================================================================

/**
 * Updates an indicator value locally and queues for sync
 * Resets syncStatus to "pending"
 */
export const updateIndicatorValue = mutation({
  args: {
    externalId: v.string(),
    value: v.optional(v.number()),
    date: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { externalId, value, date } = args;

    try {
      // Find the indicator value by externalId
      const indicatorValue = await ctx.db
        .query("indicatorValues")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!indicatorValue) {
        return {
          success: false,
          externalId,
          error: `Indicator value not found: ${externalId}`,
        };
      }

      const now = Date.now();

      // Update the indicator value
      await ctx.db.patch(indicatorValue._id, {
        ...(value !== undefined && { value }),
        ...(date !== undefined && { date }),
        syncStatus: "pending",
      });

      // Create payload for sync with updated values
      const updatedIndicatorValue = {
        externalId,
        indicatorExternalId: indicatorValue.indicatorExternalId,
        value: value ?? indicatorValue.value,
        date: date ?? indicatorValue.date,
      };

      const payload = JSON.stringify(updatedIndicatorValue);

      // Add to sync queue
      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "indicatorValue",
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
 * Insert an indicator value into LinkHub
 */
export const insertIndicatorValue = mutation({
  args: {
    indicatorValue: indicatorValuePayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { indicatorValue } = args;

    // Validate external IDs
    assertValidExternalId(
      indicatorValue.externalId,
      "indicatorValue.externalId"
    );
    assertValidExternalId(
      indicatorValue.indicatorExternalId,
      "indicatorValue.indicatorExternalId"
    );

    // Add to sync queue
    const payload = JSON.stringify(indicatorValue);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "indicatorValue",
      externalId: indicatorValue.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: indicatorValue.externalId,
      queueId,
    };
  },
});
