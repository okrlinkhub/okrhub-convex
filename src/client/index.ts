/**
 * OKRHub Component - Client API
 *
 * This file exports the client-facing API for the OKRHub component.
 * It provides functions that can be called from consumer applications.
 */

import {
  actionGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import type {
  Auth,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  HttpRouter,
} from "convex/server";
import { v } from "convex/values";
import { httpActionGeneric } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import { OKRHUB_VERSION } from "../component/externalId.js";

// Re-export external ID utilities
export {
  generateExternalId,
  validateExternalId,
  parseExternalId,
  extractSourceApp,
  extractEntityType,
  sameSourceApp,
  OKRHUB_VERSION,
  ENTITY_TYPES,
  type EntityType,
  type ParsedExternalId,
} from "../component/externalId.js";

// Re-export payload types
export type {
  ObjectivePayload,
  KeyResultPayload,
  RiskPayload,
  InitiativePayload,
  IndicatorPayload,
  IndicatorValuePayload,
  IndicatorForecastPayload,
  MilestonePayload,
  TeamPayload,
  UserPayload,
  CompanyPayload,
  BatchPayload,
} from "../component/schema.js";

// Re-export validators
export {
  objectivePayloadValidator,
  keyResultPayloadValidator,
  riskPayloadValidator,
  initiativePayloadValidator,
  indicatorPayloadValidator,
  indicatorValuePayloadValidator,
  indicatorForecastPayloadValidator,
  milestonePayloadValidator,
  batchPayloadValidator,
  PrioritySchema,
  PeriodicitySchema,
  InitiativeStatusSchema,
  MilestoneStatusSchema,
  SyncStatusSchema,
} from "../component/schema.js";

// Re-export SyncStatus type
export type { SyncStatus } from "../component/schema.js";

// ============================================================================
// COMPONENT API CONFIGURATION
// ============================================================================

interface OKRHubConfig {
  /**
   * The LinkHub API endpoint URL
   * Example: "https://your-linkhub.convex.site"
   */
  endpointUrl: string;

  /**
   * API key prefix for identifying the key (e.g., "okr_abc12345")
   * Used in X-OKRHub-Key-Prefix header
   */
  apiKeyPrefix: string;

  /**
   * Signing secret for HMAC authentication (e.g., "whsec_...")
   * This is the dedicated secret shown once when creating an API key.
   * Used to sign request payloads.
   */
  signingSecret: string;
}

/**
 * Options for exposing the OKRHub API
 */
interface ExposeApiOptions {
  /**
   * Optional authentication function
   * Should verify the user has access to perform the operation
   */
  auth?: (
    ctx: { auth: Auth },
    operation: {
      type: "insert" | "update" | "sync";
      entityType: string;
    }
  ) => Promise<void>;

  /**
   * Configuration for LinkHub connection (static object)
   * WARNING: If using this option, ensure it's evaluated at runtime, not module-level!
   * Prefer using `getConfig` function instead.
   * If neither is provided, uses environment variables:
   * - LINKHUB_API_URL
   * - LINKHUB_API_KEY_PREFIX
   * - LINKHUB_SIGNING_SECRET
   */
  config?: OKRHubConfig;

  /**
   * Configuration getter function for LinkHub connection (RECOMMENDED)
   * This function is called at runtime, ensuring environment variables are available.
   * Use this instead of `config` when environment variables might not be available
   * at module load time.
   * 
   * @example
   * ```typescript
   * exposeApi(components.okrhub, {
   *   getConfig: () => ({
   *     endpointUrl: process.env.LINKHUB_API_URL!,
   *     apiKeyPrefix: process.env.LINKHUB_API_KEY_PREFIX!,
   *     signingSecret: process.env.LINKHUB_SIGNING_SECRET!,
   *   }),
   * });
   * ```
   */
  getConfig?: () => OKRHubConfig;
}

/**
 * Get configuration from options or environment.
 * Priority: options.getConfig() > options.config > process.env
 *
 * Returns null if no config is available (the component will read from its DB).
 */
function resolveConfig(options?: ExposeApiOptions): OKRHubConfig | null {
  // Priority 1: Use getConfig function if provided (called at runtime)
  if (options?.getConfig) {
    return options.getConfig();
  }

  // Priority 2: Use static config if provided
  if (options?.config) {
    return options.config;
  }

  // Priority 3: Read from environment variables
  const endpointUrl = process.env.LINKHUB_API_URL;
  const apiKeyPrefix = process.env.LINKHUB_API_KEY_PREFIX;
  const signingSecret = process.env.LINKHUB_SIGNING_SECRET;

  if (!endpointUrl || !apiKeyPrefix || !signingSecret) {
    // Config not available - component will read from its DB
    return null;
  }

  return { endpointUrl, apiKeyPrefix, signingSecret };
}

/**
 * Require configuration from options or environment.
 * Throws if not available. Used for backward-compatible code paths.
 */
function requireConfig(options?: ExposeApiOptions): OKRHubConfig {
  const config = resolveConfig(options);
  if (!config) {
    throw new Error(
      "OKRHub configuration missing. " +
        "Set LINKHUB_API_URL, LINKHUB_API_KEY_PREFIX, and LINKHUB_SIGNING_SECRET environment variables, " +
        "or pass config/getConfig in exposeApi options, " +
        "or call configure() to store config in the component DB."
    );
  }
  return config;
}

/**
 * Expose the OKRHub component API for use in consumer applications.
 *
 * Minimal setup (recommended):
 * @example
 * ```typescript
 * // convex/okrhub.ts
 * import { components } from "./_generated/api";
 * import { exposeApi } from "@okrlinkhub/okrhub";
 *
 * export const {
 *   configure,
 *   startSync,
 *   insertRisk,
 *   insertInitiative,
 *   processSyncQueue,
 *   getPendingSyncItems,
 * } = exposeApi(components.okrhub);
 * ```
 *
 * Then call `configure()` once from the Convex Dashboard:
 * ```
 * npx convex run okrhub:configure '{"endpointUrl":"https://...","apiKeyPrefix":"okr_...","signingSecret":"whsec_..."}'
 * ```
 *
 * Or with env vars (legacy):
 * @example
 * ```typescript
 * export const { ... } = exposeApi(components.okrhub, {
 *   getConfig: () => ({
 *     endpointUrl: process.env.LINKHUB_API_URL!,
 *     apiKeyPrefix: process.env.LINKHUB_API_KEY_PREFIX!,
 *     signingSecret: process.env.LINKHUB_SIGNING_SECRET!,
 *   }),
 * });
 * ```
 */
export function exposeApi(
  component: ComponentApi,
  options?: ExposeApiOptions
) {
  return {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    /**
     * Store LinkHub connection config in the component's database.
     * Call once during setup. Config can also come from env vars or getConfig option.
     *
     * If env vars (LINKHUB_API_URL, LINKHUB_API_KEY_PREFIX, LINKHUB_SIGNING_SECRET)
     * are set, they will be used as defaults if explicit args are not provided.
     */
    configure: mutationGeneric({
      args: {
        endpointUrl: v.optional(v.string()),
        apiKeyPrefix: v.optional(v.string()),
        signingSecret: v.optional(v.string()),
        autoSyncEnabled: v.optional(v.boolean()),
        syncIntervalMs: v.optional(v.number()),
        sourceApp: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "sync", entityType: "config" });
        }

        // Resolve: explicit args > options config > env vars
        const envConfig = resolveConfig(options);
        const endpointUrl = args.endpointUrl || envConfig?.endpointUrl;
        const apiKeyPrefix = args.apiKeyPrefix || envConfig?.apiKeyPrefix;
        const signingSecret = args.signingSecret || envConfig?.signingSecret;

        if (!endpointUrl || !apiKeyPrefix || !signingSecret) {
          throw new Error(
            "OKRHub configure() requires endpointUrl, apiKeyPrefix, and signingSecret. " +
              "Pass them as arguments, set environment variables, or use getConfig option."
          );
        }

        return await ctx.runMutation(component.config.configure, {
          endpointUrl,
          apiKeyPrefix,
          signingSecret,
          autoSyncEnabled: args.autoSyncEnabled ?? true,
          syncIntervalMs: args.syncIntervalMs ?? 60000,
          sourceApp: args.sourceApp,
        });
      },
    }),

    /**
     * Start the auto-sync loop. Triggers one processSyncQueue run,
     * which will self-schedule subsequent runs if autoSyncEnabled is true.
     *
     * Call once after configure() to kick off the sync loop.
     */
    startSync: actionGeneric({
      args: {
        batchSize: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "sync", entityType: "queue" });
        }
        return await ctx.runAction(component.sync.processor.processSyncQueue, {
          batchSize: args.batchSize,
        });
      },
    }),

    // =========================================================================
    // SYNC PROCESSOR
    // =========================================================================

    /**
     * Process the sync queue manually.
     * Reads config from stored DB config, env vars, or getConfig option.
     * If autoSyncEnabled, also self-schedules the next run.
     */
    processSyncQueue: actionGeneric({
      args: {
        batchSize: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "sync", entityType: "queue" });
        }

        // Try to resolve config from options/env (backward compatible)
        const config = resolveConfig(options);

        return await ctx.runAction(component.okrhub.processSyncQueue, {
          endpointUrl: config?.endpointUrl,
          apiKeyPrefix: config?.apiKeyPrefix,
          signingSecret: config?.signingSecret,
          batchSize: args.batchSize,
        });
      },
    }),

    // =========================================================================
    // QUEUE QUERIES
    // =========================================================================
    getPendingSyncItems: queryGeneric({
      args: {
        limit: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getPendingSyncItems, args);
      },
    }),

    // =========================================================================
    // LOCAL CRUD OPERATIONS (with sync)
    // =========================================================================
    
    /**
     * Creates an objective locally and queues for sync to LinkHub
     */
    createObjective: mutationGeneric({
      args: {
        sourceApp: v.string(),
        sourceUrl: v.optional(v.string()),
        externalId: v.optional(v.string()),
        title: v.string(),
        description: v.string(),
        teamExternalId: v.string(),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "objective" });
        }
        return await ctx.runMutation(component.okrhub.createObjective, args);
      },
    }),

    /**
     * Creates a key result locally and queues for sync to LinkHub
     * Note: weight is always 0, managed only by LinkHub
     */
    createKeyResult: mutationGeneric({
      args: {
        sourceApp: v.string(),
        sourceUrl: v.optional(v.string()),
        externalId: v.optional(v.string()),
        objectiveExternalId: v.string(), // Required
        indicatorExternalId: v.string(),
        teamExternalId: v.string(),
        forecastValue: v.optional(v.number()),
        targetValue: v.optional(v.number()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "keyResult" });
        }
        return await ctx.runMutation(component.okrhub.createKeyResult, args);
      },
    }),

    /**
     * Creates a risk locally and queues for sync to LinkHub
     */
    createRisk: mutationGeneric({
      args: {
        sourceApp: v.string(),
        sourceUrl: v.optional(v.string()),
        externalId: v.optional(v.string()),
        description: v.string(),
        teamExternalId: v.string(),
        keyResultExternalId: v.string(), // Required
        priority: v.union(
          v.literal("lowest"),
          v.literal("low"),
          v.literal("medium"),
          v.literal("high"),
          v.literal("highest")
        ),
        indicatorExternalId: v.optional(v.string()),
        triggerValue: v.optional(v.number()),
        triggeredIfLower: v.optional(v.boolean()),
        useForecastAsTrigger: v.optional(v.boolean()),
        isRed: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "risk" });
        }
        return await ctx.runMutation(component.okrhub.createRisk, args);
      },
    }),

    /**
     * Creates an initiative locally and queues for sync to LinkHub
     * Note: relativeImpact, overallImpact, isNew are set by LinkHub
     */
    createInitiative: mutationGeneric({
      args: {
        sourceApp: v.string(),
        sourceUrl: v.optional(v.string()),
        externalId: v.optional(v.string()),
        description: v.string(),
        teamExternalId: v.string(),
        riskExternalId: v.string(), // Required
        assigneeExternalId: v.string(),
        createdByExternalId: v.string(),
        status: v.optional( // Optional in input, default ON_TIME in backend
          v.union(
            v.literal("ON_TIME"),
            v.literal("OVERDUE"),
            v.literal("FINISHED")
          )
        ),
        priority: v.union(
          v.literal("lowest"),
          v.literal("low"),
          v.literal("medium"),
          v.literal("high"),
          v.literal("highest")
        ),
        finishedAt: v.optional(v.number()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "initiative" });
        }
        return await ctx.runMutation(component.okrhub.createInitiative, args);
      },
    }),

    /**
     * Creates an indicator locally and queues for sync to LinkHub
     */
    createIndicator: mutationGeneric({
      args: {
        sourceApp: v.string(),
        sourceUrl: v.optional(v.string()),
        externalId: v.optional(v.string()),
        companyExternalId: v.string(),
        description: v.string(),
        symbol: v.string(),
        periodicity: v.union(
          v.literal("weekly"),
          v.literal("monthly"),
          v.literal("quarterly"),
          v.literal("semesterly"),
          v.literal("yearly")
        ),
        isReverse: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "indicator" });
        }
        return await ctx.runMutation(component.okrhub.createIndicator, args);
      },
    }),

    /**
     * Creates an indicator value locally and queues for sync to LinkHub
     */
    createIndicatorValue: mutationGeneric({
      args: {
        sourceApp: v.string(),
        sourceUrl: v.optional(v.string()),
        externalId: v.optional(v.string()),
        indicatorExternalId: v.string(),
        value: v.number(),
        date: v.number(),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "indicatorValue" });
        }
        return await ctx.runMutation(component.okrhub.createIndicatorValue, args);
      },
    }),

    /**
     * Creates an indicator forecast locally and queues for sync to LinkHub
     */
    createIndicatorForecast: mutationGeneric({
      args: {
        sourceApp: v.string(),
        sourceUrl: v.optional(v.string()),
        externalId: v.optional(v.string()),
        indicatorExternalId: v.string(),
        value: v.number(),
        date: v.number(),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "indicatorForecast" });
        }
        return await ctx.runMutation(component.okrhub.createIndicatorForecast, args);
      },
    }),

    /**
     * Creates a milestone locally and queues for sync to LinkHub
     */
    createMilestone: mutationGeneric({
      args: {
        sourceApp: v.string(),
        sourceUrl: v.optional(v.string()),
        externalId: v.optional(v.string()),
        indicatorExternalId: v.string(),
        description: v.string(),
        value: v.number(),
        forecastDate: v.optional(v.number()),
        status: v.optional(
          v.union(
            v.literal("ON_TIME"),
            v.literal("OVERDUE"),
            v.literal("ACHIEVED_ON_TIME"),
            v.literal("ACHIEVED_LATE")
          )
        ),
        achievedAt: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "milestone" });
        }
        return await ctx.runMutation(component.okrhub.createMilestone, args);
      },
    }),

    // =========================================================================
    // LOCAL UPDATE OPERATIONS (with sync reset)
    // =========================================================================

    /**
     * Updates an objective locally and resets syncStatus to pending
     */
    updateObjective: mutationGeneric({
      args: {
        externalId: v.string(),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "objective" });
        }
        return await ctx.runMutation(component.okrhub.updateObjective, args);
      },
    }),

    /**
     * Updates a key result locally and resets syncStatus to pending
     */
    updateKeyResult: mutationGeneric({
      args: {
        externalId: v.string(),
        objectiveExternalId: v.optional(v.string()),
        forecastValue: v.optional(v.number()),
        targetValue: v.optional(v.number()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "keyResult" });
        }
        return await ctx.runMutation(component.okrhub.updateKeyResult, args);
      },
    }),

    /**
     * Soft-deletes a risk by setting deletedAt
     */
    deleteRisk: mutationGeneric({
      args: {
        externalId: v.string(),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "risk" });
        }
        return await ctx.runMutation(component.okrhub.deleteRisk, args);
      },
    }),

    /**
     * Updates a risk locally and resets syncStatus to pending
     */
    updateRisk: mutationGeneric({
      args: {
        externalId: v.string(),
        description: v.optional(v.string()),
        priority: v.optional(
          v.union(
            v.literal("lowest"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("highest")
          )
        ),
        keyResultExternalId: v.optional(v.string()),
        indicatorExternalId: v.optional(v.string()),
        triggerValue: v.optional(v.number()),
        triggeredIfLower: v.optional(v.boolean()),
        useForecastAsTrigger: v.optional(v.boolean()),
        isRed: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "risk" });
        }
        return await ctx.runMutation(component.okrhub.updateRisk, args);
      },
    }),

    /**
     * Soft-deletes an initiative by setting deletedAt
     */
    deleteInitiative: mutationGeneric({
      args: {
        externalId: v.string(),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "initiative" });
        }
        return await ctx.runMutation(component.okrhub.deleteInitiative, args);
      },
    }),

    /**
     * Updates an initiative locally and resets syncStatus to pending
     */
    updateInitiative: mutationGeneric({
      args: {
        externalId: v.string(),
        description: v.optional(v.string()),
        riskExternalId: v.optional(v.string()),
        assigneeExternalId: v.optional(v.string()),
        status: v.optional(
          v.union(
            v.literal("ON_TIME"),
            v.literal("OVERDUE"),
            v.literal("FINISHED")
          )
        ),
        priority: v.optional(
          v.union(
            v.literal("lowest"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("highest")
          )
        ),
        finishedAt: v.optional(v.number()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "initiative" });
        }
        return await ctx.runMutation(component.okrhub.updateInitiative, args);
      },
    }),

    /**
     * Updates an indicator locally and resets syncStatus to pending
     */
    updateIndicator: mutationGeneric({
      args: {
        externalId: v.string(),
        description: v.optional(v.string()),
        symbol: v.optional(v.string()),
        periodicity: v.optional(
          v.union(
            v.literal("weekly"),
            v.literal("monthly"),
            v.literal("quarterly"),
            v.literal("semesterly"),
            v.literal("yearly")
          )
        ),
        isReverse: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "indicator" });
        }
        return await ctx.runMutation(component.okrhub.updateIndicator, args);
      },
    }),

    /**
     * Updates an indicator value locally and resets syncStatus to pending
     */
    updateIndicatorValue: mutationGeneric({
      args: {
        externalId: v.string(),
        value: v.optional(v.number()),
        date: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "indicatorValue" });
        }
        return await ctx.runMutation(component.okrhub.updateIndicatorValue, args);
      },
    }),

    /**
     * Updates an indicator forecast locally and resets syncStatus to pending
     */
    updateIndicatorForecast: mutationGeneric({
      args: {
        externalId: v.string(),
        value: v.optional(v.number()),
        date: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "indicatorForecast" });
        }
        return await ctx.runMutation(component.okrhub.updateIndicatorForecast, args);
      },
    }),

    /**
     * Updates a milestone locally and resets syncStatus to pending
     */
    updateMilestone: mutationGeneric({
      args: {
        externalId: v.string(),
        description: v.optional(v.string()),
        value: v.optional(v.number()),
        forecastDate: v.optional(v.number()),
        status: v.optional(
          v.union(
            v.literal("ON_TIME"),
            v.literal("OVERDUE"),
            v.literal("ACHIEVED_ON_TIME"),
            v.literal("ACHIEVED_LATE")
          )
        ),
        achievedAt: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "update", entityType: "milestone" });
        }
        return await ctx.runMutation(component.okrhub.updateMilestone, args);
      },
    }),

    // =========================================================================
    // LOCAL QUERY OPERATIONS
    // =========================================================================

    /**
     * Gets a single objective by externalId
     */
    getObjectiveByExternalId: queryGeneric({
      args: {
        externalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getObjectiveByExternalId, args);
      },
    }),

    /**
     * Gets all local objectives for a team
     */
    getObjectivesByTeam: queryGeneric({
      args: {
        teamExternalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getObjectivesByTeam, args);
      },
    }),

    /**
     * Gets a single key result by externalId
     */
    getKeyResultByExternalId: queryGeneric({
      args: {
        externalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getKeyResultByExternalId, args);
      },
    }),

    /**
     * Gets all local key results for an objective
     */
    getKeyResultsByObjective: queryGeneric({
      args: {
        objectiveExternalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getKeyResultsByObjective, args);
      },
    }),

    /**
     * Gets a single risk by externalId
     */
    getRiskByExternalId: queryGeneric({
      args: {
        externalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getRiskByExternalId, args);
      },
    }),

    /**
     * Gets all local risks for a key result
     */
    getRisksByKeyResult: queryGeneric({
      args: {
        keyResultExternalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getRisksByKeyResult, args);
      },
    }),

    /**
     * Gets all local risks for a team
     */
    getRisksByTeam: queryGeneric({
      args: {
        teamExternalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getRisksByTeam, args);
      },
    }),

    /**
     * Gets a single initiative by externalId
     */
    getInitiativeByExternalId: queryGeneric({
      args: {
        externalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getInitiativeByExternalId, args);
      },
    }),

    /**
     * Gets all local initiatives for a risk
     */
    getInitiativesByRisk: queryGeneric({
      args: {
        riskExternalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getInitiativesByRisk, args);
      },
    }),

    /**
     * Gets all local initiatives for a team
     */
    getInitiativesByTeam: queryGeneric({
      args: {
        teamExternalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getInitiativesByTeam, args);
      },
    }),

    /**
     * Gets all local initiatives for an assignee
     */
    getInitiativesByAssignee: queryGeneric({
      args: {
        assigneeExternalId: v.string(),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.okrhub.getInitiativesByAssignee, args);
      },
    }),

    // =========================================================================
    // LINKHUB API CALLS
    // =========================================================================

    /**
     * Gets the list of teams where the user has active membership in LinkHub
     * 
     * @param email - User email address
     * @returns List of teams with their IDs, names, and external IDs if available
     */
    getMyTeams: actionGeneric({
      args: {
        email: v.string(),
      },
      handler: async (ctx, args) => {
        const config = requireConfig(options);

        // Create signature payload (query string without leading ?)
        const queryString = `email=${encodeURIComponent(args.email)}`;
        
        // Create HMAC signature
        const encoder = new TextEncoder();
        const keyData = encoder.encode(config.signingSecret);
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
        const url = `${config.endpointUrl}/api/okrhub/teams?${queryString}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "X-OKRHub-Version": OKRHUB_VERSION,
            "X-OKRHub-Key-Prefix": config.apiKeyPrefix,
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
    }),
  };
}

/**
 * Register HTTP routes for the OKRHub component.
 * This exposes REST endpoints that can be called from external systems.
 *
 * @example
 * ```typescript
 * // convex/http.ts
 * import { httpRouter } from "convex/server";
 * import { components } from "./_generated/api";
 * import { registerRoutes } from "@okrlinkhub/okrhub";
 *
 * const http = httpRouter();
 * registerRoutes(http, components.okrhub, { pathPrefix: "/api/okrhub" });
 *
 * export default http;
 * ```
 */
export function registerRoutes(
  http: HttpRouter,
  component: ComponentApi,
  options: {
    pathPrefix?: string;
    /**
     * API key for validating incoming requests
     */
    apiKey?: string;
  } = {}
) {
  const { pathPrefix = "/okrhub" } = options;

  // Health check endpoint
  http.route({
    path: `${pathPrefix}/health`,
    method: "GET",
    handler: httpActionGeneric(async () => {
      return new Response(
        JSON.stringify({
          status: "ok",
          version: OKRHUB_VERSION,
          timestamp: Date.now(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }),
  });

  // Get pending sync items
  http.route({
    path: `${pathPrefix}/queue/pending`,
    method: "GET",
    handler: httpActionGeneric(async (ctx, request) => {
      const url = new URL(request.url);
      const limitParam = url.searchParams.get("limit");
      const limit = limitParam ? parseInt(limitParam, 10) : 50;

      const items = await ctx.runQuery(component.okrhub.getPendingSyncItems, {
        limit,
      });

      return new Response(JSON.stringify(items), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  });
}

// Convenient types for `ctx` args
type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction"
>;

type MutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "db"
>;
