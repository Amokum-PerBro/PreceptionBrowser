/**
 * A deterministic, offline storefront.
 *
 * It exists so that the agent loop, the action contract, and the evaluation
 * harness can be tested with zero network access, zero credentials, and zero
 * model calls. If the loop cannot drive this, it cannot drive a real site.
 *
 * The fixture is a browser, not a mock of the loop: it exposes the same
 * `Browser` interface a Playwright adapter will implement, and it renders real
 * aria snapshots that go through the real parser.
 */

import type { Action, ActionResult, Browser, Observation } from "../core/types.ts";
import { toObservation } from "../observe/snapshot.ts";

export const SHOP_ORIGIN = "https://shop.perceptionbrowser.test";

export interface Product {
  readonly slug: string;
  readonly name: string;
  readonly price: number;
  readonly blurb: string;
}

export const PRODUCTS: readonly Product[] = [
  { slug: "buds", name: "Perception Buds", price: 39, blurb: "Wireless earbuds for the commute." },
  { slug: "air", name: "Perception Air", price: 59, blurb: "Open-back headphones for the desk." },
  { slug: "studio", name: "Perception Studio", price: 129, blurb: "Closed-back reference headphones." },
];

function money(amount: number): string {
  return `€${amount}`;
}

/** Quotes would break the snapshot format; the fixture never emits them in names. */
function esc(value: string): string {
  return value.replace(/["\\\n\r]/g, " ").trim();
}

export class FakeShopBrowser implements Browser {
  #path = "/";
  #query = "";
  #cart: Product[] = [];
  #notice = "";
  #closed = false;

  get cartItems(): readonly string[] {
    return this.#cart.map((item) => item.name);
  }

  async open(url: string): Promise<Observation> {
    this.#navigate(url);
    return this.observe();
  }

  async observe(): Promise<Observation> {
    return this.#observation();
  }

  async close(): Promise<void> {
    this.#closed = true;
  }

  async act(action: Action): Promise<ActionResult> {
    if (this.#closed) throw new Error("browser is already closed");

    switch (action.kind) {
      case "goto":
        this.#navigate(action.url);
        return this.#ok(`navigated to ${this.#url()}`);
      case "click":
        return this.#click(action.ref);
      case "type":
        return this.#type(action.ref, action.text);
      case "scroll":
        return this.#ok(`scrolled ${action.direction}`);
      case "wait":
        return this.#ok(`waited ${action.ms}ms`);
      case "extract":
        return this.#extract(action.question);
      case "ask_user":
        return this.#ok("the user was asked; nothing changed on the page");
      case "finish":
        return this.#ok("run finished");
    }
  }

  // ---------------------------------------------------------------- actions

  #click(ref: string): ActionResult {
    const product = this.#product();

    if (this.#path === "/" && product === undefined) {
      if (ref === "e2") {
        this.#navigate(`${SHOP_ORIGIN}/search`);
        return this.#ok(`searched for "${this.#query || "everything"}"`);
      }
      if (ref === "e3") return this.#goCart();
      return this.#err(`"${ref}" is not a clickable control on this page`);
    }

    if (this.#path === "/search" && product === undefined) {
      const index = Number.parseInt(ref.replace(/^e/, ""), 10) - 1;
      const target = PRODUCTS[index];
      if (ref === "e4") return this.#goCart();
      if (target === undefined) return this.#err(`"${ref}" does not match any listing on this page`);
      this.#navigate(`${SHOP_ORIGIN}/product/${target.slug}`);
      return this.#ok(`opened ${target.name}`);
    }

    if (product !== undefined) {
      if (ref === "e1") {
        if (this.#cart.some((item) => item.slug === product.slug)) {
          this.#notice = `${product.name} is already in your cart`;
        } else {
          this.#cart.push(product);
          this.#notice = `${product.name} added to cart`;
        }
        return this.#ok(this.#notice);
      }
      if (ref === "e2") {
        this.#navigate(`${SHOP_ORIGIN}/search`);
        return this.#ok("back to results");
      }
      if (ref === "e3") return this.#goCart();
      return this.#err(`"${ref}" is not a control on this product page`);
    }

    if (this.#path === "/cart") {
      if (ref === "e1") return this.#err("checkout is disabled in the demo storefront");
      if (ref === "e2") {
        this.#navigate(`${SHOP_ORIGIN}/search`);
        return this.#ok("continue shopping");
      }
      return this.#err(`"${ref}" is not a control on the cart page`);
    }

    if (ref === "e1") {
      this.#navigate(`${SHOP_ORIGIN}/`);
      return this.#ok("home");
    }
    return this.#err(`"${ref}" is not a control on this page`);
  }

  #type(ref: string, text: string): ActionResult {
    if (this.#path === "/" && ref === "e1") {
      this.#query = text;
      this.#notice = "";
      return this.#ok(`typed ${JSON.stringify(text)} into the search box`);
    }
    return this.#err(`${ref} is not a text field on this page`);
  }

  #extract(question: string): ActionResult {
    const text = this.#tree()
      .split("\n")
      .map((line) => line.replace(/\[[^\]]*\]/g, "").replace(/^\s*[-*]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .join(" | ");
    return this.#ok(`[extracted for ${JSON.stringify(question)}] ${text}`);
  }

  #goCart(): ActionResult {
    this.#navigate(`${SHOP_ORIGIN}/cart`);
    return this.#ok("opened the cart");
  }

  // ----------------------------------------------------------------- pages

  #navigate(url: string): void {
    const parsed = new URL(url, SHOP_ORIGIN);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    this.#path = path;
    if (path === "/search") this.#query = parsed.searchParams.get("q") ?? "";
    this.#notice = "";
  }

  #url(): string {
    if (this.#path === "/search") {
      return `${SHOP_ORIGIN}/search?q=${encodeURIComponent(this.#query)}`;
    }
    return `${SHOP_ORIGIN}${this.#path === "/" ? "/" : this.#path}`;
  }

  #product(): Product | undefined {
    if (!this.#path.startsWith("/product/")) return undefined;
    const slug = this.#path.slice("/product/".length);
    return PRODUCTS.find((item) => item.slug === slug);
  }

  #title(): string {
    const product = this.#product();
    if (product !== undefined) return product.name;
    if (this.#path === "/search") return `Results for ${this.#query || "everything"}`;
    if (this.#path === "/cart") return "Your cart";
    if (this.#path === "/") return "Perception Demo Shop";
    return "Not found";
  }

  #tree(): string {
    const product = this.#product();
    if (product !== undefined) return this.#productTree(product).join("\n");
    if (this.#path === "/") return this.#homeTree().join("\n");
    if (this.#path === "/search") return this.#searchTree().join("\n");
    if (this.#path === "/cart") return this.#cartTree().join("\n");
    return [
      '- heading "Not found" [level=1]',
      '- paragraph "No such page in the demo storefront."',
      '- link "Home" [ref=e1]',
    ].join("\n");
  }

  #noticeLine(): string[] {
    return this.#notice ? [`- status "${esc(this.#notice)}"`] : [];
  }

  #homeTree(): string[] {
    const value = this.#query ? ` [value="${esc(this.#query)}"]` : "";
    return [
      '- heading "Perception Demo Shop" [level=1]',
      '- paragraph "Demo storefront for the PerceptionBrowser evaluation suite. Nothing here is real."',
      ...this.#noticeLine(),
      `- textbox "Search products"${value} [ref=e1]`,
      '- button "Search" [ref=e2]',
      '- link "Cart" [ref=e3]',
    ];
  }

  #searchTree(): string[] {
    const listings = this.#query
      ? PRODUCTS.map(
          (item, index) =>
            `  - listitem\n    - link "${esc(item.name)} — ${money(item.price)}" [ref=e${index + 1}]`,
        )
      : [];
    return [
      `- heading "Results for ${esc(this.#query || "everything")}" [level=1]`,
      ...this.#noticeLine(),
      ...(listings.length > 0
        ? ['- list "Products"', ...listings]
        : ['- paragraph "No products matched that search."']),
      '- link "Cart" [ref=e4]',
    ];
  }

  #productTree(product: Product): string[] {
    return [
      `- heading "${esc(product.name)}" [level=1]`,
      `- paragraph "${esc(product.blurb)} ${money(product.price)}."`,
      ...this.#noticeLine(),
      '- button "Add to cart" [ref=e1]',
      '- link "Back to results" [ref=e2]',
      '- link "Cart" [ref=e3]',
    ];
  }

  #cartTree(): string[] {
    const items =
      this.#cart.length > 0
        ? this.#cart.map((item) => `  - listitem\n    - text "${esc(item.name)} — ${money(item.price)}"`)
        : ['  - listitem\n    - text "Your cart is empty."'];
    const total = this.#cart.reduce((sum, item) => sum + item.price, 0);
    const empty = this.#cart.length === 0;
    return [
      '- heading "Your cart" [level=1]',
      '- list "Items"',
      ...items,
      `- text "Total: ${money(total)}"`,
      `- button "Checkout" [ref=e1]${empty ? " [disabled]" : ""}`,
      '- link "Continue shopping" [ref=e2]',
    ];
  }

  // ---------------------------------------------------------------- helpers

  #observation(): Observation {
    return toObservation(this.#url(), this.#title(), this.#tree());
  }

  #ok(detail: string): ActionResult {
    return { ok: true, detail, observation: this.#observation() };
  }

  #err(detail: string): ActionResult {
    return { ok: false, detail, observation: this.#observation() };
  }
}
