interface ProgressBarsProps {
  count: number;
  currentIndex: number;
  /** 0..1 fraction of the current segment that's filled. */
  progress: number;
}

/** Segmented top bar, Instagram Stories style. */
export function ProgressBars({ count, currentIndex, progress }: ProgressBarsProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        display: "flex",
        gap: 4,
        zIndex: 20,
      }}
    >
      {Array.from({ length: count }, (_, i) => {
        const fill = i < currentIndex ? 1 : i === currentIndex ? progress : 0;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              background: "#cccccc",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${fill * 100}%`,
                height: "100%",
                background: "#000000",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
