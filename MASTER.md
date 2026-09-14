# DEVS Wrapped

A Spotify-Wrapped-style story sequence for society stats. No visual design
system is in place — slides use plain default browser styling (system font,
black/white, no custom colors, no imagery beyond mascot placeholders).

## Structure

- `src/wrapped/engine/` — slide sequencing (`StoryController`), the
  injectable slide clock (`Timeline.ts`), and the slide list
  (`SlideRegistry.ts`).
- `src/wrapped/components/` — shared building blocks (`StatReveal`,
  `RetroCounter`, `ProgressBars`, `MascotSlot`, `PixelButton`,
  `PixelBackground`, `GlitchText`). Despite the names, none of these apply
  decorative theming anymore — they're plain functional wrappers.
- `src/wrapped/slides/` — one component per slide.
- `src/wrapped/render-targets/LiveDOM.tsx` — mounts the fixed 1080x1920
  story canvas and scales it to fit the viewport.

## Interaction

Tap zones: left third = previous slide, center third = pause/resume, right
third = next slide. Press-and-hold pauses. Swipe down exits. Slides
auto-advance on a timer with a fade in/out; transitions between slides are a
plain fade (see `TransitionOverlay`).
