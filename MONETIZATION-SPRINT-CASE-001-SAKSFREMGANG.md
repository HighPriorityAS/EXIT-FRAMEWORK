# Monetization Sprint Case 001 — Saksfremgang

Status: READY TO RUN  
Protocol: Exit Monetization Sprint v0  
Start window: 2026-09-24  
Default decision point: Day 7

## Day 0 baseline

**Offer**  
Saksfremgang — full NAV case analysis.

**Customer**  
A person with a NAV decision who needs to understand the case, identify relevant facts and choose the next action.

**Commercial thesis**  
People arriving with a high-intent NAV problem will pay NOK 499 for a source-grounded analysis and one recommended next action.

**Current constraint**  
No confirmed willingness-to-pay signal from non-personal traffic yet.

**Success threshold**  
At least one confirmed NOK 499 purchase attributable to non-personal traffic.

**Guardrail**  
Maximum seven days. Maximum NOK 1,000 paid-search spend. No major product expansion during the experiment.

## Experiment 001 — High-intent Search

**Hypothesis**  
A small stream of people actively searching for help understanding or challenging a NAV decision contains enough purchase intent to generate at least one paid Saksfremgang analysis.

**Bounded action**  
Run one tightly scoped Google Search campaign using high-intent NAV decision / complaint queries. Send traffic to the existing product flow. Do not broaden product scope during the test.

**Success signal**  
Primary: at least one confirmed NOK 499 purchase from non-personal campaign traffic.

Secondary signals, useful but not sufficient by themselves:
- checkout started
- qualified user reaches paid-analysis boundary
- explicit objection revealing price, trust or product-fit friction

**Do not count as validation**
- impressions
- clicks
- CTR alone
- time spent building
- features shipped
- internal confidence

## Evidence ledger fields

For every material signal record:
- date
- evidence type
- count
- revenue if any
- source/channel
- one factual sentence describing what happened

Do not record customer-sensitive case content in the sprint ledger.

## Decision rules

### CONTINUE
Use when the paid threshold is met or the evidence strongly supports repeating the same commercial mechanism.

Default next move:
Repeat the same channel/offer combination with a bounded second sample before broadening scope.

### CHANGE
Use when there is meaningful intent but the current offer, trust layer, price, message or funnel prevents conversion.

Default next move:
Change the smallest plausible variable identified by evidence, then run one new experiment.

### KILL
Use when the test produces enough relevant exposure to reject the current commercial thesis, or when the cost/burden required to test it further is no longer justified.

Default next move:
Stop spending capacity on this path and name the next commercial thesis.

### EXTEND
Use only when evidence is genuinely insufficient because the test did not reach a useful sample or a material instrumentation failure invalidated the result.

Do not use EXTEND to avoid making an uncomfortable decision.

## Day 7 output

The sprint must end with:

1. Current reality — facts only.
2. Commercial signal — paid / checkout intent / qualified interest / no useful signal.
3. Decision — CONTINUE / CHANGE / KILL / EXTEND.
4. Evidence-backed rationale.
5. One bounded next move.
6. Newly identified constraint.

## Learning objective for Exit itself

This case tests two things at once:

1. Saksfremgang: whether the existing product can produce a non-personal willingness-to-pay signal.
2. Exit Framework: whether Monetization Sprint produces a clearer, lower-friction commercial decision than ordinary founder activity.

A successful Exit test does **not** require Saksfremgang to get a purchase. Exit succeeds if the protocol materially reduces uncertainty and leads to a defensible next decision without unnecessary scope expansion.
