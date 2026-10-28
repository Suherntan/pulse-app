import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { C, Center, Emoji, GapHeader, Source, Text, money, useAt, useIn } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- 0. Hook ----------
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const at = useAt();
  const card = useIn(0);
  const crackAt = at(0.42);
  const crack = interpolate(frame, [crackAt, crackAt + 10], [0, 1], clamp);
  const fall = interpolate(frame, [crackAt + 6, crackAt + 30], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const shake = frame > crackAt && frame < crackAt + 14 ? Math.sin(frame * 3) * 14 : 0;
  const salary = interpolate(frame, [4, 26], [0, 12000], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${shake}px)` }}>
      <Center top={330}>
        <div
          style={{
            width: 700,
            padding: "50px 40px",
            borderRadius: 40,
            background: "rgba(255,255,255,0.07)",
            border: `3px solid ${fall > 0 ? C.red : C.gold}`,
            transform: `scale(${card}) translateY(${fall * 900}px) rotate(${fall * 24}deg)`,
            opacity: 1 - fall,
          }}
        >
          <Text size={44} color={C.dim}>Salary credited ✓</Text>
          <Text size={150} color={C.green}>{money(salary)}</Text>
          <Text size={44} color={C.dim}>Monthly income</Text>
        </div>
      </Center>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <path
          d="M -10 900 L 180 860 L 260 960 L 420 880 L 520 1010 L 660 900 L 760 980 L 900 890 L 1090 950"
          stroke={C.gold}
          strokeWidth={10}
          fill="none"
          strokeLinejoin="bevel"
          strokeDasharray={1400}
          strokeDashoffset={1400 * (1 - crack)}
          style={{ filter: `drop-shadow(0 0 18px ${C.gold})` }}
        />
      </svg>
      <Center top={1040} style={{ opacity: crack }}>
        <Text size={96} color={C.red}>ONE BAD YEAR</Text>
      </Center>
    </div>
  );
};

// ---------- 1. Title ----------
export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = useIn(0, 11);
  const sub = useIn(14);
  const pulse = 1 + Math.sin(frame / 6) * 0.015;
  return (
    <>
      <Center top={330}>
        <Img
          src={staticFile("fbs-logo-light.png")}
          style={{ width: 760, transform: `scale(${logo * pulse}) rotate(${(1 - logo) * -12}deg)` }}
        />
      </Center>
      <Center top={950} style={{ opacity: sub, transform: `translateY(${(1 - sub) * 40}px)` }}>
        <Text size={60} color={C.gold}>MOST MALAYSIANS NEVER SEE THEM</Text>
      </Center>
    </>
  );
};

// ---------- Gap 1: income ----------
const Row: React.FC<{ e: string; label: string; ok: boolean; delay: number }> = ({ e, label, ok, delay }) => {
  const frame = useCurrentFrame();
  const p = useIn(delay);
  const shake = !ok && frame > delay + 12 ? Math.sin(frame * 1.6) * 6 : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 34,
        width: 880,
        padding: "22px 40px",
        marginBottom: 26,
        borderRadius: 30,
        background: ok ? "rgba(61,220,151,0.10)" : "rgba(255,90,95,0.16)",
        border: `3px solid ${ok ? C.green : C.red}`,
        opacity: p,
        transform: `translateX(${(1 - p) * -300 + shake}px)`,
      }}
    >
      <Emoji e={e} size={100} />
      <Text size={64} style={{ flex: 1, textAlign: "left" }}>{label}</Text>
      <Text size={58} color={ok ? C.green : C.red}>{ok ? "🛡 INSURED" : "✗ NOT"}</Text>
    </div>
  );
};

export const Gap1: React.FC = () => {
  const at = useAt();
  return (
    <>
      <GapHeader n={1} title="Your income has no safety net" />
      <Center top={560}>
        <Row e="🚗" label="Car" ok delay={at(0.1)} />
        <Row e="🏠" label="House" ok delay={at(0.32)} />
        <Row e="💼" label="Your income" ok={false} delay={at(0.58)} />
      </Center>
      <Source>Your ability to earn could be worth RM2–5 million over your career</Source>
    </>
  );
};

// ---------- Gap 2: medical card ----------
export const Gap2: React.FC = () => {
  const frame = useCurrentFrame();
  const at = useAt();
  const card = useIn(at(0.08));
  const bill = interpolate(frame, [at(0.4), at(0.85)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const Bar = (label: string, value: string, w: number, color: string, o: number) => (
    <div style={{ width: 900, marginBottom: 46, opacity: o }}>
      <Text size={46} color={C.dim} style={{ textAlign: "left", marginBottom: 10 }}>{label}</Text>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ height: 76, width: w, background: color, borderRadius: 18, boxShadow: `0 0 30px ${color}66` }} />
        <Text size={60} color={color}>{value}</Text>
      </div>
    </div>
  );
  return (
    <>
      <GapHeader n={2} title="Your medical card isn't enough" />
      <Center top={600}>
        {Bar("Typical company medical card limit", "RM100k", 150 * card, C.gold, card)}
        {Bar("Private cancer treatment", bill > 0.98 ? "RM600k" : money(bill * 600000), 30 + 560 * bill, C.red, bill > 0 ? 1 : 0)}
      </Center>
      <Source>Private cancer treatment in Malaysia: RM150,000–600,000 per episode</Source>
    </>
  );
};

// ---------- Gap 3: education ----------
export const Gap3: React.FC = () => {
  const frame = useCurrentFrame();
  const at = useAt();
  const t = interpolate(frame, [at(0.15), at(0.85)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const tagScale = 1 + t * 0.35;
  return (
    <>
      <GapHeader n={3} title="Uni fees rise faster than you save" />
      <Center top={560}>
        <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
          <Emoji e="👶" size={180} style={{ opacity: 1 - t * 0.7, transform: `scale(${1 - t * 0.3})` }} />
          <Text size={90} color={C.gold}>→</Text>
          <Emoji e="🎓" size={180} style={{ opacity: 0.3 + t * 0.7, transform: `scale(${0.7 + t * 0.3})` }} />
        </div>
        <Text size={56} color={C.dim} style={{ marginTop: 20 }}>Age {Math.round(t * 18)}</Text>
        <div
          style={{
            marginTop: 30,
            padding: "26px 60px",
            borderRadius: 30,
            background: C.gold,
            transform: `scale(${tagScale}) rotate(-3deg)`,
          }}
        >
          <Text size={96} color={C.bg1} style={{ textShadow: "none" }}>
            {money(120000 + t * 130000)}
            {t > 0.99 ? "+" : ""}
          </Text>
        </div>
      </Center>
      <Source>Tuition inflation 7–8% a year: fees double about every 10 years</Source>
    </>
  );
};

// ---------- Gap 4: inflation ----------
export const Gap4: React.FC = () => {
  const frame = useCurrentFrame();
  const at = useAt();
  const a = useIn(at(0.05));
  const b = useIn(at(0.3));
  const shrink = interpolate(frame, [at(0.55), at(0.95)], [0, 1], clamp);
  const Stat = (label: string, v: string, color: string, arrow: string, p: number) => (
    <div
      style={{
        width: 420,
        padding: "30px 10px",
        borderRadius: 30,
        border: `3px solid ${color}`,
        background: "rgba(255,255,255,0.05)",
        opacity: p,
        transform: `translateY(${(1 - p) * 80}px)`,
      }}
    >
      <Text size={44} color={C.dim}>{label}</Text>
      <Text size={110} color={color}>{v}</Text>
      <Text size={50} color={color}>{arrow}</Text>
    </div>
  );
  return (
    <>
      <GapHeader n={4} title="Savings losing to inflation" />
      <Center top={560}>
        <div style={{ display: "flex", gap: 40 }}>
          {Stat("Savings account", "0.25%", C.green, "▲ barely", a)}
          {Stat("Prices (inflation)", "3.5%", C.red, "▲▲▲", b)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 50, opacity: shrink > 0 ? 1 : 0 }}>
          <Emoji e="🐷" size={140} style={{ transform: `scale(${1 - shrink * 0.4})` }} />
          <Text size={52} style={{ textAlign: "left" }}>
            RM100,000 today<br />
            <span style={{ color: C.red }}>= {money(100000 - shrink * 27000)}</span> in 10 yrs
          </Text>
        </div>
      </Center>
    </>
  );
};

// ---------- Gap 5: retirement ----------
export const Gap5: React.FC = () => {
  const frame = useCurrentFrame();
  const at = useAt();
  const epf = interpolate(frame, [at(0.1), at(0.4)], [0, 240000], clamp);
  const m = useIn(at(0.55));
  return (
    <>
      <GapHeader n={5} title="Can you fund your retirement?" />
      <Center top={560}>
        <Emoji e="⏳" size={150} style={{ transform: `rotate(${Math.floor(frame / 30) * 180}deg)` }} />
        <Text size={48} color={C.dim} style={{ marginTop: 20 }}>Median EPF savings at 55</Text>
        <Text size={130} color={C.gold}>{money(epf)}</Text>
        <div style={{ opacity: m, transform: `scale(${0.6 + m * 0.4})`, marginTop: 10 }}>
          <Text size={60}>
            = under <span style={{ color: C.red }}>RM1,000/month</span>
            <br />for 20 years
          </Text>
        </div>
      </Center>
    </>
  );
};

// ---------- Gap 6: business ----------
export const Gap6: React.FC = () => {
  const frame = useCurrentFrame();
  const at = useAt();
  const shutter = interpolate(frame, [at(0.12), at(0.32)], [0, 1], { ...clamp, easing: Easing.bounce });
  const items = ["Loan repayments", "Staff salaries", "Supplier bills"];
  return (
    <>
      <GapHeader n={6} title="Your business isn't protected" />
      <Center top={540}>
        <div style={{ position: "relative", width: 300, height: 230, overflow: "hidden", borderRadius: 20 }}>
          <Emoji e="🏪" size={220} style={{ position: "absolute", left: 40, top: 0 }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 230 * shutter,
              background: `repeating-linear-gradient(180deg, #8a8f98 0 18px, #5f646c 18px 24px)`,
            }}
          />
        </div>
        <div style={{ marginTop: 30 }}>
          {items.map((t, i) => {
            const p = interpolate(frame, [at(0.38 + i * 0.12), at(0.46 + i * 0.12)], [0, 1], clamp);
            return (
              <Text key={t} size={58} style={{ opacity: p, transform: `translateX(${(1 - p) * 200}px)`, marginBottom: 8 }}>
                <span style={{ color: C.red }}>●</span> {t} <span style={{ color: C.dim }}>keep coming</span>
              </Text>
            );
          })}
        </div>
      </Center>
      <Source>80% of Malaysian SMEs have no keyman / continuity plan</Source>
    </>
  );
};

// ---------- Gap 7: will ----------
export const Gap7: React.FC = () => {
  const frame = useCurrentFrame();
  const at = useAt();
  const lock = useIn(at(0.08), 9);
  const stamp = useIn(at(0.35), 10);
  const years = Math.min(7, Math.max(1, Math.round(interpolate(frame, [at(0.55), at(0.95)], [1, 7], clamp))));
  return (
    <>
      <GapHeader n={7} title="No will, no access" />
      <Center top={560}>
        <div style={{ position: "relative" }}>
          <Emoji e="🏦" size={200} />
          <Emoji
            e="🔒"
            size={130}
            style={{ position: "absolute", right: -60, bottom: -20, transform: `scale(${lock})` }}
          />
        </div>
        <div
          style={{
            marginTop: 30,
            padding: "10px 40px",
            border: `6px solid ${C.red}`,
            borderRadius: 16,
            transform: `scale(${2 - stamp}) rotate(-8deg)`,
            opacity: stamp,
          }}
        >
          <Text size={80} color={C.red}>ASSETS FROZEN</Text>
        </div>
        <Text size={60} style={{ marginTop: 40 }}>
          Family waiting: <span style={{ color: C.gold }}>Year {years}</span>
        </Text>
      </Center>
      <Source>Estates without a will take 3–7 years to settle in Malaysia</Source>
    </>
  );
};

// ---------- Checklist ----------
export const Check: React.FC = () => {
  const frame = useCurrentFrame();
  const at = useAt();
  const labels = ["Income protection", "Medical card limit", "Child's education", "Savings vs inflation", "Retirement fund", "Business protection", "Will & nominations"];
  return (
    <Center top={220}>
      <Text size={80} color={C.gold} style={{ marginBottom: 30 }}>HOW MANY DID YOU SPOT?</Text>
      {labels.map((l, i) => {
        const on = frame > at(0.08 + i * 0.09);
        const p = interpolate(frame, [at(0.08 + i * 0.09), at(0.08 + i * 0.09) + 6], [0, 1], clamp);
        return (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 28, width: 820, marginBottom: 18 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 16,
                border: `5px solid ${C.gold}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: on ? C.gold : "transparent",
              }}
            >
              <Text size={60} color={C.bg1} style={{ transform: `scale(${p})`, textShadow: "none" }}>✓</Text>
            </div>
            <Text size={60} style={{ textAlign: "left" }}>{l}</Text>
          </div>
        );
      })}
    </Center>
  );
};

// ---------- Good news ----------
export const Good: React.FC = () => {
  const at = useAt();
  const lines = ["SPOT IT.", "PLAN IT.", "PROTECT IT."];
  const glow = useIn(at(0.6), 30);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 45%, ${C.gold}55 0%, transparent ${20 + glow * 40}%)`,
        }}
      />
      <Center top={420}>
        {lines.map((l, i) => {
          const p = useIn(at(0.05 + i * 0.22), 12);
          return (
            <Text
              key={l}
              size={150}
              color={i === 2 ? C.gold : C.white}
              style={{ opacity: p, transform: `scale(${0.5 + p * 0.5})`, marginBottom: 10 }}
            >
              {l}
            </Text>
          );
        })}
      </Center>
    </>
  );
};

// ---------- CTA ----------
export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bubble = useIn(0, 9);
  const logo = useIn(fps, 14);
  const pulse = 1 + Math.sin(frame / 5) * 0.04;
  return (
    <>
      <Center top={250}>
        <Text size={70}>Comment</Text>
        <div
          style={{
            marginTop: 20,
            padding: "30px 90px",
            borderRadius: 60,
            background: `linear-gradient(180deg, #FFE08A, ${C.gold})`,
            transform: `scale(${bubble * pulse})`,
            boxShadow: `0 0 60px ${C.gold}88`,
          }}
        >
          <Text size={170} color={C.bg1} style={{ textShadow: "none", letterSpacing: 6 }}>GUIDE</Text>
        </div>
        <Emoji e="👇" size={120} style={{ marginTop: 20, transform: `translateY(${Math.abs(Math.sin(frame / 6)) * 30}px)` }} />
      </Center>
      <Center top={880} style={{ opacity: logo, transform: `translateY(${(1 - logo) * 60}px)` }}>
        <Img src={staticFile("fbs-logo-light.png")} style={{ width: 360 }} />
        <Text size={50} color={C.gold} style={{ marginTop: 14 }}>with Su Hern</Text>
      </Center>
    </>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  title: Title,
  gap1: Gap1,
  gap2: Gap2,
  gap3: Gap3,
  gap4: Gap4,
  gap5: Gap5,
  gap6: Gap6,
  gap7: Gap7,
  check: Check,
  good: Good,
  cta: Cta,
};
