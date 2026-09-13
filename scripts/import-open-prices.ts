/** Bounded discovery, not a live frontend feed or independent price audit.
 * Usage: npm run import:open-prices
 * Replay captured response: npm run import:open-prices -- --input /path/page.json --schema /path/schema.json --as-of YYYY-MM-DD
 * Only aggregate coverage is written publicly. No receipt images or contributor details.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  parisDate,
  isCalendarDate,
  haversineKm,
  parseEuroToCents,
} from "../src/domain";
const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
const startedAt = new Date().toISOString();
const asOf = option("--as-of") || parisDate();
if (!isCalendarDate(asOf)) throw Error("Invalid --as-of calendar date.");
const from = new Date(Date.parse(asOf + "T00:00:00Z") - 30 * 86400000)
  .toISOString()
  .slice(0, 10);
const SCHEMA_URL = "https://prices.openfoodfacts.org/api/schema";
const API = "https://prices.openfoodfacts.org/api/v1/prices";
const MAX_PAGES = 10;
const MAX_ROWS = 1000;
const deadline = Date.now() + 5 * 60000;
const urls: string[] = [];
async function fetchJSON(url: string): Promise<any> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (Date.now() > deadline)
      throw Error("Bounded five-minute request budget reached.");
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "BasketMap/1.0 (bounded read-only portfolio data coverage check)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      const raw = response.headers.get("Retry-After");
      const seconds = raw
        ? Number.isFinite(Number(raw))
          ? Number(raw)
          : Math.max(0, (Date.parse(raw) - Date.now()) / 1000)
        : attempt;
      if (
        !Number.isFinite(seconds) ||
        seconds > 60 ||
        Date.now() + seconds * 1000 > deadline
      )
        throw Error(
          "Service requested a Retry-After beyond this bounded run; no further requests sent.",
        );
      if (attempt === 3)
        throw Error(
          `Source returned HTTP ${response.status} after three attempts.`,
        );
      await new Promise((r) => setTimeout(r, Math.max(1, seconds) * 1000));
      continue;
    }
    throw Error(`Source returned HTTP ${response.status}; stopped.`);
  }
  throw Error("Source request failed.");
}
const schemaPath = option("--schema");
const schema = schemaPath
  ? JSON.parse(await readFile(schemaPath, "utf8"))
  : await fetchJSON(SCHEMA_URL);
const params = new Set(
  (schema.paths?.["/api/v1/prices"]?.get?.parameters || []).map(
    (x: any) => x.name,
  ),
);
for (const required of [
  "currency",
  "lat",
  "lon",
  "radius_km",
  "type",
  "date__gte",
  "date__lte",
  "page",
  "size",
])
  if (!params.has(required))
    throw Error(
      `Current source schema does not expose ${required}. No price queries sent.`,
    );
const makeQuery = (page: number) => {
  const u = new URL(API);
  u.search = new URLSearchParams({
    currency: "EUR",
    lat: "48.853",
    lon: "2.369",
    radius_km: "3",
    type: "PRODUCT",
    date__gte: from,
    date__lte: asOf,
    page: String(page),
    size: "100",
  }).toString();
  return u.toString();
};
let rows: any[] = [];
let pagesExamined = 0;
let reportedTotal = 0;
let reportedPages = 0;
let capped = false;
const input = option("--input");
if (input) {
  const payload = JSON.parse(await readFile(input, "utf8"));
  if (!Array.isArray(payload.items))
    throw Error("Replay must contain an API page with items.");
  rows = payload.items.slice(0, MAX_ROWS);
  pagesExamined = 1;
  reportedTotal = payload.total;
  reportedPages = payload.pages;
  urls.push(makeQuery(payload.page || 1));
  capped = payload.pages > 1 || payload.items.length > MAX_ROWS;
} else {
  for (let page = 1; page <= MAX_PAGES && rows.length < MAX_ROWS; page++) {
    const url = makeQuery(page);
    urls.push(url);
    const payload = await fetchJSON(url);
    if (
      !Array.isArray(payload.items) ||
      !Number.isInteger(payload.pages) ||
      !Number.isInteger(payload.total)
    )
      throw Error("Unexpected pagination shape; stopped without guessing.");
    rows.push(...payload.items.slice(0, MAX_ROWS - rows.length));
    pagesExamined++;
    reportedTotal = payload.total;
    reportedPages = payload.pages;
    if (page >= payload.pages || payload.items.length === 0) break;
    if (page === MAX_PAGES || rows.length === MAX_ROWS) capped = true;
    await new Promise((r) => setTimeout(r, 500));
  }
}
const branches = new Map<
  string,
  {
    id: string;
    name: string;
    locationType: string;
    observations: number;
    barcodes: Set<string>;
  }
>();
const barcodeLocations = new Map<string, Set<string>>();
const reasons: Record<string, number> = {};
const priceBases: Record<string, number> = {};
const dates = new Set<string>();

for (const row of rows) {
  const location = row.location || {};
  const product = row.product || {};
  const locationId = String(row.location_id ?? "missing");
  const code = typeof row.product_code === "string" ? row.product_code : null;
  let branch = branches.get(locationId);
  if (!branch) {
    branch = {
      id: locationId,
      name: String(location.osm_name || "Unnamed location"),
      locationType: String(
        location.osm_tag_value || location.type || "unknown",
      ),
      observations: 0,
      barcodes: new Set(),
    };
    branches.set(locationId, branch);
  }
  branch.observations++;
  if (code) {
    branch.barcodes.add(code);
    const locations = barcodeLocations.get(code) || new Set();
    locations.add(locationId);
    barcodeLocations.set(code, locations);
  }
  if (typeof row.date === "string") dates.add(row.date);
  const basis = String(row.price_per ?? "unknown");
  priceBases[basis] = (priceBases[basis] || 0) + 1;
  const excluded = new Set<string>();
  if (row.currency !== "EUR" || row.type !== "PRODUCT")
    excluded.add("wrong_currency_or_record_type");
  if (!isCalendarDate(row.date) || row.date < from || row.date > asOf)
    excluded.add("outside_date_window");
  if (!code || product.code !== code)
    excluded.add("missing_or_mismatched_product_identity");
  if (
    location.type !== "OSM" ||
    !Number.isFinite(location.osm_lat) ||
    !Number.isFinite(location.osm_lon) ||
    Math.abs(location.osm_lat) > 90 ||
    Math.abs(location.osm_lon) > 180
  )
    excluded.add("physical_location_not_established");
  else if (
    haversineKm(
      { lat: 48.853, lon: 2.369 },
      { lat: location.osm_lat, lon: location.osm_lon },
    ) > 3
  )
    excluded.add("outside_area");
  if (
    ![
      "supermarket",
      "convenience",
      "grocery",
      "deli",
      "greengrocer",
      "health_food",
    ].includes(location.osm_tag_value)
  )
    excluded.add("grocery_store_type_not_established");
  if (row.price_is_discounted !== false || row.discount_type)
    excluded.add("regular_condition_not_established");
  if (row.price_per !== "UNIT")
    excluded.add(
      row.price_per === "KILOGRAM"
        ? "per_kilogram_price"
        : "pack_price_basis_unresolved",
    );
  if (
    !Number.isFinite(product.product_quantity) ||
    product.product_quantity <= 0 ||
    !["g", "kg", "ml", "l", "L"].includes(product.product_quantity_unit) ||
    typeof product.quantity !== "string" ||
    !product.quantity.trim()
  )
    excluded.add("package_identity_incomplete");
  if (!row.proof_id) excluded.add("source_evidence_missing");
  // A physical OSM place alone cannot prove the channel for this observation.
  excluded.add("in_store_channel_not_independently_established");
  try {
    const cents = parseEuroToCents(String(row.price));
    if (cents <= 0 || cents > 100000) excluded.add("invalid_pack_price");
  } catch {
    excluded.add("invalid_pack_price");
  }
  for (const reason of excluded) reasons[reason] = (reasons[reason] || 0) + 1;
}
const overlap = [...barcodeLocations]
  .filter(([, locations]) => locations.size >= 2)
  .map(([barcode]) => barcode);
let maxSharedItemsBetweenTwoStores = 0;
for (const a of branches.values())
  for (const b of branches.values())
    if (a.id < b.id)
      maxSharedItemsBetweenTwoStores = Math.max(
        maxSharedItemsBetweenTwoStores,
        [...a.barcodes].filter((code) => b.barcodes.has(code)).length,
      );
const report = {
  runAt: startedAt,
  analysisCompletedAt: new Date().toISOString(),
  source: "Open Prices",
  sourceLicense: "ODbL",
  sourceUrl: "https://openfoodfacts.github.io/open-prices/guides/data/",
  schemaUrl: SCHEMA_URL,
  schemaVersion: schema.info?.version || null,
  schemaSha256: createHash("sha256")
    .update(JSON.stringify(schema))
    .digest("hex"),
  queries: urls,
  region: "3 km around Bastille, Paris (48.853, 2.369)",
  dateWindow: { from, to: asOf, maxAgeDays: 30 },
  pagesExamined,
  reportedPages,
  reportedTotal,
  capped,
  rawRowCount: rows.length,
  retainedRowCount: 0,
  branchCount: branches.size,
  distinctBarcodes: barcodeLocations.size,
  barcodesAtMultipleBranches: overlap.length,
  maxSharedItemsBetweenTwoStores,
  distinctComparableItems: 0,
  completeStoreCount: 0,
  branches: [...branches.values()].map((x) => ({
    ...x,
    barcodes: undefined,
    distinctBarcodes: x.barcodes.size,
  })),
  observationDates: [...dates].sort(),
  priceBases,
  exclusionsByReason: reasons,
  exclusionCountsOverlap: true,
  gate: { requiredStores: 2, requiredCommonItems: 6, passed: false },
  outcome: "No observed dataset published",
  reason:
    maxSharedItemsBetweenTwoStores < 6
      ? "The nearby sample does not have six matching barcodes across two stores. Package, price basis and sales channel also need confirmation."
      : "Barcode overlap alone is insufficient. Package, pack-price basis and sales channel require an explicit verified mapping before normalization.",
  unresolvedAssumptions: [
    "Null price_per is not assumed to mean a defined pack price.",
    "An OSM location does not independently prove an in-store sales channel.",
    "No shelf check or receipt image review was performed.",
    "Defining product attributes and package identities were not manually matched across brands.",
    "This narrow sample is not an exhaustive Paris price audit.",
  ],
  requestMode: input
    ? "Analysis of the captured API page; no repeated price retrieval"
    : "Live bounded API discovery",
};
await mkdir("public/data", { recursive: true });
await mkdir("docs", { recursive: true });
await writeFile(
  "public/data/open-prices-coverage.json",
  JSON.stringify(report, null, 2) + "\n",
);
await mkdir("src/data", { recursive: true });
await writeFile(
  "src/data/coverage.json",
  JSON.stringify(report, null, 2) + "\n",
);
await writeFile(
  "docs/DATA_SOURCES.md",
  `# Data sources and actual coverage check\n\nRun: ${report.runAt}. ${report.requestMode}.\n\n## Decision\n\n${report.outcome}. ${report.reason}\n\n## Scope\n\n${report.region}; ${from} through ${asOf}, inclusive. ${pagesExamined} page(s), ${rows.length} records, capped: ${capped}. ${branches.size} locations, ${barcodeLocations.size} distinct barcodes, ${overlap.length} barcodes at multiple locations. Maximum shared barcodes between two stores: ${maxSharedItemsBetweenTwoStores}. Retained rows: 0; distinct normalized comparable items: 0; complete-store count for a candidate basket: 0. No candidate is published.\n\n${urls.map((url) => `- [Exact query](${url})`).join("\n")}\n\nSchema: [current API schema](${SCHEMA_URL}); version ${report.schemaVersion}; SHA-256 ${report.schemaSha256}.\n\n## Exclusions\n\nReason counts overlap; a record may have several problems.\n\n${Object.entries(
    reasons,
  )
    .map(([k, v]) => `- ${k}: ${v}`)
    .join(
      "\n",
    )}\n\n## Unresolved assumptions\n\n${report.unresolvedAssumptions.map((x) => "- " + x).join("\n")}\n\n## Sources and licenses\n\nOpen Prices aggregate discovery derived from [Open Prices](https://openfoodfacts.github.io/open-prices/guides/data/) under ODbL. [Download coverage report](/data/open-prices-coverage.json). No receipt images or contributor identities are published. Synthetic demo records are authored separately and never used to fill observed gaps. OSM supplies map tiles and attribution; it does not supply grocery prices. GroceryGuru is credited as inspiration; no server code is copied.\n\nThe requested gate is two physical stores sharing six eligible exact specifications within 30 days, a BasketMap product assumption. Raw overlap failing this gate ends this bounded attempt before costly product mapping. A separately reviewed normalized file can later be inspected using the local importer.\n`,
);
console.log(
  JSON.stringify({
    rawRows: report.rawRowCount,
    locations: report.branchCount,
    sharedBarcodes: report.barcodesAtMultipleBranches,
    retainedRows: 0,
    outcome: report.outcome,
    report: "public/data/open-prices-coverage.json",
  }),
);
