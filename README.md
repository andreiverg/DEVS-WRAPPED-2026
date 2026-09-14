# DEVS Wrapped

A full-screen, Instagram Stories-style animated carousel that walks a DEVS
member through their personal yearly stats — 16-bit pixel-art aesthetic,
society-wide recap first, then personal stats, archetype, and a share card.
Built to also be server-rendered into a shareable video via Playwright +
ffmpeg (pipeline not yet built — see Status below).

## Running it

```bash
npm install
npm run dev
```

Opens the live carousel at a fixed 1080×1920 virtual canvas, letterboxed to
fit the browser window. Tap/click the right two-thirds of the canvas to
advance, the left third to go back, press-and-hold to pause, and swipe down
to exit. It currently renders `src/wrapped/dev/sampleStats.ts`'s
`SAMPLE_STATS` — there's no real backend or member-picker yet.

```bash
npm run build   # tsc -b && vite build
npm run lint    # oxlint
```

## Architecture

```
src/wrapped/
  data/
    schema.ts          # WrappedStats input contract + EventCategory/ArchetypeId
    validate.ts         # defaults/guards + archetype computation
    categoryCopy.ts      # per-category label + flavor quip
    archetypeCopy.ts     # per-archetype label + blurb
  engine/
    Timeline.ts          # injectable clock (LiveClockProvider / SteppedClockProvider)
                          # + useSlideTimeline/applyEnterExit GSAP helpers
    SlideRegistry.ts      # SlideConfig type + buildSlideRegistry() ordering
    StoryController.tsx    # autoplay timer, tap/hold/swipe nav, play/pause/seek
  slides/                 # one component per slide (see Slide sequence below)
  components/
    CanvasStage.tsx        # fixed 1080x1920 virtual canvas (no responsive layout)
    ProgressBars.tsx        # IG-story segmented progress bar
    PixelBackground.tsx      # gradient + ASCII texture layer
    GlitchText.tsx            # RGB-split heading text
    RetroCounter.tsx           # odometer-style count-up
    StatReveal.tsx               # shared "label + count-up number" slide template
    MascotSlot.tsx                # static per-archetype sprite (idle-loop animated externally)
  theme/tokens.css        # palette / font / spacing CSS vars
  render-targets/
    LiveDOM.tsx           # scales/letterboxes CanvasStage for desktop
  dev/
    sampleStats.ts         # sample WrappedStats payloads for local preview
    PlaceholderSlides.tsx    # colored-box slides used to prove nav timing (unused by the app)
```

### The injectable clock (`engine/Timeline.ts`)

Every slide's GSAP timeline is scrubbed by elapsed time rather than played by
GSAP's own ticker, via `useSlideTimeline`. Two providers feed that elapsed
time:

- `LiveClockProvider` — ticks via `requestAnimationFrame` (used by
  `StoryController` for the live experience).
- `SteppedClockProvider` — elapsed time is supplied externally, frame by
  frame (intended for the future Playwright render route).

Slide components never call `requestAnimationFrame`/`Date.now()` directly —
this is what will let the same components produce frame-identical output
live and under headless capture, once the render pipeline is built.

**Gotcha worth knowing:** GSAP's `.from()`/`.to()` infer the "other side" of
a tween from the target's *current* inline style. React 18 StrictMode
double-invokes effects in dev, so the first timeline gets built and killed
before the second is created — killing a tween leaves its last-rendered
value in the DOM, which a freshly-created `.from()` then reads as its own
end value, animating nothing visibly. Fix: every tween in this codebase uses
explicit `.fromTo()` endpoints instead (see `applyEnterExit` in
`Timeline.ts`).

### Archetype logic (`data/validate.ts`)

`personalityType` is **not** sent by the backend — a member's DEVS archetype
is derived client-side from `eventsAttended`, `eventsByCategory`, and
`attendancePercentile`, in this precedence order:

1. `eventsAttended < 2` → **Ghost Member**
2. `attendancePercentile <= 10` → **Devs Star**
3. Otherwise, by category share of their attended events:
   - No category reaches 35% share → **All-Rounder**
   - Tech + Industry combined ≥ 50% → **Locked In**
   - Social is the plurality → **Party Animal**
   - Competitions is the plurality → **Competitor**
   - (unreachable given 4 exhaustive categories) → **Wildcard** fallback

### Slide sequence (`engine/SlideRegistry.ts`)

Society-wide recap → transition → personal stats → recap → share:

`Intro → SocietyEvents → JointEvents → Attendees → PopularCategory → ExecGrowth → KpopChoreos → Transition ("now let's talk about you") → EventsAttended → PrizesWon → FavoriteTeam → Archetype → Percentile → Recap → Share`

`SignupDateSlide`, `MembershipDurationSlide`, and `MostActiveMonthSlide`
exist in `slides/` but aren't in the default sequence — the current script
doesn't call for them; add them back into `buildSlideRegistry()` if wanted.

## Status

Built and verified (via Playwright screenshots + manual DOM checks) so far:

- [x] Input schema + validation/edge-case guards (0 events, brand-new member, zero prizes)
- [x] Fixed 1080×1920 canvas + desktop scaling/letterbox wrapper
- [x] `StoryController` + `ProgressBars` navigation/timing
- [x] Injectable clock abstraction in `Timeline.ts` (live mode only, so far)
- [x] All real slide components, GSAP timelines respecting the ~15s/slide budget
- [ ] `AudioController` with mute-by-default + gesture-unlock, SFX manifest
- [ ] `/render` headless route driven by `SteppedClockProvider` + Playwright capture + ffmpeg stitch (highest-risk piece, not started)
- [ ] `statsHash` + video cache + job queue/dedupe + `/api/wrapped/:userId/video` route
- [ ] Perf pass (lazy-loading next slide's assets during current slide's hold) + cross-device QA
- [ ] Real mascot sprite assets (currently a flat placeholder pixel block per archetype, see `MascotSlot.tsx`)

Playwright and ffmpeg were both confirmed available in this environment
(Playwright installed as a devDependency; ffmpeg present on `PATH`), so the
render pipeline is unblocked whenever it's picked up.
