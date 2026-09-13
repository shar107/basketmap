# sharad.fr and BasketMap

Personal site: https://sharad.fr/

Live project: https://sharad.fr/projects/basketmap/

The repository contains two independently built frontends:

- `portfolio/` is the Astro personal site published at the domain root.
- the repository root is the React/Vite BasketMap application published at
  `/projects/basketmap/`.

BasketMap is a focused grocery-price comparison product for Lyon and Paris.
Visitors choose a city, build a basket, compare complete totals across real
supermarket branches, and then shop directly at the selected store.

The current bootstrap contains 2,275 valid source-linked price observations,
2,006 exact products, and 25 priced branches within 15 km of Lyon or Paris.
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
- Comparable essentials group real products only when their type and displayed
  pack size match. Each branch uses one explicitly selected source product and
  retains its original product label, observation date, barcode, and evidence
  link.
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

GitHub Actions publishes a combined GitHub Pages site:

- `https://sharad.fr/` contains the Astro portfolio from `portfolio/`.
- `https://sharad.fr/projects/basketmap/` contains the Vite application.

The workflow builds both applications, copies the portfolio to the deployment
root, and then copies BasketMap into its nested project directory. BasketMap is
built with `BASKETMAP_BASE_PATH` so assets, client-side navigation, downloads,
and data requests work beneath that URL. The existing Sites registration
remains in `.openai/hosting.json` as historical deployment metadata.

## Licence

BasketMap's original source code is available under the [MIT Licence](LICENSE).
Third-party software, data, maps, and product imagery retain their respective
licences and attribution requirements; see `THIRD_PARTY_NOTICES.md`,
`public/licenses.txt`, and `docs/DATA_SOURCES.md`.
