import React from "react";
import { AbsoluteFill, Audio, Series, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import scenes from "./scenes.json";
import timing from "./timing.json";
import { SCENES } from "./Scenes";
import { Background, Caption } from "./ui";

export const FPS = 30;
const GAP = 0.4; // seconds of breathing room after each line
const END_HOLD = 1.6; // keep the call-to-action on screen a little longer

const t = timing as Record<string, number>;
const plan = scenes.map((s, i) => {
  const voice = Math.ceil(t[s.id] * FPS);
  const extra = i === scenes.length - 1 ? END_HOLD : GAP;
  return { ...s, voice, frames: voice + Math.ceil(extra * FPS) };
});
export const totalFrames = plan.reduce((a, p) => a + p.frames, 0);

// quick zoom-and-fade into every scene
const SceneShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inP = interpolate(frame, [0, 7], [0, 1], { extrapolateRight: "clamp" });
  const outP = interpolate(frame, [durationInFrames - 5, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: Math.min(inP, outP), transform: `scale(${1.06 - inP * 0.06})` }}>
      {children}
    </AbsoluteFill>
  );
};

export const Reel: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <Series>
      {plan.map((p) => {
        const Scene = SCENES[p.id];
        return (
          <Series.Sequence key={p.id} durationInFrames={p.frames}>
            <Audio src={staticFile(`vo/${p.id}.wav`)} />
            <SceneShell>
              <Scene />
              <Caption text={p.caption} voiceFrames={p.voice} />
            </SceneShell>
          </Series.Sequence>
        );
      })}
    </Series>
  </AbsoluteFill>
);
