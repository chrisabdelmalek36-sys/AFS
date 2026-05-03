import "./index.css";
import { Composition } from "remotion";
import { BashaReel } from "./BashaReel";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BashaReel"
        component={BashaReel}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
