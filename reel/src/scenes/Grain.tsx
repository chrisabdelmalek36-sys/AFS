import { AbsoluteFill, useCurrentFrame } from "remotion";

// SVG-based film grain. Re-seeded over time to keep the texture moving.
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 9999;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.18, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
