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
  PeriodicitySchema,
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
    externalId: v.optional(v.string()),
    companyExternalId: v.string(),
    description: v.string(),
    symbol: v.string(),
    periodicity: PeriodicitySchema,
    isReverse: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("indicators"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
    existing: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      companyExternalId,
      description,
      symbol,
      periodicity,
      isReverse,
    } = args;

    try {
      assertValidExternalId(companyExternalId, "companyExternalId");

      // Idempotency check: if externalId provided, check if already exists
      if (args.externalId) {
        const existing = await ctx.db
          .query("indicators")
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

      // Use provided externalId or generate a new one
      const externalId = args.externalId ?? generateExternalId(sourceApp, "indicator");
      const slug = generateSlug(sourceApp, description);
      const now = Date.now();

      const localId = await ctx.db.insert("indicators", {
        externalId,
        companyExternalId,
        description,
        symbol,
        periodicity,
        isReverse,
        slug,
        metadata: args.metadata,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        companyExternalId,
        description,
        symbol,
        periodicity,
        isReverse,
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
      isReverse: v.optional(v.boolean()),
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
// UPDATE MUTATIONS
// ============================================================================

/**
 * Updates an indicator locally and queues for sync
 * Resets syncStatus to "pending"
 */
export const updateIndicator = mutation({
  args: {
    externalId: v.string(),
    description: v.optional(v.string()),
    symbol: v.optional(v.string()),
    periodicity: v.optional(PeriodicitySchema),
    isReverse: v.optional(v.boolean()),
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
      symbol,
      periodicity,
      isReverse,
    } = args;

    try {
      // Find the indicator by externalId
      const indicator = await ctx.db
        .query("indicators")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!indicator) {
        return {
          success: false,
          externalId,
          error: `Indicator not found: ${externalId}`,
        };
      }

      const now = Date.now();

      // Update the indicator
      await ctx.db.patch(indicator._id, {
        ...(description !== undefined && { description }),
        ...(symbol !== undefined && { symbol }),
        ...(periodicity !== undefined && { periodicity }),
        ...(isReverse !== undefined && { isReverse }),
        ...(args.metadata !== undefined && { metadata: args.metadata }),
        syncStatus: "pending",
      });

      // Create payload for sync with updated values
      const updatedIndicator = {
        externalId,
        companyExternalId: indicator.companyExternalId,
        description: description ?? indicator.description,
        symbol: symbol ?? indicator.symbol,
        periodicity: periodicity ?? indicator.periodicity,
        isReverse: isReverse ?? indicator.isReverse,
      };

      const payload = JSON.stringify(updatedIndicator);

      // Add to sync queue
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

