/**
 * Initiatives Entity for OKRHub Component
 *
 * CRUD operations and queries for Initiatives.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { generateExternalId } from "../externalId.js";
import { assertValidExternalId, generateSlug } from "../lib/validation.js";
import {
  PrioritySchema,
  InitiativeStatusSchema,
  SyncStatusSchema,
} from "../schema.js";

// ============================================================================
// LOCAL CRUD MUTATIONS
// ============================================================================

/**
 * Creates an initiative locally and queues for sync
 * Note: relativeImpact/overallImpact/isNew are set by linkhub based on priority
 */
export const createInitiative = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    description: v.string(),
    teamExternalId: v.string(),
    riskExternalId: v.string(), // Required: Reference to risk
    assigneeExternalId: v.string(),
    createdByExternalId: v.string(),
    status: v.optional(InitiativeStatusSchema), // Optional in input, default ON_TIME
    priority: PrioritySchema,
    finishedAt: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("initiatives"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      description,
      teamExternalId,
      riskExternalId,
      assigneeExternalId,
      createdByExternalId,
      status,
      priority,
      finishedAt,
    } = args;

    try {
      assertValidExternalId(teamExternalId, "teamExternalId");
      assertValidExternalId(assigneeExternalId, "assigneeExternalId");
      assertValidExternalId(createdByExternalId, "createdByExternalId");
      assertValidExternalId(riskExternalId, "riskExternalId");

      // Validate parent hierarchy: risk must exist in local tables
      const parentRisk = await ctx.db
        .query("risks")
        .withIndex("by_external_id", (q) =>
          q.eq("externalId", riskExternalId)
        )
        .first();

      if (!parentRisk) {
        return {
          success: false,
          externalId: "",
          localId: "" as Id<"initiatives">,
          error: `Parent risk not found in component tables: ${riskExternalId}. Create it first via createRisk().`,
        };
      }

      const externalId = generateExternalId(sourceApp, "initiative");
      const slug = generateSlug(sourceApp, description.substring(0, 30));
      const now = Date.now();

      const localId = await ctx.db.insert("initiatives", {
        externalId,
        description,
        teamExternalId,
        riskExternalId,
        assigneeExternalId,
        createdByExternalId,
        status: status ?? "ON_TIME", // Default to ON_TIME
        priority,
        finishedAt,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        description,
        teamExternalId,
        riskExternalId,
        assigneeExternalId,
        createdByExternalId,
        status: status ?? "ON_TIME", // Default to ON_TIME
        priority,
        finishedAt,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "initiative",
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
        localId: "" as Id<"initiatives">,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

/**
 * Gets all local initiatives
 */
export const getAllInitiatives = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("initiatives"),
      _creationTime: v.number(),
      externalId: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      riskExternalId: v.string(), // Required
      assigneeExternalId: v.string(),
      createdByExternalId: v.string(),
      status: InitiativeStatusSchema, // Required
      priority: PrioritySchema,
      finishedAt: v.optional(v.number()),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("initiatives")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// ============================================================================
// UPDATE MUTATIONS
// ============================================================================

/**
 * Updates an initiative locally and queues for sync
 * Resets syncStatus to "pending"
 */
export const updateInitiative = mutation({
  args: {
    externalId: v.string(),
    description: v.optional(v.string()),
    riskExternalId: v.optional(v.string()),
    assigneeExternalId: v.optional(v.string()),
    status: v.optional(InitiativeStatusSchema),
    priority: v.optional(PrioritySchema),
    finishedAt: v.optional(v.number()),
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
      riskExternalId,
      assigneeExternalId,
      status,
      priority,
      finishedAt,
    } = args;

    try {
      // Find the initiative by externalId
      const initiative = await ctx.db
        .query("initiatives")
        .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
        .first();

      if (!initiative) {
        return {
          success: false,
          externalId,
          error: `Initiative not found: ${externalId}`,
        };
      }

      // Validate external IDs if provided
      if (riskExternalId) {
        assertValidExternalId(riskExternalId, "riskExternalId");
      }
      if (assigneeExternalId) {
        assertValidExternalId(assigneeExternalId, "assigneeExternalId");
      }

      const now = Date.now();

      // Update the initiative
      await ctx.db.patch(initiative._id, {
        ...(description !== undefined && { description }),
        ...(riskExternalId !== undefined && { riskExternalId }),
        ...(assigneeExternalId !== undefined && { assigneeExternalId }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(finishedAt !== undefined && { finishedAt }),
        syncStatus: "pending",
        updatedAt: now,
      });

      // Create payload for sync with updated values
      const updatedInitiative = {
        externalId,
        description: description ?? initiative.description,
        teamExternalId: initiative.teamExternalId,
        riskExternalId: riskExternalId ?? initiative.riskExternalId,
        assigneeExternalId: assigneeExternalId ?? initiative.assigneeExternalId,
        createdByExternalId: initiative.createdByExternalId,
        status: status ?? initiative.status,
        priority: priority ?? initiative.priority,
        finishedAt: finishedAt ?? initiative.finishedAt,
        updatedAt: now,
      };

      const payload = JSON.stringify(updatedInitiative);

      // Add to sync queue
      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "initiative",
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

