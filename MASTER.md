# DEVS Wrapped

A Spotify-Wrapped-style story sequence for society stats.

## Structure

- `src/wrapped/engine/` — slide sequencing (`StoryController`), the
  injectable slide clock (`Timeline.ts`), and the slide list
  (`SlideRegistry.ts`).
- `src/wrapped/components/` — shared building blocks (`StatReveal`,
  `RetroCounter`, `ProgressBars`, `MascotSlot`, `PixelButton`,
  `PixelBackground`, `GlitchText`).
- `src/wrapped/slides/` — one component per slide.
- `src/wrapped/render-targets/LiveDOM.tsx` — mounts the fixed 1080x1920
  story canvas and scales it to fit the viewport.

## Interaction

Tap zones: left third = previous slide, center third = pause/resume, right
third = next slide. Press-and-hold pauses. Swipe down exits. Slides
auto-advance on a timer with a fade in/out; transitions between slides are a
plain fade (see `TransitionOverlay`).

## Design system — "Arcade Wrapped"

Two visual worlds share one palette. Bespoke full-scene slides (the
mountain-climb percentile slide, the event corkboard) get their own custom
pixel art. Every other slide — intro, the "now let's talk about you" pivot,
recap, share, stat reveals — uses the shared shell below: `PixelBackground`
+ `GlitchText` (+ `RetroCounter`, `PixelButton`). Changing those four
components changes every slide that uses them.

Nothing here should be reinvented per slide — every color, font, and motion
value below is the single source; components read from it, they don't
redeclare it.

### Color

Reused verbatim from the mountain-climb slide's palette (`MountainProgressTracker.tsx`) —
one world, not two:

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0D0714` | Base ground, darkest gradient stop |
| `--deep-purple` | `#2A1245` | Gradient stop, panel/border fill |
| `--hero-purple` | `#7B3FE4` | Gradient stop, primary accent |
| `--glow-purple` | `#9B5FF0` | Gradient stop, glow/accent only — 4.0:1 on white, not for body text fills |
| `--support-blue` | `#4A5FD9` | Gradient stop, secondary accent |
| `--paper` | `#FFFFFF` | Headline/counter text |
| `--mist` | `#C9BEDD` | Caption/label text |

Contrast checked against `--ink`: paper 19.9:1, mist 11.3:1, hero-purple as
a text fill 5.7:1, support-blue as a text fill 5.4:1 — all pass for the
sizes they're used at.

### Typography

- **Headline** — `Press Start 2P`, per-slide `fontSize` 38–56px (bigger for a single hero word/phrase — intro's society name at 56, shorter reveals at 46–52, empty-state fallback copy at 38). White fill, glow `text-shadow: 0 0 8px rgba(155,95,240,0.85), 0 0 20px rgba(74,95,217,0.5)`. Component: `GlitchText`.
- **Caption / label** — `Space Grotesk`, weight 700, 22px, uppercase, `letter-spacing: 0.08em`, color `--mist`. Short lead-in lines only ("Your favourite team was", row labels). Component: `Caption` (`components/Caption.tsx`).
- **Blurb** — `Space Grotesk`, weight 400, 24px, sentence case, color `--mist`. Longer one-line flavor text (category quips, archetype blurbs) — deliberately not uppercase, since that breaks the punchy lowercase phrasing. Component: `Blurb` (same file).
- **Counter (big numbers)** — `Jersey 10`. Chunkier and more legible at hero size than `VT323`/`Pixelify Sans`, still pixel-styled. `font-variant-numeric: tabular-nums`.
- All fonts are already loaded in `index.html` — no new font requests needed.

Every plain, unstyled `<div>` that used to carry caption/blurb text (RecapSlide's rows, ShareSlide's society name, etc.) now goes through `Caption`/`Blurb` — there should be no more raw-text divs riding on inherited browser defaults on the general-slide layer.

### Motion

Clock-driven throughout — every value below is scrubbed off `useSlideClock`
(GSAP timelines, `.seek()`-based) and must never read `Date.now()` or free-run
via `requestAnimationFrame`/CSS `@keyframes`, so a slide renders identically
live or under the stepped export clock.

| What | Value |
|---|---|
| Checker tile size | 12px (low-res buffer, same 108×192 buffer convention as the mountain slide) |
| Checker tilt | 18°, rotated around the canvas center |
| Checker drift | 6px/s diagonal, seamless 4.0s loop (`elapsedMs`-driven, not rAF) |
| Gradient wash | Static — same 5-stop diagonal band ramp as the mountain slide's sky, not animated |
| `GlitchText` entrance | 450ms, `back.out(1.7)` (~10% overshoot), 16px travel — layered on top of, not instead of, the slide's own container fade/slide (which stays 40px, `power2`, per `applyEnterExit`) |
| `GlitchText` idle bounce | ±4px, 1.6s period, continuous while the slide holds |
| `PixelButton` press | Immediate hard-cut scale (`transform: scale(0.92)`), no easing, ~90ms |
| Reduced motion | Checker drift freezes to a static frame; `GlitchText` snaps straight to its settled position with no idle bounce |

**Forbidden on this shared layer:** soft/blur easing, parallax (parallax is
reserved for the personal-stats slides — see `SlideRegistry`'s
`transitionIn: "parallax"` slides), and any timing sourced from
`Date.now()`/rAF instead of the injected clock.

### Layout

Unchanged from the existing slide convention: full-bleed, centered flex
column, 64px padding, hard edges (no border-radius), 1px borders where
needed. `PixelBackground` and `GlitchText` are the only things that changed
look — slide layout code doesn't need to change to pick up the new system.
