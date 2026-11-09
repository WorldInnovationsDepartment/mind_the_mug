// Fx.tsx — the launch v2 motion kit: hard cuts, camera punches on reel stops,
// flashes, speed streaks behind a spinning machine, a HUD, a typewriter.
// Reuses the v1 five-layer stack (Layers.tsx); nothing here is flat either.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../theme.ts";

/** Hard-cut scene wrapper: 6-frame zoom-settle on entry, 5-frame snap out on exit. */
export const Cut: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const inS = interpolate(frame, [0, 6], [1.06, 1], { easing: theme.ease.out, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inO = interpolate(frame, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outS = interpolate(frame, [durationInFrames - 5, durationInFrames - 1], [1, 1.05], { easing: theme.ease.in, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outO = interpolate(frame, [durationInFrames - 5, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: inO * outO, transform: `scale(${inS * outS})` }}>{children}</AbsoluteFill>;
};

/** How hard the most recent hit is still ringing: 1 at the hit, decaying to ~0 in 12 frames. */
export function ring(absFrame: number, hits: readonly number[], decay = 3): number {
  let k = 0;
  for (const h of hits) {
    const d = absFrame - h;
    if (d >= 0) k = Math.max(k, Math.exp(-d / decay));
  }
  return k;
}

/** Camera punch: the wrapped scene kicks in by `amount` on every hit and settles. */
export const Punch: React.FC<{ absFrame: number; hits: readonly number[]; amount?: number; shake?: number; children: React.ReactNode }> = ({ absFrame, hits, amount = 0.045, shake = 0, children }) => {
  const k = ring(absFrame, hits);
  const sx = shake ? Math.sin(absFrame * 2.7) * shake * k : 0;
  const sy = shake ? Math.cos(absFrame * 3.1) * shake * k * 0.6 : 0;
  return <AbsoluteFill style={{ transform: `scale(${1 + amount * k}) translate(${sx}px, ${sy - 8 * k}px)` }}>{children}</AbsoluteFill>;
};

/** A coloured flash on every hit. Peak opacity stays under 0.55 so no frame reads as a white background. */
export const Flash: React.FC<{ absFrame: number; hits: readonly number[]; color: string; peak?: number }> = ({ absFrame, hits, color, peak = 0.4 }) => {
  const k = ring(absFrame, hits, 2.2);
  return <AbsoluteFill style={{ pointerEvents: "none", background: color, opacity: Math.min(0.55, peak) * k, mixBlendMode: "screen" }} />;
};

/** Vertical speed streaks: a reel spinning hard enough to blur the room. `intensity` 0..1. */
export const Streaks: React.FC<{ intensity: number; color: string }> = ({ intensity, color }) => {
  const frame = useCurrentFrame();
  if (intensity <= 0.01) return null;
  const lines = Array.from({ length: 34 }, (_, i) => {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const r = seed - Math.floor(seed);
    const x = 40 + r * 1840;
    const len = 160 + ((i * 97) % 5) * 90;
    const speed = 70 + ((i * 31) % 7) * 18;
    const y = ((frame * speed + i * 213) % (1080 + len)) - len;
    const w = 2 + (i % 3);
    return <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: len, background: `linear-gradient(180deg, transparent, ${color}, transparent)`, opacity: 0.18 + (i % 4) * 0.08 }} />;
  });
  return <AbsoluteFill style={{ pointerEvents: "none", opacity: intensity }}>{lines}</AbsoluteFill>;
};

/** Slam entrance: a hard spring from `from` px below (or above) with a touch of overscale. */
export const Slam: React.FC<{ delay?: number; from?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay = 0, from = 60, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.hard });
  return (
    <div style={{ opacity: Math.min(1, p * 1.6), transform: `translateY(${interpolate(p, [0, 1], [from, 0])}px) scale(${interpolate(p, [0, 1], [1.12, 1])})`, ...style }}>
      {children}
    </div>
  );
};

/** Corner HUD: pull counter left, rolling balance right. */
export const Hud: React.FC<{ pull: number; of: number; balance: number; color?: string }> = ({ pull, of, balance, color = theme.colors.textDim }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ position: "absolute", top: 34, left: 56, fontFamily: theme.fonts.mono, fontSize: 26, letterSpacing: "0.18em", color }}>
      PULL {String(pull).padStart(2, "0")}<span style={{ opacity: 0.5 }}> / {String(of).padStart(2, "0")}</span>
    </div>
    <div style={{ position: "absolute", top: 34, right: 56, fontFamily: theme.fonts.mono, fontSize: 26, letterSpacing: "0.18em", color }}>
      <span style={{ opacity: 0.5 }}>CR </span>{String(Math.max(0, Math.min(999, balance))).padStart(3, "0")}
    </div>
  </AbsoluteFill>
);

/** Whole-video progress strip along the bottom edge, in the hero colour. */
export const Progress: React.FC<{ absFrame: number; total: number }> = ({ absFrame, total }) => (
  <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end" }}>
    <div style={{ height: 6, width: `${(absFrame / total) * 100}%`, background: theme.colors.primary, boxShadow: `0 0 18px ${theme.colors.glow}` }} />
  </AbsoluteFill>
);

/** Typewriter: `text` arrives at `cps` characters per frame after `delay`, with a blinking block cursor. */
export const Typewriter: React.FC<{ text: string; delay?: number; cps?: number; style?: React.CSSProperties }> = ({ text, delay = 0, cps = 2.2, style }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - delay) * cps)));
  const done = n >= text.length;
  const cursorOn = done ? Math.floor(frame / 8) % 2 === 0 : true;
  return (
    <div style={{ fontFamily: theme.fonts.mono, whiteSpace: "pre", ...style }}>
      <span style={{ color: theme.colors.primary }}>&gt; </span>
      {text.slice(0, n)}
      <span style={{ opacity: cursorOn ? 1 : 0, color: theme.colors.primary }}>▌</span>
    </div>
  );
};

/** A stamp that appears for `hold` frames after `at`: "PULL" over the trigger, "STOP" on the stop. */
export const Stamp: React.FC<{ absFrame: number; at: number; hold?: number; text: string; color: string; style?: React.CSSProperties }> = ({ absFrame, at, hold = 12, text, color, style }) => {
  const d = absFrame - at;
  if (d < 0 || d > hold) return null;
  const k = 1 - d / hold;
  return (
    <div style={{ position: "absolute", fontFamily: theme.fonts.display, fontSize: 46, letterSpacing: "0.12em", color, opacity: Math.min(1, k * 2), transform: `scale(${1 + 0.25 * (1 - k)})`, ...style }}>
      {text}
    </div>
  );
};
