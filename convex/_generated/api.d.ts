/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as checkpoint from "../checkpoint.js";
import type * as contacts from "../contacts.js";
import type * as decisions from "../decisions.js";
import type * as inbound from "../inbound.js";
import type * as outbox from "../outbox.js";
import type * as reportData from "../reportData.js";
import type * as reports from "../reports.js";
import type * as reset from "../reset.js";
import type * as roles from "../roles.js";
import type * as scenarioData from "../scenarioData.js";
import type * as sessions from "../sessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  checkpoint: typeof checkpoint;
  contacts: typeof contacts;
  decisions: typeof decisions;
  inbound: typeof inbound;
  outbox: typeof outbox;
  reportData: typeof reportData;
  reports: typeof reports;
  reset: typeof reset;
  roles: typeof roles;
  scenarioData: typeof scenarioData;
  sessions: typeof sessions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
