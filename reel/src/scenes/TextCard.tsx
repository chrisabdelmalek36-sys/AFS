import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  eyebrow: string;
  line: string;
  fontFamily: string;
  color: string;
  accent: string;
};

export const TextCard: React.FC<Props> = ({
  eyebrow,
  line,
  fontFamily,
  color,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const enter = interpolate(frame, [0, fps * 1.2], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exit = interpolate(
    frame,
    [durationInFrames - fps * 0.8, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const visible = enter - exit;
  const opacity = visible;
  const translateY = interpolate(enter, [0, 1], [18, 0]) + interpolate(exit, [0, 1], [0, -10]);
  const blur = interpolate(visible, [0, 1], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Eyebrow accent line grows as we enter
  const lineWidth = interpolate(enter, [0, 1], [0, 64], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 80px",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          filter: `blur(${blur}px)`,
          textAlign: "center",
          color,
          fontFamily,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              height: 1,
              width: lineWidth,
              background: accent,
              opacity: 0.7,
            }}
          />
          <span
            style={{
              color: accent,
              letterSpacing: 6,
              fontSize: 22,
              fontWeight: 400,
              textTransform: "uppercase",
              fontVariant: "small-caps",
            }}
          >
            {eyebrow}
          </span>
          <div
            style={{
              height: 1,
              width: lineWidth,
              background: accent,
              opacity: 0.7,
            }}
          />
        </div>

        <div
          style={{
            fontSize: 78,
            fontWeight: 400,
            letterSpacing: 0.5,
            lineHeight: 1.18,
            fontStyle: "italic",
            textShadow: "0 4px 30px rgba(0,0,0,0.6)",
          }}
        >
          {line}
        </div>
      </div>
    </AbsoluteFill>
  );
};
