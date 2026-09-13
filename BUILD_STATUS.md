# BasketMap build status

## Current local release candidate — 12 September 2026

- Restricted launch scope to Lyon and Paris, with Lyon as the default.
- Removed unrestricted city search and geolocation.
- Refreshed a focused two-city snapshot containing 2,275 observations, 2,006
  exact products, and 25 priced branches from the priority supermarket network.
- Fixed English/French essential search. Searching for `milk` now returns
  actual dairy milk rather than milk chocolate, cheese, or coconut milk.
- Added real comparable essentials using explicit package specifications and
  source-product mappings. Current examples include:
  - Lyon: six eggs across 3 stores, 500 g rice across 8, 500 g pasta across 4,
    250 g butter across 4, and 250 g ground coffee across 6.
  - Paris: 1 L milk, 500 g rice, and 250 g butter across 2 stores each.
- Added direct product selection and automatic shared-basket comparison. When
  the full list cannot be priced by two stores, the interface compares the
  largest common set and names store-specific exclusions separately. Partial
  totals stay secondary, and directions appear only for complete full baskets.
- Added an interactive homepage map, clearer purpose statement, dynamic chain
  coverage, author credit, and a white/deep-green visual system.
- Added a versioned saved-shopping-session flow. New visitors start empty;
  returning visitors resume their basket, city, and radius; and a confirmed
  “New basket” action clears saved products without changing the chosen area.
- Kept project narrative and research material out of the shopper flow.

## Validation

- TypeScript: pass.
- Production build: pass.
- Dataset validation: pass.
- Unit and service tests: 126 pass.
- Browser journeys: 11 pass locally, including:
  - real complete totals and source evidence;
  - automatic shared-product totals with explicit exclusions;
  - milk search;
  - Lyon/Paris-only location flow;
  - homepage and result map fallbacks;
  - mobile layout, persistence, and starting a new basket;
  - export, offline recovery, and browser tools.
- Desktop and 390 px mobile checks show no horizontal overflow or page errors.

## Publication

The verified changes are local and not yet on the public URL. The currently
recorded public application is the earlier synthetic portfolio release.
Publish this observed-price release to the existing project ID recorded in
`.openai/hosting.json`, then run the signed-out public browser checks and record
the deployed revision here.

## Known external limitation

Paris has substantially less comparable coverage than Lyon. The interface
states that limitation and never fills gaps with invented prices. Broader
complete baskets require additional retailer or licensed price feeds.
