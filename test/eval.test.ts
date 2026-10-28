import { test } from "node:test";
import assert from "node:assert/strict";

import { FakeShopBrowser } from "../src/browser/fake-shop.ts";
import { runSuite } from "../src/eval/harness.ts";
import { scriptedPolicy } from "../src/policy/scripted.ts";
import { starterTasks } from "../src/eval/tasks.ts";
import { traceFor } from "../src/eval/traces.ts";

const noSleep = async (): Promise<void> => {};

test("the starter benchmark passes end to end", async () => {
  const report = await runSuite(starterTasks, {
    browserFactory: () => new FakeShopBrowser(),
    policyFactory: (task) => scriptedPolicy(traceFor(task.id)),
    sleep: noSleep,
  });

  assert.equal(report.total, 2);
  assert.equal(report.passed, 2);
  assert.equal(report.passRate, 1);
});

test("an empty suite reports zero rather than NaN", async () => {
  const report = await runSuite([], {
    browserFactory: () => new FakeShopBrowser(),
    policyFactory: () => scriptedPolicy([]),
    sleep: noSleep,
  });

  assert.equal(report.total, 0);
  assert.equal(report.passRate, 0);
});
