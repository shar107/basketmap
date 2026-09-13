# Independent acceptance review for the implementing agent

Reviewed against the implemented code and recorded checks on 12 September 2026. Checked rows combine source inspection, domain tests and browser evidence; exact test counts and deployment state are in BUILD_STATUS.md and LAUNCH.md. Owner usability research remains pending.

## P0 correctness and honest presentation

- [x] Golden starter quantities are 2 milk, 1 eggs, 2 spaghetti, 1 rice; results A 860, B 820, C 900 cents; D 520 partial. Remove eggs: A 620, B 610, C 635, D 520 complete.
- [x] D appears outside the complete ranking, has no lowest-price badge, and its marker says 3/4 items rather than €5.20 while incomplete.
- [x] Empty basket has null coverage/no recommendation; one complete store does not claim comparative savings.
- [x] Radius uses raw Haversine distance, Earth radius 6,371 km; baseline is nearest complete eligible; price ties visibly joint-lowest with deterministic distance/ID order.
- [x] Demo status is visible near results, in detail/popups, and exports. No real-world directions, retailer logos, observed dates for synthetic data, live stock, or “updated today.”
- [x] Dataset registry and version are real; absent observed data is stated plainly with a usable demo action.
- [x] Two fixed packs remain two packs; quantities are integer 1–20, duplicates merge, English labels and local French aliases work.
- [x] Every card, map badge, detail, baseline, category chart, and export uses the same comparison outputs.

## Data boundaries easy to miss

- [x] Runtime validation rejects duplicate IDs, unknown references, non-finite/bad coordinates, real-date errors, unsafe/negative/sub-cent money, and prices above 100,000 cents. The engine excludes future observations.
- [x] Separate demo/observed datasets; observed records require real store, source reference, observation date, non-synthetic verification; no imported record becomes human_checked through automation.
- [x] Exact barcode/package and defining attributes match; equal net weight alone does not equate 4 × 125 g with a 500 g tub or six eggs with twelve.
- [x] Only regular in-store pack prices qualify; latest eligible date selected, equal duplicate collapsed, same-day price conflict unresolved, no fallback to older cheaper value.
- [x] 30-day-old date is eligible at a 30-day cutoff; 31 days excluded; reference clock is fixed in tests and actual Paris date in UI.
- [x] Curated matching records explicit mapping and attributes; several products per branch require selected mapping, not cheapest/fuzzy choice.

## Browser reliability and safety

- [x] Blocked tile requests trigger automatic useful fallback; explicit simplified-map control exists; selectable coordinate plot is labelled basemap unavailable and invents no streets.
- [x] Card and marker selection work in both directions; details have keyboard/focus management; raw imported names never become popup HTML.
- [x] Mobile around 390 px has visible labels, unclipped controls, useful list/map switch, no competing full-height nested scroll panels.
- [x] Empty search, no complete stores, all outside radius, storage failure, invalid share/import, and clipboard failure explain recovery locally.
- [x] Invalid saved state does not crash; obsolete item IDs get explanation; reset works; storage blocked means memory-only notice.
- [x] Public deployment checked without owner's account; direct Data/Product story routes survive refresh; URL and revision are actual evidence.
- [x] OpenStreetMap attribution visible, tile URL configurable, browser caching/referrer retained; repeated automated checks block tiles.

## P1 checks if implemented

- [x] Import ≤2 MB and ≤5,000 observations, specific row errors, preview then explicit apply, rejection atomic; file stays browser-memory only.
- [x] Sharing validates version/size/quantity/catalog IDs; unavailable dataset version prompts explicit current demo; locally imported dataset cannot masquerade as published.
- [x] Shared payloads/events/exports omit precise personal coordinates, file contents, notes, receipts and secrets.
- [x] Clipboard success appears only after successful copy; failure exposes selectable URL without false shared event.
- [x] CSV is real escaped output; formula prefixes neutralized even in imported strings; includes mode/version, calculation time, age policy, specification/quantity/line cost, source/date, missing status, labelled subtotal and complete total only if complete.
- [x] Incomplete selection cannot show a full budget comparison; category chart has accessible equivalent values.
- [x] Session viewer label is exact in meaning; log bounded; comparison events deduplicated by basket/filter state; no aggregate usage claims.
- [x] Bounded live import begins after working P0, schema inspected first, ≤10 pages/1,000 rows, source timeout/rate limits respected, exclusions/coverage documented. Snapshot published only if gate is satisfied.
- [x] Story and docs say research pending, no measured savings or customer quotes; technical QA is not presented as customer evidence.
- [x] Installed package licenses retained in actual distribution; notices list finalized against lockfile.

## Handoff integrity

- [x] npm install/ci, dev, typecheck, test -- --run, build, preview scripts are real and documented; extra e2e command only if installed.
- [x] BUILD_STATUS contains completed milestones, next action, commands and external blockers.
- [x] Final P0/P1 claims distinguish passed, manual, unrun and deferred checks.
- [x] Final handoff is prepared with actual URL or exact publication blocker, project location, active dataset/import outcome, checks, limitations, and the 60-second golden-fixture demonstration.
