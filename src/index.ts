/**
 * PerceptionBrowser — public API.
 *
 * Everything importable from the package lives here. `Browser` is the only
 * interface an adapter has to implement; `Policy` is the only interface a
 * model backend has to implement.
 */

export type {
  Action,
  ActionKind,
  ActionResult,
  Browser,
  Element,
  Observation,
  Policy,
  PolicyInput,
  RunResult,
  ScrollDirection,
  Step,
  StopReason,
  Task,
} from "./core/types.ts";

export { runTask } from "./core/loop.ts";
export type { RunOptions } from "./core/loop.ts";
export { parseAction, describeAction, InvalidActionError, ACTION_KINDS } from "./actions/validate.ts";
export { actAndVerify, observationSignature } from "./actions/execute.ts";
export { parseSnapshot, toObservation, findElement, INTERACTIVE_ROLES } from "./observe/snapshot.ts";
export { FakeShopBrowser, PRODUCTS, SHOP_ORIGIN } from "./browser/fake-shop.ts";
export { scriptedPolicy, constantPolicy } from "./policy/scripted.ts";
export { runSuite } from "./eval/harness.ts";
export type { SuiteOptions, SuiteReport, TaskOutcome } from "./eval/harness.ts";
export { starterTasks } from "./eval/tasks.ts";
export { recordedTraces } from "./eval/traces.ts";
