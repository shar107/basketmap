# BasketMap

Live project: https://sharad.fr/projects/basketmap/

Personal site repository:
[`shar107/sharad-fr`](https://github.com/shar107/sharad-fr)

BasketMap is a focused grocery-price comparison product for Lyon and Paris.
Visitors choose a city, build a basket, compare complete totals across real
supermarket branches, and then shop directly at the selected store.

The current bootstrap contains 2,270 valid source-linked price observations,
2,002 exact products, and 25 priced branches within 15 km of Lyon or Paris.
BasketMap requests newer Open Prices records when it opens and retains this
bundled snapshot as an availability fallback. Prices are community-observed
regular in-store records from the preceding 30 days; they are not live shelf
inventory, and coverage and stock are not guaranteed.

## Product behaviour

- Lyon is the default launch city; Paris is the second supported city.
- A fresh visitor starts with an empty basket. A returning visitor resumes the
  basket, city, and radius saved in that browser.
- “New basket” deliberately clears saved products after confirmation while
  retaining the selected city and radius.
- There is no unrestricted location or postcode search.
- The homepage explains the product immediately and includes an interactive
  store map.
- The catalog is a separate `/shop` view. Visitors must choose “Start your
  shopping list” before product search and basket-building controls appear.
- Exact branded products remain searchable by name or barcode.
- Comparable product groupings use real products only when their type and
  displayed pack size match. Each branch uses one explicitly selected source
  product and retains its original product label, observation date, barcode,
  and evidence link.
- Any recorded product can be added directly. Products show whether they are
  shared across stores or may need to be listed separately.
- When no two stores can price the full basket, BasketMap automatically totals
  the largest set of products shared by at least two stores. Products outside
  that set remain in the shopping list and are named separately with their
  observed availability.
- Partial store subtotals never become a cheapest-store recommendation.
- Directions appear only for a complete full-basket result.

## Run and verify

Node 24 is recorded in `.nvmrc`.

```sh
npm ci
npm run dev
npm run typecheck
npm run test -- --run
npm run build
npm run validate:data
npm run test:e2e
```

Browser tests expect the development server on port 5173, or the URL supplied
through `BASKETMAP_TEST_URL`.

## Data refresh

```sh
npm run sync:prices
```

The refresh queries Open Prices separately for Lyon and Paris using stable
ascending price IDs, validates every row, strips contributor identities, and
replaces the snapshot only after valid observations are available.

Price observations require:

- a real French physical grocery location;
- an exact barcode and defined package;
- a regular, non-discounted EUR pack price;
- a traceable price record and proof;
- an observation date within the configured freshness window.

Comparable essential mappings are derived locally from those exact records.
They do not create prices or merge incompatible package sizes.

## Privacy and limitations

The basket is stored on the visitor's device. There are no accounts, receipt
uploads, precise geolocation, or external analytics collection. Map tiles are
requested from OpenStreetMap and reveal the displayed viewport to that service.

Open Prices coverage remains uneven. BasketMap reports missing data explicitly;
comprehensive branch-level pricing and stock would require retailer or licensed
commercial feeds.

## Deployment

This repository owns BasketMap's source, tests, and validation workflow. The
independent [`shar107/sharad-fr`](https://github.com/shar107/sharad-fr)
deployment checks out this repository, builds it with the
`/projects/basketmap/` base path, and mounts the static output at the public URL.

The Sharad.fr workflow refreshes project sources hourly and can also be
dispatched immediately after a project change. The existing Sites registration
remains in `.openai/hosting.json` as historical deployment metadata.

## Licence

BasketMap's original source code is available under the [MIT Licence](LICENSE).
Third-party software, data, maps, and product imagery retain their respective
licences and attribution requirements; see `THIRD_PARTY_NOTICES.md`,
`public/licenses.txt`, and `docs/DATA_SOURCES.md`.
