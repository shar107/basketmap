import { z } from "zod";
import { isCalendarDate } from "./dates";
import { matchingReason } from "./matching";
import type { Dataset, ValidationResult } from "./types";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_OBSERVATIONS = 10_000;
const id = z.string().trim().min(1).max(160);
const label = z.string().trim().min(1).max(500);
const text = z.string().max(5_000);
const calendarDate = z
  .string()
  .refine(isCalendarDate, "Expected a real calendar date (YYYY-MM-DD).");
const timestamp = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        value,
      ) &&
      isCalendarDate(value.slice(0, 10)) &&
      Number.isFinite(Date.parse(value)),
    "Expected a valid ISO timestamp with timezone.",
  );
const safeUrl = z
  .string()
  .max(2_000)
  .refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Expected an http(s) source URL.");
const sourceUrl = z.union([safeUrl, z.string().regex(/^#\/[a-zA-Z0-9/_-]*$/)]);
const unit = z.enum(["g", "ml", "count"]);
const quantity = z.number().finite().positive().max(1_000_000);
export const catalogItemSchema = z
  .object({
    id,
    name: label,
    category: label,
    aliases: z.array(label).max(30),
    packQuantity: quantity,
    packUnit: unit,
    packLabel: label,
    requiredAttributes: z.array(label).max(30),
    barcode: id.nullable(),
  })
  .strict();
export const storeSchema = z
  .object({
    id,
    name: label,
    chain: label.nullable(),
    address: label.nullable(),
    lat: z.number().finite().min(-90).max(90),
    lon: z.number().finite().min(-180).max(180),
    fictional: z.boolean(),
    sourceUrl: safeUrl.nullable(),
    osm: z
      .object({ type: z.enum(["node", "way", "relation"]), id })
      .strict()
      .nullable(),
  })
  .strict();
export const observationSchema = z
  .object({
    id,
    itemId: id,
    storeId: id,
    productCode: id.nullable(),
    productLabel: label,
    packQuantity: quantity,
    packUnit: unit,
    packLabel: label.optional(),
    attributes: z.array(label).max(30).optional(),
    priceCents: z
      .number()
      .int()
      .positive()
      .max(100_000, "A grocery pack cannot exceed €1,000 in this version."),
    currency: z.literal("EUR"),
    priceBasis: z.enum(["pack", "quantity_equivalent"]),
    sourcePackQuantity: quantity.optional(),
    sourcePackUnit: unit.optional(),
    sourcePackLabel: label.optional(),
    sourcePriceCents: z.number().int().positive().max(100_000).optional(),
    channel: z.enum(["in_store", "online", "unknown"]),
    condition: z.enum([
      "regular",
      "promotion",
      "loyalty",
      "multibuy",
      "unknown",
    ]),
    matchBasis: z.enum([
      "demo_spec",
      "exact_barcode",
      "curated_spec",
      "normalized_unit",
    ]),
    matchNote: text,
    observedOn: calendarDate.nullable(),
    retrievedAt: timestamp.nullable(),
    verification: z.enum(["synthetic", "source_linked", "human_checked"]),
    source: z
      .object({
        provider: z.enum(["synthetic", "open_prices", "manual"]),
        recordId: id.nullable(),
        recordUrl: safeUrl.nullable(),
        proofId: id.nullable(),
      })
      .strict(),
  })
  .strict();
const baseDatasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version: id,
    mode: z.enum(["demo", "observed"]),
    title: label,
    createdAt: timestamp,
    description: text,
    sources: z
      .array(z.object({ name: label, url: sourceUrl, license: label }).strict())
      .max(30),
    stores: z.array(storeSchema).min(1).max(250),
    items: z.array(catalogItemSchema).min(1).max(10_000),
    observations: z.array(observationSchema).max(MAX_OBSERVATIONS),
    selectedProducts: z
      .array(
        z
          .object({ itemId: id, storeId: id, productCode: id, decision: label })
          .strict(),
      )
      .max(5_000)
      .optional(),
  })
  .strict();
export const datasetSchema = baseDatasetSchema.superRefine((data, context) => {
  const issue = (path: (string | number)[], message: string) =>
    context.addIssue({ code: "custom", path, message });
  for (const collection of ["stores", "items", "observations"] as const) {
    const seen = new Set<string>();
    data[collection].forEach((entry, index) => {
      if (seen.has(entry.id))
        issue(
          [collection, index, "id"],
          `Duplicate ${collection} identifier: ${entry.id}`,
        );
      seen.add(entry.id);
    });
  }
  const items = new Map(data.items.map((item) => [item.id, item]));
  const stores = new Map(data.stores.map((store) => [store.id, store]));
  data.stores.forEach((store, index) => {
    if (data.mode === "demo" && !store.fictional)
      issue(
        ["stores", index, "fictional"],
        "Demo stores must be explicitly fictional.",
      );
    if (data.mode === "observed" && store.fictional)
      issue(
        ["stores", index, "fictional"],
        "Observed datasets require real stores.",
      );
  });
  data.observations.forEach((observation, index) => {
    const path: (string | number)[] = ["observations", index];
    const item = items.get(observation.itemId);
    if (!item)
      issue([...path, "itemId"], `Unknown catalog item: ${observation.itemId}`);
    if (!stores.has(observation.storeId))
      issue([...path, "storeId"], `Unknown store: ${observation.storeId}`);
    if (item) {
      const reason = matchingReason(item, observation);
      if (reason) issue(path, reason);
    }
    if (data.mode === "demo") {
      if (
        observation.verification !== "synthetic" ||
        observation.source.provider !== "synthetic" ||
        observation.observedOn !== null ||
        observation.matchBasis !== "demo_spec"
      )
        issue(
          path,
          "Demo records require synthetic source and verification, demo_spec matching, and no observation date.",
        );
    } else {
      if (
        observation.verification === "synthetic" ||
        observation.source.provider === "synthetic" ||
        observation.matchBasis === "demo_spec"
      )
        issue(path, "Synthetic records cannot enter an observed dataset.");
      if (observation.observedOn === null)
        issue(
          [...path, "observedOn"],
          "Observed records require their actual observation date.",
        );
      if (!observation.source.recordId && !observation.source.recordUrl)
        issue(
          [...path, "source"],
          "Observed records require a traceable source record ID or URL.",
        );
    }
  });
  const mappings = new Set<string>();
  data.selectedProducts?.forEach((mapping, index) => {
    const key = `${mapping.storeId}\u0000${mapping.itemId}`;
    if (mappings.has(key))
      issue(
        ["selectedProducts", index],
        "Only one product mapping is allowed per catalog item and store.",
      );
    mappings.add(key);
    if (!items.has(mapping.itemId) || !stores.has(mapping.storeId))
      issue(
        ["selectedProducts", index],
        "Product mapping references an unknown item or store.",
      );
    if (
      !data.observations.some(
        (observation) =>
          observation.itemId === mapping.itemId &&
          observation.storeId === mapping.storeId &&
          observation.productCode === mapping.productCode &&
          ["curated_spec", "normalized_unit"].includes(
            observation.matchBasis,
          ),
      )
    )
      issue(
        ["selectedProducts", index],
        "Product mapping requires a matching curated observation.",
      );
  });
});
export function validateDataset(input: unknown): ValidationResult {
  const result = datasetSchema.safeParse(input);
  if (!result.success)
    return {
      success: false,
      errors: result.error.issues
        .slice(0, 100)
        .map((issue) => ({
          path: issue.path.join(".") || "dataset",
          message: issue.message,
        })),
    };
  return { success: true, data: result.data as Dataset };
}
/** Pure, atomic import: caller applies data only after success and explicit preview confirmation. */
export function parseDatasetImport(json: string): ValidationResult {
  if (new TextEncoder().encode(json).byteLength > MAX_IMPORT_BYTES)
    return {
      success: false,
      errors: [
        { path: "file", message: "The dataset exceeds the 2 MB import limit." },
      ],
    };
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    return {
      success: false,
      errors: [{ path: "file", message: "This file is not valid JSON." }],
    };
  }
  return validateDataset(input);
}
