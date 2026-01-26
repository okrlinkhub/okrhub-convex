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
  initiativePayloadValidator,
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
    riskExternalId: v.optional(v.string()),
    assigneeExternalId: v.string(),
    createdByExternalId: v.string(),
    status: v.optional(InitiativeStatusSchema),
    priority: PrioritySchema,
    finishedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
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
      notes,
    } = args;

    try {
      assertValidExternalId(teamExternalId, "teamExternalId");
      assertValidExternalId(assigneeExternalId, "assigneeExternalId");
      assertValidExternalId(createdByExternalId, "createdByExternalId");
      if (riskExternalId) {
        assertValidExternalId(riskExternalId, "riskExternalId");
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
        status: status ?? "ON_TIME",
        priority,
        finishedAt,
        notes,
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
        status: status ?? "ON_TIME",
        priority,
        finishedAt,
        notes,
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
      riskExternalId: v.optional(v.string()),
      assigneeExternalId: v.string(),
      createdByExternalId: v.string(),
      status: InitiativeStatusSchema,
      priority: PrioritySchema,
      finishedAt: v.optional(v.number()),
      notes: v.optional(v.string()),
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
// PUBLIC MUTATIONS - Entry points for consumers
// ============================================================================

/**
 * Insert an initiative into LinkHub
 */
export const insertInitiative = mutation({
  args: {
    initiative: initiativePayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { initiative } = args;

    // Validate external IDs
    assertValidExternalId(initiative.externalId, "initiative.externalId");
    assertValidExternalId(
      initiative.teamExternalId,
      "initiative.teamExternalId"
    );
    assertValidExternalId(
      initiative.assigneeExternalId,
      "initiative.assigneeExternalId"
    );
    assertValidExternalId(
      initiative.createdByExternalId,
      "initiative.createdByExternalId"
    );
    if (initiative.riskExternalId) {
      assertValidExternalId(
        initiative.riskExternalId,
        "initiative.riskExternalId"
      );
    }

    // Add to sync queue
    const payload = JSON.stringify(initiative);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "initiative",
      externalId: initiative.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: initiative.externalId,
      queueId,
    };
  },
});
