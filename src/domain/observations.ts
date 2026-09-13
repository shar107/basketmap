import { ageInDays } from "./dates";
import { matchingReason } from "./matching";
import type {
  CatalogItem,
  Store,
  Dataset,
  ComparisonSettings,
  PriceObservation,
  SelectionResult,
} from "./types";
function exclusionReason(
  item: CatalogItem,
  observation: PriceObservation,
  dataset: Dataset,
  settings: ComparisonSettings,
): string | null {
  const mismatch = matchingReason(item, observation);
  if (mismatch) return mismatch;
  if (observation.currency !== "EUR")
    return "Only EUR prices are eligible.";
  if (
    (observation.matchBasis === "normalized_unit" &&
      observation.priceBasis !== "quantity_equivalent") ||
    (observation.matchBasis !== "normalized_unit" &&
      observation.priceBasis !== "pack")
  )
    return "The observation price basis does not match its product matching method.";
  if (
    !Number.isSafeInteger(observation.priceCents) ||
    observation.priceCents <= 0 ||
    observation.priceCents > 100_000
  )
    return "The pack price is invalid or exceeds the €1,000 limit.";
  if (observation.channel !== "in_store")
    return "Only in-store observations are eligible.";
  if (observation.condition !== "regular")
    return "Only regular prices are eligible; promotions, loyalty and multibuy prices are excluded.";
  if (dataset.mode === "demo") {
    if (
      observation.verification !== "synthetic" ||
      observation.source.provider !== "synthetic" ||
      observation.matchBasis !== "demo_spec" ||
      observation.observedOn !== null
    )
      return "Demo records must be synthetic and cannot carry observation dates.";
  } else {
    if (
      observation.verification === "synthetic" ||
      observation.source.provider === "synthetic" ||
      observation.matchBasis === "demo_spec"
    )
      return "Synthetic records cannot enter an observed comparison.";
    if (!observation.source.recordId && !observation.source.recordUrl)
      return "The observation has no traceable source reference.";
    if (!observation.observedOn) return "The observation date is missing.";
    let age: number;
    try {
      age = ageInDays(observation.observedOn, settings.asOfDate);
    } catch {
      return "The observation date is invalid.";
    }
    if (age < 0) return "Future observation dates are excluded.";
    if (age > settings.maxObservationAgeDays)
      return `Observation is older than the selected ${settings.maxObservationAgeDays}-day maximum.`;
  }
  return null;
}
export function selectObservation(
  item: CatalogItem,
  store: Store,
  dataset: Dataset,
  settings: ComparisonSettings,
): SelectionResult {
  const excludedReasons: string[] = [];
  const missing = (reason: string): SelectionResult => ({
    status: "missing",
    observation: null,
    reason,
    sourceReferences: [],
    excludedReasons: [...new Set(excludedReasons)],
  });
  if (
    (dataset.mode === "demo" && !store.fictional) ||
    (dataset.mode === "observed" && store.fictional)
  )
    return missing("The store does not belong to this dataset mode.");
  const records = dataset.observations.filter(
    (observation) =>
      observation.storeId === store.id && observation.itemId === item.id,
  );
  let eligible = records.filter((observation) => {
    const reason = exclusionReason(item, observation, dataset, settings);
    if (reason) excludedReasons.push(reason);
    return reason === null;
  });
  if (!eligible.length)
    return missing(
      records.length
        ? [...new Set(excludedReasons)].join(" ")
        : "No price is recorded for this item at this store.",
    );
  if (
    eligible.some((observation) =>
      ["curated_spec", "normalized_unit"].includes(observation.matchBasis),
    )
  ) {
    const mapping = dataset.selectedProducts?.find(
      (candidate) =>
        candidate.itemId === item.id && candidate.storeId === store.id,
    );
    if (mapping) {
      const before = eligible.length;
      eligible = eligible.filter(
        (observation) => observation.productCode === mapping.productCode,
      );
      if (before !== eligible.length)
        excludedReasons.push(
          "A different product was excluded by the explicit selected-product mapping.",
        );
      if (!eligible.length)
        return missing(
          "The explicitly selected product has no eligible observation.",
        );
    } else if (
      new Set(eligible.map((observation) => observation.productCode)).size > 1
    ) {
      return missing(
        "Several products match this curated specification. An explicit selected-product mapping is required.",
      );
    }
  }
  const latestDate =
    dataset.mode === "observed"
      ? eligible
          .map((observation) => observation.observedOn!)
          .sort()
          .at(-1)!
      : null;
  const latest = eligible.filter(
    (observation) => observation.observedOn === latestDate,
  );
  if (new Set(latest.map((observation) => observation.priceCents)).size > 1)
    return missing(
      "Conflicting prices on the latest eligible day leave this item unresolved.",
    );
  const sorted = [...latest].sort((a, b) => a.id.localeCompare(b.id));
  const sourceReferences = [
    ...new Map(
      sorted.map((observation) => [
        JSON.stringify(observation.source),
        observation.source,
      ]),
    ).values(),
  ];
  return {
    status: "resolved",
    observation: sorted[0],
    sourceReferences,
    excludedReasons: [...new Set(excludedReasons)],
  };
}
