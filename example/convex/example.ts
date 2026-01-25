import { action, mutation, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { exposeApi, generateExternalId } from "../../src/client/index.js";
import { v } from "convex/values";
import type { Auth } from "convex/server";

/**
 * Example usage of the OKRHub component
 *
 * This file demonstrates how to use the component in a consumer application.
 * During development, imports use relative paths. When published, consumers
 * will import from "@linkhub/okrhub".
 */

// Re-export the component's API with authentication
export const {
  insertObjective,
  insertKeyResult,
  insertRisk,
  insertInitiative,
  insertIndicator,
  insertMilestone,
  processSyncQueue,
  getPendingSyncItems,
} = exposeApi(components.okrhub, {
  auth: async (ctx, operation) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
  },
});

// Example: Direct mutation using the component
export const createObjectiveExample = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    teamExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a unique external ID for this objective
    const externalId = generateExternalId("example-app", "objective");

    // Insert the objective using the component
    return await ctx.runMutation(components.okrhub.okrhub.insertObjective, {
      objective: {
        externalId,
        title: args.title,
        description: args.description,
        teamExternalId: args.teamExternalId,
      },
    });
  },
});

// Example: Query pending sync items
export const listPendingSync = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getPendingSyncItems, {
      limit: 50,
    });
  },
});

// Helper to get authenticated user ID
async function getAuthUserId(ctx: { auth: Auth }): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? "anonymous";
}

// ============================================================================
// TEST ACTION - For testing sync without authentication
// ============================================================================

/**
 * Test action to process sync queue without authentication.
 * ⚠️ FOR DEVELOPMENT/TESTING ONLY - Remove in production!
 */
export const testProcessSyncQueue = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get config from environment
    const endpointUrl = process.env.LINKHUB_API_URL;
    const apiKeyPrefix = process.env.LINKHUB_API_KEY_PREFIX;
    const signingSecret = process.env.LINKHUB_SIGNING_SECRET;

    if (!endpointUrl || !apiKeyPrefix || !signingSecret) {
      throw new Error(
        "Missing environment variables: LINKHUB_API_URL, LINKHUB_API_KEY_PREFIX, LINKHUB_SIGNING_SECRET"
      );
    }

    return await ctx.runAction(components.okrhub.okrhub.processSyncQueue, {
      endpointUrl,
      apiKeyPrefix,
      signingSecret,
      batchSize: args.batchSize ?? 10,
    });
  },
});
