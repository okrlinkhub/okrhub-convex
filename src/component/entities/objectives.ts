/**
 * Objectives Entity for OKRHub Component
 *
 * CRUD operations and queries for Objectives.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import { generateExternalId } from "../externalId.js";
import { assertValidExternalId, generateSlug } from "../lib/validation.js";
import { SyncStatusSchema } from "../schema.js";

// ============================================================================
// LOCAL CRUD MUTATIONS
// ============================================================================

/**
 * Creates an objective locally and queues for sync
 */
export const createObjective = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    externalId: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    teamExternalId: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.optional(v.id("objectives")),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
    existing: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const { sourceApp, sourceUrl, title, description, teamExternalId } = args;

    try {
      // Validate team external ID
      assertValidExternalId(teamExternalId, "teamExternalId");

      // Idempotency check: if externalId provided, check if already exists
      if (args.externalId) {
        const existing = await ctx.db
          .query("objectives")
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
      const externalId = args.externalId ?? generateExternalId(sourceApp, "objective");
      const slug = generateSlug(sourceApp, title);
      const now = Date.now();

      // Save locally
      const localId = await ctx.db.insert("objectives", {
        externalId,
        title,
        description,
        teamExternalId,
        slug,
        metadata: args.metadata,
        syncStatus: "pending",
        createdAt: now,
      });

      // Create payload for sync
      const payload = JSON.stringify({
        externalId,
        title,
        description,
        teamExternalId,
        sourceUrl,
        createdAt: now,
      });

      // Add to sync queue
      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "objective",
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
 * Gets a single objective by its externalId
 */
export const getObjectiveByExternalId = query({
  args: {
    externalId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("objectives"),
      _creationTime: v.number(),
      externalId: v.string(),
      title: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
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
      .query("objectives")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

/**
 * Gets all local objectives for a team
 */
export const getObjectivesByTeam = query({
  args: {
    teamExternalId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("objectives"),
      _creationTime: v.number(),
      externalId: v.string(),
      title: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objectives")
      .withIndex("by_team", (q) => q.eq("teamExternalId", args.teamExternalId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local objectives
 */
export const getAllObjectives = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("objectives"),
      _creationTime: v.number(),
      externalId: v.string(),
      title: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("objectives")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// ============================================================================
// UPDATE MUTATIONS
// ============================================================================

/**
 * Updates an objective locally and queues for sync
 * Resets syncStatus to "pending"
 */
export const updateObjective = mutation({
  args: {
    externalId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { externalId, title, description } = args;

    try {
      // Find the objective by externalId
      const objective = await ctx.db
        .query("objectives")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!objective) {
        return {
          success: false,
          externalId,
          error: `Objective not found: ${externalId}`,
        };
      }

      const now = Date.now();

      // Update the objective
      await ctx.db.patch(objective._id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(args.metadata !== undefined && { metadata: args.metadata }),
        syncStatus: "pending",
        updatedAt: now,
      });

      // Create payload for sync with updated values
      const updatedObjective = {
        externalId,
        title: title ?? objective.title,
        description: description ?? objective.description,
        teamExternalId: objective.teamExternalId,
        updatedAt: now,
      };

      const payload = JSON.stringify(updatedObjective);

      // Add to sync queue
      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "objective",
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

