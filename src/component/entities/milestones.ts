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
        status: status ?? "ON_TIME", // Default to ON_TIME
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
        status: status ?? "ON_TIME", // Default to ON_TIME
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
      status: MilestoneStatusSchema, // Required
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
// UPDATE MUTATIONS
// ============================================================================

/**
 * Updates a milestone locally and queues for sync
 * Resets syncStatus to "pending"
 */
export const updateMilestone = mutation({
  args: {
    externalId: v.string(),
    description: v.optional(v.string()),
    value: v.optional(v.number()),
    forecastDate: v.optional(v.number()),
    status: v.optional(MilestoneStatusSchema),
    achievedAt: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { externalId, description, value, forecastDate, status, achievedAt } =
      args;

    try {
      // Find the milestone by externalId
      const milestone = await ctx.db
        .query("milestones")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!milestone) {
        return {
          success: false,
          externalId,
          error: `Milestone not found: ${externalId}`,
        };
      }

      const now = Date.now();

      // Update the milestone
      await ctx.db.patch(milestone._id, {
        ...(description !== undefined && { description }),
        ...(value !== undefined && { value }),
        ...(forecastDate !== undefined && { forecastDate }),
        ...(status !== undefined && { status }),
        ...(achievedAt !== undefined && { achievedAt }),
        syncStatus: "pending",
        updatedAt: now,
      });

      // Create payload for sync with updated values
      const updatedMilestone = {
        externalId,
        indicatorExternalId: milestone.indicatorExternalId,
        description: description ?? milestone.description,
        value: value ?? milestone.value,
        forecastDate: forecastDate ?? milestone.forecastDate,
        status: status ?? milestone.status,
        achievedAt: achievedAt ?? milestone.achievedAt,
        updatedAt: now,
      };

      const payload = JSON.stringify(updatedMilestone);

      // Add to sync queue
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
