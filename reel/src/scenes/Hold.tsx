import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  subtle: string;
  fontFamily: string;
  color: string;
  accent: string;
};

// A quiet hold beat — empty scene with optional location whisper.
export const Hold: React.FC<Props> = ({ subtle, fontFamily, color, accent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const enter = interpolate(frame, [0, fps * 1.5], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exit = interpolate(
    frame,
    [durationInFrames - fps * 1, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = (enter - exit) * 0.85;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 220,
      }}
    >
      {subtle ? (
        <div
          style={{
            opacity,
            color,
            fontFamily,
            fontSize: 24,
            letterSpacing: 8,
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 32,
              height: 1,
              background: accent,
              opacity: 0.6,
            }}
          />
          {subtle}
          <span
            style={{
              display: "inline-block",
              width: 32,
              height: 1,
              background: accent,
              opacity: 0.6,
            }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
