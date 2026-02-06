/**
 * OKRHub Component - Configuration Management
 *
 * Provides persistent configuration storage for the LinkHub connection.
 * The consumer calls `configure` once to store connection details,
 * and the component reads them automatically from the DB.
 */

import { v } from "convex/values";
import { mutation, internalQuery } from "./_generated/server.js";

/**
 * Upsert the component configuration.
 * Call this once during setup to store LinkHub connection details.
 * If config already exists, it will be updated.
 */
export const configure = mutation({
  args: {
    endpointUrl: v.string(),
    apiKeyPrefix: v.string(),
    signingSecret: v.string(),
    autoSyncEnabled: v.optional(v.boolean()),
    syncIntervalMs: v.optional(v.number()),
    sourceApp: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("config").first();
    const data = {
      endpointUrl: args.endpointUrl,
      apiKeyPrefix: args.apiKeyPrefix,
      signingSecret: args.signingSecret,
      autoSyncEnabled: args.autoSyncEnabled ?? true,
      syncIntervalMs: args.syncIntervalMs ?? 60000,
      sourceApp: args.sourceApp,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("config", data);
    }

    return null;
  },
});

/**
 * Internal query to read the stored configuration.
 * Used by processSyncQueue and other internal functions.
 */
export const getConfig = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      endpointUrl: v.string(),
      apiKeyPrefix: v.string(),
      signingSecret: v.string(),
      autoSyncEnabled: v.boolean(),
      syncIntervalMs: v.number(),
      sourceApp: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const config = await ctx.db.query("config").first();
    if (!config) return null;
    return {
      endpointUrl: config.endpointUrl,
      apiKeyPrefix: config.apiKeyPrefix,
      signingSecret: config.signingSecret,
      autoSyncEnabled: config.autoSyncEnabled,
      syncIntervalMs: config.syncIntervalMs,
      sourceApp: config.sourceApp,
    };
  },
});

/**
 * Remove the stored configuration (for reset/cleanup).
 */
export const clearConfig = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("config").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
