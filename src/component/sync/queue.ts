/**
 * Sync Queue Management for OKRHub Component
 *
 * Handles the sync queue for async processing of entities to LinkHub.
 */

import { v } from "convex/values";
import { api, internal } from "../_generated/api.js";
import { internalMutation, internalQuery, query } from "../_generated/server.js";

/**
 * Adds an item to the sync queue for async processing
 */
export const addToSyncQueue = internalMutation({
  args: {
    entityType: v.string(),
    externalId: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const hadPendingBeforeInsert = await ctx.db
      .query("syncQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(1);

    const queueId = await ctx.db.insert("syncQueue", {
      entityType: args.entityType,
      externalId: args.externalId,
      payload: args.payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    if (hadPendingBeforeInsert.length === 0) {
      const config = await ctx.runQuery(internal.config.getConfig, {});
      if (config?.autoSyncEnabled) {
        await ctx.scheduler.runAfter(0, api.sync.processor.processSyncQueue, {});
        console.log(
          `[okrhub] enqueue scheduled processor entityType=${args.entityType} externalId=${args.externalId}`
        );
      }
    }

    return queueId;
  },
});

/**
 * Updates sync queue item status and the local entity syncStatus
 */
export const updateSyncQueueItem = internalMutation({
  args: {
    id: v.id("syncQueue"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    linkHubId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
      lastAttemptAt: Date.now(),
    };

    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }

    const item = await ctx.db.get(args.id);
    if (item) {
      updates.attempts = item.attempts + 1;
    }

    await ctx.db.patch(args.id, updates);

    // If successful, update the local entity syncStatus and log the sync
    if (args.status === "success" && item) {
      // Update local entity syncStatus based on entityType
      const newSyncStatus = "synced";

      if (item.entityType === "objective") {
        const entity = await ctx.db
          .query("objectives")
          .withIndex("by_external_id", (q) =>
            q.eq("externalId", item.externalId)
          )
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, {
            syncStatus: newSyncStatus,
            updatedAt: Date.now(),
          });
        }
      } else if (item.entityType === "keyResult") {
        const entity = await ctx.db
          .query("keyResults")
          .withIndex("by_external_id", (q) =>
            q.eq("externalId", item.externalId)
          )
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, {
            syncStatus: newSyncStatus,
            updatedAt: Date.now(),
          });
        }
      } else if (item.entityType === "risk") {
        const entity = await ctx.db
          .query("risks")
          .withIndex("by_external_id", (q) =>
            q.eq("externalId", item.externalId)
          )
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
        }
      } else if (item.entityType === "initiative") {
        const entity = await ctx.db
          .query("initiatives")
          .withIndex("by_external_id", (q) =>
            q.eq("externalId", item.externalId)
          )
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, {
            syncStatus: newSyncStatus,
            updatedAt: Date.now(),
          });
        }
      } else if (item.entityType === "indicator") {
        const entity = await ctx.db
          .query("indicators")
          .withIndex("by_external_id", (q) =>
            q.eq("externalId", item.externalId)
          )
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
        }
      } else if (item.entityType === "indicatorValue") {
        const entity = await ctx.db
          .query("indicatorValues")
          .withIndex("by_external_id", (q) =>
            q.eq("externalId", item.externalId)
          )
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
        }
      } else if (item.entityType === "indicatorForecast") {
        const entity = await ctx.db
          .query("indicatorForecasts")
          .withIndex("by_external_id", (q) =>
            q.eq("externalId", item.externalId)
          )
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
        }
      } else if (item.entityType === "milestone") {
        const entity = await ctx.db
          .query("milestones")
          .withIndex("by_external_id", (q) =>
            q.eq("externalId", item.externalId)
          )
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, {
            syncStatus: newSyncStatus,
            updatedAt: Date.now(),
          });
        }
      }

      // Log the sync
      await ctx.db.insert("syncLog", {
        entityType: item.entityType,
        externalId: item.externalId,
        linkHubId: args.linkHubId,
        syncedAt: Date.now(),
        action: "create", // TODO: Determine if create or update
      });
    }
  },
});

/**
 * Update multiple sync queue items in a single mutation call.
 */
export const updateSyncQueueItemsBatch = internalMutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("syncQueue"),
        status: v.union(
          v.literal("pending"),
          v.literal("processing"),
          v.literal("success"),
          v.literal("failed")
        ),
        errorMessage: v.optional(v.string()),
        linkHubId: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const patch: Record<string, unknown> = {
        status: update.status,
        lastAttemptAt: Date.now(),
      };

      if (update.errorMessage) {
        patch.errorMessage = update.errorMessage;
      }

      const item = await ctx.db.get(update.id);
      if (item) {
        patch.attempts = item.attempts + 1;
      }

      await ctx.db.patch(update.id, patch);

      if (update.status === "success" && item) {
        const newSyncStatus = "synced";

        if (item.entityType === "objective") {
          const entity = await ctx.db
            .query("objectives")
            .withIndex("by_external_id", (q) =>
              q.eq("externalId", item.externalId)
            )
            .first();
          if (entity) {
            await ctx.db.patch(entity._id, {
              syncStatus: newSyncStatus,
              updatedAt: Date.now(),
            });
          }
        } else if (item.entityType === "keyResult") {
          const entity = await ctx.db
            .query("keyResults")
            .withIndex("by_external_id", (q) =>
              q.eq("externalId", item.externalId)
            )
            .first();
          if (entity) {
            await ctx.db.patch(entity._id, {
              syncStatus: newSyncStatus,
              updatedAt: Date.now(),
            });
          }
        } else if (item.entityType === "risk") {
          const entity = await ctx.db
            .query("risks")
            .withIndex("by_external_id", (q) =>
              q.eq("externalId", item.externalId)
            )
            .first();
          if (entity) {
            await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
          }
        } else if (item.entityType === "initiative") {
          const entity = await ctx.db
            .query("initiatives")
            .withIndex("by_external_id", (q) =>
              q.eq("externalId", item.externalId)
            )
            .first();
          if (entity) {
            await ctx.db.patch(entity._id, {
              syncStatus: newSyncStatus,
              updatedAt: Date.now(),
            });
          }
        } else if (item.entityType === "indicator") {
          const entity = await ctx.db
            .query("indicators")
            .withIndex("by_external_id", (q) =>
              q.eq("externalId", item.externalId)
            )
            .first();
          if (entity) {
            await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
          }
        } else if (item.entityType === "indicatorValue") {
          const entity = await ctx.db
            .query("indicatorValues")
            .withIndex("by_external_id", (q) =>
              q.eq("externalId", item.externalId)
            )
            .first();
          if (entity) {
            await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
          }
        } else if (item.entityType === "indicatorForecast") {
          const entity = await ctx.db
            .query("indicatorForecasts")
            .withIndex("by_external_id", (q) =>
              q.eq("externalId", item.externalId)
            )
            .first();
          if (entity) {
            await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
          }
        } else if (item.entityType === "milestone") {
          const entity = await ctx.db
            .query("milestones")
            .withIndex("by_external_id", (q) =>
              q.eq("externalId", item.externalId)
            )
            .first();
          if (entity) {
            await ctx.db.patch(entity._id, {
              syncStatus: newSyncStatus,
              updatedAt: Date.now(),
            });
          }
        }

        await ctx.db.insert("syncLog", {
          entityType: item.entityType,
          externalId: item.externalId,
          linkHubId: update.linkHubId,
          syncedAt: Date.now(),
          action: "create",
        });
      }
    }

    console.log(
      `[okrhub] queue batch status updates applied=${args.updates.length}`
    );

    return {
      updated: args.updates.length,
    };
  },
});

/**
 * Gets lightweight pending items from the sync queue (without payload).
 */
export const getPendingSyncItems = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("syncQueue"),
      _creationTime: v.number(),
      entityType: v.string(),
      externalId: v.string(),
      status: v.string(),
      attempts: v.number(),
      lastAttemptAt: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("syncQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(args.limit ?? 50);

    return items.map((item) => ({
      _id: item._id,
      _creationTime: item._creationTime,
      entityType: item.entityType,
      externalId: item.externalId,
      status: item.status,
      attempts: item.attempts,
      lastAttemptAt: item.lastAttemptAt,
      errorMessage: item.errorMessage,
      createdAt: item.createdAt,
    }));
  },
});

/**
 * Gets full pending items for processing (includes payload).
 */
export const getPendingSyncItemsForProcessing = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("syncQueue"),
      _creationTime: v.number(),
      entityType: v.string(),
      externalId: v.string(),
      payload: v.string(),
      status: v.string(),
      attempts: v.number(),
      lastAttemptAt: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("syncQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(args.limit ?? 50);
  },
});
