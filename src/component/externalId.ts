/**
 * External ID helper for OKRHub component
 *
 * External IDs are used to map entities between the consumer app and LinkHub.
 * Format: {sourceApp}:{entityType}:{uuid}
 *
 * Example: "mycrm:objective:550e8400-e29b-41d4-a716-446655440000"
 */

import { v } from "convex/values";

// Entity types supported by OKRHub
export const ENTITY_TYPES = [
  "objective",
  "keyResult",
  "risk",
  "initiative",
  "indicator",
  "indicatorValue",
  "indicatorForecast",
  "milestone",
  "team",
  "company",
  "user",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// Convex validator for entity type
export const entityTypeValidator = v.union(
  v.literal("objective"),
  v.literal("keyResult"),
  v.literal("risk"),
  v.literal("initiative"),
  v.literal("indicator"),
  v.literal("indicatorValue"),
  v.literal("indicatorForecast"),
  v.literal("milestone"),
  v.literal("team"),
  v.literal("company"),
  v.literal("user")
);

// Regex pattern for external ID validation
// Format: {sourceApp}:{entityType}:{uuid}
// - sourceApp: 2-32 lowercase alphanumeric characters or hyphens
// - entityType: one of the supported entity types
// - uuid: UUID v4 format (36 characters with hyphens)
const EXTERNAL_ID_REGEX =
  /^[a-z0-9-]{2,32}:(objective|keyResult|risk|initiative|indicator|indicatorValue|indicatorForecast|milestone|team|company|user):[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

// Simpler regex for basic validation (allows any UUID-like format)
const EXTERNAL_ID_REGEX_SIMPLE =
  /^[a-z0-9-]{2,32}:(objective|keyResult|risk|initiative|indicator|indicatorValue|indicatorForecast|milestone|team|company|user):[a-f0-9-]{36}$/;

/**
 * Validates an external ID format
 * @param id - The external ID to validate
 * @returns true if the ID is valid, false otherwise
 */
export function validateExternalId(id: string): boolean {
  return EXTERNAL_ID_REGEX_SIMPLE.test(id);
}

/**
 * Validates a source app name format
 * @param sourceApp - The source app name to validate
 * @returns true if valid, false otherwise
 */
export function validateSourceApp(sourceApp: string): boolean {
  return /^[a-z0-9-]{2,32}$/.test(sourceApp);
}

/**
 * Generates a new external ID for the given source app and entity type
 * @param sourceApp - The identifier of the source application (2-32 lowercase alphanumeric or hyphens)
 * @param entityType - The type of entity (objective, keyResult, risk, initiative, indicator, milestone)
 * @returns A new external ID in the format {sourceApp}:{entityType}:{uuid}
 * @throws Error if sourceApp format is invalid
 */
export function generateExternalId(
  sourceApp: string,
  entityType: EntityType
): string {
  if (!validateSourceApp(sourceApp)) {
    throw new Error(
      `Invalid sourceApp format: "${sourceApp}". Must be 2-32 lowercase alphanumeric characters or hyphens.`
    );
  }

  const uuid = crypto.randomUUID();
  return `${sourceApp}:${entityType}:${uuid}`;
}

/**
 * Parsed external ID structure
 */
export interface ParsedExternalId {
  sourceApp: string;
  entityType: EntityType;
  uuid: string;
}

/**
 * Parses an external ID into its components
 * @param id - The external ID to parse
 * @returns The parsed components, or null if the ID is invalid
 */
export function parseExternalId(id: string): ParsedExternalId | null {
  const match = id.match(
    /^([a-z0-9-]{2,32}):(objective|keyResult|risk|initiative|indicator|indicatorValue|indicatorForecast|milestone|team|company|user):([a-f0-9-]{36})$/
  );

  if (!match) return null;

  return {
    sourceApp: match[1],
    entityType: match[2] as EntityType,
    uuid: match[3],
  };
}

/**
 * Extracts the source app from an external ID
 * @param id - The external ID
 * @returns The source app, or null if invalid
 */
export function extractSourceApp(id: string): string | null {
  const parsed = parseExternalId(id);
  return parsed?.sourceApp ?? null;
}

/**
 * Extracts the entity type from an external ID
 * @param id - The external ID
 * @returns The entity type, or null if invalid
 */
export function extractEntityType(id: string): EntityType | null {
  const parsed = parseExternalId(id);
  return parsed?.entityType ?? null;
}

/**
 * Checks if two external IDs belong to the same source app
 * @param id1 - First external ID
 * @param id2 - Second external ID
 * @returns true if both IDs are from the same source app
 */
export function sameSourceApp(id1: string, id2: string): boolean {
  const app1 = extractSourceApp(id1);
  const app2 = extractSourceApp(id2);
  return app1 !== null && app1 === app2;
}

/**
 * Convex validator for external ID (as string with runtime validation)
 * Use this in your mutation/query args
 */
export const externalIdValidator = v.string();

/**
 * Version information for the OKRHub component
 * Used for compatibility checks with LinkHub API
 */
export const OKRHUB_VERSION = "0.1.5";

/**
 * Gets the current component version
 */
export function getVersion(): string {
  return OKRHUB_VERSION;
}
