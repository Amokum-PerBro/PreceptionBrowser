import { test } from "node:test";
import assert from "node:assert/strict";

import { findElement, parseSnapshot, toObservation } from "../src/observe/snapshot.ts";

const SAMPLE = [
  '- heading "Your cart" [level=1]',
  '- textbox "Search products" [value="buds"] [ref=e1]',
  '- button "Checkout" [ref=e2] [disabled]',
  '- status "Perception Buds added to cart"',
  '  - listitem',
  '    - link "Perception Buds — €39" [ref=e3]',
].join("\n");

test("extracts only addressable elements", () => {
  const { elements, tree } = parseSnapshot(SAMPLE);
  assert.deepEqual(
    elements.map((element) => element.ref),
    ["e1", "e2", "e3"],
  );
  assert.equal(tree.split("\n").length, 6);
});

test("reads values, names and disabled state", () => {
  const observation = toObservation("https://example.test/", "Cart", SAMPLE);

  const box = findElement(observation, "e1");
  assert.ok(box);
  assert.equal(box.role, "textbox");
  assert.equal(box.value, "buds");
  assert.equal(box.disabled, false);

  const checkout = findElement(observation, "e2");
  assert.ok(checkout);
  assert.equal(checkout.disabled, true);

  const link = findElement(observation, "e3");
  assert.equal(link?.name, "Perception Buds — €39");
});

test("tolerates junk without throwing", () => {
  const messy = ["", "not a snapshot line", "- ", "- paragraph", "- : broken", SAMPLE].join("\n");
  const { elements } = parseSnapshot(messy);
  assert.deepEqual(
    elements.map((element) => element.ref),
    ["e1", "e2", "e3"],
  );
  assert.deepEqual(parseSnapshot("").elements, []);
});

test("missing refs mean no element", () => {
  const { elements } = parseSnapshot(['- heading "Hi"', '- button "Go"'].join("\n"));
  assert.deepEqual(elements, []);
});
