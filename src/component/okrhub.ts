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
  milestonePayloadValidator,
  batchPayloadValidator,
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
 * 
 * SECURITY NOTE: Uses the signing secret (not the API key) to create
 * cryptographically consistent signatures that the server can verify.
 */
async function createHmacSignature(
  payload: string,
  signingSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingSecret);
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
 * Creates request headers with HMAC signature, version, and key prefix
 */
async function createRequestHeaders(
  payload: string,
  apiKeyPrefix: string,
  signingSecret: string
): Promise<Headers> {
  const signature = await createHmacSignature(payload, signingSecret);

  return new Headers({
    "Content-Type": "application/json",
    "X-OKRHub-Version": OKRHUB_VERSION,
    "X-OKRHub-Key-Prefix": apiKeyPrefix,
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
// SLUG GENERATION UTILITIES
// ============================================================================

/**
 * Generates a slug from text with sourceApp prefix
 * Pattern: {sourceApp}-{baseSlug}
 */
function generateSlug(sourceApp: string, text: string, maxLength = 50): string {
  const baseSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, maxLength - sourceApp.length - 7); // Reserve space for prefix and suffix

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${sourceApp}-${baseSlug}-${suffix}`;
}

// ============================================================================
// LOCAL CRUD MUTATIONS - Store locally before sync
// ============================================================================

import { generateExternalId } from "./externalId.js";
import {
  PrioritySchema,
  PeriodicitySchema,
  InitiativeStatusSchema,
  MilestoneStatusSchema,
  IndicatorTypeSchema,
  SyncStatusSchema,
} from "./schema.js";

/**
 * Creates an objective locally and queues for sync
 */
export const createObjective = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    teamExternalId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("objectives"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { sourceApp, sourceUrl, title, description, teamExternalId } = args;

    try {
      // Validate team external ID
      assertValidExternalId(teamExternalId, "teamExternalId");

      // Generate external ID for this objective
      const externalId = generateExternalId(sourceApp, "objective");
      const slug = generateSlug(sourceApp, title);
      const now = Date.now();

      // Save locally
      const localId = await ctx.db.insert("objectives", {
        externalId,
        title,
        description,
        teamExternalId,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      // Create payload for sync
      const payload = JSON.stringify({
        externalId,
        title,
        description,
        teamExternalId,
        sourceUrl,
        createdAt: now,
      });

      // Add to sync queue
      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "objective",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: "" as Id<"objectives">,
        error: errorMessage,
      };
    }
  },
});

/**
 * Creates a key result locally and queues for sync
 * Note: weight is always set to 0, managed only by linkhub
 */
export const createKeyResult = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    objectiveExternalId: v.optional(v.string()),
    indicatorExternalId: v.string(),
    teamExternalId: v.string(),
    forecastValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("keyResults"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      objectiveExternalId,
      indicatorExternalId,
      teamExternalId,
      forecastValue,
      targetValue,
    } = args;

    try {
      // Validate external IDs
      assertValidExternalId(teamExternalId, "teamExternalId");
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");
      if (objectiveExternalId) {
        assertValidExternalId(objectiveExternalId, "objectiveExternalId");
      }

      const externalId = generateExternalId(sourceApp, "keyResult");
      const slug = generateSlug(sourceApp, `kr-${sourceApp}`);
      const now = Date.now();

      // Save locally
      const localId = await ctx.db.insert("keyResults", {
        externalId,
        objectiveExternalId,
        indicatorExternalId,
        teamExternalId,
        forecastValue,
        targetValue,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      // Create payload for sync (weight=0 always)
      const payload = JSON.stringify({
        externalId,
        objectiveExternalId,
        indicatorExternalId,
        teamExternalId,
        weight: 0, // Always 0, managed by linkhub
        forecastValue,
        targetValue,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "keyResult",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: "" as Id<"keyResults">,
        error: errorMessage,
      };
    }
  },
});

/**
 * Creates a risk locally and queues for sync
 */
export const createRisk = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    description: v.string(),
    teamExternalId: v.string(),
    keyResultExternalId: v.optional(v.string()),
    priority: PrioritySchema,
    indicatorExternalId: v.optional(v.string()),
    triggerValue: v.optional(v.number()),
    triggeredIfLower: v.optional(v.boolean()),
    useForecastAsTrigger: v.optional(v.boolean()),
    isRed: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("risks"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      description,
      teamExternalId,
      keyResultExternalId,
      priority,
      indicatorExternalId,
      triggerValue,
      triggeredIfLower,
      useForecastAsTrigger,
      isRed,
    } = args;

    try {
      assertValidExternalId(teamExternalId, "teamExternalId");
      if (keyResultExternalId) {
        assertValidExternalId(keyResultExternalId, "keyResultExternalId");
      }
      if (indicatorExternalId) {
        assertValidExternalId(indicatorExternalId, "indicatorExternalId");
      }

      const externalId = generateExternalId(sourceApp, "risk");
      const slug = generateSlug(sourceApp, description.substring(0, 30));
      const now = Date.now();

      const localId = await ctx.db.insert("risks", {
        externalId,
        description,
        teamExternalId,
        keyResultExternalId,
        priority,
        indicatorExternalId,
        triggerValue,
        triggeredIfLower,
        useForecastAsTrigger,
        isRed,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        description,
        teamExternalId,
        keyResultExternalId,
        priority,
        indicatorExternalId,
        triggerValue,
        triggeredIfLower,
        useForecastAsTrigger,
        isRed,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "risk",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: "" as Id<"risks">,
        error: errorMessage,
      };
    }
  },
});

/**
 * Creates an initiative locally and queues for sync
 * Note: relativeImpact/overallImpact/isNew are set by linkhub based on priority
 */
export const createInitiative = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    description: v.string(),
    teamExternalId: v.string(),
    riskExternalId: v.optional(v.string()),
    assigneeExternalId: v.string(),
    createdByExternalId: v.string(),
    status: v.optional(InitiativeStatusSchema),
    priority: PrioritySchema,
    finishedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("initiatives"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      description,
      teamExternalId,
      riskExternalId,
      assigneeExternalId,
      createdByExternalId,
      status,
      priority,
      finishedAt,
      notes,
    } = args;

    try {
      assertValidExternalId(teamExternalId, "teamExternalId");
      assertValidExternalId(assigneeExternalId, "assigneeExternalId");
      assertValidExternalId(createdByExternalId, "createdByExternalId");
      if (riskExternalId) {
        assertValidExternalId(riskExternalId, "riskExternalId");
      }

      const externalId = generateExternalId(sourceApp, "initiative");
      const slug = generateSlug(sourceApp, description.substring(0, 30));
      const now = Date.now();

      const localId = await ctx.db.insert("initiatives", {
        externalId,
        description,
        teamExternalId,
        riskExternalId,
        assigneeExternalId,
        createdByExternalId,
        status: status ?? "ON_TIME",
        priority,
        finishedAt,
        notes,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        description,
        teamExternalId,
        riskExternalId,
        assigneeExternalId,
        createdByExternalId,
        status: status ?? "ON_TIME",
        priority,
        finishedAt,
        notes,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "initiative",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: "" as Id<"initiatives">,
        error: errorMessage,
      };
    }
  },
});

/**
 * Creates an indicator locally and queues for sync
 */
export const createIndicator = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    companyExternalId: v.string(),
    description: v.string(),
    symbol: v.string(),
    periodicity: PeriodicitySchema,
    assigneeExternalId: v.optional(v.string()),
    isReverse: v.optional(v.boolean()),
    type: v.optional(IndicatorTypeSchema),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("indicators"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      companyExternalId,
      description,
      symbol,
      periodicity,
      assigneeExternalId,
      isReverse,
      type,
      notes,
    } = args;

    try {
      assertValidExternalId(companyExternalId, "companyExternalId");
      if (assigneeExternalId) {
        assertValidExternalId(assigneeExternalId, "assigneeExternalId");
      }

      const externalId = generateExternalId(sourceApp, "indicator");
      const slug = generateSlug(sourceApp, description);
      const now = Date.now();

      const localId = await ctx.db.insert("indicators", {
        externalId,
        companyExternalId,
        description,
        symbol,
        periodicity,
        assigneeExternalId,
        isReverse,
        type,
        notes,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        companyExternalId,
        description,
        symbol,
        periodicity,
        assigneeExternalId,
        isReverse,
        type,
        notes,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "indicator",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: "" as Id<"indicators">,
        error: errorMessage,
      };
    }
  },
});

/**
 * Creates an indicator value locally and queues for sync
 */
export const createIndicatorValue = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    indicatorExternalId: v.string(),
    value: v.number(),
    date: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("indicatorValues"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { sourceApp, sourceUrl, indicatorExternalId, value, date } = args;

    try {
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");

      // Generate externalId - we use "indicator" type as base since indicatorValue isn't in the list
      const uuid = crypto.randomUUID();
      const externalId = `${sourceApp}:indicator:${uuid}`;
      const now = Date.now();

      const localId = await ctx.db.insert("indicatorValues", {
        externalId,
        indicatorExternalId,
        value,
        date,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        indicatorExternalId,
        value,
        date,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "indicatorValue",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: "" as Id<"indicatorValues">,
        error: errorMessage,
      };
    }
  },
});

/**
 * Creates an indicator forecast locally and queues for sync
 */
export const createIndicatorForecast = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    indicatorExternalId: v.string(),
    value: v.number(),
    date: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("indicatorForecasts"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { sourceApp, sourceUrl, indicatorExternalId, value, date } = args;

    try {
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");

      const uuid = crypto.randomUUID();
      const externalId = `${sourceApp}:indicator:${uuid}`;
      const now = Date.now();

      const localId = await ctx.db.insert("indicatorForecasts", {
        externalId,
        indicatorExternalId,
        value,
        date,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        indicatorExternalId,
        value,
        date,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "indicatorForecast",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: "" as Id<"indicatorForecasts">,
        error: errorMessage,
      };
    }
  },
});

/**
 * Creates a milestone locally and queues for sync
 */
export const createMilestone = mutation({
  args: {
    sourceApp: v.string(),
    sourceUrl: v.optional(v.string()),
    indicatorExternalId: v.string(),
    description: v.string(),
    value: v.number(),
    forecastDate: v.optional(v.number()),
    status: v.optional(MilestoneStatusSchema),
    achievedAt: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    externalId: v.string(),
    localId: v.id("milestones"),
    queueId: v.optional(v.id("syncQueue")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      sourceApp,
      sourceUrl,
      indicatorExternalId,
      description,
      value,
      forecastDate,
      status,
      achievedAt,
    } = args;

    try {
      assertValidExternalId(indicatorExternalId, "indicatorExternalId");

      const externalId = generateExternalId(sourceApp, "milestone");
      const slug = generateSlug(sourceApp, description);
      const now = Date.now();

      const localId = await ctx.db.insert("milestones", {
        externalId,
        indicatorExternalId,
        description,
        value,
        forecastDate,
        status,
        achievedAt,
        slug,
        syncStatus: "pending",
        createdAt: now,
      });

      const payload = JSON.stringify({
        externalId,
        indicatorExternalId,
        description,
        value,
        forecastDate,
        status,
        achievedAt,
        sourceUrl,
        createdAt: now,
      });

      const queueId = await ctx.db.insert("syncQueue", {
        entityType: "milestone",
        externalId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return {
        success: true,
        externalId,
        localId,
        queueId,
      };
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "Unknown error";

      return {
        success: false,
        externalId: "",
        localId: "" as Id<"milestones">,
        error: errorMessage,
      };
    }
  },
});

// ============================================================================
// LOCAL QUERY FUNCTIONS
// ============================================================================

/**
 * Gets all local objectives for a team
 */
export const getObjectivesByTeam = query({
  args: {
    teamExternalId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("objectives"),
      _creationTime: v.number(),
      externalId: v.string(),
      title: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objectives")
      .withIndex("by_team", (q) => q.eq("teamExternalId", args.teamExternalId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local key results for an objective
 */
export const getKeyResultsByObjective = query({
  args: {
    objectiveExternalId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("keyResults"),
      _creationTime: v.number(),
      externalId: v.string(),
      objectiveExternalId: v.optional(v.string()),
      indicatorExternalId: v.string(),
      teamExternalId: v.string(),
      forecastValue: v.optional(v.number()),
      targetValue: v.optional(v.number()),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("keyResults")
      .withIndex("by_objective", (q) =>
        q.eq("objectiveExternalId", args.objectiveExternalId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local risks for a key result
 */
export const getRisksByKeyResult = query({
  args: {
    keyResultExternalId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("risks"),
      _creationTime: v.number(),
      externalId: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      keyResultExternalId: v.optional(v.string()),
      priority: PrioritySchema,
      indicatorExternalId: v.optional(v.string()),
      triggerValue: v.optional(v.number()),
      triggeredIfLower: v.optional(v.boolean()),
      useForecastAsTrigger: v.optional(v.boolean()),
      isRed: v.optional(v.boolean()),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("risks")
      .withIndex("by_key_result", (q) =>
        q.eq("keyResultExternalId", args.keyResultExternalId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// ============================================================================
// GET ALL QUERIES - For testing/debugging
// ============================================================================

/**
 * Gets all local objectives
 */
export const getAllObjectives = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("objectives"),
      _creationTime: v.number(),
      externalId: v.string(),
      title: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("objectives")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local key results
 */
export const getAllKeyResults = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("keyResults"),
      _creationTime: v.number(),
      externalId: v.string(),
      objectiveExternalId: v.optional(v.string()),
      indicatorExternalId: v.string(),
      teamExternalId: v.string(),
      forecastValue: v.optional(v.number()),
      targetValue: v.optional(v.number()),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("keyResults")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local risks
 */
export const getAllRisks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("risks"),
      _creationTime: v.number(),
      externalId: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      keyResultExternalId: v.optional(v.string()),
      priority: PrioritySchema,
      indicatorExternalId: v.optional(v.string()),
      triggerValue: v.optional(v.number()),
      triggeredIfLower: v.optional(v.boolean()),
      useForecastAsTrigger: v.optional(v.boolean()),
      isRed: v.optional(v.boolean()),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("risks")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local initiatives
 */
export const getAllInitiatives = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("initiatives"),
      _creationTime: v.number(),
      externalId: v.string(),
      description: v.string(),
      teamExternalId: v.string(),
      riskExternalId: v.optional(v.string()),
      assigneeExternalId: v.string(),
      createdByExternalId: v.string(),
      status: InitiativeStatusSchema,
      priority: PrioritySchema,
      finishedAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("initiatives")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local indicators
 */
export const getAllIndicators = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("indicators"),
      _creationTime: v.number(),
      externalId: v.string(),
      companyExternalId: v.string(),
      description: v.string(),
      symbol: v.string(),
      periodicity: PeriodicitySchema,
      assigneeExternalId: v.optional(v.string()),
      isReverse: v.optional(v.boolean()),
      type: v.optional(IndicatorTypeSchema),
      notes: v.optional(v.string()),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("indicators")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local milestones
 */
export const getAllMilestones = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("milestones"),
      _creationTime: v.number(),
      externalId: v.string(),
      indicatorExternalId: v.string(),
      description: v.string(),
      value: v.number(),
      forecastDate: v.optional(v.number()),
      status: v.optional(MilestoneStatusSchema),
      achievedAt: v.optional(v.number()),
      slug: v.string(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("milestones")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Gets all local indicator values
 */
export const getAllIndicatorValues = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("indicatorValues"),
      _creationTime: v.number(),
      externalId: v.string(),
      indicatorExternalId: v.string(),
      value: v.number(),
      date: v.number(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("indicatorValues").collect();
  },
});

/**
 * Gets all local indicator forecasts
 */
export const getAllIndicatorForecasts = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("indicatorForecasts"),
      _creationTime: v.number(),
      externalId: v.string(),
      indicatorExternalId: v.string(),
      value: v.number(),
      date: v.number(),
      syncStatus: SyncStatusSchema,
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("indicatorForecasts").collect();
  },
});

// ============================================================================
// HTTP ACTIONS - Direct API calls to LinkHub
// ============================================================================

/**
 * Sends a single entity to LinkHub's ingest API
 */
export const sendToLinkHub = action({
  args: {
    endpointUrl: v.string(),
    apiKeyPrefix: v.string(),
    signingSecret: v.string(),
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
    const { endpointUrl, apiKeyPrefix, signingSecret, entityType, payload } = args;

    try {
      const headers = await createRequestHeaders(payload, apiKeyPrefix, signingSecret);
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
    apiKeyPrefix: v.string(),
    signingSecret: v.string(),
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
    const { endpointUrl, apiKeyPrefix, signingSecret, payload } = args;

    try {
      const headers = await createRequestHeaders(payload, apiKeyPrefix, signingSecret);
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
          .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus, updatedAt: Date.now() });
        }
      } else if (item.entityType === "keyResult") {
        const entity = await ctx.db
          .query("keyResults")
          .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus, updatedAt: Date.now() });
        }
      } else if (item.entityType === "risk") {
        const entity = await ctx.db
          .query("risks")
          .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
        }
      } else if (item.entityType === "initiative") {
        const entity = await ctx.db
          .query("initiatives")
          .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus, updatedAt: Date.now() });
        }
      } else if (item.entityType === "indicator") {
        const entity = await ctx.db
          .query("indicators")
          .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
        }
      } else if (item.entityType === "indicatorValue") {
        const entity = await ctx.db
          .query("indicatorValues")
          .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
        }
      } else if (item.entityType === "indicatorForecast") {
        const entity = await ctx.db
          .query("indicatorForecasts")
          .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus });
        }
      } else if (item.entityType === "milestone") {
        const entity = await ctx.db
          .query("milestones")
          .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
          .first();
        if (entity) {
          await ctx.db.patch(entity._id, { syncStatus: newSyncStatus, updatedAt: Date.now() });
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

    for (const { key, type: _type } of entityTypes) {
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
        apiKeyPrefix,
        signingSecret,
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
