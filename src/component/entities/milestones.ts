/**
 * Milestones Entity for OKRHub Component
 *
 * CRUD operations and queries for Milestones.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { generateExternalId } from "../externalId.js";
import { assertValidExternalId, generateSlug } from "../lib/validation.js";
import {
  milestonePayloadValidator,
  MilestoneStatusSchema,
  SyncStatusSchema,
} from "../schema.js";

// ============================================================================
// LOCAL CRUD MUTATIONS
// ============================================================================

/**
 * Creates a milestone locally and queues for sync
 */
export const createMilestone = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    indicatorExternalId: v.string(),
    description: v.string(),
    value: v.number(),
    forecastDate: v.optional(v.number()),
    status: v.optional(MilestoneStatusSchema),
    achievedAt: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("milestones"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      indicatorExternalId,
      description,
      value,
      forecastDate,
      status,
      achievedAt,
    } = args;

    try {
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");

      const externalId = generateExternalId(sourceApp, "milestone");
      const slug = generateSlug(sourceApp, description);
      const now = Date.now();

      const localId = await ctx.db.insert("milestones", {
        externalId,
        indicatorExternalId,
        description,
        value,
        forecastDate,
        status,
        achievedAt,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        indicatorExternalId,
        description,
        value,
        forecastDate,
        status,
        achievedAt,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "milestone",
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
        localId: "" as Id<"milestones">,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

/**
 * Gets all local milestones
 */
export const getAllMilestones = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("milestones"),
      _creationTime: v.number(),
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
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("milestones")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// ============================================================================
// PUBLIC MUTATIONS - Entry points for consumers
// ============================================================================

/**
 * Insert a milestone into LinkHub
 */
export const insertMilestone = mutation({
  args: {
    milestone: milestonePayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { milestone } = args;

    // Validate external IDs
    assertValidExternalId(milestone.externalId, "milestone.externalId");
    assertValidExternalId(
      milestone.indicatorExternalId,
      "milestone.indicatorExternalId"
    );

    // Add to sync queue
    const payload = JSON.stringify(milestone);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "milestone",
      externalId: milestone.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: milestone.externalId,
      queueId,
    };
  },
});
