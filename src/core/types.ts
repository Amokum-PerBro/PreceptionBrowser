/**
 * The stable contract of PerceptionBrowser.
 *
 * Everything the agent knows about the web passes through five types:
 * Observation -> Action -> ActionResult -> Step -> RunResult.
 *
 * Keeping this surface tiny is deliberate: a browser adapter, a model policy,
 * and a benchmark can all be written against it without touching each other.
 */

export type ScrollDirection = "up" | "down";

/**
 * One thing the page lets you do, identified by a ref that is stable for the
 * duration of a single observation. Refs are not URLs and not selectors: they
 * are ephemeral handles that die as soon as the page changes.
 */
export interface Element {
  readonly ref: string;
  readonly role: string;
  readonly name: string;
  readonly value?: string;
  readonly disabled: boolean;
}

/** A single look at the page: what it says, and what can be touched. */
export interface Observation {
  readonly url: string;
  readonly title: string;
  /** Normalized accessibility tree, one node per line. This is what the model reads. */
  readonly tree: string;
  /** Flattened, addressable subset of `tree`: the elements an action may target. */
  readonly elements: readonly Element[];
}

/**
 * The action space is intentionally small and typed. Any capability the agent
 * needs must be expressible as one of these; anything that is not, is a
 * feature request against this file, not a prompt.
 */
export type Action =
  | { kind: "click"; ref: string; expect?: string }
  | { kind: "type"; ref: string; text: string; submit?: boolean; expect?: string }
  | { kind: "goto"; url: string }
  | { kind: "scroll"; direction: ScrollDirection; amount?: number }
  | { kind: "wait"; ms: number }
  | { kind: "extract"; question: string; ref?: string }
  | { kind: "ask_user"; question: string; options?: readonly string[] }
  | { kind: "finish"; answer: string };

export type ActionKind = Action["kind"];

/** What happened when an action was applied. `ok` means "applied without error", never "succeeded at the goal". */
export interface ActionResult {
  readonly ok: boolean;
  readonly detail: string;
  readonly observation: Observation;
}

/** An action plus its outcome, as recorded for the model and for the benchmark. */
export interface Step {
  readonly index: number;
  readonly action: Action;
  /** Did the page observably change? A click that changes nothing is the most common silent failure. */
  readonly changed: boolean;
  readonly result: ActionResult;
}

export interface PolicyInput {
  readonly goal: string;
  readonly observation: Observation;
  readonly history: readonly Step[];
  /** Steps left before the run is cut off. */
  readonly remaining: number;
}

/** A decider. The LLM policy, a recording, or a test double all implement this. */
export interface Policy {
  next(input: PolicyInput): Promise<Action>;
}

/** A browser under test. Implemented by Playwright (milestone 2) and by the offline fixture. */
export interface Browser {
  open(url: string): Promise<Observation>;
  observe(): Promise<Observation>;
  act(action: Action): Promise<ActionResult>;
  close(): Promise<void>;
}

export type StopReason =
  | "finished"
  | "asked_user"
  | "stalled"
  | "budget"
  | "error";

export interface RunResult {
  readonly taskId: string;
  readonly ok: boolean;
  readonly steps: readonly Step[];
  readonly stopReason: StopReason;
  readonly answer?: string;
  /** Set when the run ended in `error` or `stalled`. */
  readonly detail?: string;
}

export interface Task {
  readonly id: string;
  readonly goal: string;
  readonly startUrl: string;
  /**
   * Ground truth, evaluated against the browser itself rather than the model's
   * answer. The agent cannot vote for its own success.
   */
  verify(result: RunResult, browser: Browser): boolean;
}
