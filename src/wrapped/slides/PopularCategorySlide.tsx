import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { CenteredText, Layer, PlacedImage } from "../components/Placed";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import { CATEGORY_QUIP, CATEGORY_SHORT_LABEL } from "../data/categoryCopy";
import type { SlideProps } from "../engine/SlideRegistry";

const PODIUM_SRC = "/wrapped/popular-category/podium.png";

const inter: CSSProperties = { fontFamily: '"Inter", sans-serif', fontWeight: 700, lineHeight: 1.5, color: "#FFFFFF" };
const podiumLabel: CSSProperties = { fontFamily: '"Joystix", monospace', lineHeight: 1.5, color: "#FFFFFF" };

/** The podium art is a trio sheet; each column crops to one block. */
const PODIUM_CROP_X = -123.18;
const PODIUM_CROP_W = 339.07;

// Podium reveal: each pillar rises up from below the frame carrying its
// label — 1st place (middle) first, then 2nd (left), then 3rd (right).
const RISE_S = 0.8;
const RISE_STARTS_S = { first: 0.4, second: 1.0, third: 1.45 } as const;
const PODIUM_EXIT_S = 0.7;

/** How far below its resting spot a pillar starts: just far enough that its label is off-canvas. */
const riseDistance = (labelTop: number) => 1920 - labelTop + 40;

export function PopularCategorySlide({ data, durationMs }: SlideProps) {
  const headingRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);
  const thirdRef = useRef<HTMLDivElement>(null);
  const [first, second, third] = data.popularCategoryRanking;

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (headingRef.current) applyEnterExit(tl, headingRef.current, duration);
    const pillars = [
      [firstRef, RISE_STARTS_S.first, riseDistance(992)],
      [secondRef, RISE_STARTS_S.second, riseDistance(1343)],
      [thirdRef, RISE_STARTS_S.third, riseDistance(1556)],
    ] as const;
    for (const [ref, start, distance] of pillars) {
      if (ref.current) {
        tl.fromTo(ref.current, { y: distance }, { y: 0, duration: RISE_S, ease: "back.out(1.1)" }, start);
      }
    }
    if (podiumRef.current) {
      tl.fromTo(
        podiumRef.current,
        { opacity: 1 },
        { opacity: 0, duration: PODIUM_EXIT_S, ease: "power2.in", immediateRender: false },
        duration / 1000 - PODIUM_EXIT_S,
      );
    }
    return tl;
  }, durationMs);

  return (
    <PixelBackground durationMs={durationMs}>
      {/* The spotlight truss over this scene is the shared StoryTruss, carried over from the Attendees slide. */}

      <Layer ref={headingRef}>
        <CenteredText centerX={540} top={867} style={{ ...inter, fontSize: 32 }}>
          OUR MOST POPULAR EVENTS WERE
        </CenteredText>
        <CenteredText centerX={544.5} top={915} style={{ ...inter, fontSize: 24 }}>
          {CATEGORY_QUIP[data.mostPopularCategory].replace(/\.$/, "")}
        </CenteredText>
      </Layer>

      {/* Back to front, as grouped in Figma: 1st (middle), 2nd (left), 3rd (right). */}
      <Layer ref={podiumRef}>
        <Layer ref={firstRef}>
          <PlacedImage
            src={PODIUM_SRC}
            left={313}
            top={970}
            width={453}
            height={1024}
            crop={{ left: PODIUM_CROP_X, top: 0, width: PODIUM_CROP_W, height: 100 }}
          />
          <CenteredText centerX={544.5} top={992} style={{ ...podiumLabel, fontSize: 96 }}>
            {CATEGORY_SHORT_LABEL[first]}
          </CenteredText>
        </Layer>
        <Layer ref={secondRef}>
          <CenteredText centerX={281} top={1343} style={{ ...podiumLabel, fontSize: 64 }}>
            {CATEGORY_SHORT_LABEL[second]}
          </CenteredText>
          <PlacedImage
            src={PODIUM_SRC}
            left={54}
            top={1417}
            width={453}
            height={875}
            crop={{ left: PODIUM_CROP_X, top: -17.03, width: PODIUM_CROP_W, height: 117.03 }}
          />
        </Layer>
        <Layer ref={thirdRef}>
          <CenteredText centerX={820.5} top={1556} style={{ ...podiumLabel, fontSize: 64 }}>
            {CATEGORY_SHORT_LABEL[third]}
          </CenteredText>
          <PlacedImage
            src={PODIUM_SRC}
            left={594}
            top={1630}
            width={453}
            height={876}
            crop={{ left: PODIUM_CROP_X, top: -16.89, width: PODIUM_CROP_W, height: 116.89 }}
          />
        </Layer>
      </Layer>
    </PixelBackground>
  );
}

PopularCategorySlide.preload = [PODIUM_SRC, "/wrapped/shared/spotlight-truss.png"];
