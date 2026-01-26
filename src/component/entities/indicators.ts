/**
 * Indicators Entity for OKRHub Component
 *
 * CRUD operations and queries for Indicators.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { generateExternalId } from "../externalId.js";
import { assertValidExternalId, generateSlug } from "../lib/validation.js";
import {
  indicatorPayloadValidator,
  PeriodicitySchema,
  IndicatorTypeSchema,
  SyncStatusSchema,
} from "../schema.js";

// ============================================================================
// LOCAL CRUD MUTATIONS
// ============================================================================

/**
 * Creates an indicator locally and queues for sync
 */
export const createIndicator = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    companyExternalId: v.string(),
    description: v.string(),
    symbol: v.string(),
    periodicity: PeriodicitySchema,
    assigneeExternalId: v.optional(v.string()),
    isReverse: v.optional(v.boolean()),
    type: v.optional(IndicatorTypeSchema),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("indicators"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      companyExternalId,
      description,
      symbol,
      periodicity,
      assigneeExternalId,
      isReverse,
      type,
      notes,
    } = args;

    try {
      assertValidExternalId(companyExternalId, "companyExternalId");
      if (assigneeExternalId) {
        assertValidExternalId(assigneeExternalId, "assigneeExternalId");
      }

      const externalId = generateExternalId(sourceApp, "indicator");
      const slug = generateSlug(sourceApp, description);
      const now = Date.now();

      const localId = await ctx.db.insert("indicators", {
        externalId,
        companyExternalId,
        description,
        symbol,
        periodicity,
        assigneeExternalId,
        isReverse,
        type,
        notes,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        companyExternalId,
        description,
        symbol,
        periodicity,
        assigneeExternalId,
        isReverse,
        type,
        notes,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "indicator",
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
        localId: "" as Id<"indicators">,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

/**
 * Gets all local indicators
 */
export const getAllIndicators = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("indicators"),
      _creationTime: v.number(),
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
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("indicators")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// ============================================================================
// PUBLIC MUTATIONS - Entry points for consumers
// ============================================================================

/**
 * Insert an indicator into LinkHub
 */
export const insertIndicator = mutation({
  args: {
    indicator: indicatorPayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { indicator } = args;

    // Validate external IDs
    assertValidExternalId(indicator.externalId, "indicator.externalId");
    assertValidExternalId(
      indicator.companyExternalId,
      "indicator.companyExternalId"
    );
    if (indicator.assigneeExternalId) {
      assertValidExternalId(
        indicator.assigneeExternalId,
        "indicator.assigneeExternalId"
      );
    }

    // Add to sync queue
    const payload = JSON.stringify(indicator);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "indicator",
      externalId: indicator.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: indicator.externalId,
      queueId,
    };
  },
});
