# BasketMap research

Status: research pending. No participants have been recruited in this build session, no customer interviews or usability sessions have been conducted, and no customer quotes or behavioral findings are available. The developer's own checks are QA, not usability research.

## Initial assumptions

- Some students and young professionals around Paris prefer one store visit and care about the cost of their complete basket.
- A named price/distance comparison may be easier to act on than disconnected item prices.
- Explicit coverage and evidence may help people recognize when a comparison is too incomplete to trust.

These statements must be tested; they are not validated personas or demonstrated demand.

## Discovery guide

Ask two or three accessible people about a recent concrete experience. With consent, record concise notes and distinguish what they did from what they say they might do.

1. Tell me about your most recent grocery trip. How did you choose the store?
2. Did you compare prices anywhere? Show me what you used, if possible.
3. When have you gone farther away to save money? What made it worthwhile?
4. Which products would you refuse to substitute, and why?
5. What information would you need before trusting a basket comparison?

## Usability task

Give the public URL with minimal coaching: “Use this example basket to choose one store within the selected distance. Tell me what you are relying on.”

Observe whether the tester identifies B as the lowest complete starter basket, recognizes D as incomplete, notices that stores and prices are fictional, and inspects the item breakdown. Then ask the tester to remove eggs and explain why the result changed. D should become complete and lowest; do not reveal that answer in advance.

Ask what information was missing and what they would do next. Do not imply that this demonstration finds a real saving or that the stores exist.

## Session record template

| Field                  | Record after an actual session                                     |
| ---------------------- | ------------------------------------------------------------------ |
| Session / date / build | Anonymous session ID, actual date, checked URL and revision        |
| Consent                | Permission to record notes or an anonymous quote                   |
| Starting conditions    | Device, basket, dataset/version, origin preset, radius             |
| First choice           | Store selected, stated reason, assistance required                 |
| Understanding          | Demo status noticed; incomplete state interpreted correctly        |
| Interaction            | Basket edit, comparison update, details opened                     |
| Eggs removal           | New choice and explanation                                         |
| Main obstacle          | Observed behavior; separate researcher inference                   |
| Comment                | One consented verbatim comment, or a clearly labelled paraphrase   |
| Revision / retest      | Concrete change, evidence motivating it, and actual retest outcome |

Target the first three sessions as a convenience sample. Report counts with their small denominators, not market-wide conclusions. Keep personal identifiers and recordings out of the public repository.

## Open questions

- Does one-store comparison match how people actually shop?
- Which substitutions are acceptable, and which attributes are essential?
- How much evidence is enough to trust a record with an older observation date?
- When is extra distance worth a lower complete total?
- Is obtaining enough comparable branch-specific data practical?
- Would people return before a later grocery trip once real observations exist?

Next step: the owner arranges actual sessions after the public journey has been checked. No outreach has been sent by the build agent.
