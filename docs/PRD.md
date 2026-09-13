# BasketMap product requirements

Status: implementation brief; acceptance checks are recorded separately. Research and outcome measures are pending.

## Problem and audience

Comparing a few low item prices can conceal a more expensive full basket. Missing prices can also make a store appear cheaper than a complete option. BasketMap supports one decision: which covered store has the lowest complete basket within the visitor's chosen straight-line radius?

Initial audience hypothesis: students and young professionals around Paris who want to control grocery spending and make one store visit. No interviews have established this audience's needs yet.

Job: “When planning a grocery trip, help me compare the whole basket and the extra distance so I can choose a store confidently.”

Positioning hypothesis: “Compare your whole basket. See the price and the distance.”

## Release scope

P0 is an account-free, static React/TypeScript prototype with 24 fixed grocery specifications, four fictional stores around Bastille, a searchable catalog, whole-pack basket editing, radius filtering, map/list selection, item details, and local browser persistence. All demo prices are authored examples. The public release must keep this status visible beside the results and in store details.

P1 adds a separate product story and data view, shareable published baskets, CSV export, budget/category breakdown, validated local JSON import, and session-only instrumentation. These additions are complete only when verified; they must not postpone the initial usable deployment.

Deferred: accounts, live stock, automatic retailer scraping, route optimization, automatic substitutions, promotions/loyalty pricing, alerts, OCR, and production analytics. An observed dataset is a separate release gate, not a prerequisite for the synthetic demo.

## User stories and acceptance criteria

| Visitor need                      | Required behavior                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Try the product immediately       | The default basket loads without sign-in or a price API call.                                                                             |
| Specify my basket                 | Search labels and French aliases; add, remove, clear, and set integer quantities from 1–20 packs.                                         |
| Compare the whole basket          | Only complete stores within the selected radius compete for lowest price; incomplete subtotals appear separately with missing items.      |
| Weigh price against distance      | Show approximate straight-line distance and name the nearest complete eligible store used as the baseline.                                |
| Inspect the result                | Store cards and map markers select the same detail breakdown; incomplete markers show coverage rather than a partial-price badge.         |
| Recover from unavailable services | Comparison works with a selectable simplified map when tiles fail; blocked storage keeps the session usable with an explanation.          |
| Understand the evidence           | Fictional stores and synthetic prices are explicit; no directions to fictional stores, inventory claims, or fabricated observation dates. |
| Return on this device             | Validate versioned saved state and explain any obsolete items removed; browser storage is not account sync.                               |
| Use the public product on a phone | Core controls remain usable around 390 px; keyboard access, visible labels, focus indication, and useful empty/error states are present.  |

The starter basket is two milk, one eggs, two spaghetti, and one rice. Expected totals are A €8.60, B €8.20, C €9.00, and D €5.20 partial for three of four lines. B is lowest complete; A is nearest complete; the example difference is €0.40. Removing eggs makes D complete and lowest at €5.20. These are test expectations, not measured user savings.

## Success measures and evidence boundary

Release success requires verified calculations, essential browser interactions, a public signed-out journey, and honest data labels. Actual check results belong in the launch/build record.

Activation hypothesis: a visitor edits the starter basket, views the changed comparison, and opens a store breakdown. First research measures are correct store identification, understanding of incomplete coverage and demo status, and obstacles to making a choice. No activation rate, demand, retention, or realized savings has been measured.

Next experiment: three owner-arranged usability sessions, followed by one change grounded in an observed problem and a follow-up attempt. See RESEARCH.md and METRICS.md.
