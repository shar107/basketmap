# sharad.fr: complete history, domain purchase, deployment, architecture, and operations

**Prepared:** 13 September 2026

**Current owner/display name:** Sharad Adhikari

**Primary domain:** `sharad.fr`

**Source repository:** `https://github.com/shar107/basketmap`

**Production homepage:** `https://sharad.fr/`

**Production BasketMap application:** `https://sharad.fr/projects/basketmap/`

**Current hosting provider:** GitHub Pages

**Domain registrar and DNS provider:** GoDaddy

**Repository visibility:** Public

**Licence:** MIT

---

> **Architecture update — 13 September 2026:** Sharad.fr and BasketMap now have
> independent source repositories. `shar107/sharad-fr` owns the GitHub Pages
> deployment and checks out this repository during its build, publishing
> BasketMap at `/projects/basketmap/`. Sections below describing the original
> same-repository build are retained as historical context.

## 1. Purpose of this document

This is the durable operational record for the complete `sharad.fr` setup. It
documents:

- why the domain was purchased;
- how GoDaddy was selected;
- exactly what was and was not purchased from GoDaddy;
- the purchase cost and expected renewal;
- the earlier ChatGPT Sites and Netlify deployments;
- the creation and configuration of the public GitHub repository;
- the move to GitHub Pages;
- the GoDaddy DNS records that point the domain at GitHub Pages;
- the HTTPS and cache behaviour;
- how the root portfolio and nested BasketMap application are built together;
- how the portfolio design was selected and integrated;
- how every future push to `main` becomes a production deployment;
- the current validation state;
- the files that control the system;
- known limitations and future maintenance tasks;
- recovery and troubleshooting instructions.

The intention is that a future developer or Codex session can understand and
reproduce the entire system without needing the original chat history.

This document complements
[`BASKETMAP_FULL_PROJECT_CONTEXT.md`](./BASKETMAP_FULL_PROJECT_CONTEXT.md),
which contains the deeper BasketMap product, data, design, and comparison-engine
history.

---

## 2. Security and privacy boundary

The domain checkout required private registrant, billing, identity, and payment
information. Those details were entered into GoDaddy but are deliberately not
copied into this repository.

This document does **not** contain:

- the GoDaddy password;
- the GitHub password;
- authentication or verification codes;
- the complete payment-card number or its final digits;
- the private billing address;
- the private registrant address;
- the private receipt email address;
- the GoDaddy order number;
- GitHub recovery codes;
- any session cookie, API token, SSH private key, or secret.

Screenshots used during setup displayed some of this information. They are not
project assets and must not be committed.

Operational records may safely include the public domain, public repository,
public DNS values, public GitHub username, public deployment URLs, and the
GitHub-provided `noreply` commit email.

---

## 3. Current system at a glance

```text
Visitor
  |
  | HTTPS
  v
sharad.fr
  |
  | DNS managed at GoDaddy
  v
GitHub Pages edge network
  |
  | artifact created by .github/workflows/pages.yml
  v
_site/
├── index.html                       Astro portfolio homepage
├── about/
├── now/
├── experience/
├── projects/
├── essays/
├── _astro/                          Portfolio CSS and font assets
├── CNAME                            contains "sharad.fr"
├── .nojekyll
└── projects/
    └── basketmap/
        ├── index.html               React/Vite BasketMap
        ├── assets/
        ├── data/
        ├── shop/index.html          direct-path SPA fallback
        └── results/index.html       direct-path SPA fallback
```

There are two separate frontend projects in one Git repository:

| Application | Source location | Framework | Production path |
|---|---|---|---|
| Personal portfolio | `portfolio/` | Astro | `/` |
| BasketMap | repository root | React + TypeScript + Vite | `/projects/basketmap/` |

They have separate `package.json` and `package-lock.json` files and are built
independently. GitHub Actions assembles both build outputs into one GitHub Pages
artifact.

---

## 4. Chronological history

### 4.1 BasketMap began as the only website

The original project was BasketMap: a grocery-price comparison experience for
Lyon and Paris. The product went through extensive iterations around:

- real versus fictional price data;
- supermarket coverage;
- Lyon as the default city;
- product photographs;
- store maps;
- basket persistence;
- new-basket behaviour;
- complete versus partial comparison totals;
- store-specific products;
- landing-page versus shopping-page separation;
- desktop and mobile usability;
- visual design inspired by several grocery and food-branding references.

The important product principle that emerged was:

> A smaller, honest comparison using real source-linked data is preferable to a
> polished fictional demo.

The current BasketMap implementation uses real community-observed records and
explicitly communicates coverage gaps.

### 4.2 The first public host was ChatGPT Sites

An earlier release was published at:

`https://basketmap.rufina-sharad.chatgpt.site/`

That deployment proved the application could be made public, but it eventually
fell behind the local code. Updating it was constrained by the ChatGPT
publishing workflow, available credits, and file/deployment limits. It remains
historical deployment metadata rather than the source of truth.

The repository still contains:

```text
.openai/hosting.json
```

That file contains a Sites project identifier and static output directory. It
does not contain an authentication token. It is retained only as historical
deployment metadata.

### 4.3 Localhost became the working review environment

While public publishing was blocked or inconvenient, the current application
was repeatedly reviewed at:

`http://127.0.0.1:5173/`

This allowed rapid visual iteration without waiting for a public deployment.
The normal local command is:

```sh
npm run dev
```

The Vite server is explicitly bound to `127.0.0.1`.

### 4.4 Netlify was used as the first independent host

BasketMap was initially uploaded to Netlify as a built ZIP file. The public
Netlify URL was:

`https://basketmap.netlify.app/`

The purpose of this deployment was to get an immediately usable independent
URL outside ChatGPT Sites.

The workflow then moved toward connecting that Netlify site to the GitHub
repository so future changes would not require repeated ZIP uploads.

Netlify was not retained as the primary architecture because:

- the goal expanded from one application to a complete personal domain;
- the desired URL structure became `sharad.fr/projects/basketmap`;
- the user did not want Netlify-branded deployment UI appearing during review;
- GitHub Pages could host this static system for free;
- GitHub was already becoming the source of truth;
- a single GitHub Pages artifact could contain both the root site and projects.

The Netlify URL may continue to exist, but it is not the canonical production
URL and is not required by the current deployment.

### 4.5 A personal domain and project hierarchy were chosen

The desired long-term structure became:

```text
sharad.fr/
sharad.fr/projects/basketmap/
sharad.fr/projects/project2/
...
```

This decision avoided purchasing or maintaining a separate domain for each
project.

Buying `sharad.fr` provides control over:

- the apex domain: `sharad.fr`;
- arbitrary subdomains such as `basketmap.sharad.fr`;
- arbitrary URL paths such as `sharad.fr/projects/basketmap`.

Subdomains do **not** need to be purchased individually. They are DNS labels
created under the owned domain.

For this implementation, URL paths were chosen instead of separate
subdomains. A path-based project archive is simpler to present as one personal
website and can be generated as one GitHub Pages artifact.

### 4.6 Domain providers were researched

The domain search considered multiple registrars and website providers,
including:

- GoDaddy;
- OVHcloud;
- WordPress.com;
- other mainstream domain registrars;
- student offers and the GitHub Student Developer Pack.

The US GoDaddy storefront displayed `sharad.fr` at approximately
`$19.99/year`, which initially looked expensive.

The French GoDaddy storefront displayed a much better local promotion:

- `€0.01` for the first year;
- conditional on a three-year commitment;
- the final three-year registration subtotal was `€21.99`.

The promotion and final cart total made GoDaddy France the selected registrar.

The French storefront affected the checkout language, not the language of the
domain itself. The account/site language can be changed later. A `.fr` domain
does not force the website or future account management to remain in French.

The GitHub Student Developer Pack was also activated, but it was not required
for this domain purchase or for GitHub Pages hosting.

### 4.7 `sharad.fr` was purchased from GoDaddy

The domain was purchased on 13 September 2026 through GoDaddy's French
storefront.

#### Final purchase

| Item | Amount |
|---|---:|
| `.FR Domain Name Registration - 3 Years` | `€21.99` |
| VAT and fees | `€4.40` |
| **Total paid** | **`€26.39`** |

The checkout displayed:

- regular three-year price: `€32.97`;
- discounted three-year subtotal: `€21.99`;
- savings: `€10.98`;
- discount: `33%`;
- displayed next renewal: September 2029 for `€32.97`, before any future tax or price changes.

The effective first-term cost including VAT was approximately:

```text
€26.39 / 3 years = approximately €8.80 per year
```

The receipt described the registration as recurring. The exact future renewal
price is not guaranteed; registrars can change renewal pricing and applicable
taxes.

#### GoDaddy add-ons that were not purchased

The final cart contained one item: the domain registration.

The following optional products were left off:

| Optional product | Price displayed at checkout | Why it was unnecessary |
|---|---:|---|
| Complete Domain Protection | `€0.71/month`, shown as `€8.49/year` | Not required for DNS, hosting, SSL, or domain ownership |
| Microsoft 365 basic email | `€1.29/month` promotional price | Custom-domain email was not part of the hosting task |
| GoDaddy Airo AI Builder | `€8.49/month` promotional price | The website was already being built in source code |
| Managed WordPress hosting | `€5.49/month` promotional price | GitHub Pages provides the required static hosting |
| Additional TLD bundles | varied | Only `sharad.fr` was needed |
| Extra `.shop`, `.life`, `.site`, `.tv`, etc. domains | varied | They did not serve the chosen brand or URL architecture |

Complete Domain Protection is an extra GoDaddy security service that adds
stronger approval requirements for critical domain actions such as transfer,
deletion, or DNS/account changes. It is not:

- web hosting;
- an SSL certificate;
- email hosting;
- a requirement for using GitHub Pages;
- a requirement for keeping the domain.

The account itself should still use a strong unique password and two-factor
authentication.

#### `.fr` registration information

GoDaddy required valid registrant and billing details and localized identity
fields for the `.fr` registration. These details were successfully submitted.
They must remain accurate in the GoDaddy account but must not be copied into
the Git repository.

### 4.8 The GitHub repository became the source of truth

The GitHub account was authenticated through the browser, including the
required verification step.

A public repository was created:

`https://github.com/shar107/basketmap`

Key repository choices:

| Setting | Value |
|---|---|
| Owner | `shar107` |
| Repository | `basketmap` |
| Visibility | Public |
| Default branch | `main` |
| Licence | MIT |
| Git remote protocol | SSH |
| Remote | `git@github.com:shar107/basketmap.git` |

The public repository was chosen because BasketMap and `sharad.fr` are
portfolio work and the source should be inspectable.

The Git author email uses GitHub's `noreply` format so the private personal
email does not need to appear in new commits:

```text
51527793+shar107@users.noreply.github.com
```

The current Git author name is:

```text
Sharad Adhikari
```

Three early commits retain the older author label
`Sharadindu ADHIKARI`. Git history was not rewritten. The current site,
licence, visible footer, documentation, and future commit configuration use
`Sharad Adhikari`.

#### Exact initial GitHub publication procedure

The project folder already had local Git history, so the upload did not require
starting a new repository with `git init`.

Before publishing, the following decisions were confirmed:

- the repository would be public;
- the licence would be MIT;
- the repository would be owned by the personal `shar107` GitHub account;
- the private personal email would not be used as the commit email;
- the existing local README and `.gitignore` would be retained;
- GitHub would not create a conflicting README, licence, or `.gitignore`.

The local author configuration was set to the chosen public identity and the
GitHub-provided `noreply` email:

```sh
git config user.name "Sharad Adhikari"
git config user.email "51527793+shar107@users.noreply.github.com"
```

The repository was created under the personal GitHub account after browser
sign-in and account verification.

The local repository was connected through SSH:

```sh
git remote add origin git@github.com:shar107/basketmap.git
git remote -v
```

If `origin` already exists on a restored clone, do not add it again. Verify it:

```sh
git remote get-url origin
```

The first public release was staged, reviewed, committed, and pushed:

```sh
git add -A
git diff --cached --check
git commit -m "Initial public release of BasketMap"
git branch -M main
git push -u origin main
```

The `-u` flag established `origin/main` as the upstream branch. Subsequent
pushes therefore require only:

```sh
git push
```

The configured remote is:

```text
git@github.com:shar107/basketmap.git
```

SSH authentication depends on the local machine's SSH key and GitHub account
configuration. The private SSH key must never be committed.

### 4.9 GitHub Pages replaced the temporary root deployment

The repository initially used a simple static directory, `site/`, as a minimal
root homepage. BasketMap was built below it at:

`/projects/basketmap/`

This established the domain and project-path architecture before the full
portfolio was ready.

The deployment commit was:

```text
f25c908 — Deploy sharad.fr with BasketMap project
```

### 4.10 The full portfolio replaced the placeholder homepage

Two separate portfolio prototypes existed:

```text
/Users/sharaaad/Library/CloudStorage/Dropbox/Agentic Work & Projects/Claude Workstation/Portfolio/
/Users/sharaaad/Library/CloudStorage/Dropbox/ClaudeCode/Portfolio/
```

They were compared before integration.

The newer `ClaudeCode/Portfolio` version was selected as the base because it
contained:

- a floating capsule navigation bar;
- a wider responsive layout;
- project cards;
- About, Now, Experience, Projects, and Notes routes;
- Astro content collections;
- an RSS feed;
- a sitemap;
- a more developed essay-reading layout;
- stronger responsive behaviour.

The earlier version influenced the quieter, reading-first tone and restrained
design.

The imported prototype contained fictional or placeholder material, including
sample employers, projects, travel captions, essays, recommendations, reading
lists, and biographical statements. These were removed rather than published
as facts.

The production portfolio now contains:

- the name `Sharad Adhikari`;
- Lyon, France as the current location;
- a concise product/data/AI positioning;
- a live BasketMap project card;
- a `sharad.fr` project card;
- working principles;
- a draft-ready notes system;
- About, Now, Experience, Projects, and Notes routes;
- an honest empty state where reviewed content is not yet available.

The replacement commit was:

```text
6155108 — Replace sharad.fr homepage with portfolio
```

The old `site/` placeholder files were deleted. `portfolio/` is now the source
for the root website.

---

## 5. Git and release history

The repository's main release commits are:

| Commit | Date | Meaning |
|---|---|---|
| `7a8ecdc` | 13 Sep 2026 | Initial public release of BasketMap |
| `c14e6d1` | 13 Sep 2026 | Separated the landing page from the shopping flow |
| `f25c908` | 13 Sep 2026 | Added GitHub Pages, `sharad.fr`, and nested BasketMap deployment |
| `6155108` | 13 Sep 2026 | Replaced the temporary homepage with the Astro portfolio |

The repository tracks `origin/main`, and every push to `main` triggers the
production GitHub Pages workflow.

---

## 6. Domain, DNS, and HTTPS configuration

### 6.1 Registrar versus host

GoDaddy and GitHub Pages have separate jobs:

| Service | Responsibility |
|---|---|
| GoDaddy | Domain ownership, renewal, nameservers, DNS records |
| GitHub | Source code, version control, Actions build, Pages hosting, HTTPS certificate |

No GoDaddy web-hosting plan is required.

### 6.2 Nameservers

The domain continues to use GoDaddy-managed DNS. The nameservers did not need
to be moved to GitHub because GitHub is not a general DNS provider.

Only the relevant DNS records were changed.

### 6.3 GoDaddy DNS setup procedure

The effective setup process in GoDaddy was:

1. Sign in to the GoDaddy account that owns `sharad.fr`.
2. Open **My Products** or the domain portfolio.
3. Select `sharad.fr`.
4. Open **DNS** / **Manage DNS**.
5. Review the existing records.
6. Remove or replace any GoDaddy parking record that conflicts with the apex
   GitHub Pages records.
7. Add the four `A` records for host `@`.
8. Add the four `AAAA` records for host `@`.
9. Add the `CNAME` record for host `www`.
10. Do not create an HTTP forwarding rule to the old Netlify or ChatGPT Sites
    URL.
11. Save the records.
12. Wait for public DNS resolvers to return the new values.

GoDaddy displays `@` as the root/apex host. It means `sharad.fr` itself, not an
email address.

If GoDaddy refuses a new record, check for an existing record with the same
host/type combination. Do not create two conflicting `www` CNAME records.

### 6.4 Apex-domain records

The apex host `@`, meaning `sharad.fr`, points to GitHub Pages using four IPv4
records:

| Type | Host | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

Four IPv6 records are also present:

| Type | Host | Value |
|---|---|---|
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

### 6.5 `www` record

The `www` hostname points to the GitHub Pages account host:

| Type | Host | Value |
|---|---|---|
| CNAME | `www` | `shar107.github.io` |

With `sharad.fr` configured as the canonical custom domain, GitHub Pages
redirects:

```text
https://www.sharad.fr/ → https://sharad.fr/
```

### 6.6 Current DNS observation

On 13 September 2026, public DNS returned:

- all four GitHub Pages IPv4 addresses for `sharad.fr`;
- all four GitHub Pages IPv6 addresses for `sharad.fr`;
- `www.sharad.fr` as a CNAME to `shar107.github.io`;
- an observed apex TTL of approximately 600 seconds;
- an observed `www` TTL of approximately 3600 seconds.

TTL is a caching instruction and may be changed by the DNS provider or observed
differently at different resolvers.

### 6.7 GitHub Pages custom domain

The Pages custom domain is:

```text
sharad.fr
```

The build workflow writes a `CNAME` file into the final artifact:

```sh
printf 'sharad.fr\n' > _site/CNAME
```

This preserves the custom-domain association with each deployment.

### 6.8 HTTPS

GitHub Pages issues and manages the TLS certificate. No GoDaddy SSL certificate
was purchased.

The final verified production URLs return HTTP 200 over HTTPS:

```text
https://sharad.fr/
https://sharad.fr/projects/basketmap/
```

`www.sharad.fr` redirects to the HTTPS apex domain.

When DNS was first changed, the certificate and HTTPS control needed time to
become available. This was expected. DNS and certificate state cannot be
forced instantly from the browser.

### 6.9 GitHub Pages settings procedure

After the initial repository push:

1. Open `https://github.com/shar107/basketmap`.
2. Open **Settings**.
3. Open **Pages**.
4. Under **Build and deployment**, select **GitHub Actions** as the source.
5. Commit or manually run `.github/workflows/pages.yml`.
6. Wait for the first Pages deployment to finish.
7. In the Pages custom-domain field, enter:

   ```text
   sharad.fr
   ```

8. Save the custom domain.
9. Allow GitHub to run its DNS check.
10. Confirm the GoDaddy records match the records in this document.
11. Wait for GitHub to issue the certificate.
12. Enable **Enforce HTTPS** when GitHub makes the option available.
13. Verify the apex URL and the `www` redirect in a signed-out/private browser.

The custom-domain association is also preserved by the generated `CNAME` file.
Both the repository setting and deployed file should remain consistent.

### 6.10 Cache behaviour

GitHub Pages currently returns:

```text
Cache-Control: max-age=600
```

This means an edge cache or browser may show the previous version for up to
approximately ten minutes after deployment.

To distinguish a real deployment problem from caching:

1. confirm the GitHub Actions run succeeded;
2. open the site in a private window;
3. hard-refresh;
4. append a temporary query string:

   ```text
   https://sharad.fr/?verify=TIMESTAMP
   ```

5. inspect the built asset filename;
6. wait for the 600-second cache window if necessary.

Do not repeatedly alter DNS records to solve a normal ten-minute content cache.

---

## 7. GitHub Pages deployment workflow

The production workflow is:

```text
.github/workflows/pages.yml
```

### 7.1 Triggers

It runs:

- automatically on every push to `main`;
- manually through `workflow_dispatch`.

### 7.2 Permissions

The workflow receives:

```yaml
contents: read
pages: write
id-token: write
```

These are the permissions required to read the repository, upload a Pages
artifact, and deploy it with GitHub's identity-token flow.

### 7.3 Concurrency

The workflow uses:

```yaml
concurrency:
  group: pages
  cancel-in-progress: true
```

If several pushes happen quickly, the older in-progress Pages build can be
cancelled so the newest commit wins.

### 7.4 Node version

The workflow uses Node 24:

```yaml
node-version: 24
```

The repository also contains:

```text
.nvmrc → 24
```

### 7.5 Dependency caching

Both lockfiles are included in the npm cache key:

```yaml
cache-dependency-path: |
  package-lock.json
  portfolio/package-lock.json
```

This is necessary because the repository contains two Node applications.

### 7.6 BasketMap build

The workflow runs:

```sh
npm ci
npm run typecheck
npm run test -- --run
npm run build
```

The build receives:

```text
BASKETMAP_BASE_PATH=/projects/basketmap/
```

The Vite configuration is:

```ts
export default defineConfig({
  base: process.env.BASKETMAP_BASE_PATH || "/",
  plugins: [react()],
  test: { include: ["tests/**/*.test.ts"] },
  build: { chunkSizeWarningLimit: 650 },
});
```

This is critical. Without the nested base path, the deployed BasketMap HTML
would request assets from `/assets/...` instead of
`/projects/basketmap/assets/...`.

### 7.7 Portfolio build

The workflow separately runs:

```sh
npm ci --prefix portfolio
npm run build --prefix portfolio
```

The Astro configuration declares:

```js
site: 'https://sharad.fr'
```

This allows correct canonical URLs and sitemap generation.

### 7.8 Artifact assembly

The workflow creates the final Pages site:

```sh
mkdir -p _site/projects/basketmap/shop _site/projects/basketmap/results
cp -R portfolio/dist/. _site/
cp -R dist/. _site/projects/basketmap/
cp dist/index.html _site/projects/basketmap/shop/index.html
cp dist/index.html _site/projects/basketmap/results/index.html
touch _site/.nojekyll
printf 'sharad.fr\n' > _site/CNAME
```

The order matters:

1. copy the portfolio to `_site/`;
2. copy BasketMap into `_site/projects/basketmap/`;
3. create direct-entry SPA fallbacks;
4. disable Jekyll processing;
5. include the custom domain.

### 7.9 Why direct route copies exist

BasketMap has shopping and result states that can be entered through:

```text
/projects/basketmap/shop/
/projects/basketmap/results/
```

GitHub Pages has no general server-side rewrite engine. Copying the Vite
`index.html` into those directories ensures a direct request returns the React
application instead of a 404.

### 7.10 Pages Actions

The workflow uses:

```yaml
actions/configure-pages@v5
actions/upload-pages-artifact@v3
actions/deploy-pages@v4
```

The deploy job targets the protected `github-pages` environment.

### 7.11 Successful deployment record

The portfolio integration deployment completed successfully in GitHub Actions:

```text
Workflow: Deploy sharad.fr
Commit: 6155108
Run: https://github.com/shar107/basketmap/actions/runs/34753765941
Conclusion: success
```

---

## 8. Repository structure and important files

| File or directory | Responsibility |
|---|---|
| `.github/workflows/pages.yml` | Builds and deploys the complete domain |
| `.nvmrc` | Pins local/CI Node major version to 24 |
| `.gitignore` | Excludes dependencies, builds, local env files, and reports |
| `README.md` | Current public project overview |
| `LICENSE` | MIT licence under Sharad Adhikari |
| `package.json` | BasketMap dependencies and commands |
| `package-lock.json` | Reproducible BasketMap dependency graph |
| `vite.config.ts` | BasketMap base path and build/test configuration |
| `src/` | BasketMap React/TypeScript source |
| `public/` | BasketMap data, static assets, and notices |
| `tests/` | BasketMap Vitest coverage |
| `e2e/` | Browser tests |
| `portfolio/package.json` | Portfolio dependencies and commands |
| `portfolio/package-lock.json` | Reproducible portfolio dependency graph |
| `portfolio/astro.config.mjs` | Astro site URL, MDX, sitemap, output format |
| `portfolio/src/pages/` | Homepage and content routes |
| `portfolio/src/components/` | Portfolio UI components |
| `portfolio/src/content/` | Project and draft note content |
| `portfolio/src/styles/global.css` | Portfolio visual system |
| `docs/BASKETMAP_FULL_PROJECT_CONTEXT.md` | Full BasketMap decision history |
| `docs/SHARAD_FR_COMPLETE_HISTORY_AND_OPERATIONS.md` | This document |
| `.openai/hosting.json` | Historical ChatGPT Sites metadata |

Build directories and dependencies are intentionally ignored:

```text
node_modules/
dist/
portfolio/node_modules/
portfolio/dist/
portfolio/.astro/
```

---

## 9. Portfolio technical design

### 9.1 Framework

The personal homepage uses Astro because it is primarily static content and
does not need a heavy client-side runtime.

Current key dependencies include:

- Astro 7;
- MDX support;
- RSS generation;
- sitemap generation;
- locally bundled Newsreader font files.

### 9.2 Pages

The generated routes include:

```text
/
/about/
/now/
/experience/
/projects/
/projects/this-site/
/essays/
/feed.xml
/404.html
```

The BasketMap project card links directly to:

```text
/projects/basketmap/
```

It is not generated as an Astro project-detail page because that path is owned
by the Vite application.

### 9.3 Content integrity decision

The portfolio source prototypes included example content that looked complete
but was not verified as Sharad's real history.

The following were removed:

- fictional project names;
- fictional employers and dates;
- placeholder essays presented as published work;
- unverified travel photographs and captions;
- unverified reading and music preferences;
- generic email and social links;
- placeholder biographical claims.

The site intentionally shows an honest incomplete state rather than invented
portfolio history.

### 9.4 Name decision

The final public identity is:

```text
Sharad Adhikari
```

This is used in:

- homepage hero;
- page titles;
- metadata;
- RSS title and author display;
- project pages;
- BasketMap footer;
- MIT licence;
- current Git configuration.

### 9.5 Portfolio dependency security

The imported portfolio initially used an older Astro release with reported
security advisories.

Before deployment:

- Astro and related packages were upgraded;
- the portfolio was rebuilt;
- `npm audit --prefix portfolio --omit=dev` reported zero vulnerabilities;
- the generated pages were reviewed again.

---

## 10. BasketMap product and technical state

The full product history is in the dedicated BasketMap context document. The
following points are essential to the website deployment.

### 10.1 Supported geography

- Lyon is the default and primary city.
- Paris remains available.
- The default is intentionally based on the current user context in Lyon.

### 10.2 Data policy

BasketMap does not fill the interface with fictional prices.

The current bootstrap includes:

- 2,275 valid source-linked price observations;
- 2,006 exact products;
- 25 priced branches within 15 km of Lyon or Paris.

Data sources include:

- Open Prices for observed prices;
- Open Food Facts for product identity and imagery;
- OpenStreetMap/Leaflet for maps and store context.

Observations are not guaranteed live shelf inventory. The interface communicates
freshness, incomplete coverage, and stock uncertainty.

### 10.3 Basket persistence

Basket, city, and radius state are saved in browser `localStorage`.

This provides:

- an empty basket for a first-time visitor;
- the previous basket for a returning visitor;
- no required account;
- no backend database;
- no server-side personal data.

The state is browser- and device-specific.

### 10.4 New basket

The `New basket` action clears saved products after confirmation while
retaining the selected city and radius.

### 10.5 Comparison logic

BasketMap distinguishes:

1. a complete full-basket comparison;
2. a comparison of the largest product set shared by at least two stores;
3. products priced only at particular stores;
4. partial store records that are not valid recommendations.

If the full basket cannot be compared:

- shared items still receive comparable store totals;
- non-shared items remain in the shopping list;
- excluded products are named explicitly;
- partial totals do not become a "cheapest store" recommendation.

### 10.6 Landing and shopping separation

The homepage is a true product landing page.

The visitor must choose `Start your shopping list` before entering the catalog.
The complete search and shopping interface is no longer exposed simply by
scrolling down the landing page.

### 10.7 Visual direction

Several design directions were tried and rejected before the current BasketMap
style was accepted.

The current version uses:

- a white background;
- strong green brand colour;
- yellow accents;
- rounded product cards;
- product imagery;
- supermarket identity;
- a more app-like grocery-shopping presentation;
- responsive desktop and mobile layouts.

The final direction was inspired by a modern Instacart-like e-commerce visual
language rather than the earlier beige or editorial food-branding experiments.

### 10.8 Supermarket decisions

The focus is on chains with meaningful availability in Lyon and Paris. Super U
was removed from the intended core focus during product refinement, while Aldi
was explicitly requested as an important chain to include.

Coverage remains dependent on available real observations. A chain can be
recognised by the product but still have sparse recent price records.

---

## 11. Local development

### 11.1 Requirements

- Node.js 24;
- npm;
- Git;
- a browser.

Use the version in `.nvmrc`:

```sh
nvm use
```

### 11.2 Install BasketMap

From the repository root:

```sh
npm ci
```

### 11.3 Run BasketMap locally

```sh
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

### 11.4 Validate BasketMap

```sh
npm run typecheck
npm run test -- --run
npm run build
npm run validate:data
```

For browser tests:

```sh
npm run test:e2e
```

### 11.5 Install and run the portfolio

```sh
npm ci --prefix portfolio
npm run dev --prefix portfolio
```

Astro will display the local URL it selects.

### 11.6 Build both production applications locally

Portfolio:

```sh
npm run build --prefix portfolio
```

BasketMap with the production nested path:

```sh
BASKETMAP_BASE_PATH=/projects/basketmap/ npm run build
```

### 11.7 Reproduce the Pages artifact locally

```sh
mkdir -p _site/projects/basketmap/shop _site/projects/basketmap/results
cp -R portfolio/dist/. _site/
cp -R dist/. _site/projects/basketmap/
cp dist/index.html _site/projects/basketmap/shop/index.html
cp dist/index.html _site/projects/basketmap/results/index.html
touch _site/.nojekyll
printf 'sharad.fr\n' > _site/CNAME
```

`_site` is a generated preview and should not be committed.

---

## 12. Normal change and deployment process

Once the domain and workflow are configured, future releases are simple.

### 12.1 Make the change

Modify BasketMap, the portfolio, or both.

### 12.2 Test locally

At minimum:

```sh
npm run typecheck
npm run test -- --run
BASKETMAP_BASE_PATH=/projects/basketmap/ npm run build
npm run build --prefix portfolio
```

For a data change:

```sh
npm run validate:data
```

For a major user-flow change:

```sh
npm run test:e2e
```

### 12.3 Commit

```sh
git add -A
git commit -m "Describe the change"
```

### 12.4 Synchronise and push

```sh
git fetch origin
git rebase origin/main
git push origin main
```

### 12.5 Monitor deployment

Open:

```text
https://github.com/shar107/basketmap/actions
```

Wait for `Deploy sharad.fr` to complete successfully.

### 12.6 Verify production

Check:

```text
https://sharad.fr/
https://sharad.fr/about/
https://sharad.fr/projects/
https://sharad.fr/projects/basketmap/
https://sharad.fr/projects/basketmap/shop/
https://sharad.fr/projects/basketmap/results/
```

Use a private browser window for an authentication- and cache-independent
check.

---

## 13. Adding another project

The current path architecture supports:

```text
sharad.fr/projects/project2/
```

There are two common approaches.

### 13.1 Static project page inside Astro

For a written project case study:

1. create a Markdown content entry in:

   ```text
   portfolio/src/content/projects/
   ```

2. omit the external `url` field;
3. Astro generates:

   ```text
   /projects/ENTRY-ID/
   ```

This is suitable for case studies without a separate application.

### 13.2 Separate application

For another React/Vite or static application:

1. add its source in a dedicated directory;
2. give it a separate lockfile;
3. build it with its production base path;
4. update `pages.yml` to copy its output into:

   ```text
   _site/projects/project2/
   ```

5. add a portfolio project entry that links to:

   ```text
   /projects/project2/
   ```

6. add direct-route copies or another static-routing solution if the
   application uses browser path routes.

No new domain or subdomain purchase is required.

---

## 14. Domain maintenance

### 14.1 Renewal

The initial three-year term runs to approximately September 2029.

The GoDaddy cart displayed a renewal of:

```text
€32.97
```

This is not a permanent price guarantee. Taxes and registrar prices may change.

Recommended actions:

- keep the GoDaddy account email accessible;
- keep two-factor authentication enabled;
- confirm the payment method before renewal;
- review auto-renew at least 60 days before expiry;
- set an independent calendar reminder for June 2029;
- verify that registrant contact information remains accurate;
- do not let the domain lapse because restoration can cost more than renewal.

### 14.2 Moving registrars later

The domain can be transferred to another registrar later if renewal pricing or
service quality becomes unattractive.

Before transferring:

- confirm the `.fr` transfer rules;
- unlock the domain if required;
- request the transfer/authentication code;
- retain current DNS records;
- avoid transferring immediately before expiry;
- verify the destination registrar supports `.fr`;
- ensure GitHub Pages DNS remains unchanged during the transfer.

### 14.3 Hosting independence

Owning the domain at GoDaddy does not lock the website to GoDaddy hosting.

The domain can point to:

- GitHub Pages;
- Netlify;
- Vercel;
- Cloudflare Pages;
- another static host;
- a server or cloud load balancer.

Only the DNS records and host configuration need to change.

---

## 15. Troubleshooting

### 15.1 The homepage shows an old version

Check:

1. Did the newest GitHub Actions run succeed?
2. Is the commit on `origin/main`?
3. Is the browser using a cached page?
4. Has the 600-second cache window elapsed?
5. Does a query-string URL show the new version?

Do not change DNS for a normal content-cache issue.

### 15.2 BasketMap loads but assets are missing

The likely cause is an incorrect Vite base.

Production must build with:

```text
BASKETMAP_BASE_PATH=/projects/basketmap/
```

Inspect the built `index.html`. Asset paths should begin with:

```text
/projects/basketmap/assets/
```

### 15.3 `/shop/` or `/results/` returns 404

Confirm the workflow still creates:

```text
_site/projects/basketmap/shop/index.html
_site/projects/basketmap/results/index.html
```

Each should be a copy of the BasketMap build's `index.html`.

### 15.4 GitHub Pages workflow fails during `npm ci`

Possible causes:

- a `package.json` changed without its lockfile;
- incompatible Node requirements;
- corrupted dependency cache;
- a registry outage.

Resolve lockfiles locally:

```sh
npm install
npm install --prefix portfolio
```

Review and commit the lockfile changes.

### 15.5 GitHub Pages workflow fails during tests

Do not bypass the tests merely to deploy.

Run:

```sh
npm run typecheck
npm run test -- --run
```

Fix the code or test expectation, then push a new commit.

### 15.6 `sharad.fr` does not resolve

Check GoDaddy DNS for all four A records.

Then query a public DNS resolver. If the records were just changed, wait for
the old TTL to expire.

### 15.7 `www.sharad.fr` does not redirect

Confirm:

```text
Type: CNAME
Host: www
Value: shar107.github.io
```

Also confirm the GitHub Pages custom domain is the apex:

```text
sharad.fr
```

### 15.8 HTTPS is unavailable or the certificate is pending

Confirm DNS first. GitHub cannot issue the certificate until the domain
resolves correctly.

After DNS is correct:

- allow GitHub time to issue the certificate;
- do not buy a separate GoDaddy certificate;
- do not repeatedly remove and re-add the custom domain;
- retry the GitHub Pages HTTPS setting after propagation.

### 15.9 The custom domain disappears after deployment

Confirm the workflow still creates:

```text
_site/CNAME
```

with exactly:

```text
sharad.fr
```

### 15.10 The portfolio project card overwrites BasketMap

The path `/projects/basketmap/` is reserved for the Vite application.

The BasketMap content entry includes a URL and should not generate an Astro
detail page at the same path. The deployment then copies the Vite build into
that directory after copying the portfolio.

### 15.11 The wrong personal name appears

The final public name is `Sharad Adhikari`.

Search source and built output:

```sh
rg "Sharadindu|sharadindu" portfolio src LICENSE docs
rg "Sharadindu|sharadindu" portfolio/dist dist
```

Historical Git commits may still show the original author label. That is
separate from current website content.

---

## 16. Final validation record

Before the current portfolio release:

- BasketMap TypeScript checking passed;
- 7 Vitest files passed;
- 126 tests passed;
- BasketMap's nested-path production build passed;
- the Astro portfolio production build passed;
- Astro generated 9 pages;
- the portfolio production dependency audit reported zero vulnerabilities;
- generated HTML contained `Sharad Adhikari`;
- generated HTML contained no `Sharadindu`;
- the combined local artifact served all principal routes with HTTP 200;
- GitHub Actions completed successfully;
- `https://sharad.fr/` returned HTTP 200;
- `https://sharad.fr/projects/basketmap/` returned HTTP 200;
- the deployed BasketMap JavaScript contained `Sharad Adhikari`;
- the deployed output contained no `Sharadindu`;
- `https://www.sharad.fr/` redirected to `https://sharad.fr/`.

---

## 17. Current costs and recurring obligations

| Item | Current cost | Recurring obligation |
|---|---:|---|
| `sharad.fr` first three-year term | `€26.39` including VAT | Review renewal before Sep 2029 |
| GitHub public repository | `€0` | Maintain account access |
| GitHub Actions/Pages for current usage | `€0` | Remain within applicable free limits |
| HTTPS certificate | `€0` | Managed by GitHub Pages |
| DNS management | Included with domain | Maintain correct records |
| GoDaddy hosting | Not purchased | None |
| GoDaddy Microsoft 365 | Not purchased | None |
| Complete Domain Protection | Not purchased | None |
| GoDaddy Airo | Not purchased | None |
| Netlify | Not required by production | Legacy site may remain |
| ChatGPT Sites | Not required by production | Historical deployment only |

The only necessary paid item in the current architecture is the domain
registration.

---

## 18. Known open work

The infrastructure is complete and live. Future work is primarily content and
product development:

- add reviewed professional experience to the portfolio;
- publish real notes or essays;
- add additional real projects;
- update the `Now` page over time;
- periodically refresh BasketMap price observations;
- continue improving product-image coverage;
- verify retailer coverage as upstream data changes;
- consider retiring the old Netlify deployment to reduce confusion;
- decide whether to retain or remove the historical ChatGPT Sites metadata;
- optionally set the GitHub repository homepage field to `https://sharad.fr/`;
- periodically update GitHub Actions versions and dependencies;
- set a domain-renewal reminder well before September 2029.

---

## 19. Recovery checklist

If the local machine is lost but GitHub and GoDaddy access remain:

1. Install Git and Node 24.
2. Clone:

   ```sh
   git clone git@github.com:shar107/basketmap.git
   cd basketmap
   ```

3. Install both applications:

   ```sh
   npm ci
   npm ci --prefix portfolio
   ```

4. Validate:

   ```sh
   npm run typecheck
   npm run test -- --run
   BASKETMAP_BASE_PATH=/projects/basketmap/ npm run build
   npm run build --prefix portfolio
   ```

5. Confirm GoDaddy still has the DNS records listed in this document.
6. Confirm GitHub Pages is configured to deploy through GitHub Actions.
7. Push any required recovery commit to `main`.
8. Wait for `Deploy sharad.fr`.
9. Verify the production URLs.

The source code and deployment workflow are in GitHub. The domain is recoverable
through GoDaddy account access. No production server disk or database needs to
be restored.

---

## 20. Official references

- GitHub Pages custom domains:
  `https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site`

- GitHub Pages custom workflows:
  `https://docs.github.com/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages`

- Vite static deployment and GitHub Pages base paths:
  `https://vite.dev/guide/static-deploy`

- GoDaddy DNS management:
  `https://www.godaddy.com/help/manage-dns-records-680`

- GitHub repository:
  `https://github.com/shar107/basketmap`

- GitHub Actions deployment history:
  `https://github.com/shar107/basketmap/actions`

---

## 21. One-page operational summary

```text
DOMAIN
  sharad.fr
  Registrar/DNS: GoDaddy
  Purchased: 13 Sep 2026
  First term: 3 years
  Paid: €26.39 including VAT
  Displayed renewal: Sep 2029, €32.97 before future changes

DNS
  @ A     185.199.108.153
  @ A     185.199.109.153
  @ A     185.199.110.153
  @ A     185.199.111.153
  @ AAAA  2606:50c0:8000::153
  @ AAAA  2606:50c0:8001::153
  @ AAAA  2606:50c0:8002::153
  @ AAAA  2606:50c0:8003::153
  www CNAME shar107.github.io

GITHUB
  Repository: https://github.com/shar107/basketmap
  Branch: main
  Remote: git@github.com:shar107/basketmap.git
  Licence: MIT

HOSTING
  GitHub Pages via GitHub Actions
  Workflow: .github/workflows/pages.yml
  Root: Astro portfolio
  Nested app: React/Vite BasketMap

PRODUCTION
  https://sharad.fr/
  https://sharad.fr/projects/basketmap/

RELEASE
  Test both apps
  Commit
  Rebase origin/main
  Push main
  Wait for Deploy sharad.fr
  Verify live URLs
```

---

## 22. Final state

`sharad.fr` is now a complete, independently owned and deployed personal web
property:

- the domain is owned through GoDaddy;
- DNS is correctly delegated to GitHub Pages;
- HTTPS is active;
- `www` redirects to the apex domain;
- source is public on GitHub;
- every deployment is reproducible from code;
- the homepage is an Astro portfolio;
- BasketMap is hosted at a stable project path;
- future projects can be added under the same domain without purchasing new
  domains;
- no paid GoDaddy hosting, SSL, email, AI-builder, or protection package is
  required;
- the only essential recurring expense is domain renewal.

This document should be updated whenever the registrar, DNS provider, hosting
provider, deployment workflow, project paths, or renewal arrangement changes.
