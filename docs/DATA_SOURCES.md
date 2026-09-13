# BasketMap data sources

## Active data mode

The shopper application uses observed prices only. Fictional stores and
synthetic prices are not loaded by the current application.

On startup BasketMap loads the bundled Lyon/Paris snapshot and requests newer
records from Open Prices. If that live request fails or is rate-limited, the
site continues with the bundled snapshot and says so visibly.

Snapshot retrieval time: `2026-09-12T21:58:30.723Z`.

| Coverage | Current snapshot |
| --- | ---: |
| Source-linked observations | 2,275 |
| Exact products | 2,006 |
| Physical supermarket branches | 25 |
| Launch cities | Lyon and Paris |

## Retention rules

A price is retained only when it has:

- EUR currency and a regular, non-discounted unit price;
- a valid 8–14 digit product barcode;
- a defined package quantity and unit;
- a French physical grocery location backed by OpenStreetMap;
- a matching proof location and traceable Open Prices record;
- an observation date no more than 30 days old;
- a branch in the configured priority supermarket network.

Current chains are Auchan, Carrefour, E.Leclerc, Intermarché, Lidl and
Monoprix. BasketMap does not silently fill missing prices or use unrelated
products to complete a total.

ALDI is supported by the chain filter, but the current snapshot contains no
ALDI branch with qualifying recent price records in Lyon or Paris. The shopper
interface reports that coverage gap instead of implying that ALDI prices are
available.

## Comparable essentials

Exact barcode products remain available. BasketMap additionally presents a
small set of comparable essentials only when at least two stores have
source-linked products matching the same essential type and displayed package
size. Each selected branch product retains its barcode, original product name,
observation date and evidence URL.

## Sources and licences

- Open Prices supplies price observations and evidence references under ODbL.
- Open Food Facts supplies product names, packages and product photographs.
- OpenStreetMap supplies physical store identity, coordinates and map tiles.

Contributor identities and receipt images are not copied into the public
snapshot.

## Limitations

Open Prices is a community-observation service, not a real-time retailer stock
or checkout feed. “Live refresh” means requesting the newest available
observations; it does not guarantee that a shelf price has not changed since it
was recorded. Paris currently has less comparable coverage than Lyon.
