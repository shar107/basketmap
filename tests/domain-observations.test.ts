import { describe, expect, it } from "vitest";
import { demoDataset, defaultSettings } from "../src/data";
import {
  ageInDays,
  compareBasket,
  isCalendarDate,
  parisDate,
  selectObservation,
  validateDataset,
} from "../src/domain";
import type { Dataset, PriceObservation } from "../src/domain";
const settings = { ...defaultSettings, asOfDate: "2026-09-12" };
function observedFixture(): Dataset {
  const item = {
    ...structuredClone(demoDataset.items[0]),
    barcode: "0001234567890",
  };
  const store = { ...structuredClone(demoDataset.stores[0]), fictional: false };
  const observation: PriceObservation = {
    ...structuredClone(demoDataset.observations[0]),
    id: "observed-1",
    productCode: item.barcode,
    matchBasis: "exact_barcode",
    matchNote: "Same barcode and fixed package.",
    observedOn: "2026-09-12",
    retrievedAt: "2026-09-12T10:00:00Z",
    verification: "source_linked",
    source: {
      provider: "manual",
      recordId: "shelf-record-1",
      recordUrl: null,
      proofId: null,
    },
  };
  return {
    ...structuredClone(demoDataset),
    id: "observed-test",
    version: "observed-test-v1",
    mode: "observed",
    stores: [store],
    items: [item],
    observations: [observation],
  };
}
const select = (dataset: Dataset) =>
  selectObservation(dataset.items[0], dataset.stores[0], dataset, settings);

describe("eligible observations", () => {
  it("accepts a traceable exact-barcode observed fixture", () => {
    expect(validateDataset(observedFixture()).success).toBe(true);
    expect(select(observedFixture()).status).toBe("resolved");
  });
  it("prefers the latest eligible date over a cheaper historical price", () => {
    const dataset = observedFixture();
    dataset.observations.push({
      ...structuredClone(dataset.observations[0]),
      id: "older",
      priceCents: 40,
      observedOn: "2026-09-01",
    });
    expect(select(dataset).observation?.priceCents).toBe(120);
  });
  it("collapses equal-date equal-price duplicates while retaining both source references", () => {
    const dataset = observedFixture();
    dataset.observations.push({
      ...structuredClone(dataset.observations[0]),
      id: "duplicate",
      source: {
        provider: "manual",
        recordId: "second-source",
        recordUrl: null,
        proofId: null,
      },
    });
    const result = select(dataset);
    expect(result.status).toBe("resolved");
    expect(result.sourceReferences).toHaveLength(2);
    expect(
      compareBasket(dataset, [{ itemId: "milk", quantity: 2 }], settings)[0]
        .completeTotalCents,
    ).toBe(240);
  });
  it("leaves conflicting prices on the newest day unresolved, without falling back", () => {
    const dataset = observedFixture();
    dataset.observations.push({
      ...structuredClone(dataset.observations[0]),
      id: "conflict",
      priceCents: 110,
    });
    dataset.observations.push({
      ...structuredClone(dataset.observations[0]),
      id: "older",
      priceCents: 80,
      observedOn: "2026-09-11",
    });
    const result = select(dataset);
    expect(result.status).toBe("missing");
    if (result.status === "missing")
      expect(result.reason).toContain("Conflicting prices");
    expect(
      compareBasket(dataset, [{ itemId: "milk", quantity: 1 }], settings)[0]
        .completeTotalCents,
    ).toBeNull();
  });
  it.each([
    ["2026-08-13", "resolved"],
    ["2026-08-12", "missing"],
    ["2026-09-13", "missing"],
  ] as const)(
    "handles the inclusive 30-day window and future dates: %s",
    (date, status) => {
      const dataset = observedFixture();
      dataset.observations[0].observedOn = date;
      expect(select(dataset).status).toBe(status);
    },
  );
  it("uses the observation date, never the retrieval date, for freshness", () => {
    const dataset = observedFixture();
    dataset.observations[0].observedOn = "2026-08-12";
    dataset.observations[0].retrievedAt = "2026-09-12T23:00:00Z";
    expect(select(dataset).status).toBe("missing");
    expect(
      selectObservation(dataset.items[0], dataset.stores[0], dataset, {
        ...settings,
        maxObservationAgeDays: 31,
      }).status,
    ).toBe("resolved");
  });
  it.each(["promotion", "loyalty", "multibuy", "unknown"] as const)(
    "excludes %s conditions",
    (condition) => {
      const dataset = observedFixture();
      dataset.observations[0].condition = condition;
      expect(select(dataset).status).toBe("missing");
    },
  );
  it.each(["online", "unknown"] as const)("excludes %s channel", (channel) => {
    const dataset = observedFixture();
    dataset.observations[0].channel = channel;
    expect(select(dataset).status).toBe("missing");
  });
  it("keeps exact branches separate", () => {
    const dataset = observedFixture();
    dataset.stores.push({ ...dataset.stores[0], id: "other-branch" });
    expect(
      selectObservation(dataset.items[0], dataset.stores[1], dataset, settings)
        .status,
    ).toBe("missing");
  });
  it("refuses a synthetic price inside an observed comparison even before schema validation", () => {
    const dataset = observedFixture();
    dataset.observations[0] = structuredClone(demoDataset.observations[0]);
    expect(select(dataset).status).toBe("missing");
    expect(validateDataset(dataset).success).toBe(false);
  });
  it("rejects barcode mismatches despite matching labels", () => {
    const dataset = observedFixture();
    dataset.observations[0].productCode = "different";
    expect(select(dataset).status).toBe("missing");
    expect(validateDataset(dataset).success).toBe(false);
  });
  it("does not substitute twelve eggs for a six-pack", () => {
    const dataset = structuredClone(demoDataset);
    const observation = dataset.observations.find(
      (entry) => entry.itemId === "eggs",
    )!;
    observation.packQuantity = 12;
    expect(validateDataset(dataset).success).toBe(false);
    const result = selectObservation(
      dataset.items.find((item) => item.id === "eggs")!,
      dataset.stores[0],
      dataset,
      settings,
    );
    expect(result.status).toBe("missing");
  });
  it("requires curated package format and attributes, not merely equal net weight", () => {
    const dataset = observedFixture();
    dataset.observations[0].matchBasis = "curated_spec";
    dataset.observations[0].packLabel = "2 × 500 ml";
    expect(select(dataset).status).toBe("missing");
    expect(validateDataset(dataset).success).toBe(false);
    dataset.observations[0].packLabel = "1 L";
    dataset.observations[0].attributes = ["semi-skimmed", "fresh", "dairy"];
    expect(select(dataset).status).toBe("missing");
    expect(validateDataset(dataset).success).toBe(false);
  });
  it("rejects an extra defining attribute such as organic in curated matching", () => {
    const dataset = observedFixture();
    dataset.observations[0].matchBasis = "curated_spec";
    dataset.observations[0].attributes = [
      ...dataset.items[0].requiredAttributes,
      "organic",
    ];
    expect(select(dataset).status).toBe("missing");
    expect(validateDataset(dataset).success).toBe(false);
  });
  it("requires an explicit product choice for multiple curated products at one store", () => {
    const dataset = observedFixture();
    dataset.items[0].barcode = null;
    dataset.observations[0].matchBasis = "curated_spec";
    dataset.observations.push({
      ...structuredClone(dataset.observations[0]),
      id: "another-product",
      productCode: "other-product",
      priceCents: 80,
    });
    expect(select(dataset).status).toBe("missing");
    dataset.selectedProducts = [
      {
        itemId: "milk",
        storeId: "demo-a",
        productCode: "0001234567890",
        decision:
          "Owner selected this defined package and checked equivalence.",
      },
    ];
    expect(validateDataset(dataset).success).toBe(true);
    expect(select(dataset).observation?.priceCents).toBe(120);
  });
  it("accepts a traceable quantity-equivalent price and verifies its calculation", () => {
    const dataset = observedFixture();
    dataset.items[0].barcode = null;
    dataset.items[0].packLabel = "1 L equivalent";
    dataset.observations[0] = {
      ...dataset.observations[0],
      packLabel: "1 L equivalent",
      priceCents: 150,
      priceBasis: "quantity_equivalent",
      sourcePackQuantity: 2000,
      sourcePackUnit: "ml",
      sourcePackLabel: "2 L",
      sourcePriceCents: 300,
      matchBasis: "normalized_unit",
      matchNote: "1 L equivalent calculated from the observed 2 L pack.",
    };
    dataset.selectedProducts = [
      {
        itemId: dataset.items[0].id,
        storeId: dataset.stores[0].id,
        productCode: dataset.observations[0].productCode!,
        decision: "Selected the lowest latest normalized regular price.",
      },
    ];
    expect(validateDataset(dataset).success).toBe(true);
    expect(select(dataset).observation?.priceCents).toBe(150);
    dataset.observations[0].priceCents = 151;
    expect(validateDataset(dataset).success).toBe(false);
    expect(select(dataset).status).toBe("missing");
  });
});
describe("calendar dates", () => {
  it("checks real calendar dates, leap years and day-only age", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2026-2-03")).toBe(false);
    expect(ageInDays("2026-08-13", "2026-09-12")).toBe(30);
  });
  it("uses the Paris calendar date at UTC day boundaries", () => {
    expect(parisDate(new Date("2026-09-12T22:30:00Z"))).toBe("2026-09-13");
  });
});
