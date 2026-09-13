import { describe, expect, it } from "vitest";
import { demoDataset } from "../src/data";
import {
  MAX_IMPORT_BYTES,
  formatEuro,
  parseDatasetImport,
  parseEuroToCents,
  validateDataset,
} from "../src/domain";

describe("money parsing", () => {
  it.each([
    ["€1.20", 120],
    ["1.20 €", 120],
    ["1.250", 125],
    ["1,20", 120],
    ["1", 100],
    ["0.09", 9],
    ["0001.2", 120],
    ["0", 0],
    ["12.34000", 1234],
  ])("parses %s deliberately into %s cents", (value, expected) => {
    expect(parseEuroToCents(value)).toBe(expected);
  });
  it.each([
    "1.001",
    "-1",
    "1.2.3",
    "1,234.56",
    "1e2",
    "one euro",
    "",
    "€1€",
    ".5",
    "Infinity",
    "1 000",
    "9007199254740992",
  ])("rejects malformed or sub-cent input %s", (value) => {
    expect(() => parseEuroToCents(value)).toThrow();
  });
  it("formats integer cents and rejects fractional-cent formatting", () => {
    expect(formatEuro(820)).toBe("€8.20");
    expect(() => formatEuro(1.5)).toThrow();
  });
});
describe("runtime dataset validation and atomic local import", () => {
  it("accepts the fixed 24-item fictional fixture", () => {
    expect(validateDataset(demoDataset).success).toBe(true);
    expect(demoDataset.items).toHaveLength(24);
    expect(demoDataset.stores).toHaveLength(4);
    expect(
      demoDataset.observations.every(
        (record) =>
          record.observedOn === null && record.verification === "synthetic",
      ),
    ).toBe(true);
  });
  it("rejects duplicate IDs and dangling references with specific row errors", () => {
    const data = structuredClone(demoDataset);
    data.items[1].id = data.items[0].id;
    data.observations[0].storeId = "nonexistent";
    const result = validateDataset(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some(
          (error) =>
            error.path === "items.1.id" && error.message.includes("Duplicate"),
        ),
      ).toBe(true);
      expect(
        result.errors.some(
          (error) =>
            error.path === "observations.0.storeId" &&
            error.message.includes("Unknown"),
        ),
      ).toBe(true);
    }
  });
  it.each([0, -1, 1.5, 100001, NaN, Infinity])(
    "rejects invalid pack prices %s",
    (priceCents) => {
      const data = structuredClone(demoDataset);
      data.observations[0].priceCents = priceCents;
      expect(validateDataset(data).success).toBe(false);
    },
  );
  it("rejects invalid coordinates and nonfinite package quantities", () => {
    const data = structuredClone(demoDataset);
    data.stores[0].lat = 91;
    expect(validateDataset(data).success).toBe(false);
    data.stores[0].lat = 48;
    data.items[0].packQuantity = Infinity;
    expect(validateDataset(data).success).toBe(false);
  });
  it("rejects impossible dates and invalid timestamp clock values", () => {
    const data = structuredClone(demoDataset);
    data.createdAt = "2026-02-30T10:00:00Z";
    expect(validateDataset(data).success).toBe(false);
    data.createdAt = "2026-09-12T24:00:00Z";
    expect(validateDataset(data).success).toBe(false);
  });
  it("rejects unsafe source URLs, unknown executable-like fields and invalid JSON", () => {
    const data = structuredClone(demoDataset);
    data.observations[0].source.recordUrl = "javascript:alert(1)";
    expect(validateDataset(data).success).toBe(false);
    expect(parseDatasetImport("{invalid").success).toBe(false);
    expect(
      validateDataset({
        ...demoDataset,
        __proto__: { unsafe: true },
        unexpectedScript: "<script>",
      }).success,
    ).toBe(false);
  });
  it("rejects mixing real stores or observations into the synthetic mode", () => {
    const data = structuredClone(demoDataset);
    data.stores[0].fictional = false;
    expect(validateDataset(data).success).toBe(false);
    data.stores[0].fictional = true;
    data.observations[0].observedOn = "2026-09-12";
    expect(validateDataset(data).success).toBe(false);
  });
  it("rejects oversized imports before JSON parsing and caps observations", () => {
    const result = parseDatasetImport(" ".repeat(MAX_IMPORT_BYTES + 1));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0].message).toContain("2 MB");
    const data = structuredClone(demoDataset);
    data.observations = Array.from({ length: 5001 }, (_, index) => ({
      ...data.observations[0],
      id: `record-${index}`,
    }));
    expect(validateDataset(data).success).toBe(false);
  });
  it("returns new validated data on success and never changes a working dataset on failure", () => {
    const before = structuredClone(demoDataset);
    const good = parseDatasetImport(JSON.stringify(demoDataset));
    expect(good.success).toBe(true);
    const bad = parseDatasetImport(
      JSON.stringify({ ...demoDataset, stores: [] }),
    );
    expect(bad.success).toBe(false);
    expect(demoDataset).toEqual(before);
    if (good.success) expect(good.data).not.toBe(demoDataset);
  });
});
