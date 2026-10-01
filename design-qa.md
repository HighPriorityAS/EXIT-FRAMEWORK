# EXIT homepage hero v38 — design QA

Approved visual: Strategisk kontroll i regnbyen (1).png, 1672 × 941.
The clean scene removes only baked text and CTA artwork. Figure, threshold,
commuters, transport, perspective and reflections retain the approved composition.
Highest source resolution is retained; responsive WebP files are 1672 × 941
and 1088 × 612. No upscaling, new fonts, dependencies or hero JavaScript.

The headline, supporting copy and both CTAs are visible HTML. The headline uses
a system editorial serif; human freedom. is italic amber. Removed metadata is absent.
Desktop keeps the narrative on the left and text in the calm right field.
Mobile keeps the complete figure and threshold above the copy, with a short
edge fade into the existing background. The existing header remains as before.

Browser-rendered views inspected: 390, 430, 768, 1024, 1440 and 1920 CSS pixels.
No horizontal overflow. Person and threshold remain visible. Both CTA routes
were clicked on desktop and mobile and their destination headings verified.
A 200% font enlargement check at 390 preserves all content with vertical scrolling.
The first 430px screenshot was captured before its image loaded; waiting for
load and recapturing confirmed the image rendered correctly.

Validation: python validate.py --decode --release. Checks all 28 public routes,
anchors, image dimensions and full pixel decode, method order, H1s, research
boundaries and the source fingerprint. Other product source files are untouched.

Result: passed. Screenshots are separate review artifacts, not published site files.
