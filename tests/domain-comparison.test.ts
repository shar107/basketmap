import { describe, expect, it } from "vitest";
import {
  demoDataset,
  defaultSettings,
  presetBaskets,
  starterBasket,
} from "../src/data";
import {
  compareBasket,
  compareCheapestWithNearest,
  haversineKm,
  lowestPriceStoreIds,
  normalizeBasket,
  rankCompleteStores,
  rankIncompleteStores,
} from "../src/domain";
const settings = { ...defaultSettings, asOfDate: "2026-09-12" };

describe("complete basket arithmetic and ranking", () => {
  it("matches the independent golden fixture and distinguishes the incomplete store", () => {
    const results = compareBasket(demoDataset, starterBasket, settings);
    expect(
      results.map((result) => [
        result.storeId,
        result.completeTotalCents,
        result.knownSubtotalCents,
        result.matchedLineCount,
      ]),
    ).toEqual([
      ["demo-a", 860, 860, 4],
      ["demo-b", 820, 820, 4],
      ["demo-c", 900, 900, 4],
      ["demo-d", null, 520, 3],
    ]);
    expect(results[3].coverageRatio).toBe(0.75);
    expect(results[3].missingItemIds).toEqual(["eggs"]);
    expect(
      results[3].lines.find((line) => line.itemId === "eggs")?.lineTotalCents,
    ).toBeNull();
    expect(rankCompleteStores(results).map((result) => result.storeId)).toEqual(
      ["demo-b", "demo-a", "demo-c"],
    );
    expect(
      rankIncompleteStores(results).map((result) => result.storeId),
    ).toEqual(["demo-d"]);
    expect(lowestPriceStoreIds(results)).toEqual(["demo-b"]);
    const baseline = compareCheapestWithNearest(results)!;
    expect([
      baseline.cheapest.storeId,
      baseline.nearest.storeId,
      baseline.differenceCents,
    ]).toEqual(["demo-b", "demo-a", 40]);
    expect(baseline.extraDistanceKm).toBeGreaterThan(0);
    expect(baseline.isSameStore).toBe(false);
    expect(results[0].oldestObservationDate).toBeNull();
  });
  it("makes D the legitimate winner when eggs are removed", () => {
    const results = compareBasket(
      demoDataset,
      starterBasket.filter((line) => line.itemId !== "eggs"),
      settings,
    );
    expect(results.map((result) => result.completeTotalCents)).toEqual([
      620, 610, 635, 520,
    ]);
    expect(rankCompleteStores(results)[0].storeId).toBe("demo-d");
    expect(results.every((result) => result.status === "complete")).toBe(true);
  });
  it("does not recommend a zero-cost store for an empty basket", () => {
    const results = compareBasket(demoDataset, [], settings);
    expect(
      results.every(
        (result) =>
          result.status === "empty" &&
          result.completeTotalCents === null &&
          result.coverageRatio === null,
      ),
    ).toBe(true);
    expect(rankCompleteStores(results)).toEqual([]);
    expect(compareCheapestWithNearest(results)).toBeNull();
  });
  it("multiplies defined packs, merges duplicate lines and measures distinct-line coverage", () => {
    const basket = [
      { itemId: "spaghetti", quantity: 2 },
      { itemId: "spaghetti", quantity: 3 },
      { itemId: "milk", quantity: 1 },
    ];
    expect(normalizeBasket(basket, demoDataset)).toEqual([
      { itemId: "spaghetti", quantity: 5 },
      { itemId: "milk", quantity: 1 },
    ]);
    const result = compareBasket(demoDataset, basket, settings)[0];
    expect(result.completeTotalCents).toBe(620);
    expect(result.requestedLineCount).toBe(2);
    expect(result.lines[0].lineTotalCents).toBe(500);
  });
  it.each([0, -1, 1.5, 21, Infinity, NaN])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(() =>
        compareBasket(demoDataset, [{ itemId: "milk", quantity }], settings),
      ).toThrow("whole numbers from 1 to 20");
    },
  );
  it("rejects unknown catalog IDs and combined quantities above the cap", () => {
    expect(() =>
      compareBasket(
        demoDataset,
        [{ itemId: "made-up", quantity: 1 }],
        settings,
      ),
    ).toThrow("Unknown basket item");
    expect(() =>
      normalizeBasket(
        [
          { itemId: "milk", quantity: 20 },
          { itemId: "milk", quantity: 1 },
        ],
        demoDataset,
      ),
    ).toThrow("cannot exceed 20");
  });
  it("uses unrounded distance for the radius and includes an exact boundary", () => {
    const result = compareBasket(demoDataset, starterBasket, {
      ...settings,
      radiusKm: 0.1,
    })[0];
    expect(result.distanceKm.toFixed(1)).toBe("0.1");
    expect(result.withinRadius).toBe(false);
    expect(
      compareBasket(demoDataset, starterBasket, {
        ...settings,
        radiusKm: result.distanceKm,
      })[0].withinRadius,
    ).toBe(true);
  });
  it("cannot establish a difference when only one complete store is eligible", () => {
    const results = compareBasket(demoDataset, starterBasket, {
      ...settings,
      radiusKm: 0.2,
    });
    expect(rankCompleteStores(results).map((result) => result.storeId)).toEqual(
      ["demo-a"],
    );
    expect(compareCheapestWithNearest(results)).toBeNull();
  });
  it("retains joint-lowest IDs and stable tie order by distance then ID", () => {
    const results = compareBasket(demoDataset, starterBasket, settings).map(
      (result) =>
        result.status === "complete"
          ? { ...result, completeTotalCents: 820, distanceKm: 1 }
          : result,
    );
    expect(
      rankCompleteStores([...results].reverse()).map(
        (result) => result.storeId,
      ),
    ).toEqual(["demo-a", "demo-b", "demo-c"]);
    expect(lowestPriceStoreIds(results)).toEqual([
      "demo-a",
      "demo-b",
      "demo-c",
    ]);
    expect(compareCheapestWithNearest(results)?.isPriceTie).toBe(true);
    expect(compareCheapestWithNearest(results)?.differenceCents).toBe(0);
  });
  it("produces different computed winners for supported presets", () => {
    const winners = presetBaskets.map(
      (preset) =>
        rankCompleteStores(
          compareBasket(demoDataset, preset.lines, settings),
        )[0].storeId,
    );
    expect(winners).toEqual(["demo-b", "demo-c", "demo-c", "demo-a"]);
  });
  it("rejects invalid comparison settings instead of silently widening them", () => {
    expect(() =>
      compareBasket(demoDataset, starterBasket, { ...settings, radiusKm: -1 }),
    ).toThrow("Invalid comparison");
    expect(() =>
      compareBasket(demoDataset, starterBasket, {
        ...settings,
        asOfDate: "2026-02-30",
      }),
    ).toThrow("Invalid comparison");
  });
});
describe("straight-line distance", () => {
  it("matches the one-degree equatorial reference and clamps antipodal calculations", () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(
      111.19492664455873,
      8,
    );
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(
      20015.086796020572,
      8,
    );
    expect(haversineKm({ lat: 48, lon: 2 }, { lat: 48, lon: 2 })).toBe(0);
    expect(() => haversineKm({ lat: 91, lon: 0 }, { lat: 0, lon: 0 })).toThrow(
      "Coordinates",
    );
  });
});
