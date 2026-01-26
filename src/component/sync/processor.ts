/**
 * Sync Processor for OKRHub Component
 *
 * Processes pending items from the sync queue.
 */

import { v } from "convex/values";
import { action } from "../_generated/server.js";
import { api, internal } from "../_generated/api.js";

/**
 * Process pending items from the sync queue
 * This should be called periodically (e.g., via cron job)
 */
export const processSyncQueue = action({
  args: {
    endpointUrl: v.string(),
    apiKeyPrefix: v.string(),
    signingSecret: v.string(),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    succeeded: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    const { endpointUrl, apiKeyPrefix, signingSecret, batchSize = 10 } = args;

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

    return { processed, succeeded, failed };
  },
});
