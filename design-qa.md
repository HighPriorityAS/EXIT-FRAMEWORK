# Approved Exit homepage hero — design QA

## Evidence

- Source visual truth: `/workspace/scratch/f3a90dafb89b/exit-hero-handoff/01_APPROVED_SOURCE_OF_TRUTH.png` (1536 × 1024) and `03_APPROVED_MOBILE_REFERENCE.png` (477 × 1024).
- Approved production artwork: `assets/exit-portal-approved-desktop-v24.webp` (1920 × 1080) and `assets/exit-portal-approved-mobile-v24.webp` (768 × 806).
- Browser-rendered implementation: `/workspace/scratch/exit-hero-desktop-1440.jpg` (1440 × 900), `/workspace/scratch/exit-hero-mobile-390.jpg` (375 × 844 content crop from a 390 CSS-pixel iframe), `/workspace/scratch/exit-hero-mobile-430.jpg` (415 × 932 content crop from a 430 CSS-pixel iframe), and `/workspace/scratch/exit-hero-tablet-768.jpg` (768 × 1024).
- Full-view comparisons: `/workspace/scratch/exit-hero-desktop-comparison.jpg` and `/workspace/scratch/exit-hero-mobile-comparison.jpg`.
- State: homepage hero, menu closed, default pointer state.
- Density normalization: device scale factor 1. The 1440 × 900 layout was captured at 90% in the browser QA frame and normalized back to 1440 × 900. The 768 × 1024 layout was captured at 85% and normalized back to 768 × 1024. Mobile browser scrollbars consume 15 visible pixels in the QA iframe; CSS media-query widths remained exactly 390 and 430.

## Required fidelity surfaces

- Fonts and typography: local IBM Plex Mono is used for the brand, hero copy, navigation and CTAs. Weight, uppercase treatment, line height, tracking and wrapping match the approved editorial direction. Copy is exact.
- Spacing and layout rhythm: hero height equals the viewport at 390 × 844, 430 × 932, 768 × 1024 and 1440 × 900. Mobile CTAs stack; tablet and desktop CTAs sit side by side. No horizontal overflow was detected.
- Colors and visual tokens: obsidian background, warm cream type, amber portal/rules and restrained dark overlays match the approved palette. Contrast remains readable across the distressed artwork.
- Image quality and asset fidelity: desktop uses the supplied approved 1920 × 1080 artwork unchanged. Mobile uses the supplied gritty mobile scene with only the baked CTA strip removed; the previous minimalist SVG is not referenced. The phone frame/status UI from the reference is intentionally not shipped.
- Copy and content: “Strategic control. Human freedom.”, “Tools. Perspective. Systems for a clearer tomorrow.” and both approved CTA labels are present without changes.

## Findings

- No actionable P0, P1 or P2 mismatches remain.
- Accepted responsive adaptation: the approved mobile reference contains phone chrome and composed UI rather than a clean full-height production background. The implementation uses the closest non-destructive crop authorized by the handoff, preserving the same scene, figure, EXIT lettering and portal without inventing replacement artwork.
- P3: exact subject scale differs slightly between the presentation mockup and live viewport crops because the references and real browser surfaces have different aspect ratios.

Focused-region comparison was not needed after the full-view boards because the critical details—brand/header switch, copy, portal/figure crop and CTA geometry—remain legible at native capture size. DOM measurements were used to confirm exact breakpoint behavior and control geometry.

## Comparison history

1. Initial mobile pass used a 126% natural-size crop, which hid too much of the distressed EXIT lettering. Changed the mobile art direction to 100% width × 62% viewport height; the post-fix 390 and 430 captures retain the central figure, portal and more of the lettering without empty bands.
2. Initial desktop pass placed the copy too high and the CTA row too low/narrow relative to the source. Moved copy to 54%, set the CTA row to 9vh from the bottom with a 1148px maximum width, and added restrained scene-darkening for text contrast. The 1440 × 900 post-fix comparison matches the approved hierarchy.

## Interaction and browser checks

- Mobile hamburger opens, reports `aria-expanded="true"`, closes with Escape, and desktop navigation is never visible at mobile/tablet widths.
- Desktop shows About / Approach / Join and hides the hamburger.
- Primary CTA navigates to `/chaos-audit.html`; secondary CTA navigates to `/framework.html`.
- The header tagline stays hidden at all four tested widths.
- No page-origin console warnings or errors were recorded.
- Content below the hero was not changed.

final result: passed
