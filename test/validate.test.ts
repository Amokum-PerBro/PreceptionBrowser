import { test } from "node:test";
import assert from "node:assert/strict";

import { InvalidActionError, parseAction } from "../src/actions/validate.ts";

function rejects(raw: unknown, fragment: string): void {
  assert.throws(
    () => parseAction(raw),
    (error: unknown) => {
      assert.ok(error instanceof InvalidActionError, "expected InvalidActionError");
      assert.ok(
        error.message.toLowerCase().includes(fragment.toLowerCase()),
        `expected message to mention ${JSON.stringify(fragment)}, got: ${error.message}`,
      );
      return true;
    },
  );
}

test("accepts a well-formed click", () => {
  assert.deepEqual(parseAction({ kind: "click", ref: "e1" }), { kind: "click", ref: "e1" });
});

test("accepts actions serialized as JSON text", () => {
  assert.deepEqual(parseAction('{"kind":"goto","url":"https://example.test/a"}'), {
    kind: "goto",
    url: "https://example.test/a",
  });
});

test("rejects an unknown kind", () => {
  rejects({ kind: "teleport", ref: "e1" }, "kind");
});

test("rejects a missing ref", () => {
  rejects({ kind: "click" }, "ref");
});

test("rejects an invented ref", () => {
  rejects({ kind: "click", ref: "#submit-button" }, "element ref");
});

test("rejects extra fields instead of ignoring them", () => {
  rejects({ kind: "click", ref: "e1", text: "oops" }, "unexpected field");
});

test("rejects non-http urls", () => {
  rejects({ kind: "goto", url: "javascript:alert(1)" }, "http");
});

test("rejects a fractional wait", () => {
  rejects({ kind: "wait", ms: 1.5 }, "integer");
});

test("rejects malformed json with a usable message", () => {
  rejects("{kind: click}", "json");
});

test("keeps optional fields only when present", () => {
  const action = parseAction({ kind: "type", ref: "e1", text: "" });
  assert.deepEqual(action, { kind: "type", ref: "e1", text: "" });
  assert.equal("submit" in action, false);
});
