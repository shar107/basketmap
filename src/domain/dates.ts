/** Calendar dates are date-only values; observation age never uses retrieval timestamps. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}
export function ageInDays(observedOn: string, asOfDate: string): number {
  if (!isCalendarDate(observedOn) || !isCalendarDate(asOfDate))
    throw new Error("Expected a real calendar date (YYYY-MM-DD).");
  return (
    (Date.parse(`${asOfDate}T00:00:00Z`) -
      Date.parse(`${observedOn}T00:00:00Z`)) /
    86_400_000
  );
}
export function parisDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) =>
    parts.find((entry) => entry.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
