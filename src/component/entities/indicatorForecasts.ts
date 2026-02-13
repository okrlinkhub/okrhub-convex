/**
 * Indicator Forecasts Entity for OKRHub Component
 *
 * CRUD operations and queries for Indicator Forecasts.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import { generateIndicatorTimeSeriesExternalId } from "../externalId.js";
import { assertValidExternalId } from "../lib/validation.js";
import { SyncStatusSchema } from "../schema.js";

// ============================================================================
// LOCAL CRUD MUTATIONS
// ============================================================================

/**
 * Creates an indicator forecast locally and queues for sync
 */
export const createIndicatorForecast = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.string(),
    indicatorExternalId: v.string(),
    value: v.number(),
    date: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.optional(v.id("indicatorForecasts")),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
    existing: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const { sourceApp, sourceUrl, indicatorExternalId, value, date } = args;

    try {
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");

      const externalId = generateIndicatorTimeSeriesExternalId(
        sourceApp,
        "indicatorForecast",
        indicatorExternalId,
        date
      );

      // Idempotency check: always check resolved externalId
      const existing = await ctx.db
        .query("indicatorForecasts")
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

      // externalId already resolved above
      const now = Date.now();

      const localId = await ctx.db.insert("indicatorForecasts", {
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
        entityType: "indicatorForecast",
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

// ============================================================================
// UPDATE MUTATIONS
// ============================================================================

/**
 * Updates an indicator forecast locally and queues for sync
 * Resets syncStatus to "pending"
 */
export const updateIndicatorForecast = mutation({
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
      // Find the indicator forecast by externalId
      const indicatorForecast = await ctx.db
        .query("indicatorForecasts")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!indicatorForecast) {
        return {
          success: false,
          externalId,
          error: `Indicator forecast not found: ${externalId}`,
        };
      }

      const now = Date.now();

      // Update the indicator forecast
      await ctx.db.patch(indicatorForecast._id, {
        ...(value !== undefined && { value }),
        ...(date !== undefined && { date }),
        syncStatus: "pending",
      });

      // Create payload for sync with updated values
      const updatedIndicatorForecast = {
        externalId,
        indicatorExternalId: indicatorForecast.indicatorExternalId,
        value: value ?? indicatorForecast.value,
        date: date ?? indicatorForecast.date,
      };

      const payload = JSON.stringify(updatedIndicatorForecast);

      // Add to sync queue
      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "indicatorForecast",
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

/**
 * Gets all local indicator forecasts
 */
export const getAllIndicatorForecasts = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("indicatorForecasts"),
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
    return await ctx.db.query("indicatorForecasts").collect();
  },
});
