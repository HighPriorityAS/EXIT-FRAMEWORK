# EXIT homepage hero v31 — design QA

## Source visual truth
- Approved hero image: strategisk_kontroll_menneskelig_frihet.png from the current conversation.
- Repository scene asset: assets/exit-hero-approved-v31.webp, cropped directly from the approved image to preserve the evidence wall, subject, amber portal and materiality.

## Implementation
- Branch: hero-approved-image-v31
- The hero no longer reconstructs the visual source with evidence cards, Post-its, CSS drawings, inline SVG subject art or a synthetic control-axis scene.
- Header, headline, lead, CTAs, stage rail and principles remain live HTML.

## Findings history
1. v28 — blocked: CSS/SVG reconstruction materially diverged from the approved source.
2. v29/v30 — blocked: legacy portal artwork and reconstructed evidence UI remained dominant.
3. v31 — source image is now the visual scene. Remaining gate is browser-rendered desktop/mobile comparison.

## Required fidelity surfaces
- Typography: live editorial headline retained.
- Layout: desktop scene left / live copy right; portrait mobile scene above copy; landscape scene left / copy right.
- Color: source image carries the approved obsidian/cream/amber treatment.
- Image fidelity: direct crop of approved source; no proxy reconstruction.
- Copy: canonical EXIT copy remains live.

## Final gate
Browser-rendered desktop and mobile screenshots must be compared against the source before production merge.

final result: blocked
