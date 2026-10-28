/**
 * The starter benchmark.
 *
 * Deliberately tiny and deterministic. Its job is not to be impressive; it is
 * to be a tripwire. When the loop, the snapshot parser, or the action
 * validation regresses, these two tasks break immediately.
 */

import { FakeShopBrowser, SHOP_ORIGIN } from "../browser/fake-shop.ts";
import type { Browser, Task } from "../core/types.ts";

function cartOf(browser: Browser): readonly string[] {
  if (!(browser instanceof FakeShopBrowser)) {
    throw new Error("this task can only be verified against the fixture browser");
  }
  return browser.cartItems;
}

export const addCheapestHeadphones: Task = {
  id: "shop-add-buds",
  goal: "Find a pair of headphones under 50 euros and add it to the cart.",
  startUrl: `${SHOP_ORIGIN}/`,
  verify(_result, browser) {
    return cartOf(browser).includes("Perception Buds");
  },
};

export const addSpecificProduct: Task = {
  id: "shop-add-air",
  goal: "Add the Perception Air headphones to the cart.",
  startUrl: `${SHOP_ORIGIN}/`,
  verify(_result, browser) {
    const cart = cartOf(browser);
    return cart.includes("Perception Air");
  },
};

export const starterTasks: readonly Task[] = [addCheapestHeadphones, addSpecificProduct];
