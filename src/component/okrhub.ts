/**
 * OKRHub Component - Proxy Mutations
 *
 * This file contains proxy mutations that forward OKR data to LinkHub's API.
 * No business logic here - only payload validation and HTTP forwarding.
 *
 * All mutations use HMAC signature for authentication and include version headers.
 */

import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server.js";
import { api, internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import {
  objectivePayloadValidator,
  keyResultPayloadValidator,
  riskPayloadValidator,
  initiativePayloadValidator,
  indicatorPayloadValidator,
  indicatorValuePayloadValidator,
  indicatorForecastPayloadValidator,
  milestonePayloadValidator,
  batchPayloadValidator,
  type ObjectivePayload,
  type KeyResultPayload,
  type RiskPayload,
  type InitiativePayload,
  type IndicatorPayload,
  type IndicatorValuePayload,
  type MilestonePayload,
  type BatchPayload,
} from "./schema.js";
import {
  validateExternalId,
  OKRHUB_VERSION,
  type EntityType,
} from "./externalId.js";

// ============================================================================
// HMAC SIGNATURE UTILITIES
// ============================================================================

/**
 * Creates HMAC-SHA256 signature for payload authentication
 */
async function createHmacSignature(
  payload: string,
  apiKey: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates request headers with HMAC signature and version
 */
async function createRequestHeaders(
  payload: string,
  apiKey: string
): Promise<Headers> {
  const signature = await createHmacSignature(payload, apiKey);

  return new Headers({
    "Content-Type": "application/json",
    "X-OKRHub-Version": OKRHUB_VERSION,
    "X-OKRHub-Signature": signature,
  });
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface IngestResponse {
  success: boolean;
  externalId: string;
  linkHubId?: string;
  action: "create" | "update";
  error?: string;
}

interface BatchIngestResponse {
  success: boolean;
  results: {
    entityType: string;
    externalId: string;
    linkHubId?: string;
    action: "create" | "update";
    error?: string;
  }[];
  errors: string[];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates external ID format and throws if invalid
 */
function assertValidExternalId(externalId: string, fieldName = "externalId") {
  if (!validateExternalId(externalId)) {
    throw new Error(
      `Invalid ${fieldName} format: "${externalId}". ` +
        `Expected format: {sourceApp}:{entityType}:{uuid}`
    );
  }
}

// ============================================================================
// HTTP ACTIONS - Direct API calls to LinkHub
// ============================================================================

/**
 * Sends a single entity to LinkHub's ingest API
 */
export const sendToLinkHub = action({
  args: {
    endpointUrl: v.string(),
    apiKey: v.string(),
    entityType: v.string(),
    payload: v.string(), // JSON stringified payload
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    linkHubId: v.optional(v.string()),
    action: v.optional(v.union(v.literal("create"), v.literal("update"))),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { endpointUrl, apiKey, entityType, payload } = args;

    try {
      const headers = await createRequestHeaders(payload, apiKey);
      const url = `${endpointUrl}/ingest/okr/v1/${entityType}`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          externalId: "",
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = (await response.json()) as IngestResponse;
      return result;
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        error: errorMessage,
      };
    }
  },
});

/**
 * Sends a batch of entities to LinkHub's ingest API
 */
export const sendBatchToLinkHub = action({
  args: {
    endpointUrl: v.string(),
    apiKey: v.string(),
    payload: v.string(), // JSON stringified BatchPayload
  },
  returns: v.object({
    success: v.boolean(),
    results: v.array(
      v.object({
        entityType: v.string(),
        externalId: v.string(),
        linkHubId: v.optional(v.string()),
        action: v.optional(v.union(v.literal("create"), v.literal("update"))),
        error: v.optional(v.string()),
      })
    ),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { endpointUrl, apiKey, payload } = args;

    try {
      const headers = await createRequestHeaders(payload, apiKey);
      const url = `${endpointUrl}/ingest/okr/v1/batch`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          results: [],
          errors: [`HTTP ${response.status}: ${errorText}`],
        };
      }

      const result = (await response.json()) as BatchIngestResponse;
      return result;
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        results: [],
        errors: [errorMessage],
      };
    }
  },
});

// ============================================================================
// SYNC QUEUE MANAGEMENT
// ============================================================================

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
    return await ctx.db.insert("syncQueue", {
      entityType: args.entityType,
      externalId: args.externalId,
      payload: args.payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Updates sync queue item status
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

    const item = await ctx.db.get("syncQueue", args.id);
    if (item) {
      updates.attempts = item.attempts + 1;
    }

    await ctx.db.patch("syncQueue", args.id, updates);

    // If successful, log the sync
    if (args.status === "success" && item) {
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
 * Gets pending items from the sync queue
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

// ============================================================================
// PUBLIC MUTATIONS - Entry points for consumers
// ============================================================================

/**
 * Insert an objective into LinkHub
 */
export const insertObjective = mutation({
  args: {
    objective: objectivePayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { objective } = args;

    // Validate external IDs
    assertValidExternalId(objective.externalId, "objective.externalId");
    assertValidExternalId(objective.teamExternalId, "objective.teamExternalId");

    // Add to sync queue
    const payload = JSON.stringify(objective);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "objective",
      externalId: objective.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: objective.externalId,
      queueId,
    };
  },
});

/**
 * Insert a key result into LinkHub
 */
export const insertKeyResult = mutation({
  args: {
    keyResult: keyResultPayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { keyResult } = args;

    // Validate external IDs
    assertValidExternalId(keyResult.externalId, "keyResult.externalId");
    assertValidExternalId(keyResult.teamExternalId, "keyResult.teamExternalId");
    assertValidExternalId(
      keyResult.indicatorExternalId,
      "keyResult.indicatorExternalId"
    );
    if (keyResult.objectiveExternalId) {
      assertValidExternalId(
        keyResult.objectiveExternalId,
        "keyResult.objectiveExternalId"
      );
    }

    // Add to sync queue
    const payload = JSON.stringify(keyResult);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "keyResult",
      externalId: keyResult.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: keyResult.externalId,
      queueId,
    };
  },
});

/**
 * Insert a risk into LinkHub
 */
export const insertRisk = mutation({
  args: {
    risk: riskPayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { risk } = args;

    // Validate external IDs
    assertValidExternalId(risk.externalId, "risk.externalId");
    assertValidExternalId(risk.teamExternalId, "risk.teamExternalId");
    if (risk.keyResultExternalId) {
      assertValidExternalId(
        risk.keyResultExternalId,
        "risk.keyResultExternalId"
      );
    }
    if (risk.indicatorExternalId) {
      assertValidExternalId(
        risk.indicatorExternalId,
        "risk.indicatorExternalId"
      );
    }

    // Add to sync queue
    const payload = JSON.stringify(risk);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "risk",
      externalId: risk.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: risk.externalId,
      queueId,
    };
  },
});

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

/**
 * Insert an indicator into LinkHub
 */
export const insertIndicator = mutation({
  args: {
    indicator: indicatorPayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { indicator } = args;

    // Validate external IDs
    assertValidExternalId(indicator.externalId, "indicator.externalId");
    assertValidExternalId(
      indicator.companyExternalId,
      "indicator.companyExternalId"
    );
    if (indicator.assigneeExternalId) {
      assertValidExternalId(
        indicator.assigneeExternalId,
        "indicator.assigneeExternalId"
      );
    }

    // Add to sync queue
    const payload = JSON.stringify(indicator);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "indicator",
      externalId: indicator.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: indicator.externalId,
      queueId,
    };
  },
});

/**
 * Insert an indicator value into LinkHub
 */
export const insertIndicatorValue = mutation({
  args: {
    indicatorValue: indicatorValuePayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { indicatorValue } = args;

    // Validate external IDs
    assertValidExternalId(indicatorValue.externalId, "indicatorValue.externalId");
    assertValidExternalId(
      indicatorValue.indicatorExternalId,
      "indicatorValue.indicatorExternalId"
    );

    // Add to sync queue
    const payload = JSON.stringify(indicatorValue);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "indicatorValue",
      externalId: indicatorValue.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: indicatorValue.externalId,
      queueId,
    };
  },
});

/**
 * Insert a milestone into LinkHub
 */
export const insertMilestone = mutation({
  args: {
    milestone: milestonePayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { milestone } = args;

    // Validate external IDs
    assertValidExternalId(milestone.externalId, "milestone.externalId");
    assertValidExternalId(
      milestone.indicatorExternalId,
      "milestone.indicatorExternalId"
    );

    // Add to sync queue
    const payload = JSON.stringify(milestone);
    const queueId = await ctx.db.insert("syncQueue", {
      entityType: "milestone",
      externalId: milestone.externalId,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      externalId: milestone.externalId,
      queueId,
    };
  },
});

/**
 * Insert a batch of entities into LinkHub
 */
export const insertBatch = mutation({
  args: {
    batch: batchPayloadValidator,
  },
  returns: v.object({
    success: v.boolean(),
    queueIds: v.array(v.id("syncQueue")),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { batch } = args;
    const queueIds: Id<"syncQueue">[] = [];
    const errors: string[] = [];

    // Process each entity type
    const entityTypes: { key: keyof BatchPayload; type: EntityType }[] = [
      { key: "companies", type: "objective" }, // Using objective as placeholder
      { key: "teams", type: "objective" },
      { key: "users", type: "objective" },
      { key: "indicators", type: "indicator" },
      { key: "objectives", type: "objective" },
      { key: "keyResults", type: "keyResult" },
      { key: "risks", type: "risk" },
      { key: "initiatives", type: "initiative" },
      { key: "milestones", type: "milestone" },
      { key: "indicatorValues", type: "indicator" },
      { key: "indicatorForecasts", type: "indicator" },
    ];

    for (const { key, type } of entityTypes) {
      const items = batch[key];
      if (!items || items.length === 0) continue;

      for (const item of items) {
        try {
          // Validate external ID
          if ("externalId" in item && typeof item.externalId === "string") {
            assertValidExternalId(item.externalId);
          }

          const payload = JSON.stringify(item);
          const queueId = await ctx.db.insert("syncQueue", {
            entityType: key,
            externalId:
              "externalId" in item && typeof item.externalId === "string"
                ? item.externalId
                : `batch-${Date.now()}`,
            payload,
            status: "pending",
            attempts: 0,
            createdAt: Date.now(),
          });
          queueIds.push(queueId);
        } catch (error) {
          const errorMessage =
            error && typeof error === "object" && "message" in error
              ? (error.message as string)
              : "Unknown error";
          errors.push(`${key}: ${errorMessage}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      queueIds,
      errors,
    };
  },
});

// ============================================================================
// SYNC PROCESSOR ACTION
// ============================================================================

/**
 * Process pending items from the sync queue
 * This should be called periodically (e.g., via cron job)
 */
export const processSyncQueue = action({
  args: {
    endpointUrl: v.string(),
    apiKey: v.string(),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    succeeded: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    const { endpointUrl, apiKey, batchSize = 10 } = args;

    // Get pending items
    const pendingItems = await ctx.runQuery(api.okrhub.getPendingSyncItems, {
      limit: batchSize,
    });

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const item of pendingItems) {
      processed++;

      // Mark as processing
      await ctx.runMutation(internal.okrhub.updateSyncQueueItem, {
        id: item._id,
        status: "processing",
      });

      // Send to LinkHub
      const result = await ctx.runAction(api.okrhub.sendToLinkHub, {
        endpointUrl,
        apiKey,
        entityType: item.entityType,
        payload: item.payload,
      });

      if (result.success) {
        succeeded++;
        await ctx.runMutation(internal.okrhub.updateSyncQueueItem, {
          id: item._id,
          status: "success",
          linkHubId: "linkHubId" in result ? result.linkHubId : undefined,
        });
      } else {
        failed++;
        await ctx.runMutation(internal.okrhub.updateSyncQueueItem, {
          id: item._id,
          status: "failed",
          errorMessage: result.error,
        });
      }
    }

    return { processed, succeeded, failed };
  },
});
