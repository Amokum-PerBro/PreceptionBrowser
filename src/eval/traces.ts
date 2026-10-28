/**
 * Recorded traces.
 *
 * These are not model output and must never be reported as a model score. They
 * are the "known good" baseline: if the loop, the snapshot parser or the action
 * validation changes shape, these traces stop working and CI goes red.
 */

import type { Action } from "../core/types.ts";
import { SHOP_ORIGIN } from "../browser/fake-shop.ts";

export const recordedTraces: Readonly<Record<string, readonly Action[]>> = {
  "shop-add-buds": [
    { kind: "type", ref: "e1", text: "headphones" },
    { kind: "click", ref: "e2" },
    { kind: "click", ref: "e1" },
    { kind: "click", ref: "e1" },
    { kind: "goto", url: `${SHOP_ORIGIN}/cart` },
    { kind: "extract", question: "what is in the cart, and what is the total?" },
    { kind: "finish", answer: "Added Perception Buds at €39 to the cart; total €39." },
  ],
  "shop-add-air": [
    { kind: "type", ref: "e1", text: "headphones" },
    { kind: "click", ref: "e2" },
    { kind: "click", ref: "e2" },
    { kind: "click", ref: "e1" },
    { kind: "goto", url: `${SHOP_ORIGIN}/cart` },
    { kind: "extract", question: "what is in the cart, and what is the total?" },
    { kind: "finish", answer: "Added Perception Air at €59 to the cart." },
  ],
};

export function traceFor(taskId: string): readonly Action[] {
  return recordedTraces[taskId] ?? [{ kind: "finish", answer: `no recorded trace for ${taskId}` }];
}
