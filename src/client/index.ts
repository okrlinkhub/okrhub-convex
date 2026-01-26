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
      type: "insert" | "sync";
      entityType: string;
    }
  ) => Promise<void>;

  /**
   * Configuration for LinkHub connection
   * If not provided, uses environment variables:
   * - LINKHUB_API_URL
   * - LINKHUB_API_KEY
   */
  config?: OKRHubConfig;
}

/**
 * Get configuration from environment or options
 */
function getConfig(options?: ExposeApiOptions): OKRHubConfig {
  if (options?.config) {
    return options.config;
  }

  const endpointUrl = process.env.LINKHUB_API_URL;
  const apiKeyPrefix = process.env.LINKHUB_API_KEY_PREFIX;
  const signingSecret = process.env.LINKHUB_SIGNING_SECRET;

  if (!endpointUrl || !apiKeyPrefix || !signingSecret) {
    throw new Error(
      "OKRHub configuration missing. " +
        "Set LINKHUB_API_URL, LINKHUB_API_KEY_PREFIX, and LINKHUB_SIGNING_SECRET environment variables, " +
        "or pass config in exposeApi options."
    );
  }

  return { endpointUrl, apiKeyPrefix, signingSecret };
}

/**
 * Expose the OKRHub component API for use in consumer applications.
 *
 * @example
 * ```typescript
 * // convex/okrhub.ts
 * import { components } from "./_generated/api";
 * import { exposeApi } from "@linkhub/okrhub";
 *
 * export const { insertObjective, insertKeyResult, processSyncQueue } =
 *   exposeApi(components.okrhub, {
 *     auth: async (ctx, operation) => {
 *       const identity = await ctx.auth.getUserIdentity();
 *       if (!identity) throw new Error("Unauthorized");
 *     },
 *   });
 * ```
 */
export function exposeApi(
  component: ComponentApi,
  options?: ExposeApiOptions
) {
  return {
    // =========================================================================
    // OBJECTIVE MUTATIONS
    // =========================================================================
    insertObjective: mutationGeneric({
      args: {
        objective: v.object({
          externalId: v.string(),
          title: v.string(),
          description: v.string(),
          teamExternalId: v.string(),
          createdAt: v.optional(v.number()),
          updatedAt: v.optional(v.number()),
        }),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "objective" });
        }
        return await ctx.runMutation(component.okrhub.insertObjective, args);
      },
    }),

    // =========================================================================
    // KEY RESULT MUTATIONS
    // =========================================================================
    insertKeyResult: mutationGeneric({
      args: {
        keyResult: v.object({
          externalId: v.string(),
          objectiveExternalId: v.optional(v.string()),
          indicatorExternalId: v.string(),
          teamExternalId: v.string(),
          weight: v.number(),
          impact: v.optional(v.number()),
          forecastValue: v.optional(v.number()),
          targetValue: v.optional(v.number()),
          createdAt: v.optional(v.number()),
          updatedAt: v.optional(v.number()),
        }),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "keyResult" });
        }
        return await ctx.runMutation(component.okrhub.insertKeyResult, args);
      },
    }),

    // =========================================================================
    // RISK MUTATIONS
    // =========================================================================
    insertRisk: mutationGeneric({
      args: {
        risk: v.object({
          externalId: v.string(),
          description: v.string(),
          teamExternalId: v.string(),
          priority: v.union(
            v.literal("lowest"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("highest")
          ),
          keyResultExternalId: v.optional(v.string()),
          indicatorExternalId: v.optional(v.string()),
          triggerValue: v.optional(v.number()),
          triggeredIfLower: v.optional(v.boolean()),
          useForecastAsTrigger: v.optional(v.boolean()),
          isRed: v.optional(v.boolean()),
          createdAt: v.optional(v.number()),
        }),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "risk" });
        }
        return await ctx.runMutation(component.okrhub.insertRisk, args);
      },
    }),

    // =========================================================================
    // INITIATIVE MUTATIONS
    // =========================================================================
    insertInitiative: mutationGeneric({
      args: {
        initiative: v.object({
          externalId: v.string(),
          description: v.string(),
          teamExternalId: v.string(),
          assigneeExternalId: v.string(),
          createdByExternalId: v.string(),
          priority: v.union(
            v.literal("lowest"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("highest")
          ),
          riskExternalId: v.optional(v.string()),
          status: v.optional(
            v.union(
              v.literal("ON_TIME"),
              v.literal("OVERDUE"),
              v.literal("FINISHED")
            )
          ),
          isNew: v.optional(v.boolean()),
          finishedAt: v.optional(v.number()),
          externalUrl: v.optional(v.string()),
          notes: v.optional(v.string()),
          createdAt: v.optional(v.number()),
          updatedAt: v.optional(v.number()),
        }),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "initiative" });
        }
        return await ctx.runMutation(component.okrhub.insertInitiative, args);
      },
    }),

    // =========================================================================
    // INDICATOR MUTATIONS
    // =========================================================================
    insertIndicator: mutationGeneric({
      args: {
        indicator: v.object({
          externalId: v.string(),
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
          assigneeExternalId: v.optional(v.string()),
          isReverse: v.optional(v.boolean()),
          type: v.optional(v.union(v.literal("OUTPUT"), v.literal("OUTCOME"))),
          notes: v.optional(v.string()),
          automationUrl: v.optional(v.string()),
          automationDescription: v.optional(v.string()),
          forecastDate: v.optional(v.number()),
          createdAt: v.optional(v.number()),
        }),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "indicator" });
        }
        return await ctx.runMutation(component.okrhub.insertIndicator, args);
      },
    }),

    // =========================================================================
    // INDICATOR VALUE MUTATIONS
    // =========================================================================
    insertIndicatorValue: mutationGeneric({
      args: {
        indicatorValue: v.object({
          externalId: v.string(),
          indicatorExternalId: v.string(),
          value: v.number(),
          date: v.number(),
          createdAt: v.optional(v.number()),
        }),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, {
            type: "insert",
            entityType: "indicatorValue",
          });
        }
        return await ctx.runMutation(
          component.okrhub.insertIndicatorValue,
          args
        );
      },
    }),

    // =========================================================================
    // MILESTONE MUTATIONS
    // =========================================================================
    insertMilestone: mutationGeneric({
      args: {
        milestone: v.object({
          externalId: v.string(),
          indicatorExternalId: v.string(),
          description: v.string(),
          value: v.number(),
          achievedAt: v.optional(v.number()),
          forecastDate: v.optional(v.number()),
          status: v.optional(
            v.union(
              v.literal("ON_TIME"),
              v.literal("OVERDUE"),
              v.literal("ACHIEVED_ON_TIME"),
              v.literal("ACHIEVED_LATE")
            )
          ),
          createdAt: v.optional(v.number()),
          updatedAt: v.optional(v.number()),
        }),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "insert", entityType: "milestone" });
        }
        return await ctx.runMutation(component.okrhub.insertMilestone, args);
      },
    }),

    // =========================================================================
    // SYNC PROCESSOR
    // =========================================================================
    processSyncQueue: actionGeneric({
      args: {
        batchSize: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "sync", entityType: "queue" });
        }

        const config = getConfig(options);

        return await ctx.runAction(component.okrhub.processSyncQueue, {
          endpointUrl: config.endpointUrl,
          apiKeyPrefix: config.apiKeyPrefix,
          signingSecret: config.signingSecret,
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
        title: v.string(),
        description: v.string(),
        teamExternalId: v.string(),
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
        objectiveExternalId: v.optional(v.string()),
        indicatorExternalId: v.string(),
        teamExternalId: v.string(),
        forecastValue: v.optional(v.number()),
        targetValue: v.optional(v.number()),
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
        description: v.string(),
        teamExternalId: v.string(),
        keyResultExternalId: v.optional(v.string()),
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
        description: v.string(),
        teamExternalId: v.string(),
        riskExternalId: v.optional(v.string()),
        assigneeExternalId: v.string(),
        createdByExternalId: v.string(),
        status: v.optional(
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
        notes: v.optional(v.string()),
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
        assigneeExternalId: v.optional(v.string()),
        isReverse: v.optional(v.boolean()),
        type: v.optional(v.union(v.literal("OUTPUT"), v.literal("OUTCOME"))),
        notes: v.optional(v.string()),
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
    // LOCAL QUERY OPERATIONS
    // =========================================================================

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
        const config = getConfig(options);

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
            "X-OKRHub-Version": "0.1.0",
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
 * import { registerRoutes } from "@linkhub/okrhub";
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
          version: "0.1.0",
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
