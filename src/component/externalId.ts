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
 * Normalizes a text fragment for deterministic externalId generation.
 * Keeps IDs stable across casing and spacing variations.
 */
function normalizePart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Creates a deterministic UUID-like value from a normalized seed.
 * Output keeps UUID v4 shape to stay backward-compatible with validators.
 */
function deterministicUuidFromSeed(seed: string): string {
  // FNV-1a 32-bit hash for deterministic, runtime-safe hashing.
  const fnv1a = (input: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  };

  const h1 = fnv1a(`${seed}|1`).toString(16).padStart(8, "0");
  const h2 = fnv1a(`${seed}|2`).toString(16).padStart(8, "0");
  const h3 = fnv1a(`${seed}|3`).toString(16).padStart(8, "0");
  const h4 = fnv1a(`${seed}|4`).toString(16).padStart(8, "0");
  const raw = `${h1}${h2}${h3}${h4}`;

  const part1 = raw.slice(0, 8);
  const part2 = raw.slice(8, 12);
  const part3 = `4${raw.slice(13, 16)}`; // UUID v4 marker
  const variantNibble = ((parseInt(raw.slice(16, 17), 16) & 0x3) | 0x8)
    .toString(16);
  const part4 = `${variantNibble}${raw.slice(17, 20)}`; // UUID variant 10xx
  const part5 = raw.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

/**
 * Builds a deterministic external ID from canonical parts.
 */
export function generateDeterministicExternalId(
  sourceApp: string,
  entityType: EntityType,
  parts: string[]
): string {
  if (!validateSourceApp(sourceApp)) {
    throw new Error(
      `Invalid sourceApp format: "${sourceApp}". Must be 2-32 lowercase alphanumeric characters or hyphens.`
    );
  }

  const normalizedParts = parts.map(normalizePart);
  const seed = `${sourceApp}|${entityType}|${normalizedParts.join("|")}`;
  const uuid = deterministicUuidFromSeed(seed);
  return `${sourceApp}:${entityType}:${uuid}`;
}

/**
 * Deterministic ID for entities using scope + description.
 */
export function generateScopedDescriptionExternalId(
  sourceApp: string,
  entityType:
    | "objective"
    | "risk"
    | "initiative"
    | "indicator"
    | "milestone",
  scopeId: string,
  description: string
): string {
  return generateDeterministicExternalId(sourceApp, entityType, [
    scopeId,
    description,
  ]);
}

/**
 * Deterministic ID for key results:
 * teamExternalId + objectiveExternalId + indicatorExternalId.
 */
export function generateKeyResultDeterministicExternalId(
  sourceApp: string,
  teamExternalId: string,
  objectiveExternalId: string,
  indicatorExternalId: string
): string {
  return generateDeterministicExternalId(sourceApp, "keyResult", [
    teamExternalId,
    objectiveExternalId,
    indicatorExternalId,
  ]);
}

/**
 * Deterministic ID for indicator values/forecasts:
 * indicatorExternalId + date.
 */
export function generateIndicatorTimeSeriesExternalId(
  sourceApp: string,
  entityType: "indicatorValue" | "indicatorForecast",
  indicatorExternalId: string,
  date: number
): string {
  return generateDeterministicExternalId(sourceApp, entityType, [
    indicatorExternalId,
    String(date),
  ]);
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
