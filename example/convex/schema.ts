import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Local teams table to map to LinkHub teams
  teams: defineTable({
    name: v.string(),
    linkHubTeamId: v.string(), // ID del team in LinkHub (Convex ID)
    externalId: v.string(), // External ID per il componente okrhub
    type: v.optional(v.string()), // Team type (e.g., FUNCTIONAL, CROSS_FUNCTIONAL)
    slug: v.optional(v.string()),
  })
    .index("by_external_id", ["externalId"])
    .index("by_linkhub_id", ["linkHubTeamId"]),
});
