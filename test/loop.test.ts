import { test } from "node:test";
import assert from "node:assert/strict";

import { FakeShopBrowser, SHOP_ORIGIN } from "../src/browser/fake-shop.ts";
import { runTask } from "../src/core/loop.ts";
import { constantPolicy, scriptedPolicy } from "../src/policy/scripted.ts";
import { addCheapestHeadphones } from "../src/eval/tasks.ts";
import { traceFor } from "../src/eval/traces.ts";
import type { Task } from "../src/core/types.ts";

const noSleep = async (): Promise<void> => {};

const cartPageTask: Task = {
  id: "cart-page",
  goal: "Check out",
  startUrl: `${SHOP_ORIGIN}/cart`,
  verify: () => true,
};

test("a recorded trace completes the task", async () => {
  const result = await runTask(
    addCheapestHeadphones,
    new FakeShopBrowser(),
    scriptedPolicy(traceFor("shop-add-buds")),
    { sleep: noSleep },
  );

  assert.equal(result.stopReason, "finished");
  assert.equal(result.ok, true);
  assert.ok(result.steps.length >= 5, `expected a real trajectory, got ${result.steps.length} steps`);
});

test("the loop stops at the step budget", async () => {
  const result = await runTask(
    addCheapestHeadphones,
    new FakeShopBrowser(),
    constantPolicy({ kind: "extract", question: "anything" }),
    { maxSteps: 3, sleep: noSleep },
  );

  assert.equal(result.stopReason, "budget");
  assert.equal(result.steps.length, 3);
});

test("the loop stops when nothing changes", async () => {
  const result = await runTask(
    cartPageTask,
    new FakeShopBrowser(),
    constantPolicy({ kind: "click", ref: "e1" }),
    { stallLimit: 2, sleep: noSleep },
  );

  assert.equal(result.stopReason, "stalled");
  assert.equal(result.steps.length, 2);
});

test("a failing click is recorded as an unchanged step", async () => {
  const result = await runTask(
    cartPageTask,
    new FakeShopBrowser(),
    scriptedPolicy([
      { kind: "click", ref: "e1" },
      { kind: "finish", answer: "checked out" },
    ]),
    { sleep: noSleep },
  );

  const step = result.steps[0];
  assert.ok(step);
  assert.equal(step.result.ok, false);
  assert.equal(step.changed, false);
});

test("asking the user ends the run without claiming success", async () => {
  const result = await runTask(
    addCheapestHeadphones,
    new FakeShopBrowser(),
    constantPolicy({ kind: "ask_user", question: "which headphones?" }),
    { sleep: noSleep },
  );

  assert.equal(result.stopReason, "asked_user");
  assert.equal(result.ok, false);
  assert.equal(result.answer, "which headphones?");
});

test("the model cannot declare its own success", async () => {
  const task: Task = {
    id: "unverifiable",
    goal: "do something impossible",
    startUrl: `${SHOP_ORIGIN}/`,
    verify: () => false,
  };

  const result = await runTask(
    task,
    new FakeShopBrowser(),
    scriptedPolicy([{ kind: "finish", answer: "All done!" }]),
    { sleep: noSleep },
  );

  assert.equal(result.stopReason, "finished");
  assert.equal(result.answer, "All done!");
  assert.equal(result.ok, false);
});
