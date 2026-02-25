/**
 * Sync Processor for OKRHub Component
 *
 * Processes pending items from the sync queue.
 * Supports both explicit config args (backward compatible) and
 * stored config from the DB (new recommended approach).
 *
 * When autoSyncEnabled is true, the processor runs in drain mode:
 * it keeps scheduling itself only while there are pending items.
 */

import { v } from "convex/values";
import { action } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { api, internal } from "../_generated/api.js";

const BATCH_KEY_BY_ENTITY_TYPE: Record<string, string> = {
  objective: "objectives",
  keyResult: "keyResults",
  risk: "risks",
  initiative: "initiatives",
  indicator: "indicators",
  indicatorValue: "indicatorValues",
  indicatorForecast: "indicatorForecasts",
  milestone: "milestones",
};

type PendingSyncItem = {
  _id: Id<"syncQueue">;
  entityType: string;
  externalId: string;
  payload: string;
};

/**
 * Process pending items from the sync queue.
 *
 * Config resolution priority:
 * 1. Explicit args (endpointUrl, apiKeyPrefix, signingSecret) - backward compatible
 * 2. Stored config from DB (set via configure()) - recommended
 *
 * Self-scheduling: if stored config has autoSyncEnabled=true,
 * the processor only schedules immediate follow-up runs while work remains.
 */
export const processSyncQueue = action({
  args: {
    endpointUrl: v.optional(v.string()),
    apiKeyPrefix: v.optional(v.string()),
    signingSecret: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    succeeded: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    // Resolve config: explicit args > stored config
    let endpointUrl: string;
    let apiKeyPrefix: string;
    let signingSecret: string;

    // Read stored config for self-scheduling (and as fallback)
    const storedConfig = await ctx.runQuery(internal.config.getConfig, {});

    if (args.endpointUrl && args.apiKeyPrefix && args.signingSecret) {
      // Backward compatible: use explicit args
      endpointUrl = args.endpointUrl;
      apiKeyPrefix = args.apiKeyPrefix;
      signingSecret = args.signingSecret;
    } else if (storedConfig) {
      // New approach: read from stored config
      endpointUrl = storedConfig.endpointUrl;
      apiKeyPrefix = storedConfig.apiKeyPrefix;
      signingSecret = storedConfig.signingSecret;
    } else {
      throw new Error(
        "OKRHub not configured. Either pass endpointUrl/apiKeyPrefix/signingSecret " +
          "as arguments, or call configure() first to store the config."
      );
    }

    const batchSize = args.batchSize ?? 10;

    // Get full pending items (includes payload for transport)
    const pendingItems = (await ctx.runQuery(
      internal.sync.queue.getPendingSyncItemsForProcessing,
      { limit: batchSize }
    )) as PendingSyncItem[];

    // Idle path: do nothing, don't self-schedule on an empty queue.
    if (pendingItems.length === 0) {
      console.log("[okrhub] processSyncQueue idle: no pending items");
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Mark all selected items as processing in one mutation call.
    await ctx.runMutation(internal.sync.queue.updateSyncQueueItemsBatch, {
      updates: pendingItems.map((item) => ({
        id: item._id,
        status: "processing" as const,
      })),
    });

    const updates: Array<{
      id: Id<"syncQueue">;
      status: "success" | "failed";
      linkHubId?: string;
      errorMessage?: string;
    }> = [];

    const batchPayload: Record<string, unknown[]> = {};
    const batchItemIds = new Set<Id<"syncQueue">>();
    const batchItemKeyToQueueId = new Map<string, Id<"syncQueue">>();

    for (const item of pendingItems) {
      const batchKey = BATCH_KEY_BY_ENTITY_TYPE[item.entityType];
      if (!batchKey) {
        continue;
      }

      try {
        const parsed = JSON.parse(item.payload) as Record<string, unknown>;
        if (!batchPayload[batchKey]) {
          batchPayload[batchKey] = [];
        }
        batchPayload[batchKey].push(parsed);
        batchItemIds.add(item._id);
        batchItemKeyToQueueId.set(`${item.entityType}:${item.externalId}`, item._id);
      } catch {
        updates.push({
          id: item._id,
          status: "failed",
          errorMessage: "Invalid payload JSON",
        });
      }
    }

    const batchKeys = Object.keys(batchPayload);
    if (batchKeys.length > 0) {
      const batchResult = await ctx.runAction(api.sync.http.sendBatchToLinkHub, {
        endpointUrl,
        apiKeyPrefix,
        signingSecret,
        payload: JSON.stringify(batchPayload),
      });

      if (!batchResult.success) {
        const errorMessage =
          batchResult.errors.length > 0
            ? batchResult.errors.join(" | ")
            : "Batch sync failed";

        for (const item of pendingItems) {
          if (!batchItemIds.has(item._id)) continue;
          updates.push({
            id: item._id,
            status: "failed",
            errorMessage,
          });
        }
      } else {
        const resultMap = new Map<
          string,
          { linkHubId?: string; error?: string }
        >();
        for (const result of batchResult.results) {
          resultMap.set(`${result.entityType}:${result.externalId}`, {
            linkHubId: result.linkHubId,
            error: result.error,
          });
        }

        for (const [resultKey, queueId] of batchItemKeyToQueueId.entries()) {
          const result = resultMap.get(resultKey);
          if (result && !result.error) {
            updates.push({
              id: queueId,
              status: "success",
              linkHubId: result.linkHubId,
            });
          } else {
            updates.push({
              id: queueId,
              status: "failed",
              errorMessage: result?.error ?? "Missing batch result",
            });
          }
        }
      }
    }

    // Fallback to single send for unsupported entity types.
    for (const item of pendingItems) {
      if (batchItemIds.has(item._id)) continue;
      if (updates.some((update) => update.id === item._id)) continue;

      const result = await ctx.runAction(api.sync.http.sendToLinkHub, {
        endpointUrl,
        apiKeyPrefix,
        signingSecret,
        entityType: item.entityType,
        payload: item.payload,
      });

      if (result.success) {
        updates.push({
          id: item._id,
          status: "success",
          linkHubId: "linkHubId" in result ? result.linkHubId : undefined,
        });
      } else {
        updates.push({
          id: item._id,
          status: "failed",
          errorMessage: result.error,
        });
      }
    }

    if (updates.length > 0) {
      await ctx.runMutation(internal.sync.queue.updateSyncQueueItemsBatch, {
        updates,
      });
    }

    const processed = updates.length;
    const succeeded = updates.filter((update) => update.status === "success").length;
    const failed = processed - succeeded;

    // Drain mode: if there are still pending items, immediately continue processing.
    if (storedConfig?.autoSyncEnabled) {
      const remaining = await ctx.runQuery(
        internal.sync.queue.getPendingSyncItemsForProcessing,
        { limit: 1 }
      );
      if (remaining.length > 0) {
        await ctx.scheduler.runAfter(0, api.sync.processor.processSyncQueue, {});
      }
    }

    console.log(
      `[okrhub] processSyncQueue processed=${processed} succeeded=${succeeded} failed=${failed}`
    );

    return { processed, succeeded, failed };
  },
});
