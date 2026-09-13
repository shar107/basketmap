import type { ComparisonSettings, Dataset, StoreComparison } from "../domain";
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[\s\uFEFF]*[=+@-]/.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function comparisonCSV(
  dataset: Dataset,
  comparisons: StoreComparison[],
  settings: ComparisonSettings,
  calculatedAt = new Date().toISOString(),
): string {
  const header = [
    "data_notice",
    "dataset_id",
    "dataset_version",
    "dataset_mode",
    "calculated_at",
    "as_of_date",
    "max_age_days",
    "store",
    "within_radius",
    "distance_km_straight_line",
    "basket_status",
    "complete_total_cents",
    "partial_subtotal_cents",
    "item_id",
    "item_specification",
    "pack_label",
    "quantity",
    "pack_price_cents",
    "pack_price_euros",
    "line_total_cents",
    "observed_on",
    "source_provider",
    "source_record_ids",
    "source_urls",
    "missing_status",
  ];
  const rows: unknown[][] = [header];
  for (const comparison of comparisons) {
    const store = dataset.stores.find((x) => x.id === comparison.storeId)!;
    const lines = comparison.lines.length ? comparison.lines : [null];
    for (const line of lines) {
      rows.push([
        dataset.mode === "demo"
          ? "SYNTHETIC EXAMPLE DATA — FICTIONAL STORES"
          : "OBSERVED SNAPSHOT — AVAILABILITY NOT CONFIRMED",
        dataset.id,
        dataset.version,
        dataset.mode,
        calculatedAt,
        settings.asOfDate,
        settings.maxObservationAgeDays,
        store.name,
        comparison.withinRadius,
        comparison.distanceKm.toFixed(3),
        comparison.status,
        comparison.completeTotalCents,
        comparison.status === "incomplete"
          ? comparison.knownSubtotalCents
          : null,
        line?.itemId,
        line?.item.name,
        line?.item.packLabel,
        line?.quantity,
        line?.unitPriceCents,
        line?.unitPriceCents == null
          ? ""
          : (line.unitPriceCents / 100).toFixed(2),
        line?.lineTotalCents,
        line?.observation?.observedOn,
        line?.observation?.source.provider,
        line?.sourceReferences.map((x) => x.recordId || "").join("; "),
        line?.sourceReferences.map((x) => x.recordUrl || "").join("; "),
        line?.missingReason || (line ? "priced" : "empty basket"),
      ]);
    }
  }
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
export function downloadFile(
  content: string,
  name: string,
  mime = "application/json",
) {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
