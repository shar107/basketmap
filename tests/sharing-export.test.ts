import { describe, it, expect } from "vitest";
import { demoDataset, starterBasket, defaultSettings } from "../src/data";
import { compareBasket } from "../src/domain";
import { encodeBasket, readShareHash, shareURL } from "../src/services/sharing";
import { comparisonCSV, csvCell } from "../src/services/export";
import { cleanBasket, reducer, initialState } from "../src/services/state";
const payload = (data: unknown) =>
  btoa(JSON.stringify(data))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
describe("share links and saved baskets", () => {
  it("round-trips exact dataset version and packs without precise coordinates", () => {
    const url = shareURL(
      demoDataset,
      { basket: starterBasket, originId: "bastille" },
      "https://example.com/?secret=no",
    );
    expect(url).not.toContain("secret");
    expect(url).not.toContain("48.853");
    const read = readShareHash(new URL(url).hash, demoDataset);
    expect(read).toEqual({
      status: "valid",
      basket: starterBasket,
      originId: "bastille",
    });
  });
  it("requires an explicit recovery for unavailable versions", () => {
    const code = encodeBasket(
      { ...demoDataset, version: "old-v0" },
      starterBasket,
      "bastille",
    );
    const result = readShareHash("#/compare?basket=" + code, demoDataset);
    expect(result.status).toBe("error");
    if (result.status === "error")
      expect(result.message).toContain("not available");
  });
  it.each([
    { b: [] },
    { b: [{ itemId: "milk", quantity: 21 }] },
    { b: [{ itemId: "bogus", quantity: 1 }] },
    {
      b: [
        { itemId: "milk", quantity: 1 },
        { itemId: "milk", quantity: 1 },
      ],
    },
  ])("does not accept unknown or duplicate lines: %j", ({ b }) => {
    const value = b.length
      ? { v: 1, d: demoDataset.id, dv: demoDataset.version, b, o: "bastille" }
      : { v: 2 };
    expect(
      readShareHash("#/compare?basket=" + payload(value), demoDataset).status,
    ).toBe("error");
  });
  it("rejects oversized and maliciously malformed payloads", () => {
    expect(
      readShareHash("#/compare?basket=" + "x".repeat(10101), demoDataset)
        .status,
    ).toBe("error");
    expect(
      readShareHash("#/compare?basket=%3Cscript%3E", demoDataset).status,
    ).toBe("error");
  });
  it("removes obsolete saved item IDs and rejects invalid quantities", () => {
    expect(
      cleanBasket(
        [
          { itemId: "missing", quantity: 1 },
          { itemId: "milk", quantity: 2 },
        ],
        demoDataset,
      ),
    ).toEqual([{ itemId: "milk", quantity: 2 }]);
    expect(() =>
      cleanBasket([{ itemId: "milk", quantity: 0 }], demoDataset),
    ).toThrow();
    expect(
      reducer(initialState, { type: "quantity", id: "milk", quantity: 21 }),
    ).toEqual(initialState);
  });
});
describe("honest CSV export", () => {
  it("exports the same computed cents and never a complete total for a partial basket", () => {
    const csv = comparisonCSV(
      demoDataset,
      compareBasket(demoDataset, starterBasket, defaultSettings),
      defaultSettings,
      "2026-09-12T12:00:00Z",
    );
    expect(csv).toContain("SYNTHETIC EXAMPLE DATA");
    expect(csv).toContain('"complete","820",""');
    expect(csv).toContain('"incomplete","","520"');
    expect(csv).toContain('"2","120","1.20","240"');
    expect(csv).not.toContain("48.853");
  });
  it("escapes quotes/newlines and neutralizes spreadsheet formulas including leading whitespace", () => {
    expect(csvCell("=SUM(A1)")).toBe('"\'=SUM(A1)"');
    expect(csvCell("  @evil")).toBe('"\'  @evil"');
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
});
