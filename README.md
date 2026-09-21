# Exit Framework

Static editorial website at https://chaosexit.com. Production stays on GitHub Pages.

## Local preview

Run `python -m http.server 4173` from the repository root.
Run `python validate.py --decode` with Pillow installed to check every route and anchor, the image pixels and SHA-256, method order, H1s, research boundaries and shared styles.

## Composition

`styles.css` is the shared stylesheet; `portal-hero.css` is loaded only by the homepage. `site.js` owns menu and launch-update interactions only. All identity, navigation, headings, links and page content are real HTML.

The approved homepage hero uses `assets/exit-portal-approved-desktop-v24.webp` at desktop widths and `assets/exit-portal-approved-mobile-v24.webp` below 900 CSS pixels. The desktop file is the supplied 1920 × 1080 approved artwork. The mobile file is a clean crop of the supplied mobile scene with its baked CTA strip removed; live HTML supplies the copy and links. Both layouts keep the same distressed EXIT lettering, amber portal and centered figure. Historical image URLs remain available but are not referenced.

The typeface is locally hosted IBM Plex Mono under the bundled SIL Open Font License. Body text uses the system sans-serif stack.

## State + sync

Sprint and Control Room remain local-first. The canonical browser key is `exit_control_sprint_v1`. `exit-state.js` owns optional authenticated Supabase synchronization and stores sync metadata separately under `exit_sync_meta_v1`. Local writes must succeed before cloud sync is attempted. Anonymous use remains supported.

The browser uses only the Supabase publishable key. Never add secret/service-role credentials to this repository.

## Launch boundary

Checkout and the Founder collection form are inactive. There are no payment or CRM requests. Launch updates link explicitly to the established Substack list. No reservation, payment or research participation is implied. `launch-config.js` remains an inert record of the previous integration configuration and is not loaded.

## Release

Before committing, verify every page in an actual browser at 390, 430, 768 and 1440 CSS pixels. Inspect the source reference and rendered screenshots; test the menu, keyboard focus, CTAs, disclosures, links, resource loading and absence of overflow. Update `design-qa.md` and `qa-results.json` only after those checks pass. The QA record is bound to the public source fingerprint, so a subsequent site edit invalidates it.

Every push to `main` runs the existing `.github/workflows/deploy-pages.yml`. `python validate.py --decode --release` must pass before the existing Pages deployment steps run. After deployment, verify the actual production website in a browser and check the served hero HTTP status, MIME type, full pixel decoding and SHA-256 against the original.
