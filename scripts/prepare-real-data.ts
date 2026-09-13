/** Refresh the licensed, identity-free Lyon and Paris bootstrap. */
import { writeFileSync } from "node:fs";
import {
  CITIES,
  mergeMarkets,
  normalizePrices,
  PRICE_HISTORY_DAYS,
  type Market,
} from "../src/services/market";
import { parisDate } from "../src/domain";
const API = "https://prices.openfoodfacts.org/api/v1/";
const asOf = parisDate(),
  cutoff = new Date(`${asOf}T12:00:00Z`);
cutoff.setUTCDate(cutoff.getUTCDate() - PRICE_HISTORY_DAYS);
async function get(
  path: string,
  params: URLSearchParams,
): Promise<{ items: unknown[]; pages: number; total: number }> {
  const response = await fetch(`${API}${path}?${params}`, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "BasketMap/1.0 (French grocery comparison; basketmap.rufina-sharad.chatgpt.site)",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw Error(
      `Source returned HTTP ${response.status}; existing snapshot left intact.`,
    );
  const data = await response.json();
  if (
    !Array.isArray(data.items) ||
    !Number.isInteger(data.pages) ||
    data.pages > 500
  )
    throw Error("Unexpected API pagination; snapshot left intact.");
  return data;
}
async function pages(path: string, params: URLSearchParams) {
  const first = await get(path, params),
    rows = [...first.items];
  // Small bounded batches respect the shared public API.
  for (let page = 2; page <= first.pages; page += 3) {
    const batch = await Promise.all(
      Array.from(
        { length: Math.min(3, first.pages - page + 1) },
        (_, index) => {
          const query = new URLSearchParams(params);
          query.set("page", String(page + index));
          return get(path, query);
        },
      ),
    );
    batch.forEach((result) => rows.push(...result.items));
  }
  return rows;
}
const markets: Market[] = [];
for (const city of CITIES) {
  const params = new URLSearchParams({
    currency: "EUR",
    type: "PRODUCT",
    location__type: "OSM",
    lat: String(city.lat),
    lon: String(city.lon),
    radius_km: "15",
    date__gte: cutoff.toISOString().slice(0, 10),
    date__lte: asOf,
    price_is_discounted: "false",
    size: "100",
    // Ascending immutable IDs keep pagination stable while new rows are added.
    order_by: "id",
  });
  const rows = await pages("prices", params);
  const market = normalizePrices(rows, new Date().toISOString(), asOf);
  markets.push(market);
  console.log(
    `${city.label}: ${market.observations.length} observations, ${market.items.length} products, ${market.stores.length} priced stores.`,
  );
}
const market = markets.reduce(mergeMarkets);
if (!market.observations.length)
  throw Error("No valid observations received; existing snapshot left intact.");
writeFileSync("public/data/france-market.json", JSON.stringify(market));
console.log(
  `Saved ${market.observations.length} observations, ${market.items.length} products and ${market.stores.length} stores. No contributor identities stored.`,
);
