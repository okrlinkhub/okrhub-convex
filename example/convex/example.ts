import { action, mutation, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { exposeApi, generateExternalId, OKRHUB_VERSION } from "../../src/client/index.js";
import { v } from "convex/values";

/**
 * Example usage of the OKRHub component
 *
 * This file demonstrates how to use the component in a consumer application.
 * During development, imports use relative paths. When published, consumers
 * will import from "@okrlinkhub/okrhub".
 */

// Re-export the component's API without authentication for testing
export const {
  // Insert mutations (low-level API)
  insertObjective,
  insertKeyResult,
  insertRisk,
  insertInitiative,
  insertIndicator,
  insertIndicatorValue,
  insertMilestone,
  // Create mutations (high-level API with auto external ID generation)
  createObjective,
  createKeyResult,
  createRisk,
  createInitiative,
  createIndicator,
  createIndicatorValue,
  createIndicatorForecast,
  createMilestone,
  // Update mutations (resets syncStatus to pending)
  updateObjective,
  updateKeyResult,
  updateRisk,
  updateInitiative,
  updateIndicator,
  updateIndicatorValue,
  updateIndicatorForecast,
  updateMilestone,
  // Query operations
  getObjectivesByTeam,
  getKeyResultsByObjective,
  getRisksByKeyResult,
  getPendingSyncItems,
  // Sync operations
  processSyncQueue,
  // LinkHub API calls
  getMyTeams,
} = exposeApi(components.okrhub);

// Re-export generateExternalId for use in the frontend
export { generateExternalId };

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Query pending sync items with a default limit
 */
export const listPendingSync = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getPendingSyncItems, {
      limit: 100,
    });
  },
});

/**
 * Query all local objectives
 */
export const listAllObjectives = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getAllObjectives, {});
  },
});

/**
 * Query all local key results
 */
export const listAllKeyResults = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getAllKeyResults, {});
  },
});

/**
 * Query all local risks
 */
export const listAllRisks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getAllRisks, {});
  },
});

/**
 * Query all local initiatives
 */
export const listAllInitiatives = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getAllInitiatives, {});
  },
});

/**
 * Query all local indicators
 */
export const listAllIndicators = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getAllIndicators, {});
  },
});

/**
 * Query all local milestones
 */
export const listAllMilestones = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getAllMilestones, {});
  },
});

/**
 * Query all local indicator values
 */
export const listAllIndicatorValues = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getAllIndicatorValues, {});
  },
});

/**
 * Query all local indicator forecasts
 */
export const listAllIndicatorForecasts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.okrhub.okrhub.getAllIndicatorForecasts, {});
  },
});

// ============================================================================
// TEST ACTION - For testing sync without authentication
// ============================================================================

/**
 * Test action to process sync queue without authentication.
 * FOR DEVELOPMENT/TESTING ONLY
 */
export const testProcessSyncQueue = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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

/**
 * Test action to get teams from LinkHub for a given email
 * FOR DEVELOPMENT/TESTING ONLY
 */
export const testGetMyTeams = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const endpointUrl = process.env.LINKHUB_API_URL;
    const apiKeyPrefix = process.env.LINKHUB_API_KEY_PREFIX;
    const signingSecret = process.env.LINKHUB_SIGNING_SECRET;

    if (!endpointUrl || !apiKeyPrefix || !signingSecret) {
      throw new Error(
        "Missing environment variables: LINKHUB_API_URL, LINKHUB_API_KEY_PREFIX, LINKHUB_SIGNING_SECRET"
      );
    }

    // Create signature payload (query string without leading ?)
    const queryString = `email=${encodeURIComponent(args.email)}`;
    
    // Create HMAC signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingSecret);
    const messageData = encoder.encode(queryString);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Make request to LinkHub
    const url = `${endpointUrl}/api/okrhub/teams?${queryString}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-OKRHub-Version": OKRHUB_VERSION,
        "X-OKRHub-Key-Prefix": apiKeyPrefix,
        "X-OKRHub-Signature": signature,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get teams: ${response.status} ${errorText}`);
    }

    return await response.json() as {
      success: boolean;
      teams: Array<{
        id: string;
        externalId?: string;
        name: string;
        slug: string;
        type: string;
      }>;
      message?: string;
    };
  },
});

// ============================================================================
// LOCAL TEAMS MANAGEMENT
// ============================================================================

/**
 * Save a LinkHub team locally for future use
 */
export const saveTeam = mutation({
  args: {
    name: v.string(),
    linkHubTeamId: v.string(),
    externalId: v.string(),
    type: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if team already exists
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_linkhub_id", (q) => q.eq("linkHubTeamId", args.linkHubTeamId))
      .first();

    if (existing) {
      // Update existing team
      await ctx.db.patch(existing._id, {
        name: args.name,
        externalId: args.externalId,
        type: args.type,
        slug: args.slug,
      });
      return { id: existing._id, action: "updated" as const };
    }

    // Create new team
    const id = await ctx.db.insert("teams", {
      name: args.name,
      linkHubTeamId: args.linkHubTeamId,
      externalId: args.externalId,
      type: args.type,
      slug: args.slug,
    });
    return { id, action: "created" as const };
  },
});

/**
 * List all locally saved teams
 */
export const listTeams = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teams").collect();
  },
});

/**
 * Update a local team's external ID
 */
export const updateTeamExternalId = mutation({
  args: {
    teamId: v.id("teams"),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, {
      externalId: args.externalId,
    });
  },
});

/**
 * Delete a local team
 */
export const deleteTeam = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.teamId);
  },
});
