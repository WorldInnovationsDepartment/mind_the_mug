// Kit.tsx — the launch v3 motion kit: the layer stack for a daylight video
// (mesh ground, content, grade, grain + vignette), hard cuts, slams, pops,
// camera punches on the beat, and the pixel scene itself.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { t3, type GroundId } from "./theme3.ts";
import { W, H, MASCOTS, newBuf, type MascotId, type Phase, type Outcome, type PixelBuf } from "./engine.ts";

/** Milliseconds since the start of the current Sequence. */
export const useMs = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (frame / fps) * 1000;
};

/** Layer 1: a soft, slowly drifting mesh in the scene's ground colours. Never a flat fill. */
export const Ground: React.FC<{ id: GroundId }> = ({ id }) => {
  const frame = useCurrentFrame();
  const [base, a, b] = t3.grounds[id];
  const d1 = Math.sin(frame / 50) * 60;
  const d2 = Math.cos(frame / 65) * 50;
  return (
    <AbsoluteFill style={{ background: base }}>
      <div style={{ position: "absolute", width: 1500, height: 1500, borderRadius: "50%", top: -700, left: -450 + d1, filter: "blur(70px)", background: `radial-gradient(circle, ${a}, transparent 62%)`, opacity: 0.9 }} />
      <div style={{ position: "absolute", width: 1200, height: 1200, borderRadius: "50%", bottom: -560, right: -360 - d2, filter: "blur(80px)", background: `radial-gradient(circle, ${b}, transparent 62%)`, opacity: 0.85 }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${id === "night" ? t3.colors.nightSoft : t3.colors.ink}22 2px, transparent 2px)`, backgroundSize: "54px 54px", backgroundPosition: `${frame * 0.25}px ${frame * 0.15}px`, opacity: 0.35 }} />
    </AbsoluteFill>
  );
};

/** Layers 4 and 5: a warm grade, grain, and a light vignette on top of everything. */
export const Post: React.FC<{ dark?: boolean }> = ({ dark = false }) => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundColor: dark ? t3.colors.heroDark : t3.colors.hero, mixBlendMode: "soft-light", opacity: 0.1 }} />
      <AbsoluteFill style={{ backgroundImage: noise, backgroundSize: "220px", backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`, opacity: dark ? 0.1 : 0.07, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 58%, ${dark ? "rgba(0,0,0,0.4)" : "rgba(72,44,98,0.16)"} 100%)` }} />
    </AbsoluteFill>
  );
};

/** Hard-cut scene wrapper: 5-frame zoom-settle on entry, 4-frame snap out on exit. */
export const Cut: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const inS = interpolate(frame, [0, 5], [1.05, 1], { easing: t3.ease.out, ...clamp });
  const inO = interpolate(frame, [0, 3], [0, 1], { easing: t3.ease.out, ...clamp });
  const outS = interpolate(frame, [durationInFrames - 4, durationInFrames - 1], [1, 1.04], { easing: t3.ease.in, ...clamp });
  const outO = interpolate(frame, [durationInFrames - 4, durationInFrames - 1], [1, 0], { easing: t3.ease.in, ...clamp });
  return <AbsoluteFill style={{ opacity: inO * outO, transform: `scale(${inS * outS})` }}>{children}</AbsoluteFill>;
};

/** How hard the most recent hit is still ringing: 1 at the hit, ~0 a dozen frames later. */
export function ring(frame: number, hits: readonly number[], decay = 3): number {
  let k = 0;
  for (const h of hits) {
    const d = frame - h;
    if (d >= 0) k = Math.max(k, Math.exp(-d / decay));
  }
  return k;
}

/** Camera punch: everything inside kicks in on every hit (scene-local frames) and settles. */
export const Punch: React.FC<{ hits: readonly number[]; amount?: number; shake?: number; children: React.ReactNode }> = ({ hits, amount = 0.035, shake = 0, children }) => {
  const frame = useCurrentFrame();
  const k = ring(frame, hits);
  const sx = Math.sin(frame * 2.7) * shake * k;
  const sy = Math.cos(frame * 3.1) * shake * k * 0.6;
  return <AbsoluteFill style={{ transform: `scale(${1 + amount * k}) translate(${sx}px, ${sy + 10 * k}px)` }}>{children}</AbsoluteFill>;
};

/** A soft colour flash on every hit; the peak stays low so no frame washes out. */
export const Flash: React.FC<{ hits: readonly number[]; color: string; peak?: number }> = ({ hits, color, peak = 0.28 }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ pointerEvents: "none", background: color, opacity: peak * ring(frame, hits, 2.2) }} />;
};

/** Slam entrance: hard spring, rise + overscale + opacity together. Renders nothing before `delay`. */
export const Slam: React.FC<{ delay?: number; from?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay = 0, from = 70, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < delay) return null;
  const p = spring({ frame: frame - delay, fps, config: t3.spring.hard });
  return <div style={{ opacity: Math.min(1, p * 1.6), transform: `translateY(${interpolate(p, [0, 1], [from, 0])}px) scale(${interpolate(p, [0, 1], [1.14, 1])})`, ...style }}>{children}</div>;
};

/** Pop entrance: a bouncy scale from small, with a little rotation settling to `tilt`. */
export const Pop: React.FC<{ delay?: number; tilt?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay = 0, tilt = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < delay) return null;
  const p = spring({ frame: frame - delay, fps, config: t3.spring.bouncy });
  return <div style={{ opacity: Math.min(1, p * 2), transform: `scale(${interpolate(p, [0, 1], [0.6, 1])}) rotate(${interpolate(p, [0, 1], [tilt - 6, tilt])}deg)`, ...style }}>{children}</div>;
};

/** Words that slam in one after another, `every` frames apart. */
export const Words: React.FC<{ text: string; delay?: number; every?: number; style?: React.CSSProperties; accent?: string; accentColor?: string }> = ({ text, delay = 0, every = 3, style, accent, accentColor }) => (
  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.28em", ...style }}>
    {text.split(" ").map((w, i) => (
      <Slam key={i} delay={delay + i * every} from={40}>
        <span style={{ color: accent && w.replace(/[.,!?]/g, "") === accent ? accentColor : undefined }}>{w}</span>
      </Slam>
    ))}
  </div>
);

/** A slow breath for anything that sits on screen for a while. */
export const useBreath = (amount = 0.012, period = 52) => 1 + Math.sin(useCurrentFrame() / period * Math.PI * 2) * amount;

export type Extra = (b: PixelBuf) => void;

/**
 * One of the plugin's scenes, drawn by the plugin's own code at `px` screen
 * pixels per scene pixel. `e` is milliseconds into `phase`; `clock` drives
 * the ambient motion (tails, clouds). `extra` may paint on top.
 */
export const PixelScene: React.FC<{ mascot: MascotId; phase: Phase; e: number; clock: number; outcome?: Outcome; pulses?: number[]; kept?: Outcome[]; px: number; extra?: Extra }> = ({ mascot, phase, e, clock, outcome = "none", pulses = [], kept = [], px, extra }) => {
  const b = newBuf();
  MASCOTS[mascot].scene.draw(b, { phase, t0: clock - e, outcome, pulses: pulses.map((p) => clock - e + p), kept }, clock);
  if (extra) extra(b);
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < H; y++) {
    let x0 = 0;
    for (let x = 1; x <= W; x++) {
      if (x === W || b.get(x, y) !== b.get(x0, y)) {
        rects.push(<rect key={`${x0}-${y}`} x={x0} y={y} width={x - x0} height={1.02} fill={b.get(x0, y)} />);
        x0 = x;
      }
    }
  }
  return (
    <svg width={W * px} height={H * px} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      {rects}
    </svg>
  );
};

/** A small sprite (rows of palette keys, like the scenes' own) at `px` screen pixels per pixel. */
export const Sprite: React.FC<{ rows: readonly string[]; map: Record<string, string>; px: number }> = ({ rows, map, px }) => (
  <svg width={rows[0].length * px} height={rows.length * px} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" style={{ display: "block" }}>
    {rows.flatMap((r, y) => [...r].map((ch, x) => (map[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={map[ch]} /> : null)))}
  </svg>
);

/** The scene on a white card with a soft coloured shadow, like a framed print. */
export const SceneCard: React.FC<{ px: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ px, children, style }) => (
  <div style={{ padding: Math.round(px * 0.45), borderRadius: px * 1.1, background: t3.colors.card, boxShadow: `0 ${px * 1.4}px ${px * 3.2}px ${-px}px ${t3.colors.shadow}, 0 2px 0 rgba(0,0,0,0.04)`, ...style }}>
    <div style={{ borderRadius: px * 0.7, overflow: "hidden" }}>{children}</div>
  </div>
);

/** A rounded label: mono text on ink, or ink on white. */
export const Chip: React.FC<{ children: React.ReactNode; tone?: "ink" | "white" | "hero"; size?: number; style?: React.CSSProperties }> = ({ children, tone = "ink", size = 34, style }) => {
  const bg = { ink: t3.colors.ink, white: t3.colors.white, hero: t3.colors.hero }[tone];
  const fg = tone === "white" ? t3.colors.ink : t3.colors.white;
  return <div style={{ display: "inline-block", fontFamily: t3.fonts.mono, fontWeight: 700, fontSize: size, lineHeight: 1, padding: `${size * 0.42}px ${size * 0.62}px`, borderRadius: size * 0.5, background: bg, color: fg, boxShadow: `0 10px 26px -12px ${t3.colors.shadow}`, whiteSpace: "nowrap", ...style }}>{children}</div>;
};

/** Whole-video progress strip along the bottom edge. */
export const Progress: React.FC<{ total: number; color: string }> = ({ total, color }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end" }}>
      <div style={{ height: 8, width: `${((frame + 1) / total) * 100}%`, background: color, borderRadius: "0 4px 4px 0" }} />
    </AbsoluteFill>
  );
};
