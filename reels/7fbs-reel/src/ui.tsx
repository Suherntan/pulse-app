import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const C = {
  bg1: "#041a13",
  bg2: "#0c3a2a",
  gold: "#E8B93E",
  goldDeep: "#B07D12",
  white: "#F7F5EE",
  dim: "rgba(247,245,238,0.62)",
  red: "#FF5A5F",
  green: "#3DDC97",
};

export const FONT = "'Bahnschrift', 'Impact', 'Arial Narrow', sans-serif";

// 0 → 1 spring that starts `delay` frames into the scene
export const useIn = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7 } });
};

// Frame at a fraction (0-1) of the scene, so animations follow the voiceover length
export const useAt = () => {
  const { durationInFrames } = useVideoConfig();
  return (f: number) => Math.round(durationInFrames * f);
};

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = new Array(26).fill(0).map((_, i) => {
    const x = random(`x${i}`) * 1080;
    const speed = 0.3 + random(`s${i}`) * 0.9;
    const y = (random(`y${i}`) * 2100 - frame * speed * 2) % 2100;
    const size = 3 + random(`r${i}`) * 7;
    return { x, y: y < 0 ? y + 2100 : y, size, o: 0.15 + random(`o${i}`) * 0.35 };
  });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${C.bg2} 0%, ${C.bg1} 70%)`,
      }}
    >
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y - 90,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: C.gold,
            opacity: d.o,
            filter: "blur(1px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const Text: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 72, color = C.white, weight = 700, style }) => (
  <div
    style={{
      fontFamily: FONT,
      fontStretch: "condensed",
      fontWeight: weight,
      fontSize: size,
      color,
      lineHeight: 1.08,
      textAlign: "center",
      textShadow: "0 4px 18px rgba(0,0,0,0.45)",
      ...style,
    }}
  >
    {children}
  </div>
);

// "BLIND SPOT #n" header with a big gold number that drops in
export const GapHeader: React.FC<{ n: number; title: string }> = ({ n, title }) => {
  const p = useIn(0, 12);
  const t = useIn(6);
  return (
    <div
      style={{
        position: "absolute",
        top: 190,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <Text
          size={210}
          color={C.gold}
          style={{
            transform: `translateY(${interpolate(p, [0, 1], [-260, 0])}px) scale(${interpolate(p, [0, 1], [1.6, 1])})`,
            background: `linear-gradient(180deg, #FFE08A, ${C.gold} 45%, ${C.goldDeep})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            lineHeight: 1,
          }}
        >
          #{n}
        </Text>
        <div
          style={{
            opacity: t,
            transform: `translateX(${interpolate(t, [0, 1], [60, 0])}px)`,
            textAlign: "left",
          }}
        >
          <Text size={40} color={C.gold} style={{ textAlign: "left", letterSpacing: 6 }}>
            BLIND SPOT
          </Text>
          <Text size={70} style={{ textAlign: "left", maxWidth: 560 }}>
            {title}
          </Text>
        </div>
      </div>
    </div>
  );
};

// Word-by-word caption in the lower third; words light up in step with the voice
export const Caption: React.FC<{ text: string; voiceFrames: number }> = ({ text, voiceFrames }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const per = (voiceFrames * 0.95) / words.length;
  const box = useIn(0, 20);
  return (
    <div
      style={{
        position: "absolute",
        top: 1250,
        left: 70,
        right: 70,
        opacity: box,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "4px 16px",
      }}
    >
      {words.map((w, i) => {
        const start = i * per;
        const shown = frame >= start - 2;
        const current = frame >= start && frame < start + per;
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 62,
              lineHeight: 1.15,
              color: current ? C.gold : C.white,
              opacity: shown ? 1 : 0.18,
              transform: `scale(${current ? 1.08 : 1})`,
              display: "inline-block",
              textShadow: "0 3px 10px rgba(0,0,0,0.8)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Source: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      top: 1190,
      width: "100%",
      textAlign: "center",
      fontFamily: FONT,
      fontSize: 26,
      color: C.dim,
    }}
  >
    {children}
  </div>
);

export const Emoji: React.FC<{ e: string; size?: number; style?: React.CSSProperties }> = ({
  e,
  size = 160,
  style,
}) => (
  <span
    style={{
      fontSize: size,
      lineHeight: 1,
      fontFamily: "'Segoe UI Emoji', 'Noto Color Emoji', sans-serif",
      display: "inline-block",
      ...style,
    }}
  >
    {e}
  </span>
);

export const money = (n: number) => "RM" + Math.round(n).toLocaleString("en-MY");

export const Center: React.FC<{ children: React.ReactNode; top?: number; style?: React.CSSProperties }> = ({
  children,
  top = 520,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left: 60,
      right: 60,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      ...style,
    }}
  >
    {children}
  </div>
);
