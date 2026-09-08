# Exit Framework Launch Loop 001

## Objective
Turn Post #001 into a measurable low-capacity path:

Post #001 -> Chaos Audit -> immediate result -> one next useful step -> optional email continuation.

The first launch optimization target is **audit completion**, not sales.

## Live path after merge
- `/articles/chaos-is-not-random.html`
- `/chaos-audit.html`
- optional continuation to the existing Exit Framework Substack list

## Measurement model
The browser emits privacy-minimal event hooks through `launch-metrics.js`.

Events:
- `exit_post001_view`
- `exit_post001_audit_click`
- `exit_audit_view`
- `exit_audit_start`
- `exit_audit_step_complete`
- `exit_audit_complete`
- `exit_result_view`
- `exit_email_continue`
- `exit_audit_restart`

The implementation deliberately does **not** send audit answers, result categories, substance-use selections, health information or free-text data.

Suggested launch dashboard:
1. Post -> audit click-through rate
2. Audit start rate
3. Audit completion rate — primary metric
4. Result -> email continuation rate
5. Step-level abandonment

## Launch thresholds
These are working hypotheses, not established benchmarks.

- Primary: >= 60% of started audits complete all six questions.
- Strong signal: >= 70% completion on mobile traffic.
- Investigate immediately if any single step accounts for >25% of abandonment.
- Do not optimize email conversion at the expense of audit completion or immediate value.

## Low-capacity QA
The flow should remain usable when attention and executive capacity are poor.

Acceptance criteria:
- one question per screen
- no account requirement
- no email gate before result
- no long free-text fields
- every answer can be selected with one tap
- plain-language questions
- visible progress (1/6 etc.)
- Back works without losing previous answers
- missing-answer message is non-punitive and clear
- result contains one primary next action, not an action list
- restart is reversible
- audit answers remain local to the browser session
- medical / diagnostic claims are avoided

## Mobile QA
Test at minimum:
- 320px width
- 375px width
- 390/412px Android-class viewport
- 768px tablet
- keyboard navigation / focus-visible states

Check:
- no horizontal overflow
- CTA buttons remain tappable and full-width where needed
- radio labels are comfortable tap targets
- progress remains visible
- result CTA and privacy note are readable without zoom
- menu remains operable

## Distribution map

### Tier A — owned channels
**chaosexit.com**
- Canonical full article.
- Primary CTA: Chaos Audit.

**Substack**
- Publish a close long-form adaptation.
- One CTA near the end: take the Chaos Audit.
- Do not add Founder 100 / membership as competing launch CTA.

**X**
- Use a shorter thread rather than pasting the full article.
- Core sequence:
  1. My recovery problem
  2. Chaos theory: small problems grow
  3. Complexity: the parts interact
  4. Cybernetics: feedback rebuilds control
  5. Exit: stabilize -> observe -> act -> adjust
  6. Free Chaos Audit

**LinkedIn**
- Optional second-wave channel.
- Use a more systems-thinking / product-learning angle.

### Tier B — Reddit / communities
Principle: **participation first, promotion only where explicitly allowed.**

Do not mass-post the product, automate replies or cold-DM people from support communities.

For recovery / addiction support communities:
- read current subreddit rules before every promotional post
- answer relevant discussions without links by default
- disclose personal connection to Exit if the framework is mentioned
- link only where the community rules or moderators explicitly permit it
- do not use giveaways or pilot places as a workaround around no-promotion rules
- do not request vulnerable users to move into private DMs unless the community explicitly permits it

Recommended operating pattern:
1. Observe recurring chaos problems and language.
2. Contribute useful standalone answers.
3. Let profile discovery create passive traffic.
4. If direct pilot recruitment is desired, ask moderators first.
5. Where approved, recruit transparently: 5 free pilot places, no payment, no required testimonial, honest negative feedback welcomed.

### Pilot structure
- 5 participants
- 2–4 weeks
- free
- no obligation to purchase
- no testimonial requirement
- measure usability and practical follow-through, not clinical outcomes

Suggested pilot checkpoints:
- Day 0: Chaos Audit completed
- Day 1: first useful step completed? yes/no
- Week 1: perceived control / friction review
- Week 2: retention / repeat use
- Exit interview: what helped, what confused, what was too much

## Launch decision rule
Post #001 should not be pushed broadly until the following are verified:
- article renders correctly
- audit completes end-to-end on mobile and desktop
- result appears for all response combinations tested
- email CTA routes to the correct Substack destination
- no audit-answer data is transmitted by the site code
- event hooks fire without containing sensitive selections
- privacy wording matches the implementation

## What not to add yet
- Stripe / checkout
- Founder 100 CTA inside the audit
- mandatory account creation
- mandatory email before results
- personalized medical or addiction-treatment advice
- complex scoring dashboards
- AI-generated diagnosis
- more than one primary next step per result
