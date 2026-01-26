/**
 * Validation Utilities for OKRHub Component
 *
 * Provides validation helpers for external IDs and slug generation.
 */

import { validateExternalId } from "../externalId.js";

/**
 * Validates external ID format and throws if invalid
 */
export function assertValidExternalId(
  externalId: string,
  fieldName = "externalId"
): void {
  if (!validateExternalId(externalId)) {
    throw new Error(
      `Invalid ${fieldName} format: "${externalId}". ` +
        `Expected format: {sourceApp}:{entityType}:{uuid}`
    );
  }
}

/**
 * Generates a slug from text with sourceApp prefix
 * Pattern: {sourceApp}-{baseSlug}-{suffix}
 */
export function generateSlug(
  sourceApp: string,
  text: string,
  maxLength = 50
): string {
  const baseSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, maxLength - sourceApp.length - 7); // Reserve space for prefix and suffix

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${sourceApp}-${baseSlug}-${suffix}`;
}
