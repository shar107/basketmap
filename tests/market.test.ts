import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import fixture from "./fixtures/real-carrefour-price.json";
import {
  normalizePrices,
  normalizeStore,
  localDataset,
  LYON,
  PARIS,
  PRIORITY_CHAINS,
  fetchPrices,
  isPriorityChain,
  isSupportedChain,
} from "../src/services/market";
import type { Market } from "../src/services/market";
import {
  catalogItemSchema,
  storeSchema,
  observationSchema,
  compareBasket,
  haversineKm,
} from "../src/domain";
const timestamp = "2026-09-12T12:00:00Z";
const make = (row: unknown = fixture) =>
  normalizePrices([row], timestamp, "2026-09-12");
afterEach(() => vi.unstubAllGlobals());
describe("real price ingestion", () => {
  it("retains the actual store, barcode, date, cents and evidence; excludes contributor identities", () => {
    const m = make();
    expect(m.observations).toHaveLength(1);
    const o = m.observations[0];
    expect(o.priceCents).toBe(354);
    expect(o.observedOn).toBe("2026-09-08");
    expect(o.productCode).toBe("3468572044629");
    expect(o.source.recordId).toBe(String(fixture.id));
    expect(m.stores[0].name).toBe("Carrefour Market");
    expect(m.stores[0].fictional).toBe(false);
    expect(JSON.stringify(m)).not.toMatch(/owner|creator|image_md5_hash/);
  });
  it.each([
    ["promotion", { price_is_discounted: true }],
    ["loyalty", { discount_type: "LOYALTY_PROGRAM" }],
    ["per kilogram", { price_per: "KILOGRAM" }],
    ["fractional cents", { price: 3.541 }],
    ["missing date", { date: null }],
    ["impossible date", { date: "2026-02-30" }],
    ["future", { date: "2026-09-13" }],
    ["duplicate", { duplicate_of: 1 }],
    ["different currency", { currency: "USD" }],
    [
      "unverified channel",
      { proof: { ...fixture.proof, type: "SHOP_IMPORT" } },
    ],
    ["wrong proof location", { proof: { ...fixture.proof, location_id: 999 } }],
    [
      "delivery receipt",
      { proof: { ...fixture.proof, receipt_online_delivery_costs: 0 } },
    ],
    [
      "non-French store",
      { location: { ...fixture.location, osm_address_country_code: "DE" } },
    ],
    ["online location", { location: { ...fixture.location, type: "ONLINE" } }],
    [
      "unknown pack",
      { product: { ...fixture.product, product_quantity: null } },
    ],
    ["barcode mismatch", { product: { ...fixture.product, code: "12345678" } }],
  ])("excludes %s", (_, change) =>
    expect(make({ ...fixture, ...change }).observations).toHaveLength(0),
  );
  it("only permits OFF image URLs", () =>
    expect(
      make({
        ...fixture,
        product: {
          ...fixture.product,
          image_url: "https://attacker.invalid/tracking.png",
        },
      }).images,
    ).toEqual({}));
  it("uses a rolling 30 day cutoff; never turns old prices into current totals", () => {
    const m = make();
    const d = localDataset(m, PARIS, 15, m.items, "2026-10-09");
    expect(d.observations).toHaveLength(0);
    const c = compareBasket(
      d,
      [{ itemId: fixture.product_code, quantity: 1 }],
      {
        origin: PARIS,
        radiusKm: 15,
        maxObservationAgeDays: 30,
        asOfDate: "2026-10-09",
      },
    );
    expect(c[0].completeTotalCents).toBeNull();
  });
  it("keeps products in the basket when the chosen city has no coverage", () => {
    const m = make();
    const d = localDataset(
      m,
      { label: "Remote", lat: 43, lon: 1 },
      3,
      m.items,
      "2026-09-12",
    );
    expect(d.items).toHaveLength(1);
    expect(d.observations).toHaveLength(0);
    expect(d.stores).toHaveLength(0);
  });
  it("rejects non-grocery and fictional locations", () => {
    expect(
      normalizeStore({ ...fixture.location, osm_tag_value: "cafe" }),
    ).toBeNull();
    expect(normalizeStore({ id: "demo-a" })).toBeNull();
  });
  it("keeps valid grocery prices outside the featured-chain shortlist", () => {
    const included = make({
      ...fixture,
      location: {
        ...fixture.location,
        osm_name: "Super U",
        osm_brand: "Super U",
      },
    });
    expect(included.stores[0].chain).toBe("Super U");
    expect(included.observations).toHaveLength(1);
  });
  it("fetches subsequent pages and normalizes live responses", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [fixture], pages: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], pages: 2 }),
      });
    vi.stubGlobal("fetch", fetch);
    const result = await fetchPrices(PARIS, 15, new AbortController().signal, [
      fixture.product_code,
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toContain("page=2");
    expect(fetch.mock.calls[0][0]).toContain("product_code__in=3468572044629");
    expect(result.market.observations).toHaveLength(1);
  });
  it("does not report a partially failed refresh as successful", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [fixture], pages: 2 }),
        })
        .mockResolvedValueOnce({ ok: false }),
    );
    await expect(
      fetchPrices(PARIS, 15, new AbortController().signal),
    ).rejects.toThrow();
  });
});
describe("published French snapshot", () => {
  const m = JSON.parse(
    readFileSync("public/data/france-market.json", "utf8"),
  ) as Market;
  it("contains only valid real stores, products and traceable non-synthetic observations", () => {
    const items = new Map(m.items.map((i) => [i.id, i]));
    const stores = new Set(m.stores.map((s) => s.id));
    for (const s of m.stores) {
      expect(storeSchema.safeParse(s).success).toBe(true);
      expect(s.fictional).toBe(false);
    }
    for (const i of m.items)
      expect(catalogItemSchema.safeParse(i).success).toBe(true);
    for (const o of m.observations) {
      expect(observationSchema.safeParse(o).success).toBe(true);
      expect(o.source.provider).toBe("open_prices");
      expect(o.productCode).toBe(items.get(o.itemId)?.barcode);
      expect(o.packQuantity).toBe(items.get(o.itemId)?.packQuantity);
      expect(stores.has(o.storeId)).toBe(true);
    }
    expect(m.observations.length).toBeGreaterThan(2000);
    expect(m.stores.length).toBeGreaterThanOrEqual(20);
    expect(m.stores.every((store) => isSupportedChain(store.chain))).toBe(true);
    expect(m.stores.some((store) => /super u|u express/i.test(store.name))).toBe(
      true,
    );
    expect(
      m.stores.every((store) =>
        [LYON, PARIS].some((city) => haversineKm(city, store) <= 15.1),
      ),
    ).toBe(true);
  });
  it("contains broad real-chain coverage in both launch cities", () => {
    const priced = new Set(m.observations.map((o) => o.storeId));
    const chains = new Set(
      m.stores.filter((s) => priced.has(s.id)).map((s) => s.chain),
    );
    for (const name of [
      "Carrefour",
      "Auchan",
      "Intermarché",
      "Monoprix",
      "Lidl",
      "E.Leclerc",
    ])
      expect(chains.has(name)).toBe(true);
    expect([...chains].some((chain) => !isPriorityChain(chain))).toBe(true);
    expect(chains.size).toBeGreaterThanOrEqual(PRIORITY_CHAINS.length);
    for (const city of [LYON, PARIS]) {
      const local = localDataset(m, city, 15, [], "2026-09-12");
      expect(local.observations.length).toBeGreaterThan(100);
      expect(
        local.items.some((item) => item.id.startsWith("essential:")),
      ).toBe(true);
    }
  });
  it("publishes honest comparable essentials with explicit product mappings", () => {
    const lyon = localDataset(m, LYON, 15, [], "2026-09-12");
    const rice = lyon.items.find((item) => item.id === "essential:rice:500:g");
    expect(rice?.name).toBe("Rice · 500 g equivalent");
    const results = compareBasket(
      lyon,
      [{ itemId: rice!.id, quantity: 1 }],
      {
        origin: LYON,
        radiusKm: 15,
        maxObservationAgeDays: 30,
        asOfDate: "2026-09-12",
      },
    );
    expect(
      results.filter((result) => result.status === "complete").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      lyon.observations
        .filter((observation) => observation.itemId === rice!.id)
        .every(
          (observation) =>
            observation.matchBasis === "normalized_unit" &&
            observation.priceBasis === "quantity_equivalent" &&
            observation.sourcePackQuantity &&
            observation.sourcePriceCents &&
            observation.productCode &&
            observation.source.recordUrl,
        ),
    ).toBe(true);
  });
});
