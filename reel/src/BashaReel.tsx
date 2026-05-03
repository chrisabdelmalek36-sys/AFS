import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Backdrop } from "./scenes/Backdrop";
import { Letterbox } from "./scenes/Letterbox";
import { Vignette } from "./scenes/Vignette";
import { Grain } from "./scenes/Grain";
import { TextCard } from "./scenes/TextCard";
import { Hold } from "./scenes/Hold";
import { EndCard } from "./scenes/EndCard";
import { cinzel, cormorant } from "./fonts";

const palette = {
  bg: "#0b0907",
  ink: "#efe7da",
  muted: "#a89a82",
  gold: "#bfa46f",
};

export const BashaReel: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <Backdrop palette={palette} />
      <Vignette />

      {/* 0-3s: Hook — "He was up before the city." */}
      <Sequence from={0} durationInFrames={3 * fps} layout="none">
        <TextCard
          eyebrow="i"
          line="He was up before the city."
          fontFamily={cormorant.fontFamily}
          color={palette.ink}
          accent={palette.gold}
        />
      </Sequence>

      {/* 3-8s: Establishing — silent, just atmosphere with a quiet kicker */}
      <Sequence from={3 * fps} durationInFrames={5 * fps} layout="none">
        <Hold
          subtle="Old Cairo. Morning."
          fontFamily={cormorant.fontFamily}
          color={palette.muted}
          accent={palette.gold}
        />
      </Sequence>

      {/* 8-13s: Walking — silence */}
      <Sequence from={8 * fps} durationInFrames={5 * fps} layout="none">
        <Hold
          subtle=""
          fontFamily={cormorant.fontFamily}
          color={palette.muted}
          accent={palette.gold}
        />
      </Sequence>

      {/* 13-18s: "No audience needed." */}
      <Sequence from={13 * fps} durationInFrames={5 * fps} layout="none">
        <TextCard
          eyebrow="ii"
          line="No audience needed."
          fontFamily={cormorant.fontFamily}
          color={palette.ink}
          accent={palette.gold}
        />
      </Sequence>

      {/* 18-23s: "The polo. The standard." */}
      <Sequence from={18 * fps} durationInFrames={5 * fps} layout="none">
        <TextCard
          eyebrow="iii"
          line={`The polo. The standard.`}
          fontFamily={cormorant.fontFamily}
          color={palette.ink}
          accent={palette.gold}
        />
      </Sequence>

      {/* 23-28s: Exit hold — empty street */}
      <Sequence from={23 * fps} durationInFrames={5 * fps} layout="none">
        <Hold
          subtle=""
          fontFamily={cormorant.fontFamily}
          color={palette.muted}
          accent={palette.gold}
        />
      </Sequence>

      {/* 28-30s: End card — BASHA */}
      <Sequence from={28 * fps} durationInFrames={2 * fps} layout="none">
        <EndCard
          logoFamily={cinzel.fontFamily}
          tagFamily={cormorant.fontFamily}
          color={palette.ink}
          accent={palette.gold}
        />
      </Sequence>

      <Letterbox />
      <Grain />
    </AbsoluteFill>
  );
};
