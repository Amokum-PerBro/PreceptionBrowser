/**
 * Benchmark harness.
 *
 * A benchmark that cannot fail is a demo. Every number printed here comes from
 * `Task.verify` inspecting the browser, never from the model's own claim.
 */

import type { Browser, Policy, RunResult, Task } from "../core/types.ts";
import type { Sleep } from "../actions/execute.ts";
import { runTask } from "../core/loop.ts";

export interface SuiteOptions {
  readonly browserFactory: () => Browser;
  readonly policyFactory: (task: Task) => Policy;
  readonly maxSteps?: number;
  readonly sleep?: Sleep;
}

export interface TaskOutcome {
  readonly task: Task;
  readonly result: RunResult;
  readonly passed: boolean;
}

export interface SuiteReport {
  readonly total: number;
  readonly passed: number;
  readonly passRate: number;
  readonly outcomes: readonly TaskOutcome[];
}

export async function runSuite(
  tasks: readonly Task[],
  options: SuiteOptions,
): Promise<SuiteReport> {
  const outcomes: TaskOutcome[] = [];

  for (const task of tasks) {
    const browser = options.browserFactory();
    try {
      const result = await runTask(
        task,
        browser,
        options.policyFactory(task),
        {
          ...(options.maxSteps !== undefined ? { maxSteps: options.maxSteps } : {}),
          ...(options.sleep !== undefined ? { sleep: options.sleep } : {}),
        },
      );
      outcomes.push({ task, result, passed: result.ok });
    } finally {
      await browser.close();
    }
  }

  const passed = outcomes.filter((outcome) => outcome.passed).length;
  return {
    total: outcomes.length,
    passed,
    passRate: outcomes.length === 0 ? 0 : passed / outcomes.length,
    outcomes,
  };
}
