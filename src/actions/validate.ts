/**
 * Action validation.
 *
 * Models emit JSON that is usually right and occasionally spectacularly wrong:
 * a ref that is a number, a `ms` of "soon", two kinds at once, a `finish` with
 * no answer. Everything is validated here, and every rejection produces a
 * message written for the model to read on its next turn. A throw that only
 * makes sense to a human is a bug.
 */

import type { Action, ActionKind, ScrollDirection } from "../core/types.ts";

export const ACTION_KINDS: readonly ActionKind[] = [
  "click",
  "type",
  "goto",
  "scroll",
  "wait",
  "extract",
  "ask_user",
  "finish",
];

export class InvalidActionError extends Error {
  readonly hint: string;

  constructor(message: string, hint = "") {
    super(hint ? `${message} ${hint}` : message);
    this.name = "InvalidActionError";
    this.hint = hint;
  }
}

function fail(message: string, hint = ""): never {
  throw new InvalidActionError(message, hint);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectExtras(
  source: Record<string, unknown>,
  allowed: readonly string[],
  kind: string,
): void {
  const extras = Object.keys(source).filter((key) => !allowed.includes(key));
  if (extras.length > 0) {
    fail(
      `Unexpected field(s) ${extras.map((key) => `"${key}"`).join(", ")} on a "${kind}" action.`,
      `Allowed fields: ${allowed.map((key) => `"${key}"`).join(", ")}.`,
    );
  }
}

function readString(
  source: Record<string, unknown>,
  key: string,
  kind: string,
  options: { max?: number; allowEmpty?: boolean } = {},
): string {
  const value = source[key];
  if (typeof value !== "string") {
    fail(
      `Field "${key}" on a "${kind}" action must be a string, got ${describeType(value)}.`,
    );
  }
  const trimmed = options.allowEmpty === true ? value : value.trim();
  if (trimmed.length === 0 && options.allowEmpty !== true) {
    fail(`Field "${key}" on a "${kind}" action must not be empty.`);
  }
  if (options.max !== undefined && trimmed.length > options.max) {
    fail(
      `Field "${key}" on a "${kind}" action is ${trimmed.length} characters; the limit is ${options.max}.`,
      "Split the task into smaller steps.",
    );
  }
  return trimmed;
}

function readOptionalString(
  source: Record<string, unknown>,
  key: string,
  kind: string,
  max: number,
): string | undefined {
  if (source[key] === undefined) return undefined;
  return readString(source, key, kind, { max });
}

function readInt(
  source: Record<string, unknown>,
  key: string,
  kind: string,
  min: number,
  max: number,
): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(
      `Field "${key}" on a "${kind}" action must be an integer, got ${describeType(value)}.`,
    );
  }
  if (value < min || value > max) {
    fail(`Field "${key}" on a "${kind}" action must be between ${min} and ${max}, got ${value}.`);
  }
  return value;
}

function describeType(value: unknown): string {
  if (value === undefined) return "nothing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return typeof value;
}

function readHttpUrl(source: Record<string, unknown>, key: string, kind: string): string {
  const raw = readString(source, key, kind, { max: 2048 });
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    fail(`Field "${key}" is not a valid absolute URL: ${JSON.stringify(raw)}.`, 'Include the scheme, e.g. "https://example.com".');
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    fail(`Field "${key}" must use http or https, got "${parsed.protocol}".`);
  }
  return parsed.toString();
}

function readRef(source: Record<string, unknown>, kind: string): string {
  const ref = readString(source, "ref", kind, { max: 64 });
  if (!/^[A-Za-z0-9_.:-]+$/.test(ref)) {
    fail(
      `Field "ref" on a "${kind}" action must be an element ref such as "e12", got ${JSON.stringify(ref)}.`,
      "Refs come from the observation only; never invent one.",
    );
  }
  return ref;
}

function readDirection(source: Record<string, unknown>, kind: string): ScrollDirection {
  const direction = source["direction"];
  if (direction !== "up" && direction !== "down") {
    fail(`Field "direction" on a "${kind}" action must be "up" or "down", got ${describeType(direction)}.`);
  }
  return direction;
}

/**
 * Parse one model output into a valid Action, or throw an InvalidActionError
 * whose message is safe to paste back into the conversation.
 */
export function parseAction(raw: unknown): Action {
  let candidate: unknown = raw;

  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw);
    } catch {
      fail(
        "The action was not valid JSON.",
        'Reply with a single JSON object such as {"kind":"click","ref":"e1"}.',
      );
    }
  }

  if (!isRecord(candidate)) {
    fail(`An action must be a JSON object, got ${describeType(candidate)}.`);
  }

  const kind = candidate["kind"];
  if (typeof kind !== "string" || !ACTION_KINDS.includes(kind as ActionKind)) {
    fail(
      `Field "kind" must be one of ${ACTION_KINDS.map((k) => `"${k}"`).join(", ")}, got ${typeof kind === "string" ? `"${kind}"` : describeType(kind)}.`,
    );
  }

  const actionKind = kind as ActionKind;

  switch (actionKind) {
    case "click": {
      rejectExtras(candidate, ["kind", "ref", "expect"], kind);
      const expect = readOptionalString(candidate, "expect", kind, 500);
      return { kind: actionKind, ref: readRef(candidate, kind), ...(expect !== undefined ? { expect } : {}) };
    }

    case "type": {
      rejectExtras(candidate, ["kind", "ref", "text", "submit", "expect"], kind);
      const text = readString(candidate, "text", kind, { max: 4000, allowEmpty: true });
      const expect = readOptionalString(candidate, "expect", kind, 500);
      const submit = candidate["submit"];
      if (submit !== undefined && typeof submit !== "boolean") {
        fail(`Field "submit" on a "type" action must be a boolean, got ${describeType(submit)}.`);
      }
      return {
        kind: actionKind,
        ref: readRef(candidate, kind),
        text,
        ...(submit !== undefined ? { submit } : {}),
        ...(expect !== undefined ? { expect } : {}),
      };
    }

    case "goto": {
      rejectExtras(candidate, ["kind", "url"], kind);
      return { kind: actionKind, url: readHttpUrl(candidate, "url", kind) };
    }

    case "scroll": {
      rejectExtras(candidate, ["kind", "direction", "amount"], kind);
      const amount = candidate["amount"] === undefined ? undefined : readInt(candidate, "amount", kind, 1, 10);
      return {
        kind: actionKind,
        direction: readDirection(candidate, kind),
        ...(amount !== undefined ? { amount } : {}),
      };
    }

    case "wait": {
      rejectExtras(candidate, ["kind", "ms"], kind);
      return { kind: actionKind, ms: readInt(candidate, "ms", kind, 0, 30_000) };
    }

    case "extract": {
      rejectExtras(candidate, ["kind", "question", "ref"], kind);
      const ref = candidate["ref"] === undefined ? undefined : readRef(candidate, kind);
      return {
        kind: actionKind,
        question: readString(candidate, "question", kind, { max: 1000 }),
        ...(ref !== undefined ? { ref } : {}),
      };
    }

    case "ask_user": {
      rejectExtras(candidate, ["kind", "question", "options"], kind);
      const options = candidate["options"];
      if (options !== undefined) {
        if (!Array.isArray(options) || options.some((option) => typeof option !== "string")) {
          fail('Field "options" on an "ask_user" action must be an array of strings.');
        }
      }
      return {
        kind: actionKind,
        question: readString(candidate, "question", kind, { max: 1000 }),
        ...(options !== undefined ? { options: options as string[] } : {}),
      };
    }

    case "finish": {
      rejectExtras(candidate, ["kind", "answer"], kind);
      return { kind: actionKind, answer: readString(candidate, "answer", kind, { max: 8000, allowEmpty: true }) };
    }
  }
}

/** One-line human-readable rendering, for logs and for the model's own history. */
export function describeAction(action: Action): string {
  switch (action.kind) {
    case "click":
      return `click ${action.ref}${action.expect ? ` (expect: ${action.expect})` : ""}`;
    case "type":
      return `type ${JSON.stringify(action.text)} into ${action.ref}`;
    case "goto":
      return `goto ${action.url}`;
    case "scroll":
      return `scroll ${action.direction} ${action.amount ?? 3}`;
    case "wait":
      return `wait ${action.ms}ms`;
    case "extract":
      return `extract ${JSON.stringify(action.question)}`;
    case "ask_user":
      return `ask_user ${JSON.stringify(action.question)}`;
    case "finish":
      return "finish";
  }
}

/** Actions that can legitimately leave the page unchanged. */
export function isReadOnly(action: Action): boolean {
  return action.kind === "extract" || action.kind === "wait";
}
