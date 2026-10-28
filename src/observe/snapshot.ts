/**
 * Snapshot parsing.
 *
 * Adapters hand the agent a normalized accessibility tree in this shape:
 *
 *   - heading "Your cart" [level=1]
 *   - textbox "Search products" [value="buds"] [ref=e1]
 *   - button "Add to cart" [ref=e2]
 *
 * The format is close to Playwright's `ariaSnapshot()` so that a real browser
 * adapter only has to inject `[ref=...]` markers into that output. Parsing is
 * permissive: unknown attribute groups, indentation, and `role: text` nodes are
 * tolerated, because a parser that throws on a stray line is a parser that
 * fails in production and never in tests.
 */

import type { Element, Observation } from "../core/types.ts";

/** Roles a person can plausibly act on. Adapters use this to decide what gets a ref. */
export const INTERACTIVE_ROLES: ReadonlySet<string> = new Set([
  "button",
  "checkbox",
  "combobox",
  "link",
  "listbox",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
  "treeitem",
]);

export interface ParsedSnapshot {
  readonly tree: string;
  readonly elements: readonly Element[];
}

const LINE = /^\s*[-*]\s+(.*)$/;
const NODE = /^([A-Za-z][\w-]*)(?:\s+"((?:[^"\\]|\\.)*)")?(.*)$/;
const ATTR = /^\s*\[([^\]]*)\]/;

function unescapeQuoted(value: string): string {
  return value.replace(/\\(["\\])/g, "$1");
}

interface NodeParts {
  role: string;
  name: string;
  attrs: string[];
  raw: string;
}

function splitNode(body: string): NodeParts | undefined {
  const text = body.trim();
  if (!text) return undefined;

  // `- text: some copy` / `- /placeholder: Search` / `- list:`
  if (!text.includes('"')) {
    const colon = text.indexOf(":");
    if (colon > 0) {
      return {
        role: text.slice(0, colon).replace(/^\//, "").trim(),
        name: text.slice(colon + 1).trim(),
        attrs: [],
        raw: text,
      };
    }
  }

  const match = NODE.exec(text);
  if (!match) return undefined;

  const role = match[1] ?? "";
  const name = unescapeQuoted(match[2] ?? "");

  const attrs: string[] = [];
  let rest = match[3] ?? "";
  for (;;) {
    const attr = ATTR.exec(rest);
    if (!attr) break;
    attrs.push(attr[1] ?? "");
    rest = rest.slice(attr[0].length);
  }

  return { role, name, attrs, raw: text };
}

function readRef(attrs: readonly string[]): string | undefined {
  for (const attr of attrs) {
    const match = /(?:^|\s)ref=(?:"([^"]+)"|([^\s]+))/.exec(attr);
    if (match) return match[1] ?? match[2];
  }
  return undefined;
}

function readValue(attrs: readonly string[]): string | undefined {
  for (const attr of attrs) {
    const match = /(?:^|\s)value="((?:[^"\\]|\\.)*)"/.exec(attr);
    if (match) return unescapeQuoted(match[1] ?? "");
    if (/(?:^|\s)value=([^\s]+)/.test(attr)) {
      return /(?:^|\s)value=([^\s]+)/.exec(attr)?.[1];
    }
  }
  return undefined;
}

function isDisabled(attrs: readonly string[]): boolean {
  return attrs.some((attr) => /(?:^|\s)(?:disabled|aria-disabled="?true"?)(?:\s|$)/.test(attr));
}

export function parseSnapshot(raw: string): ParsedSnapshot {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  const elements: Element[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    kept.push(line.replace(/\s+$/, ""));

    const match = LINE.exec(line);
    if (!match) continue;

    const node = splitNode(match[1] ?? "");
    if (!node) continue;

    const ref = readRef(node.attrs);
    if (!ref) continue;

    const value = readValue(node.attrs);
    elements.push({
      ref,
      role: node.role,
      name: node.name,
      disabled: isDisabled(node.attrs),
      ...(value !== undefined ? { value } : {}),
    });
  }

  return { tree: kept.join("\n"), elements };
}

export function toObservation(
  url: string,
  title: string,
  tree: string,
): Observation {
  const parsed = parseSnapshot(tree);
  return { url, title, tree: parsed.tree, elements: parsed.elements };
}

/** Look up an element by ref within an observation. */
export function findElement(
  observation: Observation,
  ref: string,
): Element | undefined {
  return observation.elements.find((element) => element.ref === ref);
}
