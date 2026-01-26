/**
 * Batch Operations for OKRHub Component
 *
 * Batch insert mutation for multiple entities.
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import type { EntityType } from "../externalId.js";
import { assertValidExternalId } from "../lib/validation.js";
import { batchPayloadValidator, type BatchPayload } from "../schema.js";

// ============================================================================
// BATCH MUTATIONS
// ============================================================================

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
