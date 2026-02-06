/**
 * Sync Processor for OKRHub Component
 *
 * Processes pending items from the sync queue.
 * Supports both explicit config args (backward compatible) and
 * stored config from the DB (new recommended approach).
 *
 * When autoSyncEnabled is true, the processor self-schedules
 * the next run via ctx.scheduler.runAfter.
 */

import { v } from "convex/values";
import { action } from "../_generated/server.js";
import { api, internal } from "../_generated/api.js";

/**
 * Process pending items from the sync queue.
 *
 * Config resolution priority:
 * 1. Explicit args (endpointUrl, apiKeyPrefix, signingSecret) - backward compatible
 * 2. Stored config from DB (set via configure()) - recommended
 *
 * Self-scheduling: if stored config has autoSyncEnabled=true,
 * the processor schedules the next run automatically.
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

    // Get pending items
    const pendingItems = await ctx.runQuery(
      api.sync.queue.getPendingSyncItems,
      { limit: batchSize }
    );

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const item of pendingItems) {
      processed++;

      // Mark as processing
      await ctx.runMutation(internal.sync.queue.updateSyncQueueItem, {
        id: item._id,
        status: "processing",
      });

      // Send to LinkHub
      const result = await ctx.runAction(api.sync.http.sendToLinkHub, {
        endpointUrl,
        apiKeyPrefix,
        signingSecret,
        entityType: item.entityType,
        payload: item.payload,
      });

      if (result.success) {
        succeeded++;
        await ctx.runMutation(internal.sync.queue.updateSyncQueueItem, {
          id: item._id,
          status: "success",
          linkHubId: "linkHubId" in result ? result.linkHubId : undefined,
        });
      } else {
        failed++;
        await ctx.runMutation(internal.sync.queue.updateSyncQueueItem, {
          id: item._id,
          status: "failed",
          errorMessage: result.error,
        });
      }
    }

    // Self-scheduling: schedule the next run if autoSync is enabled
    if (storedConfig?.autoSyncEnabled) {
      await ctx.scheduler.runAfter(
        storedConfig.syncIntervalMs,
        api.sync.processor.processSyncQueue,
        {} // no args needed - reads config from DB
      );
    }

    return { processed, succeeded, failed };
  },
});
