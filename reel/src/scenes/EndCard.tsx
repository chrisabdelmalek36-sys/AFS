import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  logoFamily: string;
  tagFamily: string;
  color: string;
  accent: string;
};

export const EndCard: React.FC<Props> = ({ logoFamily, tagFamily, color, accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = interpolate(frame, [0, fps * 1.0], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exit = interpolate(
    frame,
    [durationInFrames - fps * 0.4, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = enter - exit;
  const letterSpacing = interpolate(enter, [0, 1], [4, 22]);
  const lineWidth = interpolate(enter, [0, 1], [0, 220], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ opacity, textAlign: "center" }}>
        <div
          style={{
            fontFamily: logoFamily,
            color,
            fontSize: 132,
            fontWeight: 600,
            letterSpacing,
            textShadow: "0 6px 40px rgba(0,0,0,0.8)",
          }}
        >
          BASHA
        </div>

        <div
          style={{
            margin: "28px auto 18px",
            height: 1,
            width: lineWidth,
            background: accent,
            opacity: 0.8,
          }}
        />

        <div
          style={{
            fontFamily: tagFamily,
            color: accent,
            fontSize: 26,
            letterSpacing: 8,
            textTransform: "uppercase",
            fontStyle: "italic",
          }}
        >
          A Quiet Code of Elegance
        </div>
      </div>
    </AbsoluteFill>
  );
};
