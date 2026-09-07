# Exit Framework launch QA

final result: passed

## Scope and evidence

Compared the actual `exit-framework-layout-reference.jpg` (864 × 1536) with rendered local screenshots, including a combined comparison board. Inspected the actual `exit-framework-hero-source.jpg` separately before implementation. The source governs image details; the reference governs interface composition. This is a responsive website, so the wide desktop view and separate mobile text rows intentionally differ from the portrait mockup.

Browser: Codex in-app browser. Actual `window.innerWidth` values: **390, 430, 768, 1440 CSS pixels**, height 780. All 18 public HTML routes, including all six articles, the research boundary page and 404 page were opened at every width: **72 checks**. Scrollbars occupy approximately 15 CSS pixels; saved browser screenshots can be scaled by the capture surface and are not used to infer viewport width. No desktop crop was used as a mobile test.

Evidence retained in the task's `work/qa` directory: per-route screenshots at all four widths, settled lower-page screenshots at 390 and 1440, homepage section screenshots at 390/768/1440, `matrix.json`, `interactions.json`, `anchors.json`, `http.json`, and `reference-comparison.jpg`. Release metadata and the public-source fingerprint are in `qa-results.json`.

## Findings resolved

- P1: Original production used a background image, hid picture/img, hid the full brand, and lacked visible hero copy. Replaced its composition with a normal unchanged JPEG, full SVG/HTML identity, navigation, visible headline/subtitle/supporting copy, and primary/secondary outlined links.
- P1: First local desktop headline lacked contrast on cream because a transformed parent isolated text blending. Removed that stacking context; the headline now takes a dark tone over cream and a light tone over black. Re-inspected the revised desktop and tablet entry screenshots.
- P2: Three older articles lacked a skip-link target/mobile navigation. All public pages now have the same real header, menu, main target and footer. Route and anchor validation passes.
- P2: The inactive Founder form previously accepted details and redirected without storing them. It now explains that collection and reservations are not open, and exposes the existing Substack destination as an explicit link. No payment/CRM integration is activated.
- P2: Rapid anchor captures caught smooth-scroll intermediate positions. Switched anchor movement to instant scrolling and verified all six homepage targets at 390, 768 and 1440; targets settle at approximately 48 px (scroll padding plus target margin). Added a content-derived stylesheet cache key so existing visitors receive the new design.
- Capture issue: Large stitched browser captures produced incomplete images. Discarded them as evidence and used settled viewport screenshots. This did not require changing the source artwork.

## Fidelity review

- Typography: full spaced wordmark and geometric emblem; locally hosted IBM Plex Mono for navigation, labels, subtitle and outlined entry controls; clear sans-serif content hierarchy.
- Composition: identity/navigation precede the silhouette and its original CHAOS/CONTROL center, followed by headline, subtitle, support and the two entry links. Wide layout is integrated through the black/cream field and meaningful margin text. Mobile preserves the entire image and places readable HTML copy in a separate row.
- Palette: obsidian, warm cream, muted amber. Shared editorial columns and dividing rules replace stacked gray cards and blue research panels. No vortex, duplicate grid, duplicate crosshair or duplicate CHAOS/CONTROL text is rendered.
- Image: original JPEG copied as bytes; 864 × 1536 intrinsic and rendered proportional dimensions; no stretching, filtering, conversion or cropping. CHAOS/CONTROL, central crosshair and lower original signature remain unobstructed.
- Copy: required hero wording, eight-step method and established products retained. No decorative founding date/statistic was imported from the mockup. Research links and the explicit commerce/research boundary remain present.

## Functional and technical checks

- Primary hero link opens Framework; secondary opens Founder 100, at all four widths.
- Menu opens, Tab enters the first link, Escape closes it and restores toggle focus, at all four widths.
- FAQ disclosure opens at all four widths.
- Product-update buttons focus the explicit launch-updates link and announce that reservations are not open and no details were submitted. No local form submission, CRM request or payment request exists.
- All 18 pages have exactly one H1 and one active stylesheet. All local links/resources and fragment targets resolve.
- All 72 responsive passes show no horizontal overflow. Inspected top and lower page views, article text columns, tablet product columns, mobile stacked sections, and homepage research transition without text collisions.
- Browser warning/error log: empty during the recorded checks. Local HTTP checks: all 23 requested page/style/script/font/hero resources returned 200.
- Served hero: HTTP 200, `image/jpeg`. Pillow fully loaded all pixel data from both the copied file and the HTTP response; this is not merely a header/naturalWidth check.
- Source and local served SHA-256: `aca2b26064cc3880e8722fe2d45ea877a62a1741906b573b658b7c3325def853`.

No remaining P0/P1/P2 design or functional findings. Stripe/CRM activation remains deliberately outside this release. Production verification follows deployment and is recorded separately in the delivery report.
