import { describe, expect, it } from "vitest";
import type {
  BasketLine,
  CatalogItem,
  PriceObservation,
} from "../src/domain";
import {
  bestSharedBasket,
  candidateCoverage,
  essentialAlias,
  essentialType,
  productImageCandidates,
  resolvePack,
  searchScore,
  sharedSubset,
  type Offers,
} from "../src/services/shopping";

const item = (change: Partial<CatalogItem> = {}): CatalogItem => ({
  id: "item",
  name: "Lait demi-écrémé UHT",
  category: "Fresh & dairy",
  aliases: [],
  packQuantity: 1000,
  packUnit: "ml",
  packLabel: "1 L",
  requiredAttributes: [],
  barcode: "12345678",
  ...change,
});

const observation = (
  itemId: string,
  storeId: string,
): PriceObservation => ({
  id: `${itemId}:${storeId}`,
  itemId,
  storeId,
  productCode: "12345678",
  productLabel: itemId,
  packQuantity: 1000,
  packUnit: "ml",
  priceCents: 100,
  currency: "EUR",
  priceBasis: "pack",
  channel: "in_store",
  condition: "regular",
  matchBasis: "exact_barcode",
  matchNote: "Exact product.",
  observedOn: "2026-09-12",
  retrievedAt: "2026-09-12T12:00:00Z",
  verification: "source_linked",
  source: {
    provider: "open_prices",
    recordId: "1",
    recordUrl: "https://prices.openfoodfacts.org/prices/1",
    proofId: "1",
  },
});

describe("essential product search", () => {
  it("maps English milk search to actual tagged French dairy milk", () => {
    const milk = item();
    milk.aliases.push(
      essentialAlias(
        essentialType(milk, ["en:dairies", "en:milks", "en:uht-milks"])!,
      ),
    );
    expect(essentialType(milk)).toBe("Milk");
    expect(searchScore(milk, "milk")).toBe(100);
    expect(searchScore(milk, "lait")).toBe(100);
  });

  it("does not classify milk chocolate, cheese or coconut milk as dairy milk", () => {
    expect(
      essentialType(
        item({
          name: "Chocolat au lait",
          packQuantity: 200,
          packUnit: "g",
        }),
        ["en:milk-chocolates"],
      ),
    ).toBeNull();
    expect(
      essentialType(
        item({
          name: "Camembert au lait cru",
          packQuantity: 250,
          packUnit: "g",
        }),
        ["en:dairies", "en:cheeses"],
      ),
    ).not.toBe("Milk");
    expect(
      essentialType(item({ name: "Lait de coco" }), [
        "en:plant-based-milk-alternatives",
      ]),
    ).toBeNull();
  });

  it("classifies additional cupboard and drink staples without cosmetic false positives", () => {
    expect(
      essentialType(
        item({
          name: "Huile de tournesol",
          packUnit: "ml",
          packQuantity: 1000,
        }),
        ["en:vegetable-oils"],
      ),
    ).toBe("Cooking oil");
    expect(
      essentialType(
        item({
          name: "Eau micellaire",
          packUnit: "ml",
          packQuantity: 500,
        }),
        ["en:waters"],
      ),
    ).toBeNull();
    expect(
      essentialType(
        item({
          name: "Farine de blé",
          packUnit: "g",
          packQuantity: 1000,
        }),
        ["en:flours"],
      ),
    ).toBe("Flour");
  });

  it("recovers count-based egg packs from source labels", () => {
    expect(
      resolvePack({
        product_quantity: 0,
        product_quantity_unit: null,
        quantity: "6 œufs",
        product_name: "6 œufs plein air",
        categories_tags: ["en:eggs"],
      }),
    ).toEqual({ quantity: 6, unit: "count", label: "6 œufs" });
  });
});

describe("whole-basket coverage", () => {
  const offers: Offers = new Map([
    ["rice", [observation("rice", "a"), observation("rice", "b")]],
    ["pasta", [observation("pasta", "a"), observation("pasta", "b")]],
    ["milk", [observation("milk", "a")]],
  ]);
  const basket: BasketLine[] = [{ itemId: "rice", quantity: 1 }];

  it("shows whether an addition preserves two-store comparison", () => {
    expect(candidateCoverage("pasta", basket, offers)).toBe(2);
    expect(candidateCoverage("milk", basket, offers)).toBe(1);
  });

  it("finds the largest explicitly comparable subset without changing the basket", () => {
    const full = [
      ...basket,
      { itemId: "pasta", quantity: 1 },
      { itemId: "milk", quantity: 1 },
    ];
    expect(sharedSubset(full, offers)).toEqual(["rice", "pasta"]);
    expect(full).toHaveLength(3);
  });

  it("returns every store that can price the largest shared part of a basket", () => {
    const richerOffers: Offers = new Map([
      [
        "rice",
        [
          observation("rice", "a"),
          observation("rice", "b"),
          observation("rice", "c"),
        ],
      ],
      ["pasta", [observation("pasta", "a"), observation("pasta", "b")]],
      ["milk", [observation("milk", "a")]],
    ]);
    expect(
      bestSharedBasket(
        [
          { itemId: "rice", quantity: 1 },
          { itemId: "pasta", quantity: 1 },
          { itemId: "milk", quantity: 1 },
        ],
        richerOffers,
      ),
    ).toEqual({
      itemIds: ["rice", "pasta"],
      storeIds: ["a", "b"],
    });
  });
});

describe("product photography", () => {
  it("uses the real source product photo for a comparable essential", () => {
    const comparable = item({
      id: "essential:milk:1000:ml",
      name: "Milk · 1 L",
      aliases: [essentialAlias("Milk")],
      barcode: null,
    });
    const exact = item({
      id: "12345678",
      aliases: [essentialAlias("Milk")],
    });
    expect(
      productImageCandidates(
        comparable,
        {
          items: [comparable, exact],
          selectedProducts: [
            {
              itemId: comparable.id,
              storeId: "store",
              productCode: exact.id,
              decision: "Selected source product.",
            },
          ],
        },
        { [exact.id]: "https://images.openfoodfacts.org/example.jpg" },
      )[0],
    ).toBe("https://images.openfoodfacts.org/example.jpg");
  });

  it("falls back to a photographed product in the same category", () => {
    const missing = item({
      id: "missing",
      name: "Sparkling water",
      category: "Drinks",
      packUnit: "ml",
    });
    const photographed = item({
      id: "photo",
      name: "Still water",
      category: "Drinks",
      packUnit: "ml",
    });
    expect(
      productImageCandidates(
        missing,
        { items: [missing, photographed], selectedProducts: [] },
        { photo: "https://images.openfoodfacts.org/water.jpg" },
      ),
    ).toEqual(["https://images.openfoodfacts.org/water.jpg"]);
  });
});
