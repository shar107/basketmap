# Third-party notices

Source pages were checked on 12 September 2026. This file separates application dependencies, inspiration, and potential data sources. Installed runtime dependency license texts are included under public/licenses and distributed at /licenses/. Their versioned index is /licenses/index.json.

## Original work and inspiration

BasketMap's frontend, comparison logic, and synthetic example dataset are original work created for this project with coding-agent assistance. Fictional shop names and prices do not represent actual retailers. No product photographs, retailer logos, or receipt images are used.

[GroceryGuru by LuckyLuciano97](https://github.com/LuckyLuciano97/GroceryGuru) inspired comparing complete grocery baskets and keeping incomplete results separate. Its repository identifies the [Apache-2.0 license](https://github.com/LuckyLuciano97/GroceryGuru/blob/main/LICENSE). No GroceryGuru source code or data is copied into BasketMap.

## Application dependencies

| Component         | Role                    | Primary license reference                                            |
| ----------------- | ----------------------- | -------------------------------------------------------------------- |
| React / React DOM | User interface          | [MIT](https://github.com/react/react/blob/main/LICENSE)              |
| Vite              | Build tooling           | [MIT](https://github.com/vitejs/vite/blob/main/LICENSE)              |
| Leaflet           | Interactive map library | [BSD-2-Clause](https://github.com/Leaflet/Leaflet/blob/main/LICENSE) |

The distribution also includes Zod (MIT), Lucide React (ISC; icon notices retained) and React Scheduler (MIT). See public/licenses/index.json for exact installed versions and full notice files. The lockfile records all build and test dependencies.

## Map and data sources

Map data is © OpenStreetMap contributors and is available under the [Open Database License](https://www.openstreetmap.org/copyright). The application must show visible linked attribution on its basemap. Standard map tiles are subject to the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), including best-effort availability, ordinary browser caching/referrers, and no bulk download or prefetch. Fictional BasketMap shop points and synthetic prices are not contributed by OpenStreetMap.

The [Open Prices dataset card](https://huggingface.co/datasets/openfoodfacts/open-prices) identifies ODbL. No normalized observed price snapshot is included. The aggregate coverage report at /data/open-prices-coverage.json is derived from the bounded Open Prices query and attributed under ODbL. No contributor identities, raw receipt images or copied product photographs are published.

The [Open Prices application repository](https://github.com/openfoodfacts/open-prices) identifies AGPL-3.0 for its server code. BasketMap has not copied that server implementation. This code license is distinct from the dataset's license.

No live-price partnership, price audit, or endorsement by these projects is implied.
