/**
 * Applying an action and checking whether the page actually moved.
 *
 * The single most expensive failure mode of browser agents is the silent
 * no-op: the model clicks, the click lands on a disabled button, the page is
 * unchanged, and the model proceeds as if the step succeeded. We measure
 * `changed` on every step and let the loop act on it.
 */

import type { Action, ActionResult, Browser, Observation } from "../core/types.ts";

export type Sleep = (ms: number) => Promise<void>;

const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ActOptions {
  readonly sleep?: Sleep;
}

export interface VerifiedActionResult {
  readonly result: ActionResult;
  readonly changed: boolean;
}

/** Cheap structural identity of a page state. */
export function observationSignature(observation: Observation): string {
  return `${observation.url}\u0000${observation.title}\u0000${observation.tree}`;
}

export async function actAndVerify(
  browser: Browser,
  action: Action,
  before: Observation,
  options: ActOptions = {},
): Promise<VerifiedActionResult> {
  const sleep = options.sleep ?? realSleep;

  if (action.kind === "wait") {
    await sleep(action.ms);
    const observation = await browser.observe();
    return {
      result: { ok: true, detail: `waited ${action.ms}ms`, observation },
      changed: observationSignature(observation) !== observationSignature(before),
    };
  }

  const result = await browser.act(action);
  return {
    result,
    changed: observationSignature(result.observation) !== observationSignature(before),
  };
}
