# Exit Framework

Static editorial website at https://chaosexit.com. Production stays on GitHub Pages.

## Local preview

Run `python -m http.server 4173` from the repository root.
Run `python validate.py --decode` with Pillow installed to check every route and anchor, the image pixels and SHA-256, method order, H1s, research boundaries and shared styles.

## Composition

`styles.css` is the only active stylesheet. `site.js` owns menu and launch-update interactions only. All identity, navigation, headings, links and page content are real HTML. The hero is `assets/exit-framework-hero-source.jpg`, an unchanged 864 × 1536 JPEG. Never convert, regenerate, crop or substitute it.

The homepage uses the full portrait artwork with a shared dark/cream field, navigation and margin notes on desktop. Headline and outlined entry links follow the original CHAOS/CONTROL center. Mobile gives the original artwork a full proportional row and places headline, subtitle and entry links beneath it. Old hero styles and JavaScript injection have been removed. Historical image URLs remain available but are not referenced.

The typeface is locally hosted IBM Plex Mono under the bundled SIL Open Font License. Body text uses the system sans-serif stack.

## Launch boundary

Checkout and the Founder collection form are inactive. There are no payment or CRM requests. Launch updates link explicitly to the established Substack list. No reservation, payment or research participation is implied. `launch-config.js` remains an inert record of the previous integration configuration and is not loaded.

## Release

Before committing, verify every page in an actual browser at 390, 430, 768 and 1440 CSS pixels. Inspect the source reference and rendered screenshots; test the menu, keyboard focus, CTAs, disclosures, links, resource loading and absence of overflow. Update `design-qa.md` and `qa-results.json` only after those checks pass. The QA record is bound to the public source fingerprint, so a subsequent site edit invalidates it.

Every push to `main` runs the existing `.github/workflows/deploy-pages.yml`. `python validate.py --decode --release` must pass before the existing Pages deployment steps run. After deployment, verify the actual production website in a browser and check the served hero HTTP status, MIME type, full pixel decoding and SHA-256 against the original.
