import { describe, expect, it } from "vitest";
import type { CatalogItem } from "../src/domain";
import {
  LEGACY_BASKET_KEY,
  SHOPPING_SESSION_KEY,
  emptyShoppingSession,
  loadShoppingSession,
  persistShoppingSession,
} from "../src/services/basketStorage";

const rice: CatalogItem = {
  id: "rice",
  name: "Rice · 500 g",
  category: "Food cupboard",
  aliases: ["Rice"],
  packQuantity: 500,
  packUnit: "g",
  packLabel: "500 g",
  requiredAttributes: [],
  barcode: null,
};

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe("real shopping session persistence", () => {
  it("starts a fresh visitor with an empty Lyon basket", () => {
    const loaded = loadShoppingSession(memoryStorage());
    expect(loaded).toEqual({
      session: emptyShoppingSession(),
      restored: false,
      warning: "",
    });
  });

  it("restores the basket, city and radius on a later visit", () => {
    const storage = memoryStorage();
    expect(
      persistShoppingSession(
        {
          basket: [{ itemId: rice.id, quantity: 2 }],
          items: [rice],
          placeLabel: "Paris",
          radius: 5,
        },
        storage,
      ),
    ).toBe(true);
    expect(loadShoppingSession(storage)).toMatchObject({
      restored: true,
      session: {
        basket: [{ itemId: rice.id, quantity: 2 }],
        items: [rice],
        placeLabel: "Paris",
        radius: 5,
      },
    });
  });

  it("migrates the previous saved-basket format without losing products", () => {
    const storage = memoryStorage({
      [LEGACY_BASKET_KEY]: JSON.stringify({
        basket: [{ itemId: rice.id, quantity: 3 }],
        items: [rice],
      }),
    });
    const loaded = loadShoppingSession(storage);
    expect(loaded.session.basket).toEqual([
      { itemId: rice.id, quantity: 3 },
    ]);
    expect(loaded.session.placeLabel).toBe("Lyon");
    expect(loaded.session.radius).toBe(15);
  });

  it("persists a cleared basket and removes the legacy key", () => {
    const storage = memoryStorage({
      [LEGACY_BASKET_KEY]: JSON.stringify({ basket: [], items: [] }),
    });
    expect(persistShoppingSession(emptyShoppingSession(), storage)).toBe(true);
    expect(storage.values.has(LEGACY_BASKET_KEY)).toBe(false);
    expect(storage.values.has(SHOPPING_SESSION_KEY)).toBe(true);
    expect(loadShoppingSession(storage).session.basket).toEqual([]);
  });

  it("rejects duplicate or invalid saved lines instead of loading bad state", () => {
    const storage = memoryStorage({
      [SHOPPING_SESSION_KEY]: JSON.stringify({
        version: 2,
        basket: [
          { itemId: rice.id, quantity: 1 },
          { itemId: rice.id, quantity: 2 },
        ],
        items: [rice],
        placeLabel: "Lyon",
        radius: 15,
      }),
    });
    const loaded = loadShoppingSession(storage);
    expect(loaded.session.basket).toEqual([]);
    expect(loaded.warning).toContain("could not be restored");
  });
});
