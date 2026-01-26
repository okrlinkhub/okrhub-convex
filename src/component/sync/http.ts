/**
 * HTTP Actions for OKRHub Component
 *
 * Direct API calls to LinkHub's ingest endpoints.
 */

import { v } from "convex/values";
import { action } from "../_generated/server.js";
import { createRequestHeaders } from "../lib/hmac.js";
import type { IngestResponse, BatchIngestResponse } from "../lib/types.js";

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
  handler: async (_ctx, args) => {
    const { endpointUrl, apiKeyPrefix, signingSecret, entityType, payload } =
      args;

    try {
      const headers = await createRequestHeaders(
        payload,
        apiKeyPrefix,
        signingSecret
      );
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
  handler: async (_ctx, args) => {
    const { endpointUrl, apiKeyPrefix, signingSecret, payload } = args;

    try {
      const headers = await createRequestHeaders(
        payload,
        apiKeyPrefix,
        signingSecret
      );
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
