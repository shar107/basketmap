export type EventName =
  | "demo_opened"
  | "basket_edited"
  | "comparison_viewed"
  | "store_details_opened"
  | "radius_changed"
  | "comparison_shared"
  | "comparison_exported"
  | "map_fallback_used";
export interface QAEvent {
  name: EventName;
  at: string;
  properties: Record<string, string | number | boolean>;
}
const events: QAEvent[] = [];
const allowed = new Set([
  "datasetVersion",
  "appVersion",
  "action",
  "lineCount",
  "packCount",
  "mode",
  "completeStoreCount",
  "status",
  "radiusBucket",
  "eligibleStoreCount",
  "errorCategory",
]);
export function track(
  name: EventName,
  properties: Record<string, string | number | boolean> = {},
) {
  events.push({
    name,
    at: new Date().toISOString(),
    properties: Object.fromEntries(
      Object.entries(properties).filter(([key]) => allowed.has(key)),
    ),
  });
  if (events.length > 200) events.shift();
}
export function getEvents() {
  return [...events];
}
export function clearEvents() {
  events.length = 0;
}
