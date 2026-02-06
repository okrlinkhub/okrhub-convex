/**
 * OKRHub Component - Main Entry Point
 *
 * This file serves as the main barrel export for backward compatibility.
 * All functionality has been refactored into modular files under:
 * - config.ts - Persistent configuration management
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
} from "./entities/objectives.js";

// Key Results
export {
  createKeyResult,
  updateKeyResult,
  getKeyResultsByObjective,
  getAllKeyResults,
} from "./entities/keyResults.js";

// Risks
export {
  createRisk,
  updateRisk,
  getRisksByKeyResult,
  getAllRisks,
} from "./entities/risks.js";

// Initiatives
export {
  createInitiative,
  updateInitiative,
  getAllInitiatives,
} from "./entities/initiatives.js";

// Indicators
export {
  createIndicator,
  updateIndicator,
  getAllIndicators,
} from "./entities/indicators.js";

// Indicator Values
export {
  createIndicatorValue,
  updateIndicatorValue,
  getAllIndicatorValues,
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
} from "./entities/milestones.js";

// ============================================================================
// CONFIG EXPORTS
// ============================================================================

export { configure, getConfig, clearConfig } from "./config.js";

// ============================================================================
// SYNC EXPORTS
// ============================================================================

export {
  addToSyncQueue,
  updateSyncQueueItem,
  getPendingSyncItems,
} from "./sync/queue.js";

export { processSyncQueue } from "./sync/processor.js";

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { IngestResponse, BatchIngestResponse } from "./lib/types.js";
