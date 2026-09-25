# EXIT homepage hero v30 — design QA

## Evidence

- Source visual truth: approved hero mockup from the current design thread, compared as a 1600×900 normalized visual target.
- Implementation evidence: production screenshot supplied after v29 deployment, normalized side-by-side against the source.
- Viewport/state: desktop homepage hero, menu closed, default state.
- Full-view comparison: source and implementation were placed in one normalized comparison board before judging.
- Focused regions reviewed: evidence wall, subject/control seam, headline/CTA block, stage rail and principle band.

## Findings

- [P1] Evidence wall still reads as old EXIT portal artwork rather than documentary system evidence.
  - Evidence: v29 is dominated by oversized distressed EXIT letters; source uses a dense collage of logs, photographs, paper fragments and system traces.
  - Fix: v30 masks the old portal artwork outside the narrow control corridor and uses real repository imagery as layered evidence fragments.
- [P1] Human subject is too large in v29.
  - Evidence: subject occupies roughly a third to two-fifths of hero height; source uses a smaller human scale relative to the system.
  - Fix: v30 scales the portal scene to 78% around the control axis while preserving alignment.
- [P2] v29 evidence blocks are too rectangular/digital.
  - Evidence: bordered UI rectangles dominate instead of tactile materiality.
  - Fix: v30 lowers panel contrast and introduces overlapping photographic fragments with restrained rotation, grayscale/sepia treatment and mixed opacity.
- [P2] Control seam is too laser-like.
  - Fix: v30 reduces the synthetic core/glow and lets the photographic amber light carry more of the effect.

## Required fidelity surfaces

- Fonts/typography: v29 hierarchy is directionally correct; v30 slightly reduces headline scale to recover source breathing room.
- Spacing/layout: right-side copy and CTA geometry remain live HTML; left-side composition is rebalanced without changing entry actions.
- Colors/tokens: obsidian, warm cream and amber retained; synthetic amber intensity reduced.
- Image quality/asset fidelity: v30 uses real repository raster assets for evidence material rather than CSS-only proxy imagery.
- Copy/content: canonical hero copy, CTAs, stage labels and principles remain unchanged.

## Comparison history

1. v28: CSS/SVG proxy scene — blocked for major materiality and subject mismatch.
2. v29: photographic portal restored — major improvement, but comparison still shows P1 drift from evidence-wall source direction.
3. v30: masks legacy EXIT-letter artwork outside the control corridor, reduces subject scale, restores layered photographic evidence. Requires a post-deploy screenshot comparison before pass.

## Remaining QA requirement

Capture v30 at desktop and mobile widths after deployment and compare against the approved source. Do not mark passed until no P0/P1/P2 findings remain.

final result: blocked
