# Exit Monetization Sprint v0

Status: experimental / internal validation protocol  
Primary first case: Saksfremgang  
Default duration: up to 7 days  
Storage: browser-local only in v0

## Purpose

Monetization Sprint converts a commercial uncertainty into a bounded evidence loop.

It is not a generic productivity sprint. Its job is to answer a narrower question:

> What must we learn about willingness to pay, and what is the smallest experiment that can change that belief?

## Core loop

1. State one falsifiable commercial thesis.
2. Name the single current constraint.
3. Define one concrete success threshold.
4. Set a guardrail for time, money and scope.
5. Run one experiment at a time.
6. Record facts in the evidence ledger.
7. Close each experiment with CONTINUE / CHANGE / KILL / EXTEND.
8. Close the sprint with an explicit commercial decision and one next move.

## Evidence hierarchy

Strongest:
- confirmed purchase / collected revenue

Useful:
- checkout start
- qualified customer conversation
- explicit objection from a qualified prospect
- bounded experiment result

Weak by itself:
- traffic
- impressions
- likes
- shipping volume
- time spent
- internal enthusiasm

The UI deliberately does not count activity as validation.

## Saksfremgang baseline

The built-in seed is intentionally editable before starting.

- Offer: full NAV case analysis
- Customer: people with a NAV decision who need to understand the case and choose the next action
- Thesis: high-intent visitors will pay NOK 499 for a source-grounded analysis and one recommended next action
- Constraint: no confirmed willingness-to-pay signal from non-personal traffic
- Threshold: at least one confirmed NOK 499 purchase from non-personal traffic
- Guardrail: seven days, max NOK 1,000 paid search, no major product expansion

## v0 boundaries

- No team accounts.
- No CRM.
- No AI-generated decisions.
- No automatic import from Stripe or Google Ads.
- No cloud sync.
- No public marketing claim that the protocol is validated.
- No B2B packaging before the protocol has produced useful decision evidence in first-party cases.

## Graduation criteria

v0 earns a v1 build when:
1. At least one real product is run through the protocol.
2. The protocol produces a clearer decision than the pre-sprint state.
3. The evidence ledger is used rather than bypassed.
4. The next constraint is identifiable from the result.
5. The operator would voluntarily run the protocol again on another commercial problem.

## Next likely v1 additions

Only after the graduation criteria:
- reusable sprint templates
- experiment history comparison
- optional Stripe / analytics evidence import
- team ownership and decision roles
- shared evidence ledger
- outcome-based case export
