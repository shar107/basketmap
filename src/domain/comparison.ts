import { isCalendarDate } from "./dates";
import { haversineKm, validCoordinates } from "./distance";
import { selectObservation } from "./observations";
import type {
  BaselineComparison,
  BasketLine,
  ComparisonSettings,
  Dataset,
  ResolvedBasketLine,
  StoreComparison,
} from "./types";
/** Duplicate lines are merged by summing packs. Unknown items and quantities outside 1..20 are rejected. */
export function normalizeBasket(
  basket: BasketLine[],
  dataset: Dataset,
): BasketLine[] {
  if (!Array.isArray(basket) || basket.length > 500)
    throw new Error("Basket must be a list of up to 500 catalog lines.");
  const known = new Set(dataset.items.map((item) => item.id));
  const quantities = new Map<string, number>();
  for (const line of basket) {
    if (!line || typeof line.itemId !== "string" || !known.has(line.itemId))
      throw new Error(`Unknown basket item: ${line?.itemId ?? "(missing)"}`);
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 20
    )
      throw new Error("Pack quantities must be whole numbers from 1 to 20.");
    const quantity = (quantities.get(line.itemId) ?? 0) + line.quantity;
    if (quantity > 20)
      throw new Error(
        "Combined quantity for one catalog item cannot exceed 20 packs.",
      );
    quantities.set(line.itemId, quantity);
  }
  return [...quantities].map(([itemId, quantity]) => ({ itemId, quantity }));
}
export function compareBasket(
  dataset: Dataset,
  basket: BasketLine[],
  settings: ComparisonSettings,
): StoreComparison[] {
  if (
    !validCoordinates(settings.origin) ||
    !isCalendarDate(settings.asOfDate) ||
    !Number.isFinite(settings.radiusKm) ||
    settings.radiusKm < 0 ||
    !Number.isInteger(settings.maxObservationAgeDays) ||
    settings.maxObservationAgeDays < 0
  )
    throw new Error(
      "Invalid comparison origin, radius, reference date or observation age.",
    );
  const requested = normalizeBasket(basket, dataset);
  const items = new Map(dataset.items.map((item) => [item.id, item]));
  const records = new Map<string, Dataset["observations"]>();
  for (const observation of dataset.observations) {
    const key = JSON.stringify([observation.storeId, observation.itemId]);
    const group = records.get(key) ?? [];
    group.push(observation);
    records.set(key, group);
  }
  return dataset.stores.map((store) => {
    const excludedReasons: StoreComparison["excludedReasons"] = [];
    const lines: ResolvedBasketLine[] = requested.map((line) => {
      const item = items.get(line.itemId)!;
      const selected = selectObservation(
        item,
        store,
        {
          ...dataset,
          observations: records.get(JSON.stringify([store.id, item.id])) ?? [],
        },
        settings,
      );
      selected.excludedReasons.forEach((reason) =>
        excludedReasons.push({ itemId: item.id, reason }),
      );
      if (selected.status === "missing") {
        if (!selected.excludedReasons.includes(selected.reason))
          excludedReasons.push({ itemId: item.id, reason: selected.reason });
        return {
          ...line,
          item,
          observation: null,
          unitPriceCents: null,
          lineTotalCents: null,
          missingReason: selected.reason,
          sourceReferences: [],
        };
      }
      return {
        ...line,
        item,
        observation: selected.observation,
        unitPriceCents: selected.observation.priceCents,
        lineTotalCents: selected.observation.priceCents * line.quantity,
        missingReason: null,
        sourceReferences: selected.sourceReferences,
      };
    });
    const matchedLineCount = lines.filter(
      (line) => line.observation !== null,
    ).length;
    const status =
      lines.length === 0
        ? "empty"
        : matchedLineCount === lines.length
          ? "complete"
          : "incomplete";
    const knownSubtotalCents = lines.reduce(
      (sum, line) => sum + (line.lineTotalCents ?? 0),
      0,
    );
    const dates = lines
      .flatMap((line) =>
        line.observation?.observedOn ? [line.observation.observedOn] : [],
      )
      .sort();
    const distanceKm = haversineKm(settings.origin, store);
    return {
      storeId: store.id,
      distanceKm,
      withinRadius: distanceKm <= settings.radiusKm,
      status,
      matchedLineCount,
      requestedLineCount: lines.length,
      coverageRatio: lines.length ? matchedLineCount / lines.length : null,
      completeTotalCents: status === "complete" ? knownSubtotalCents : null,
      knownSubtotalCents,
      missingItemIds: lines
        .filter((line) => line.observation === null)
        .map((line) => line.itemId),
      excludedReasons,
      oldestObservationDate: dates[0] ?? null,
      newestObservationDate: dates.at(-1) ?? null,
      lines,
    };
  });
}
export function rankCompleteStores(
  comparisons: StoreComparison[],
): StoreComparison[] {
  return comparisons
    .filter(
      (comparison) =>
        comparison.withinRadius &&
        comparison.status === "complete" &&
        comparison.completeTotalCents !== null,
    )
    .sort(
      (a, b) =>
        a.completeTotalCents! - b.completeTotalCents! ||
        a.distanceKm - b.distanceKm ||
        a.storeId.localeCompare(b.storeId),
    );
}
export function rankIncompleteStores(
  comparisons: StoreComparison[],
): StoreComparison[] {
  return comparisons
    .filter(
      (comparison) =>
        comparison.withinRadius && comparison.status === "incomplete",
    )
    .sort(
      (a, b) =>
        (b.coverageRatio ?? 0) - (a.coverageRatio ?? 0) ||
        a.distanceKm - b.distanceKm ||
        a.storeId.localeCompare(b.storeId),
    );
}
export function compareCheapestWithNearest(
  comparisons: StoreComparison[],
): BaselineComparison | null {
  const complete = rankCompleteStores(comparisons);
  if (complete.length < 2) return null;
  const cheapest = complete[0];
  const nearest = [...complete].sort(
    (a, b) => a.distanceKm - b.distanceKm || a.storeId.localeCompare(b.storeId),
  )[0];
  return {
    cheapest,
    nearest,
    differenceCents: nearest.completeTotalCents! - cheapest.completeTotalCents!,
    extraDistanceKm: cheapest.distanceKm - nearest.distanceKm,
    isSameStore: cheapest.storeId === nearest.storeId,
    isPriceTie:
      complete.filter(
        (store) => store.completeTotalCents === cheapest.completeTotalCents,
      ).length > 1,
    completeStoreCount: complete.length,
  };
}
export function lowestPriceStoreIds(comparisons: StoreComparison[]): string[] {
  const ranked = rankCompleteStores(comparisons);
  return ranked
    .filter(
      (comparison) =>
        comparison.completeTotalCents === ranked[0]?.completeTotalCents,
    )
    .map((comparison) => comparison.storeId);
}
