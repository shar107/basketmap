# BasketMap metrics

Status: session event instrumentation and a capped local viewer are implemented. Actual QA counts and deployment status are recorded in BUILD_STATUS.md and LAUNCH.md. No external collection endpoint or aggregate visitor funnel is claimed. No real-user activation, retention, demand, or realized savings result has been measured.

## Collection contract

Use a capped browser-session log behind `track(event, properties)`. Label its viewer “Events from this browser session.” Log only the small property set below; events from automated tests or developer checks are QA traffic. A download of this session's events is a debugging artifact, not analytics for all visitors.

| Event                  | Trigger                                                | Allowed properties                      |
| ---------------------- | ------------------------------------------------------ | --------------------------------------- |
| `demo_opened`          | Demo entered                                           | Dataset version, app version            |
| `basket_edited`        | Add, remove, clear, preset, or quantity change         | Action, distinct line count, pack count |
| `comparison_viewed`    | A particular basket/filter state first becomes visible | Mode, complete-store count, line count  |
| `store_details_opened` | A store breakdown is opened                            | Mode, complete/incomplete status        |
| `radius_changed`       | A radius change is committed                           | Radius bucket, eligible-store count     |
| `comparison_shared`    | A share/copy action succeeds                           | Published dataset version, line count   |
| `comparison_exported`  | CSV generated and download action invoked              | Dataset version, line count             |
| `map_fallback_used`    | User or error handler switches map mode                | A fixed error category or user action   |

The event timestamp may identify session ordering. Do not log precise coordinates, product/search free text, personal notes, names, emails, receipt details, file contents, or tokens. Avoid duplicate comparison events caused by re-renders. Merely displaying a share URL after clipboard failure is not a successful copy.

## Hypotheses and measures

Activation hypothesis: the same visitor changes the preloaded basket, views the resulting comparison, and opens a store breakdown. Auto-loading the sample is not activation. If future real collection is introduced, define session boundaries, consent/disclosure requirements, denominator, exposure, and test-traffic exclusion before reporting a funnel rate.

For the first real usability sessions, record:

- Correct identification of the lowest complete starter basket: count / sessions attempted.
- Correct interpretation of the incomplete store: count / sessions attempted.
- Recognition that prices and stores are examples: count / sessions attempted.
- Completion after removing eggs, with assistance recorded.
- The observed obstacle and one consented comment per session.

Later measures: comparison completion, return before a subsequent grocery trip, self-reported usefulness, observed-data overlap and complete-store coverage. Actual spending changes need separate evidence. A synthetic €0.40 difference is arithmetic in a scenario, not a user saving.

## Results ledger

| Measure                 | Current evidence                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Domain and browser QA   | See BUILD_STATUS.md and LAUNCH.md for actual counts and public checks                      |
| Real usability sessions | 0 conducted in this session                                                                |
| Activation / retention  | Unmeasured                                                                                 |
| Realized savings        | Unmeasured                                                                                 |
| External analytics      | No external collection endpoint configured                                                 |
| Observed dataset        | No observed snapshot published; bounded discovery found no shared barcode across locations |
