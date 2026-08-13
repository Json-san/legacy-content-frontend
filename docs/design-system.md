# Legacy Content — Frontend Design System

Living reference for visual/interaction decisions made building the hero (`app/hero/`), to keep the rest of the app consistent. Update this file whenever a new page introduces a pattern worth reusing.

## Identity

- **Product**: Legacy Content — real estate marketing compliance engine (org submits content, it's checked against org-defined rules before publishing).
- **Voice**: editorial, confident, no marketing fluff. Copy explains what the check *does*, not vague benefits.
- **Palette**: strict two-tone ink-on-paper. No accent color, no gradients.
  - `--ink: #111111` — text, strokes, filled shapes.
  - `--ink-soft: #6f6f6f` — secondary text (nav links, tagline, eyebrow, lede).
  - `--line: rgba(17, 17, 17, 0.13)` — hairline borders/rules.
  - `--paper: #ffffff` — background.
- **Typography**:
  - `Playfair Display` (weight 500 only) — brand wordmark + hero headline. Nowhere else.
  - `Inter` — everything else. Small sizes, wide uppercase letter-spacing for labels (nav `0.15em`, tagline `0.19em`, eyebrow `0.28em`, CTA `0.16em`).
- Shadows appear in exactly one place: the primary CTA button on hover. No shadows elsewhere.

## Layout conventions established in the hero

- CSS custom properties as the contract between JS and CSS (e.g. `--crowd-top`, set by the canvas engine on every resize, consumed by `.hero { height: var(--crowd-top) }`). Prefer this pattern over hardcoded breakpoint heights when a layout depends on dynamically generated content.
- Fixed, non-scrolling viewport sections (`overflow: hidden`) use `position: fixed` + `z-index` layering: background canvas at `z-index: 0`, content at `z-index: 5+`, nav at `z-index: 10`.
- Responsive rules drop secondary content before shrinking primary content (e.g. hero lede disappears before the headline shrinks further) — see `@media (max-width / max-height)` blocks in `app/hero/hero.css`.

## Canvas illustration engine (`app/hero/cityStreet.ts`)

Established pattern for any future full-bleed animated/illustrated background:

- **Static base + dynamic overlay split**: expensive geometry (the skyline) is drawn once per resize onto an offscreen canvas; the per-frame render loop only `drawImage`s that base and redraws the handful of currently-active dynamic elements (lit windows, an open door, a car) on top. Never redraw static geometry per frame.
- **GSAP owns all motion**: `gsap.ticker` drives the render loop (never a custom `requestAnimationFrame`), and every animated value (car position, door slide progress, window light opacity) is a plain object property tweened by GSAP, read by the renderer.
- **No external assets**: illustrations are drawn with canvas path/shape primitives in code, not sprite sheets or images. Keeps the palette pixel-exact to the two-tone system and avoids asset pipeline/CORS concerns.
- **Randomized but seeded-by-config**: variation (building height/roof/door size, car kind/size/speed, event timing) comes from `randomRange`/`pick` helpers over a single `config` object at the top of the file — tune behavior there, not by editing draw calls inline.
- **Layout feeds back to CSS**: after generating the scene, the engine writes a CSS var (`--crowd-top`) so the DOM content above it can size itself to the clear space, instead of a fixed guess.
- **Center clearance rule**: any generated scene sitting behind hero copy/CTA must bias content near the horizontal center to be smaller/shorter ("valley" effect) — the CTA must never look cramped against illustrated elements, even though z-index already prevents literal overlap. Established after user feedback that "camera doesn't overlap" isn't enough — visual breathing room matters too.
- **Minimum-size floors**: any procedurally-sized sub-element (a door, a window) needs an explicit floor/clamp relative to its parent (e.g. `height = Math.max(height, 80)` before sizing a door off of it) — random generation without a floor produces visually broken elements (door taller than the building it's on).
- **Detail density**: keep per-element line detail low — fewer, larger strokes read better at this scale than many thin lines (e.g. bus went from 4 small windows to 2 large ones on feedback). Default to "could this be one bigger shape instead of three small ones?" when adding detail to a procedural element.

## Open threads / not yet decided

- Exact final car silhouette set is still being iterated on — user has flagged some shapes as not quite right without specifying which; next session should confirm per-shape before assuming the current 5 (`sedan`, `van`, `pickup`, `sport`, `bus`) are final.
- No component library / design tokens file exists yet in Tailwind config — the hero uses hand-written CSS (`app/hero/hero.css`) with its own custom properties rather than Tailwind utilities, because the visual system (exact two-tone palette, precise letter-spacing scale) didn't map cleanly to default Tailwind tokens. Revisit if more pages are added — may be worth porting these tokens into `app.css`'s `@theme` block for reuse.
