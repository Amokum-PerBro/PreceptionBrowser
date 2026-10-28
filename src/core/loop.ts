/**
 * The loop.
 *
 *   observe -> decide -> act -> verify -> repeat
 *
 * Three properties matter more than the code below:
 *   1. The loop, not the model, decides when a run is over.
 *   2. The loop, not the model, decides whether the task succeeded.
 *   3. A run that stops making observable progress is stopped by the loop.
 */

import type { Action, Browser, Policy, RunResult, Step, Task } from "./types.ts";
import { actAndVerify, type VerifiedActionResult } from "../actions/execute.ts";
import type { Sleep } from "../actions/execute.ts";
import { isReadOnly } from "../actions/validate.ts";

export interface RunOptions {
  readonly maxSteps?: number;
  /** Consecutive steps without an observable change that we tolerate. */
  readonly stallLimit?: number;
  readonly sleep?: Sleep;
}

const DEFAULT_MAX_STEPS = 20;
const DEFAULT_STALL_LIMIT = 4;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runTask(
  task: Task,
  browser: Browser,
  policy: Policy,
  options: RunOptions = {},
): Promise<RunResult> {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const stallLimit = options.stallLimit ?? DEFAULT_STALL_LIMIT;
  const steps: Step[] = [];

  let observation;
  try {
    observation = await browser.open(task.startUrl);
  } catch (error) {
    return {
      taskId: task.id,
      ok: false,
      steps,
      stopReason: "error",
      detail: `could not open ${task.startUrl}: ${describeError(error)}`,
    };
  }

  let stalled = 0;

  for (let index = 0; index < maxSteps; index += 1) {
    let action: Action;
    try {
      action = await policy.next({
        goal: task.goal,
        observation,
        history: steps,
        remaining: maxSteps - index,
      });
    } catch (error) {
      return {
        taskId: task.id,
        ok: false,
        steps,
        stopReason: "error",
        detail: `policy failed at step ${index + 1}: ${describeError(error)}`,
      };
    }

    if (action.kind === "finish") {
      const provisional: RunResult = {
        taskId: task.id,
        ok: false,
        steps,
        stopReason: "finished",
        answer: action.answer,
      };
      return { ...provisional, ok: task.verify(provisional, browser) };
    }

    if (action.kind === "ask_user") {
      return {
        taskId: task.id,
        ok: false,
        steps,
        stopReason: "asked_user",
        answer: action.question,
      };
    }

    let verified: VerifiedActionResult;
    try {
      verified = await actAndVerify(
        browser,
        action,
        observation,
        options.sleep !== undefined ? { sleep: options.sleep } : {},
      );
    } catch (error) {
      return {
        taskId: task.id,
        ok: false,
        steps,
        stopReason: "error",
        detail: `action ${index + 1} crashed: ${describeError(error)}`,
      };
    }

    steps.push({
      index,
      action,
      changed: verified.changed,
      result: verified.result,
    });
    observation = verified.result.observation;

    if (!verified.result.ok) {
      stalled += 1;
    } else if (verified.changed || isReadOnly(action)) {
      stalled = 0;
    } else {
      stalled += 1;
    }

    if (stalled >= stallLimit) {
      return {
        taskId: task.id,
        ok: false,
        steps,
        stopReason: "stalled",
        detail: `${stallLimit} steps in a row produced no visible change; stopping instead of looping`,
      };
    }
  }

  return {
    taskId: task.id,
    ok: false,
    steps,
    stopReason: "budget",
    detail: `step budget of ${maxSteps} exhausted`,
  };
}
