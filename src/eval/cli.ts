/**
 * `npm run eval`
 *
 * Runs the starter benchmark against recorded traces and prints a pass rate.
 * Exits non-zero when anything fails, so CI can gate on it.
 */

import { FakeShopBrowser } from "../browser/fake-shop.ts";
import { scriptedPolicy } from "../policy/scripted.ts";
import { runSuite } from "./harness.ts";
import { starterTasks } from "./tasks.ts";
import { traceFor } from "./traces.ts";

const report = await runSuite(starterTasks, {
  browserFactory: () => new FakeShopBrowser(),
  policyFactory: (task) => scriptedPolicy(traceFor(task.id)),
  sleep: async () => {},
});

for (const outcome of report.outcomes) {
  const status = outcome.passed ? "PASS" : "FAIL";
  const steps = outcome.result.steps.length;
  const reason = outcome.result.stopReason;
  console.log(`${status}  ${outcome.task.id.padEnd(20)} ${steps} steps  (${reason})`);
  if (!outcome.passed && outcome.result.detail !== undefined) {
    console.log(`      ${outcome.result.detail}`);
  }
}

const percent = (report.passRate * 100).toFixed(1);
console.log(`\n${report.passed}/${report.total} tasks passed (${percent}%)`);
console.log("policy: recorded traces (baseline, not a model score)");

process.exitCode = report.passed === report.total ? 0 : 1;
