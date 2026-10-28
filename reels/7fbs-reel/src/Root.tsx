import React from "react";
import { Composition } from "remotion";
import { Reel, totalFrames, FPS } from "./Reel";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="FBSReel"
    component={Reel}
    durationInFrames={totalFrames}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
