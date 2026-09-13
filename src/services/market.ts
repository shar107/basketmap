import {
  COMPARABLE_SPECS,
  essentialAlias,
  essentialType,
  resolvePack,
} from "./shopping";
import { z } from "zod";
import {
  haversineKm,
  isCalendarDate,
  parseEuroToCents,
  parisDate,
} from "../domain";
import type {
  BasketLine,
  CatalogItem,
  Dataset,
  PriceObservation,
  Store,
} from "../domain";
export type Place = { label: string; lat: number; lon: number };
export type Market = {
  refreshedAt: string;
  stores: Store[];
  items: CatalogItem[];
  observations: PriceObservation[];
  images: Record<string, string>;
};
export const PARIS: Place = { label: "Paris", lat: 48.8566, lon: 2.3522 };
export const LYON: Place = { label: "Lyon", lat: 45.764, lon: 4.8357 };
export const CITIES: Place[] = [LYON, PARIS];
export const PRIORITY_CHAINS = [
  "Carrefour",
  "Auchan",
  "Intermarché",
  "Monoprix",
  "Lidl",
  "ALDI",
  "E.Leclerc",
] as const;
const PRIORITY_CHAIN_SET = new Set<string>(PRIORITY_CHAINS);
export const isPriorityChain = (chain: string | null | undefined) =>
  Boolean(chain && PRIORITY_CHAIN_SET.has(chain));
/** Any validated physical grocery location is eligible for price ingestion. */
export const isSupportedChain = (chain: string | null | undefined) =>
  Boolean(chain?.trim());
export const SOURCES = [
  {
    name: "Open Prices",
    url: "https://prices.openfoodfacts.org",
    license: "ODbL 1.0",
  },
  {
    name: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    license: "ODbL 1.0",
  },
  {
    name: "Open Food Facts",
    url: "https://world.openfoodfacts.org/terms-of-use",
    license: "ODbL; product images CC BY-SA",
  },
];
const nullableText = z.string().nullish();
const locationSchema = z.object({
  id: z.number().int(),
  type: z.literal("OSM"),
  osm_id: z.number().int().positive(),
  osm_type: z.enum(["NODE", "WAY", "RELATION"]),
  osm_name: z.string().min(1),
  osm_brand: nullableText,
  osm_display_name: nullableText,
  osm_address_city: nullableText,
  osm_address_postcode: nullableText,
  osm_address_country_code: z.literal("FR"),
  osm_lat: z.number().min(-90).max(90),
  osm_lon: z.number().min(-180).max(180),
  osm_tag_value: z.string(),
});
const rowSchema = z.object({
  id: z.number().int().positive(),
  type: z.literal("PRODUCT"),
  product_code: z.string().regex(/^\d{8,14}$/),
  price: z.union([z.string(), z.number()]),
  currency: z.literal("EUR"),
  price_is_discounted: z.literal(false),
  discount_type: z.null().optional(),
  price_per: z.enum(["UNIT"]).nullable().optional(),
  date: z.string().refine(isCalendarDate),
  duplicate_of: z.null().optional(),
  location: locationSchema,
  proof_id: z.number().int().positive(),
  proof: z.object({
    type: z.enum(["PRICE_TAG", "RECEIPT"]),
    location_id: z.number().int().positive(),
    receipt_online_delivery_costs: z.number().nullable().optional(),
  }),
  product: z.object({
    code: z.string(),
    product_name: z.string().min(1),
    source: z.literal("off"),
    quantity: nullableText,
    product_quantity: z.number().nonnegative().nullable(),
    product_quantity_unit: nullableText,
    categories_tags: z.array(z.string()).nullish(),
    brands: nullableText,
    image_url: nullableText,
  }),
});
export function chainName(name: string): string {
  const match = [
    ["carrefour", "Carrefour"],
    ["auchan", "Auchan"],
    ["franprix", "Franprix"],
    ["aldi", "ALDI"],
    ["lidl", "Lidl"],
    ["leclerc", "E.Leclerc"],
    ["intermarch", "Intermarché"],
    ["monoprix", "Monoprix"],
    ["monop'", "Monoprix"],
    ["super u", "Super U"],
    ["hyper u", "Hyper U"],
    ["u express", "U Express"],
    ["casino", "Casino"],
    ["netto", "Netto"],
    ["biocoop", "Biocoop"],
    ["g20", "G20"],
    ["cora", "Cora"],
    ["grand frais", "Grand Frais"],
    ["leader price", "Leader Price"],
    ["match", "Match"],
    ["naturalia", "Naturalia"],
    ["spar", "Spar"],
    ["vival", "Vival"],
  ].find(([key]) => name.toLowerCase().includes(key));
  return match?.[1] || name;
}
export function normalizeStore(input: unknown): Store | null {
  const r = locationSchema.safeParse(input);
  if (!r.success) return null;
  const x = r.data;
  if (!["supermarket", "convenience", "wholesale"].includes(x.osm_tag_value))
    return null;
  return {
    id: String(x.id),
    name: x.osm_name,
    chain: chainName(x.osm_brand || x.osm_name),
    address:
      x.osm_display_name ||
      [x.osm_address_city, x.osm_address_postcode].filter(Boolean).join(" "),
    lat: x.osm_lat,
    lon: x.osm_lon,
    fictional: false,
    osm: {
      type: x.osm_type.toLowerCase() as "node" | "way" | "relation",
      id: String(x.osm_id),
    },
    sourceUrl: `https://www.openstreetmap.org/${x.osm_type.toLowerCase()}/${x.osm_id}`,
  };
}
function category(tags: string[]) {
  const text = tags.join(" ");
  if (/beverages|waters|juices|coffees|teas/.test(text)) return "Drinks";
  if (/dairies|yogurts|cheeses|milks|eggs/.test(text)) return "Fresh & dairy";
  if (/snacks|biscuits|chocolates|desserts|breakfast|confection/.test(text))
    return "Breakfast & treats";
  if (/frozen/.test(text)) return "Frozen";
  return "Food cupboard";
}
export function normalizePrices(
  rows: unknown[],
  retrievedAt: string,
  asOf = parisDate(),
): Market {
  const stores = new Map<string, Store>(),
    items = new Map<string, CatalogItem>(),
    observations = new Map<string, PriceObservation>(),
    images: Record<string, string> = {};
  for (const raw of rows) {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const x = parsed.data,
      p = x.product;
    const store = normalizeStore(x.location);
    if (
      !store ||
      !isSupportedChain(store.chain) ||
      x.date > asOf ||
      x.proof.location_id !== x.location.id ||
      x.proof.receipt_online_delivery_costs != null ||
      p.code !== x.product_code
    )
      continue;
    const pack = resolvePack(p);
    if (!pack) continue;
    const qty = pack.quantity,
      unit = pack.unit;
    let cents: number;
    try {
      cents = parseEuroToCents(String(x.price));
    } catch {
      continue;
    }
    if (cents <= 0 || cents > 100000) continue;
    const id = x.product_code;
    const item: CatalogItem = {
      id,
      name: p.product_name.slice(0, 500),
      category: category(p.categories_tags || []),
      aliases: p.brands ? [p.brands.slice(0, 500)] : [],
      packQuantity: qty,
      packUnit: unit,
      packLabel: pack.label.slice(0, 500),
      requiredAttributes: [],
      barcode: id,
    };
    const essential = essentialType(item, p.categories_tags || []);
    if (essential) item.aliases.push(essentialAlias(essential));
    const previous = items.get(id);
    if (
      previous &&
      (previous.packQuantity !== qty || previous.packUnit !== unit)
    )
      continue;
    items.set(id, item);
    stores.set(store.id, store);
    if (p.image_url) {
      try {
        const u = new URL(p.image_url);
        if (
          u.protocol === "https:" &&
          u.hostname === "images.openfoodfacts.org"
        )
          images[id] = u.href;
      } catch {
        /* no image */
      }
    }
    observations.set(String(x.id), {
      id: String(x.id),
      itemId: id,
      storeId: store.id,
      productCode: id,
      productLabel: item.name,
      packQuantity: qty,
      packUnit: item.packUnit,
      priceCents: cents,
      currency: "EUR",
      priceBasis: "pack",
      channel: "in_store",
      condition: "regular",
      matchBasis: "exact_barcode",
      matchNote:
        "Same barcode and package; regular price at the recorded physical store.",
      observedOn: x.date,
      retrievedAt,
      verification: "source_linked",
      source: {
        provider: "open_prices",
        recordId: String(x.id),
        recordUrl: `https://prices.openfoodfacts.org/prices/${x.id}`,
        proofId: String(x.proof_id),
      },
    });
  }
  return {
    refreshedAt: retrievedAt,
    stores: [...stores.values()],
    items: [...items.values()],
    observations: [...observations.values()],
    images,
  };
}
export function mergeMarkets(a: Market, b: Market): Market {
  const merge = <T extends { id: string }>(x: T[], y: T[]) => [
    ...new Map([...x, ...y].map((v) => [v.id, v])).values(),
  ];
  return {
    refreshedAt: b.refreshedAt,
    stores: merge(a.stores, b.stores),
    items: merge(a.items, b.items),
    observations: merge(a.observations, b.observations),
    images: { ...a.images, ...b.images },
  };
}
export function localDataset(
  market: Market,
  place: Place,
  radius: number,
  kept: CatalogItem[] = [],
  asOf = parisDate(),
): Dataset {
  const stores = market.stores
    .filter(
      (s) => isSupportedChain(s.chain) && haversineKm(place, s) <= radius,
    )
    .sort((a, b) => haversineKm(place, a) - haversineKm(place, b));
  const storeIds = new Set(stores.map((s) => s.id));
  const cutoff = new Date(`${asOf}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const observations = market.observations.filter(
    (o) =>
      storeIds.has(o.storeId) &&
      o.observedOn! <= asOf &&
      o.observedOn! >= cutoff.toISOString().slice(0, 10),
  );
  const ids = new Set(observations.map((o) => o.itemId));
  const exactItems = [
    ...new Map(
      [...market.items.filter((i) => ids.has(i.id)), ...kept].map((i) => [
        i.id,
        i,
      ]),
    ).values(),
  ];
  const exactItemsById = new Map(exactItems.map((item) => [item.id, item]));
  const comparableItems: CatalogItem[] = [];
  const comparableObservations: PriceObservation[] = [];
  const selectedProducts: NonNullable<Dataset["selectedProducts"]> = [];

  for (const specification of COMPARABLE_SPECS) {
    const matchingItems = exactItems.filter(
      (item) =>
        essentialType(item) === specification.essential &&
        item.packUnit === specification.packUnit &&
        item.packQuantity >= specification.sourceQuantityRange[0] &&
        item.packQuantity <= specification.sourceQuantityRange[1],
    );
    const matchingIds = new Set(matchingItems.map((item) => item.id));
    const byStore = new Map<string, PriceObservation[]>();
    observations
      .filter((observation) => matchingIds.has(observation.itemId))
      .forEach((observation) =>
        byStore.set(observation.storeId, [
          ...(byStore.get(observation.storeId) || []),
          observation,
        ]),
      );

    const selections: Array<{
      storeId: string;
      productCode: string;
      rows: PriceObservation[];
    }> = [];
    for (const [storeId, storeRows] of byStore) {
      const byProduct = new Map<string, PriceObservation[]>();
      storeRows.forEach((row) => {
        if (!row.productCode) return;
        byProduct.set(row.productCode, [
          ...(byProduct.get(row.productCode) || []),
          row,
        ]);
      });
      const candidates = [...byProduct].flatMap(([productCode, rows]) => {
        const latestDate = rows
          .map((row) => row.observedOn!)
          .sort()
          .at(-1);
        const latestRows = rows.filter((row) => row.observedOn === latestDate);
        const prices = new Set(latestRows.map((row) => row.priceCents));
        return latestDate && prices.size === 1
          ? [
              {
                productCode,
                rows,
                latestDate,
                priceCents: Math.round(
                  (latestRows[0].priceCents * specification.packQuantity) /
                    matchingItems.find((item) => item.id === productCode)!
                      .packQuantity,
                ),
              },
            ]
          : [];
      });
      const selected = candidates.sort(
        (left, right) =>
          left.priceCents - right.priceCents ||
          right.latestDate.localeCompare(left.latestDate) ||
          left.productCode.localeCompare(right.productCode),
      )[0];
      if (selected)
        selections.push({
          storeId,
          productCode: selected.productCode,
          rows: selected.rows,
        });
    }
    if (selections.length < 2) continue;

    const item: CatalogItem = {
      id: specification.id,
      name: specification.name,
      category: specification.category,
      aliases: [
        "Comparable essential",
        essentialAlias(specification.essential),
      ],
      packQuantity: specification.packQuantity,
      packUnit: specification.packUnit,
      packLabel: specification.packLabel,
      requiredAttributes: [...specification.attributes],
      barcode: null,
    };
    comparableItems.push(item);
    selections.forEach(({ storeId, productCode, rows }) => {
      selectedProducts.push({
        itemId: item.id,
        storeId,
        productCode,
        decision:
          "Lowest latest quantity-equivalent regular price among source-linked products matching this essential type.",
      });
      rows.forEach((row) => {
        const originalItem = exactItemsById.get(row.itemId)!;
        comparableObservations.push({
          ...row,
          id: `normalized:${item.id}:${row.id}`,
          itemId: item.id,
          productLabel: originalItem.name,
          packQuantity: item.packQuantity,
          packUnit: item.packUnit,
          packLabel: item.packLabel,
          attributes: [...item.requiredAttributes],
          priceCents: Math.round(
            (row.priceCents * item.packQuantity) /
              originalItem.packQuantity,
          ),
          priceBasis: "quantity_equivalent",
          sourcePackQuantity: originalItem.packQuantity,
          sourcePackUnit: originalItem.packUnit,
          sourcePackLabel: originalItem.packLabel,
          sourcePriceCents: row.priceCents,
          matchBasis: "normalized_unit",
          matchNote:
            `Quantity-equivalent ${item.packLabel} calculated from the observed ${originalItem.packLabel} source pack. BasketMap selected the lowest latest normalized regular price at this branch.`,
        });
      });
    });
  }

  return {
    schemaVersion: 1,
    id: "france-observed",
    version: market.refreshedAt,
    mode: "observed",
    title: "French supermarket prices",
    description: "Observed regular in-store prices",
    createdAt: market.refreshedAt,
    sources: SOURCES,
    stores,
    items: [
      ...new Map(
        [...exactItems, ...comparableItems].map((item) => [item.id, item]),
      ).values(),
    ],
    observations: [...comparableObservations, ...observations],
    selectedProducts,
  };
}
export const EMPTY_MARKET: Market = {
  refreshedAt: new Date().toISOString(),
  stores: [],
  items: [],
  observations: [],
  images: {},
};
async function json(url: string, signal: AbortSignal) {
  const r = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    credentials: "omit",
  });
  if (!r.ok) throw new Error("Price service temporarily unavailable");
  return r.json();
}
export async function fetchPrices(
  place: Place,
  radius: number,
  signal: AbortSignal,
  barcodes: string[] = [],
): Promise<{ market: Market; limited: boolean }> {
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(55000)]);
  const asOf = parisDate();
  const cutoff = new Date(`${asOf}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const params = new URLSearchParams({
    currency: "EUR",
    type: "PRODUCT",
    location__type: "OSM",
    lat: String(place.lat),
    lon: String(place.lon),
    radius_km: String(radius),
    date__gte: cutoff.toISOString().slice(0, 10),
    date__lte: asOf,
    price_is_discounted: "false",
    size: "100",
    order_by: "-date",
  });
  if (barcodes.length) params.set("product_code__in", barcodes.join(","));
  const rows: unknown[] = [];
  let pages = 1;
  for (let page = 1; page <= Math.min(pages, 100); page++) {
    params.set("page", String(page));
    const data = await json(
      `https://prices.openfoodfacts.org/api/v1/prices?${params}`,
      requestSignal,
    );
    if (!Array.isArray(data.items) || !Number.isInteger(data.pages))
      throw new Error("Unexpected price response");
    rows.push(...data.items);
    pages = data.pages;
  }
  return {
    market: normalizePrices(rows, new Date().toISOString(), asOf),
    limited: pages > 100,
  };
}
