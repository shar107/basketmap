export interface Coordinates {
  lat: number;
  lon: number;
}
export function validCoordinates(value: Coordinates): boolean {
  return (
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lon) &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lon) <= 180
  );
}
/** Approximate straight-line distance using mean Earth radius 6,371 km. */
export function haversineKm(
  origin: Coordinates,
  destination: Coordinates,
): number {
  if (!validCoordinates(origin) || !validCoordinates(destination))
    throw new Error("Coordinates are outside valid latitude/longitude bounds.");
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = rad(destination.lat - origin.lat);
  const deltaLon = rad(destination.lon - origin.lon);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(rad(origin.lat)) *
      Math.cos(rad(destination.lat)) *
      Math.sin(deltaLon / 2) ** 2;
  return 6_371 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}
