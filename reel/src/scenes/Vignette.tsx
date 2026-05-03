import { AbsoluteFill } from "remotion";

export const Vignette: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.85) 100%)",
      }}
    />
  );
};
