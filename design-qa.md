# EXIT homepage hero v43 — design QA

The approved rainy-city artwork remains unchanged. Desktop retains the full-bleed scene, the original right-side copy field and both live CTAs.

At widths below 900 CSS pixels, v43 gives the artwork a bounded first row and places the live copy in the following row. The lower image edge fades into the existing dark field. The hero can grow vertically when the copy needs more room, so the headline and actions remain reachable.

Production QA ran in GitHub Actions Chromium with Playwright 1.55.0 on 2026-10-06:

- **390 × 844 mobile:** the hero is 390 × 844. Both 50-pixel CTAs fit in the viewport; the secondary CTA ends at y=747. The full headline, supporting copy and both buttons are visible.
- **1440 × 900 desktop:** the hero remains 1440 × 900, with the approved image composition and both CTAs intact.
- The GitHub Pages launch validator passed, including full WebP decode and expected image dimensions.

Screenshots and viewport metrics are saved under `qa/live` on the repository's QA branch.

Result: passed for the v43 mobile layout and desktop regression check.
