/**
 * A policy that replays a recorded action list.
 *
 * Used for two things: testing the loop without a model, and freezing a known
 * good trace so that a refactor cannot silently break a flow that used to work.
 */

import type { Action, Policy, PolicyInput } from "../core/types.ts";

export function scriptedPolicy(actions: readonly Action[]): Policy {
  let index = 0;
  return {
    async next(_input: PolicyInput): Promise<Action> {
      const action = actions[index];
      index += 1;
      return action ?? { kind: "finish", answer: "(script exhausted without finishing)" };
    },
  };
}

/** Returns the same action forever. Useful for budget and stall tests. */
export function constantPolicy(action: Action): Policy {
  return {
    async next(_input: PolicyInput): Promise<Action> {
      return action;
    },
  };
}
