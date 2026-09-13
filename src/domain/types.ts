export type DatasetMode = "demo" | "observed";
export type BaseUnit = "g" | "ml" | "count";
export type MatchBasis = "demo_spec" | "exact_barcode" | "curated_spec";
export type Verification = "synthetic" | "source_linked" | "human_checked";

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  packQuantity: number;
  packUnit: BaseUnit;
  packLabel: string;
  requiredAttributes: string[];
  barcode: string | null;
}
export interface Store {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  lat: number;
  lon: number;
  fictional: boolean;
  sourceUrl: string | null;
  osm: { type: "node" | "way" | "relation"; id: string } | null;
}
export interface SourceReference {
  provider: "synthetic" | "open_prices" | "manual";
  recordId: string | null;
  recordUrl: string | null;
  proofId: string | null;
}
export interface PriceObservation {
  id: string;
  itemId: string;
  storeId: string;
  productCode: string | null;
  productLabel: string;
  packQuantity: number;
  packUnit: BaseUnit;
  /** Required for curated matching: net weight alone does not describe the package. */
  packLabel?: string;
  /** Explicit defining attributes, required for curated matching. */
  attributes?: string[];
  priceCents: number;
  currency: "EUR";
  priceBasis: "pack";
  channel: "in_store" | "online" | "unknown";
  condition: "regular" | "promotion" | "loyalty" | "multibuy" | "unknown";
  matchBasis: MatchBasis;
  matchNote: string;
  observedOn: string | null;
  retrievedAt: string | null;
  verification: Verification;
  source: SourceReference;
}
export interface SelectedProductMapping {
  itemId: string;
  storeId: string;
  productCode: string;
  decision: string;
}
export interface Dataset {
  schemaVersion: 1;
  id: string;
  version: string;
  mode: DatasetMode;
  title: string;
  createdAt: string;
  description: string;
  sources: Array<{ name: string; url: string; license: string }>;
  stores: Store[];
  items: CatalogItem[];
  observations: PriceObservation[];
  selectedProducts?: SelectedProductMapping[];
}
export interface BasketLine {
  itemId: string;
  quantity: number;
}
export interface ComparisonSettings {
  origin: { lat: number; lon: number; label: string };
  radiusKm: number;
  maxObservationAgeDays: number;
  asOfDate: string;
}
export interface ResolvedBasketLine {
  itemId: string;
  quantity: number;
  item: CatalogItem;
  observation: PriceObservation | null;
  unitPriceCents: number | null;
  lineTotalCents: number | null;
  missingReason: string | null;
  sourceReferences: SourceReference[];
}
export interface StoreComparison {
  storeId: string;
  distanceKm: number;
  withinRadius: boolean;
  status: "empty" | "complete" | "incomplete";
  matchedLineCount: number;
  requestedLineCount: number;
  coverageRatio: number | null;
  completeTotalCents: number | null;
  knownSubtotalCents: number;
  missingItemIds: string[];
  excludedReasons: Array<{ itemId: string; reason: string }>;
  oldestObservationDate: string | null;
  newestObservationDate: string | null;
  lines: ResolvedBasketLine[];
}
export interface BaselineComparison {
  cheapest: StoreComparison;
  nearest: StoreComparison;
  differenceCents: number;
  extraDistanceKm: number;
  isSameStore: boolean;
  isPriceTie: boolean;
  completeStoreCount: number;
}
export interface ValidationError {
  path: string;
  message: string;
}
export type ValidationResult =
  | { success: true; data: Dataset }
  | { success: false; errors: ValidationError[] };
export type SelectionResult =
  | {
      status: "resolved";
      observation: PriceObservation;
      sourceReferences: SourceReference[];
      excludedReasons: string[];
    }
  | {
      status: "missing";
      observation: null;
      reason: string;
      sourceReferences: [];
      excludedReasons: string[];
    };
