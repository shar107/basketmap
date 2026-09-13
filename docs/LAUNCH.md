# BasketMap launch record

Public URL: https://basketmap.rufina-sharad.chatgpt.site

The currently recorded public deployment is Sites version 2, source
`e8be8d8b3645eb57256735f75c69b2bec9c19c36`. It is the rollback checkpoint and
predates the current Lyon-first observed-price application.

## Current local release candidate

The current application uses only source-linked observed supermarket prices in
the shopper experience. It opens in Lyon, supports Paris, requests newer Open
Prices records in the browser, and falls back to the bundled observed snapshot
when the upstream service is unavailable.

The bundled snapshot contains:

- 2,275 valid price observations;
- 2,006 exact products;
- 25 branches from the priority supermarket network;
- source links and observation dates for every retained price.

A fresh visitor starts with an empty basket. A returning visitor resumes the
basket, city, and radius saved in that browser. “New basket” clears the saved
products only after confirmation.

Any recorded product can be added without an interruption. If no two stores can
price the complete list, BasketMap compares the largest group of products
shared by at least two stores and lists the remaining products separately with
their recorded availability.

## Local verification

- TypeScript and production build: pass.
- Unit and service tests: 126 pass.
- Browser journeys: 11 pass.
- Dataset validation and observed-snapshot integrity checks: pass.
- Desktop and 390 px mobile journeys: no horizontal overflow.
- Street-map failure switches to a selectable non-overlapping coordinate map.

## Data limits

“Recent” means observed within the preceding 30 Paris-calendar days. These are
community-recorded regular in-store prices, not retailer inventory feeds.
BasketMap does not claim current stock, checkout-price guarantees, exhaustive
branch coverage, loyalty discounts, promotions, or delivery costs.

No interviews, usability sessions, measured demand, retention, realised
savings, or aggregate visitor analytics are claimed.

## Publication status

The observed-price release is verified locally but is not yet recorded as a new
Sites deployment. Publish the compiled `dist` directory to the existing project
ID in `.openai/hosting.json`, then run the signed-out browser journeys against
the public URL and update this record with the deployed revision.
