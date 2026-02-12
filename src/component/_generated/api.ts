/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as config from "../config.js";
import type * as entities_batch from "../entities/batch.js";
import type * as entities_index from "../entities/index.js";
import type * as entities_indicatorForecasts from "../entities/indicatorForecasts.js";
import type * as entities_indicatorValues from "../entities/indicatorValues.js";
import type * as entities_indicators from "../entities/indicators.js";
import type * as entities_initiatives from "../entities/initiatives.js";
import type * as entities_keyResults from "../entities/keyResults.js";
import type * as entities_milestones from "../entities/milestones.js";
import type * as entities_objectives from "../entities/objectives.js";
import type * as entities_risks from "../entities/risks.js";
import type * as externalId from "../externalId.js";
import type * as lib_hmac from "../lib/hmac.js";
import type * as lib_index from "../lib/index.js";
import type * as lib_payloadPolicy from "../lib/payloadPolicy.js";
import type * as lib_types from "../lib/types.js";
import type * as lib_validation from "../lib/validation.js";
import type * as okrhub from "../okrhub.js";
import type * as sync_http from "../sync/http.js";
import type * as sync_index from "../sync/index.js";
import type * as sync_processor from "../sync/processor.js";
import type * as sync_queue from "../sync/queue.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  config: typeof config;
  "entities/batch": typeof entities_batch;
  "entities/index": typeof entities_index;
  "entities/indicatorForecasts": typeof entities_indicatorForecasts;
  "entities/indicatorValues": typeof entities_indicatorValues;
  "entities/indicators": typeof entities_indicators;
  "entities/initiatives": typeof entities_initiatives;
  "entities/keyResults": typeof entities_keyResults;
  "entities/milestones": typeof entities_milestones;
  "entities/objectives": typeof entities_objectives;
  "entities/risks": typeof entities_risks;
  externalId: typeof externalId;
  "lib/hmac": typeof lib_hmac;
  "lib/index": typeof lib_index;
  "lib/payloadPolicy": typeof lib_payloadPolicy;
  "lib/types": typeof lib_types;
  "lib/validation": typeof lib_validation;
  okrhub: typeof okrhub;
  "sync/http": typeof sync_http;
  "sync/index": typeof sync_index;
  "sync/processor": typeof sync_processor;
  "sync/queue": typeof sync_queue;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
