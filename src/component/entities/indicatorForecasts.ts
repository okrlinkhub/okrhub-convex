/**
 * Indicator Forecasts Entity for OKRHub Component
 *
 * CRUD operations and queries for Indicator Forecasts.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
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
    sourceUrl: v.optional(v.string()),
    indicatorExternalId: v.string(),
    value: v.number(),
    date: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("indicatorForecasts"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { sourceApp, sourceUrl, indicatorExternalId, value, date } = args;

    try {
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");

      const uuid = crypto.randomUUID();
      const externalId = `${sourceApp}:indicatorForecast:${uuid}`;
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
        localId: "" as Id<"indicatorForecasts">,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

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
