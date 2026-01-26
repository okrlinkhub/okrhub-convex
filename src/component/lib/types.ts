/**
 * Shared Types for OKRHub Component
 *
 * Response types and shared interfaces used across the component.
 */

/**
 * Response from LinkHub's single entity ingest endpoint
 */
export interface IngestResponse {
  success: boolean;
  externalId: string;
  linkHubId?: string;
  action: "create" | "update";
  error?: string;
}

/**
 * Response from LinkHub's batch ingest endpoint
 */
export interface BatchIngestResponse {
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
