/**
 * OKRHub Component - Main Entry Point
 *
 * This file serves as the main barrel export for backward compatibility.
 * All functionality has been refactored into modular files under:
 * - entities/ - Entity-specific CRUD operations and queries
 * - sync/ - Sync queue management and HTTP actions
 * - lib/ - Shared utilities (HMAC, validation, types)
 *
 * Import patterns:
 * - For specific entities: import { createObjective } from "./entities/objectives.js"
 * - For sync operations: import { processSyncQueue } from "./sync/processor.js"
 * - For utilities: import { createHmacSignature } from "./lib/hmac.js"
 *
 * Or use this file for backward-compatible imports:
 * - import { createObjective, processSyncQueue } from "./okrhub.js"
 */

// ============================================================================
// ENTITY EXPORTS
// ============================================================================

// Objectives
export {
  createObjective,
  updateObjective,
  getObjectivesByTeam,
  getAllObjectives,
  insertObjective,
} from "./entities/objectives.js";

// Key Results
export {
  createKeyResult,
  updateKeyResult,
  getKeyResultsByObjective,
  getAllKeyResults,
  insertKeyResult,
} from "./entities/keyResults.js";

// Risks
export {
  createRisk,
  updateRisk,
  getRisksByKeyResult,
  getAllRisks,
  insertRisk,
} from "./entities/risks.js";

// Initiatives
export {
  createInitiative,
  updateInitiative,
  getAllInitiatives,
  insertInitiative,
} from "./entities/initiatives.js";

// Indicators
export {
  createIndicator,
  updateIndicator,
  getAllIndicators,
  insertIndicator,
} from "./entities/indicators.js";

// Indicator Values
export {
  createIndicatorValue,
  updateIndicatorValue,
  getAllIndicatorValues,
  insertIndicatorValue,
} from "./entities/indicatorValues.js";

// Indicator Forecasts
export {
  createIndicatorForecast,
  updateIndicatorForecast,
  getAllIndicatorForecasts,
} from "./entities/indicatorForecasts.js";

// Milestones
export {
  createMilestone,
  updateMilestone,
  getAllMilestones,
  insertMilestone,
} from "./entities/milestones.js";

// Batch
export { insertBatch } from "./entities/batch.js";

// ============================================================================
// SYNC EXPORTS
// ============================================================================

export {
  addToSyncQueue,
  updateSyncQueueItem,
  getPendingSyncItems,
} from "./sync/queue.js";

export { sendToLinkHub, sendBatchToLinkHub } from "./sync/http.js";

export { processSyncQueue } from "./sync/processor.js";

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { IngestResponse, BatchIngestResponse } from "./lib/types.js";
