# BasketMap: full project context, decision history, and GitHub-to-Vercel deployment runbook

Prepared 12 September 2026.

This document is the durable handoff for BasketMap. It records where the
project began, what changed, why those changes were made, the current technical
and product state, the trade-offs and failures encountered, and the exact
recommended path for publishing the complete repository on GitHub and deploying
the application through Vercel.

## 1. Executive summary

BasketMap is a client-side grocery basket comparison website focused on Lyon
and Paris. A visitor creates a basket, sees which products can be compared
across multiple nearby supermarket branches, compares honest totals for the
shared products, and sees store-specific products listed separately rather than
silently treated as free or missing.

The project began as a deliberately fictional Paris portfolio prototype. It
then pivoted into an observed-price product using recent, source-linked records
from Open Prices, product information and images from Open Food Facts, and store
locations and map tiles from OpenStreetMap.

The current local release candidate:

- opens in Lyon by default and also supports Paris;
- starts a new visitor with an empty basket;
- resumes a returning visitor's basket, city, and radius on the same device;
- provides a confirmed **New basket** action;
- uses a bundled observed-price snapshot and attempts a newer browser-side
  refresh from Open Prices;
- compares a complete basket when at least two stores can price it;
- otherwise compares the largest useful subset shared by at least two stores;
- explicitly separates **Compared** and **Not compared** products;
- disables the comparison button after the comparison is displayed;
- keeps source dates and evidence links attached to observations;
- uses a compact supermarket-brand area beside the map;
- uses the accepted green, yellow, white, rounded-card visual system inspired
  by modern grocery-shopping applications;
- passes 126 unit/service tests and 11 Playwright browser journeys;
- builds successfully as a static Vite application;
- has no required backend, database, account system, paid API, or secret key.

The current local code is ahead of the recorded ChatGPT Sites deployment. It has
not yet been pushed to a GitHub remote or deployed to Vercel.

## 2. The original problem and brief

The original product question was:

> Among the stores and prices covered here, where can I get my whole basket for
> the lowest total within my chosen distance?

The product was conceived for a product-management portfolio. The initial
audience hypothesis was students and young professionals in Paris who wanted to
control grocery spending while making one supermarket visit.

The important original principles were:

1. Compare a complete basket, not isolated cheap products.
2. Never represent a missing price as zero.
3. Keep price and distance visible as separate considerations.
4. Help the visitor choose one supermarket rather than optimize a route across
   several stores.
5. Make the product usable without an account.
6. Make every data claim defensible.
7. Publish a working version early.

The original brief deliberately prioritized a fictional, deterministic demo
because real French branch-level price overlap was uncertain. It specified:

- React, TypeScript, and Vite;
- plain responsive CSS;
- Leaflet without a map API key;
- local JSON data;
- Zod validation;
- pure TypeScript comparison logic;
- localStorage persistence;
- Vitest and Playwright verification;
- static hosting, preferably Vercel if another managed host was unavailable.

The original source brief remains at:

`/Users/sharaaad/Downloads/BasketMap_Codex_Build_Brief.md`

## 3. How the project evolved

### Phase 1: the synthetic interactive demo

The first implementation followed the original risk-reduction strategy:

- four fictional stores around Bastille in Paris;
- 24 fixed grocery specifications;
- synthetic prices;
- a preloaded sample basket;
- complete and incomplete store calculations;
- straight-line distance;
- result cards, map markers, and detailed line-item evidence;
- local basket persistence;
- responsive browser behavior;
- explicit notices that the stores and prices were fictional.

The deterministic golden example made the comparison engine testable:

- the same basket had known expected totals;
- an incomplete store could not receive a cheapest-store badge;
- removing an item could make that store complete;
- tests could catch incorrect ranking and missing-item arithmetic.

The first major commit was:

`e46e6ff — Build BasketMap interactive demo with validated comparisons and map`

### Phase 2: portfolio and reproducibility features

The project then implemented much of the original P1 portfolio scope:

- shareable basket state;
- CSV export;
- validated local data import;
- a tools page;
- dataset and coverage documentation;
- local-only event instrumentation;
- stronger domain validation;
- expanded unit and browser tests;
- source and licence notices;
- public launch records and acceptance checks.

The relevant commits included:

- `e8be8d8 — Add reproducible sharing, exports, local data tools and observed coverage report`
- `853b6c8 — Record verified public release and final test evidence`

This stage produced a defensible prototype, but it was still fundamentally a
demo. It proved the interaction and arithmetic, not real grocery value.

### Phase 3: pivot from fictional data to observed French prices

The owner explicitly rejected a fictional demo as the final product and asked
for real observed data. That changed the product more deeply than a simple data
replacement.

The application was rebuilt around:

- Open Prices observations;
- Open Food Facts product identity, pack metadata, and images;
- OpenStreetMap-backed physical branches;
- a local `france-market.json` snapshot;
- browser-side attempts to retrieve newer records;
- evidence URLs and observation dates;
- filtering for regular in-store EUR pack prices;
- exact barcodes and validated package information.

The main pivot commit was:

`6476f52 — Replace public demo with real French grocery prices and simplify shopping experience`

The real-data version was also published once during the earlier development
cycle, represented by:

`a5428a5 — Record successful real-data public release`

The current local release has moved beyond that deployment.

### Phase 4: narrow the geography and make Lyon primary

The broad French-market concept produced too much irrelevant coverage and weak
comparability. The scope was narrowed deliberately:

- only Lyon and Paris remain;
- Lyon is the default because that is the owner's current city;
- unrestricted postcode, geolocation, and nationwide search were removed;
- the default radius remains locally configurable;
- Paris remains available but has visibly weaker overlap.

This was not merely a design preference. Narrowing the geography improved:

- product relevance;
- store-map usefulness;
- performance;
- the chance that observations would overlap;
- the clarity of the launch story.

The main baseline commit was:

`21ae3e9 — Focus BasketMap on comparable Lyon and Paris baskets`

### Phase 5: rationalize supermarket coverage

The visible chain list was adjusted to match the owner's expectations and the
available observed data.

Decisions included:

- remove Super U from the current priority network;
- prioritize chains with a stronger everyday presence across Lyon and Paris;
- show Carrefour, Auchan, Intermarché, Monoprix, Lidl, E.Leclerc, and ALDI in
  the intended brand system;
- support ALDI in the chain filter;
- state honestly that the current snapshot has no qualifying recent ALDI branch
  records rather than fabricating ALDI prices.

Current qualifying snapshot chains are Auchan, Carrefour, E.Leclerc,
Intermarché, Lidl, and Monoprix.

### Phase 6: solve the incomplete-basket problem properly

Real observed data is sparse. A product may appear at one supermarket and be
absent from all others. The earlier design warned the visitor before adding
such a product and could then fail to show a useful comparison.

That flow was confusing and placed too much responsibility on the visitor.

The revised behavior is:

1. Any recorded product can be added directly.
2. BasketMap first looks for stores that can price the complete basket.
3. If at least two stores can price the whole basket, it compares complete
   totals.
4. Otherwise, it finds the largest group of basket products shared by at least
   two stores.
5. It compares only those shared products.
6. Products outside the shared group remain saved in the basket.
7. Those products are explicitly listed under **Not compared** with their
   observed availability.
8. Partial store subtotals never become a cheapest-store recommendation.

This preserved utility without lying about coverage.

### Phase 7: improve persistence and basket lifecycle

The original demo began with a preloaded basket. The owner wanted the product
to behave like a real shopper tool.

The current behavior is:

- a genuinely new visitor starts empty;
- basket, city, and radius are stored in a versioned browser session;
- a returning visitor resumes where they stopped;
- obsolete or invalid saved records are handled without crashing;
- storage failure leaves the session usable in memory;
- **New basket** asks for confirmation and clears products while retaining the
  selected city and radius.

### Phase 8: clarify the comparison experience

The comparison screen went through several revisions because it originally had
too much text and weak visual hierarchy.

The accepted interaction includes:

- a visible **Compared** product group;
- a visible **Not compared** product group;
- product thumbnails in both groups;
- status icons beside each basket line;
- a store count and product count;
- totals labelled as full-basket or shared-product totals;
- a disabled **Comparison shown** button after the comparison is opened;
- no repeated modal asking whether a product should be added;
- no implication that excluded products are included in the store totals.

### Phase 9: restructure the map and supermarket discovery area

The homepage map originally occupied too much visual space. The owner requested
a more useful store-first layout.

The revised structure:

- gives supermarket brands a dedicated left-side area;
- places a smaller map to the right on desktop;
- avoids a vertically scrolling supermarket list;
- uses a compact static brand grid;
- keeps city selection near the map;
- retains a selectable coordinate fallback when map tiles fail.

### Phase 10: visual-design pivots

The visual system changed several times:

1. An early muted white, cream, and deep-green interface was functional but
   felt generic and incomplete.
2. A grocery-delivery Behance reference pushed the interface toward a brighter,
   whiter consumer-shopping style.
3. A Babette's-inspired editorial direction introduced black, orange, coral,
   condensed display typography, hard borders, and poster-like composition.
   It was implemented successfully but rejected after seeing it in the real
   product because it felt too editorial and visually heavy.
4. The current accepted direction is based on the visual principles of a modern
   Instacart-style grocery application:
   - fresh green and yellow;
   - white and pale-green surfaces;
   - rounded cards and pill controls;
   - soft shadows;
   - large product imagery;
   - simple sans-serif typography;
   - clear commerce-oriented actions;
   - friendly rather than luxurious or experimental presentation.

The final direction is a translation of those principles into BasketMap. It
does not copy the Instacart name, assets, or proprietary interface screens.

## 4. Current product behavior

### First visit

- The default city is Lyon.
- The basket is empty.
- The homepage explains the product.
- The visitor can explore supported supermarket brands and branch positions.
- Product search accepts names, local aliases, and barcodes.

### Product selection

- Exact observed products remain selectable.
- Comparable essentials are created only when real source products match the
  same essential type and displayed package size.
- Products show recent observed prices and store coverage.
- Products can be added without an interruption.

### Comparison

- Quantities are whole packs.
- Complete basket totals are preferred.
- When full overlap is unavailable, the largest useful shared product set is
  compared.
- Non-shared products remain visible but are excluded from totals.
- Store details preserve evidence and observation dates.
- Directions are shown only for valid complete full-basket results.

### Returning visit

- The saved basket, city, and radius are restored from browser storage.
- There is no account or cross-device synchronization.

### Failure behavior

- If Open Prices refresh fails, the bundled observed snapshot remains usable.
- If OpenStreetMap tiles fail, the user can select stores on a coordinate plot.
- If browser storage is unavailable, the current session remains usable.
- Missing prices remain missing.

## 5. Current data model and evidence policy

The bundled snapshot currently contains:

| Measure | Current local snapshot |
| --- | ---: |
| Valid source-linked observations | 2,275 |
| Exact products | 2,006 |
| Priced physical branches | 25 |
| Supported launch cities | 2 |
| Bundled snapshot size | Approximately 2 MB |

A retained observation requires:

- EUR currency;
- a regular, non-discounted price;
- a valid product barcode;
- a defined package quantity and unit;
- a French physical grocery branch;
- a traceable Open Prices record and proof;
- an observation date within the configured 30-day window;
- a branch in the configured priority chain network.

The browser may request newer available records. This is not a retailer
inventory feed and must not be described as guaranteed real-time shelf or
checkout pricing.

### What “recent” means

“Recent” is a BasketMap policy: an observation from the previous 30
Paris-calendar days. It does not guarantee:

- current stock;
- an unchanged shelf price;
- an unchanged checkout price;
- promotion eligibility;
- loyalty pricing;
- delivery pricing;
- complete branch coverage.

### Source responsibilities

- **Open Prices:** observed price records and evidence references.
- **Open Food Facts:** product identity, package metadata, and available product
  photographs.
- **OpenStreetMap:** physical store identity, coordinates, and map tiles.

Contributor identities and receipt images are not copied into the public
snapshot.

## 6. Important product and engineering decisions

| Decision | Why it was chosen | Trade-off |
| --- | --- | --- |
| One store per basket | The product supports one clear shopping decision. | A multi-store split could be cheaper but creates route and time optimization. |
| Whole packs | Keeps quantities and line totals unambiguous. | No arbitrary gram-level fulfillment or pack substitution. |
| Missing is not zero | Prevents incomplete stores from appearing artificially cheap. | Fewer stores qualify for a complete result. |
| Shared-subset fallback | Preserves usefulness when observed overlap is sparse. | The displayed total may not cover the visitor's entire shopping list. |
| Explicit excluded products | Makes shared totals interpretable. | Adds visual complexity to the result screen. |
| Lyon first, Paris second | Matches the owner's current context and stronger local overlap. | The product is not a nationwide French comparison service. |
| Selected chain network | Improves relevance and avoids weak long-tail store coverage. | Excludes some real observations and chains. |
| ALDI shown without invented data | Reflects user expectation while preserving evidence integrity. | ALDI currently cannot participate in comparisons. |
| 30-day freshness cutoff | Balances recency and scarce community data. | A recent price may still have changed; an older useful observation is excluded. |
| Exact barcode and package evidence | Reduces false equivalence. | Brand-agnostic comparison coverage remains limited. |
| Carefully curated essentials | Allows some cross-store staple comparison using real records. | Requires explicit type and package rules and cannot cover arbitrary products. |
| Bundled snapshot plus browser refresh | Keeps the site usable when upstream services fail. | The bundle can be older than newly available upstream observations. |
| Client-only architecture | Cheap, private, and simple static deployment. | No accounts, household sharing, central analytics, or cross-device state. |
| localStorage persistence | Supports return visits without sign-in. | State remains device- and browser-specific. |
| Leaflet plus map fallback | Useful map without a paid map key. | Public tile services are external dependencies and the fallback has no streets. |
| Hash-based secondary routes | Static hosts can serve them without server routing rules. | Hash URLs are less elegant than path-based routing. |
| No external analytics | Avoids privacy and implementation overhead. | No aggregate funnel or retention evidence. |
| Iterative visual redesign | Real rendered screens revealed preferences that static references did not. | The stylesheet contains layered historical overrides and should eventually be simplified. |

## 7. Problems encountered and how they were addressed

### Problem: the first version was only a fictional demo

**Impact:** It could demonstrate product thinking but could not make a genuine
shopping recommendation.

**Resolution:** Replace the active shopper experience with validated observed
prices and keep source evidence attached.

### Problem: observed data did not overlap cleanly

**Impact:** Full baskets frequently had only one qualifying store or no
multi-store comparison.

**Resolution:** Introduce comparable essentials and automatic shared-subset
comparison while keeping excluded items visible.

### Problem: adding a store-specific product destroyed the comparison

**Impact:** The visitor could add the item but then see no useful price table.

**Resolution:** Always retain the basket, compare the common products, and
explain exactly which products are excluded.

### Problem: warning modals interrupted shopping

**Impact:** Visitors had to make a technical coverage decision before adding a
product.

**Resolution:** Remove the add-warning flow and make coverage handling
automatic.

### Problem: the comparison page was text-heavy and confusing

**Impact:** Visitors could not quickly distinguish compared from excluded
products.

**Resolution:** Introduce separate product groups, thumbnails, status icons,
clear counts, and a disabled post-comparison button.

### Problem: product imagery was inconsistent

**Impact:** Some Open Food Facts records had missing or unavailable images.

**Resolution:** Maintain multiple candidate image URLs, move to the next image
after a load failure, and provide a category-based visual fallback rather than
a broken image.

### Problem: the map dominated the homepage

**Impact:** Store discovery and the core shopping action felt secondary.

**Resolution:** Reduce the map, pair it with a static supermarket-brand grid,
and avoid a scrolling chain list.

### Problem: chain coverage did not match owner expectations

**Impact:** Super U appeared prominently while ALDI was absent.

**Resolution:** Remove Super U from the priority network, support ALDI in the
visible chain system, and disclose that qualifying ALDI observations are
currently unavailable.

### Problem: map tiles can fail in automated or restricted environments

**Impact:** The map could become blank and store selection could be lost.

**Resolution:** Automatically offer a non-overlapping coordinate plot with
selectable markers and explicit “no streets or route information” language.

### Problem: saved state can become invalid

**Impact:** Old product IDs or blocked storage could crash or confuse the app.

**Resolution:** Add versioned schema validation, obsolete-item cleanup, and
memory-only fallback behavior.

### Problem: the design references looked better in isolation than in BasketMap

**Impact:** Two visually complete redesigns were still rejected after real
implementation.

**Resolution:** Treat visual inspiration as an experiment. The final accepted
direction favors a familiar grocery-commerce interface over an editorial brand
exercise.

### Problem: ChatGPT Sites publication limits interrupted release

**Impact:** The current local release could not immediately replace the older
public version.

**Resolution:** Keep the ChatGPT Sites project as an optional secondary
deployment and move the primary source and deployment workflow to GitHub and
Vercel.

## 8. Current architecture

### Technology

- React 19
- TypeScript
- Vite 8
- Leaflet
- Lucide React icons
- Zod runtime validation
- Vitest
- Playwright
- plain CSS

### Primary files

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Main shopper experience, basket, filters, results, dialogs, and layout. |
| `src/services/market.ts` | Observed-market loading, validation, refresh, merging, and geographic filtering. |
| `src/services/shopping.ts` | Essential matching, product image candidates, search ranking, coverage, and shared-basket selection. |
| `src/services/basketStorage.ts` | Versioned saved shopping session. |
| `src/components/MapPanel.tsx` | Leaflet map and coordinate fallback. |
| `src/components/MapPanel.css` | Map presentation. |
| `src/styles/app.css` | Responsive shopper visual system. |
| `public/data/france-market.json` | Bundled observed-price snapshot. |
| `scripts/prepare-real-data.ts` | Rebuilds the focused Lyon/Paris snapshot. |
| `scripts/import-open-prices.ts` | Bounded Open Prices import tooling. |
| `scripts/validate-data.ts` | Dataset validation. |
| `tests/journey.spec.ts` | Main browser journeys. |
| `tests/market.test.ts` | Market-data behavior. |
| `tests/shopping.test.ts` | Search, essentials, images, and shared-basket behavior. |
| `tests/basket-storage.test.ts` | Saved-session behavior. |

### Data flow

```text
Bundled observed snapshot
          +
Optional browser-side Open Prices refresh
          ↓
Validated market data
          ↓
City + radius filtering
          ↓
Searchable product catalog and product images
          ↓
Versioned local basket
          ↓
Complete basket or largest shared subset
          ↓
Cards + map + evidence dialog + CSV export
```

### Hosting characteristics

BasketMap is suitable for static hosting because:

- `npm run build` produces a `dist` directory;
- no server process is required after build;
- no database is required;
- no server-side environment secret is required;
- the current secondary routes use URL fragments such as `/#/data`;
- static data is served from `/data/...`;
- external APIs are called from the visitor's browser;
- the bundled data snapshot remains available when upstream refresh fails.

## 9. Current verification status

The current release candidate has passed:

- TypeScript checking;
- Vite production build;
- 126 unit and service tests;
- 11 Playwright browser journeys;
- desktop no-horizontal-overflow checks;
- 390 px mobile no-horizontal-overflow checks;
- complete-basket calculation;
- shared-product calculation;
- explicit excluded-product presentation;
- persistence and new-basket behavior;
- Lyon/Paris location behavior;
- map tile failure and coordinate fallback;
- source evidence links;
- offline snapshot recovery;
- CSV export.

Current production build characteristics observed locally:

- HTML entry: less than 1 KB before compression;
- CSS bundle: approximately 113 KB, approximately 26 KB compressed;
- main JavaScript bundle: approximately 394 KB, approximately 120 KB
  compressed;
- Leaflet chunk: approximately 149 KB, approximately 43 KB compressed;
- bundled price data: approximately 2 MB.

These sizes are acceptable for an initial static portfolio product. The 2 MB
data snapshot is the largest tracked project file and is far below GitHub's
100 MB single-file rejection threshold.

## 10. Honest limitations and unfinished work

The application is functional, but the following are still true:

1. Prices are recent community observations, not guaranteed live retailer
   prices.
2. Stock is not known.
3. Paris has substantially weaker comparable coverage than Lyon.
4. ALDI has no qualifying recent records in the current snapshot.
5. There are no accounts or cross-device baskets.
6. There is no production analytics pipeline.
7. There have been no recorded real-user interviews or usability sessions.
8. No demand, retention, or realized savings metric has been established.
9. The current local work has not been committed.
10. No GitHub remote is configured.
11. The current ChatGPT Sites deployment is behind the local release.
12. The stylesheet grew through several design experiments and contains
    historical override layers. It works and compresses reasonably, but a
    later maintainability pass should consolidate it.
13. Product photographs are externally hosted by Open Food Facts and may be
    missing or temporarily unavailable; visual fallbacks remain necessary.

## 11. GitHub publication readiness audit

### What is already ready

- The repository already has Git history on branch `main`.
- `.gitignore` excludes `node_modules`, `dist`, `.env` files, test output, and
  local runtime state.
- `package-lock.json` is present.
- There are no detected API keys, passwords, private keys, or tracked `.env`
  files.
- The tracked data files are within normal GitHub limits.
- Third-party notices and dependency licences are present.
- The application can be rebuilt from source.

### Decisions required before a public GitHub push

#### Repository visibility

Choose one:

- **Public:** best for a portfolio and direct Vercel import, but every tracked
  file and commit author is visible.
- **Private:** still works with Vercel after granting repository access, but
  recruiters cannot inspect the source without permission.

#### Commit-author privacy

Several existing commits use:

`Sharadindu ADHIKARI <51527793+shar107@users.noreply.github.com>`

If the repository is made public, that email may be visible in Git history.

There are two legitimate choices:

1. Accept the existing history and expose that author address.
2. Rewrite the author and committer email before the first GitHub push.

History rewriting changes commit hashes. It should be done before connecting
Vercel and before anyone else clones the repository. A backup branch should be
created first. Do not perform this casually after publication.

For future commits, GitHub's private `noreply` email can be configured after the
owner's exact GitHub username and GitHub-provided address are known.

#### Project licence

The owner selected the MIT Licence. A top-level `LICENSE` file now grants the
MIT terms for BasketMap's original source code. Third-party software, data,
maps, and product imagery retain their own licences and attribution
requirements.

#### ChatGPT Sites metadata

`.openai/hosting.json` is tracked and contains the existing Sites project ID. It
does not contain a password or API token, but it exposes deployment metadata.
It can remain if preserving the Sites deployment matters, or it can be excluded
from the public repository in a separate decision.

## 12. Recommended GitHub upload process

Official reference:

- [Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [GitHub CLI authentication](https://cli.github.com/manual/gh_auth_login)
- [GitHub repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits)

### Step 1: resolve the three publication choices

Before pushing, decide:

1. Keep or rewrite the historical Amazon author email.
2. Confirm the exact replacement email for Git metadata.

### Step 2: run a final local audit

From the project directory:

```sh
cd "/Users/sharaaad/Library/CloudStorage/Dropbox/Projects/basketmap"
npm ci
npm run typecheck
npm run test -- --run
npm run build
npm run validate:data
npm run test:e2e
git status
```

Review the complete `git status` output before staging.

### Step 3: configure the future commit identity

After choosing the desired GitHub-visible address:

```sh
git config user.name "Sharadindu Adhikari"
git config user.email "YOUR_CHOSEN_GITHUB_EMAIL"
```

Use GitHub's exact `noreply` address if email privacy is preferred.

### Step 4: add any chosen licence or metadata changes

Possible preparation changes include:

- adding `LICENSE`;
- deciding whether `.openai/hosting.json` should remain tracked;
- pinning the Node engine more narrowly;
- updating README deployment language;
- adding the final production URL after Vercel deployment.

### Step 5: commit the current release candidate

After reviewing the changed files:

```sh
git add -A
git status
git commit -m "Prepare BasketMap Lyon-first observed-price release"
```

The second `git status` is important. It verifies exactly what will enter the
public history.

### Step 6A: create and push using GitHub CLI

Check that GitHub CLI is available:

```sh
gh --version
gh auth login
```

Then create the repository and push:

```sh
gh repo create basketmap --public --source=. --remote=origin --push
```

Replace `--public` with `--private` if that is the chosen visibility.

### Step 6B: alternative GitHub website flow

If creating the repository through github.com:

1. Create a new repository named `basketmap`.
2. Do not initialize it with a README, licence, or `.gitignore`, because those
   already exist locally.
3. Copy its SSH or HTTPS URL.
4. Run:

```sh
git remote add origin git@github.com:YOUR_USERNAME/basketmap.git
git remote -v
git push -u origin main
```

If HTTPS is preferred:

```sh
git remote add origin https://github.com/YOUR_USERNAME/basketmap.git
git push -u origin main
```

### Step 7: verify GitHub

In a signed-out or private browser window, verify:

- the intended visibility;
- README rendering;
- the absence of `.env` or secret files;
- `public/data/france-market.json` is present;
- `package-lock.json` is present;
- the licence choice is correct;
- the author email shown in history is acceptable;
- the default branch is `main`.

## 13. Why Vercel is the recommended host

Vercel is the simplest fit for the current project because:

- it recognizes Vite;
- it can import the GitHub repository directly;
- it serves the `dist` output statically;
- it supports preview deployments from branches and pull requests;
- it deploys the production branch automatically;
- it gives HTTPS and a temporary domain automatically;
- it can attach a custom domain later;
- the application is designed to run from the domain root;
- the current hash-based routes do not require a server-side SPA rewrite;
- the absolute `/data/france-market.json` path works naturally at the domain
  root.

GitHub Pages is possible but less convenient for the current code. A repository
project page normally runs under a subpath such as `/basketmap/`, while the app
currently requests `/data/france-market.json` from the domain root. Supporting
that model would require Vite base-path and asset-path work, or a custom domain
at the root.

Official references:

- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
- [Configuring a Vercel build](https://vercel.com/docs/deployments/configure-a-build)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel domains](https://vercel.com/docs/domains)
- [Vite static deployment guide](https://vite.dev/guide/static-deploy.html)

## 14. Exact GitHub-to-Vercel deployment process

### Step 1: finish the GitHub push

The GitHub repository must contain the committed current release candidate.
Vercel does not deploy uncommitted local changes from a Git import.

### Step 2: create or sign into a Vercel account

Sign into Vercel and connect the GitHub account that owns the BasketMap
repository.

When Vercel requests repository access, grant access to:

- only the BasketMap repository, if using restricted repository access; or
- the relevant GitHub account/organization according to the owner's preference.

### Step 3: import the GitHub repository

In Vercel:

1. Select **Add New**.
2. Select **Project**.
3. Find the `basketmap` GitHub repository.
4. Select **Import**.

### Step 4: use these project settings

| Vercel setting | BasketMap value |
| --- | --- |
| Project name | `basketmap` or another available preferred name |
| Framework preset | Vite |
| Root directory | `./` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production branch | `main` |
| Node.js version | 24.x to match `.nvmrc` and the verified local build |

The current `package.json` allows Node `>=22.12.0`, and `.nvmrc` records Node
24. Pinning Vercel to 24.x makes cloud and local builds more reproducible. As of
this handoff, Vercel documents latest 24.x as its default when no package
override is provided.

### Step 5: environment variables

No required environment variable is needed for the default deployment.

Optional map variables are:

```text
VITE_TILE_URL
VITE_TILE_ATTRIBUTION
```

Leave them unset to use the application's existing OpenStreetMap defaults.

Do not place secrets in variables beginning with `VITE_`; Vite embeds those
values into public browser JavaScript.

### Step 6: routing configuration

No `vercel.json` rewrite is currently required because secondary product pages
use fragment routes:

```text
/#/data
/#/story
/#/tools
```

URL fragments are handled in the browser and are not sent to the server.

If the application later changes to `BrowserRouter` and real path routes such
as `/data`, add an SPA fallback deliberately and verify that it does not
interfere with `/data/france-market.json`.

### Step 7: deploy

Select **Deploy**.

Vercel will:

1. install dependencies;
2. run the TypeScript check through `npm run build`;
3. build the Vite application;
4. publish `dist`;
5. provide an HTTPS deployment URL.

If the build fails, inspect the Vercel build log before changing settings. The
expected successful command locally is:

```sh
npm run build
```

### Step 8: verify the public deployment

Use a signed-out browser and check:

1. The homepage loads without authentication.
2. Lyon is selected by default.
3. The bundled product catalog appears.
4. The store map or coordinate fallback is usable.
5. A fresh browser starts with an empty basket.
6. A product can be added.
7. A store-specific product can be added without a modal.
8. **Compare my basket** opens the result.
9. **Compared** and **Not compared** products are distinct.
10. The comparison button becomes disabled.
11. Store evidence opens.
12. Refreshing the page restores the basket.
13. **New basket** clears it after confirmation.
14. The site works around 390 px wide.
15. Open Prices API failure still leaves the bundled snapshot usable.
16. Map tile failure still leaves the coordinate fallback usable.

### Step 9: run the automated browser journeys against Vercel

From the local project directory:

```sh
BASKETMAP_TEST_URL="https://YOUR-VERCEL-URL.vercel.app" npm run test:e2e
```

Do not record the deployment as complete until these journeys pass against the
actual public URL.

### Step 10: promote and record the production deployment

After verification:

- ensure the Vercel deployment is the production deployment;
- record the Vercel URL in `README.md`;
- update `BUILD_STATUS.md`;
- update `docs/LAUNCH.md`;
- commit those deployment records;
- push the record commit to `main`.

That push should trigger another production deployment containing the correct
public documentation.

### Step 11: optional custom domain

In Vercel:

1. Open the BasketMap project.
2. Open **Settings**.
3. Open **Domains**.
4. Add the owned domain or subdomain.
5. Follow Vercel's displayed DNS instructions.
6. Wait for DNS and certificate verification.
7. Re-run the signed-out browser checks using the custom domain.

Do not purchase a domain automatically. Domain ownership and spending require
an explicit owner decision.

## 15. Alternative direct Vercel CLI deployment

Git integration is recommended because every accepted GitHub push can produce a
preview or production deployment.

A direct CLI deployment is still possible:

```sh
cd "/Users/sharaaad/Library/CloudStorage/Dropbox/Projects/basketmap"
npm ci
npm run build
npx vercel
npx vercel --prod
```

The first `npx vercel` run links the local directory to a Vercel project and may
ask interactive questions. Use:

- framework: Vite;
- root: current directory;
- build command: `npm run build`;
- output directory: `dist`.

This method can deploy without GitHub, but it should not replace the desired
GitHub source-of-truth workflow.

## 16. Continuous deployment after the first release

With the GitHub integration:

```text
Feature branch push
        ↓
Vercel preview deployment
        ↓
Browser and review checks
        ↓
Merge to main
        ↓
Vercel production deployment
```

Recommended release habit:

1. Create a feature branch.
2. Make and test a focused change.
3. Push the branch.
4. Review the Vercel preview.
5. Merge to `main`.
6. Verify the production URL.

Avoid treating every local save as production. Git commits and preview
deployments should remain understandable checkpoints.

## 17. Post-deployment operational checklist

After launch, periodically verify:

- Vercel builds still pass;
- Open Prices refresh failures are visible but non-fatal;
- the bundled snapshot remains valid;
- Open Food Facts images still degrade gracefully;
- map attribution remains visible;
- product and store evidence links work;
- the production URL in README is current;
- dependency security updates do not break Node/Vite compatibility;
- the 30-day snapshot policy is still the intended product rule;
- Paris and ALDI coverage statements remain accurate after data refreshes;
- public language does not claim live inventory or guaranteed savings.

## 18. Recommended next actions in order

1. Decide public versus private GitHub visibility.
2. Decide whether to rewrite the historical Amazon author email.
3. Consolidate and review all current local changes.
4. Run the complete verification suite.
5. Commit the current release.
6. Create and push the public GitHub repository.
7. Import the GitHub repository into Vercel.
8. Deploy with Vite, `npm run build`, and `dist`.
9. Run the browser suite against the Vercel URL.
10. Update deployment records and README.
11. Optionally attach a custom domain.

## 19. Final state statement

BasketMap is no longer an early mock-up. It is a tested static web application
with an honest observed-price model, useful incomplete-data behavior, local
persistence, map resilience, and an accepted consumer-shopping design.

Its main blockers are no longer product implementation or build stability. The
remaining blockers are publication decisions:

- repository visibility;
- author-email privacy;
- GitHub authentication;
- Vercel authentication and repository authorization.

Once those owner-controlled choices are resolved, the current application can
be committed, pushed to GitHub, imported into Vercel, and publicly verified
without introducing a backend.
