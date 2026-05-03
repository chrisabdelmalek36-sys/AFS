import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  gold: string;
};

// A slow, ambient backdrop. Warm directional light from upper-left,
// suggesting morning sun against old stone. Subtle drift to imply life
// without movement on screen.
export const Backdrop: React.FC<{ palette: Palette }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const drift = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });

  const sunX = interpolate(drift, [0, 1], [22, 30]);
  const sunY = interpolate(drift, [0, 1], [18, 22]);
  const stoneX = interpolate(drift, [0, 1], [70, 64]);
  const stoneY = interpolate(drift, [0, 1], [80, 78]);

  return (
    <AbsoluteFill>
      {/* Base warm shadow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 55%, #1a130c 0%, ${palette.bg} 60%, #050402 100%)`,
        }}
      />

      {/* Directional warm light (sun behind stone) */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${sunX}% ${sunY}%, rgba(212, 161, 86, 0.35) 0%, rgba(212, 161, 86, 0.05) 28%, transparent 55%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Cool deep stone wash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${stoneX}% ${stoneY}%, rgba(40, 30, 20, 0.6) 0%, transparent 50%)`,
        }}
      />

      {/* A single thin gold line — like a horizon, or a column edge */}
      <AbsoluteFill
        style={{
          opacity: 0.18,
          background: `linear-gradient(to bottom, transparent 0%, transparent 49.85%, ${palette.gold} 49.93%, ${palette.gold} 50.07%, transparent 50.15%, transparent 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
