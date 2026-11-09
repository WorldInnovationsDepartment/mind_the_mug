import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../theme.ts";
import { BgMesh, Post, GlitchText } from "../launch/Layers.tsx";
import { Machine } from "../machine/Machine.tsx";
import { reelOffsetsAt, overlayAt, type Pull as PullTiming } from "../machine/motion.ts";
import type { OverlayId } from "../machine/overlay-grid.ts";
import type { SymbolId } from "../machine/symbol-grid.ts";
import { Cut, Punch, Flash, Streaks, Slam, Hud, Stamp, Typewriter, ring } from "./Fx.tsx";

/** `outcome` is the engine's class name; LIFE is what the video calls TOUCH GRASS. */
export type PullSpec = {
  id: string;
  outcome: "LOSE" | "FEATURE" | "CLIENT" | "LIFE";
  symbols: readonly [SymbolId, SymbolId, SymbolId];
  leverFrame: number;
  stopFrame: number;
  reelStops: readonly [number, number, number];
  balanceBefore: number;
  payout: number;
};

/** The jackpot band on the machine alternates these per blink (the plugin's own sheet says A LIFE). */
export const JACKPOT_BAND = ["TOUCH", "GRASS"] as const;

const OVERLAY: Record<PullSpec["outcome"], OverlayId> = { LOSE: "lose", FEATURE: "win-feature", CLIENT: "win-client", LIFE: "win-life" };
const HUE: Record<PullSpec["outcome"], "grey" | "cyan" | "magenta" | "yellow"> = { LOSE: "grey", FEATURE: "cyan", CLIENT: "magenta", LIFE: "yellow" };
const COLOUR: Record<PullSpec["outcome"], string> = { LOSE: theme.colors.textDim, FEATURE: theme.colors.accent, CLIENT: theme.colors.accent2, LIFE: theme.colors.primary };
const GLOW: Record<PullSpec["outcome"], string> = { LOSE: "rgba(154,154,174,0.18)", FEATURE: theme.colors.glowCyan, CLIENT: theme.colors.glowMagenta, LIFE: theme.colors.glow };
const LABEL: Record<PullSpec["outcome"], string> = { LOSE: "no match", FEATURE: "FEATURE", CLIENT: "CLIENT", LIFE: "TOUCH GRASS" };
const HEADLINE: Record<PullSpec["outcome"], string> = { LOSE: "", FEATURE: "A FEATURE", CLIENT: "A CLIENT", LIFE: "TOUCH GRASS" };
const CAPTION: Record<PullSpec["outcome"], string> = {
  LOSE: "most prompts.",
  FEATURE: "you shipped something.",
  CLIENT: "somebody pays for it.",
  LIFE: "go outside.",
};

/** One pull, full size: the real sprite composition at 27 px per unit, cut to a 4 s beat. */
export const Pull: React.FC<{ spec: PullSpec; sceneStart: number; durationInFrames: number; prompt: string; index: number; of: number }> = ({ spec, sceneStart, durationInFrames, prompt, index, of }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absFrame = sceneStart + frame;
  const nowMs = (absFrame / fps) * 1000;
  const jackpot = spec.outcome === "LIFE";
  const timing: PullTiming = { leverAt: (spec.leverFrame / fps) * 1000, stopAt: (spec.stopFrame / fps) * 1000, symbols: spec.symbols };
  const lastStop = spec.reelStops[2];
  const stopped = absFrame >= lastStop;
  const balance = absFrame >= spec.leverFrame ? spec.balanceBefore - 1 + (absFrame >= lastStop ? spec.payout : 0) : spec.balanceBefore;
  const offsets = reelOffsetsAt(timing, nowMs);
  const rawOverlay = overlayAt(timing, OVERLAY[spec.outcome], nowMs);
  const overlay = rawOverlay && jackpot ? { ...rawOverlay, bandWords: JACKPOT_BAND } : rawOverlay;
  const variant = Math.floor(nowMs / 100) % 4;
  // speed streaks ramp in after the lever and out as the first reel lands
  const streak = interpolate(absFrame, [spec.leverFrame + 2, spec.leverFrame + 14, spec.reelStops[0] - 6, spec.reelStops[0] + 4], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const net = spec.payout - 1;
  const result = `◈ ${LABEL[spec.outcome]}  ${net >= 0 ? "+" : "−"}${Math.abs(net)} cr  balance ${String(balance).padStart(3, "0")}`;
  const resultIn = spring({ frame: absFrame - (lastStop + 4), fps, config: theme.spring.hard });
  const hits = jackpot ? [...spec.reelStops, lastStop + 36] : spec.reelStops; // the jackpot overlay's first frame hits too
  const glow = 30 + 60 * ring(absFrame, hits);
  const machineHue = jackpot && stopped ? theme.colors.glow : GLOW[spec.outcome];
  return (
    <AbsoluteFill>
      <BgMesh hue={HUE[spec.outcome]} />
      <Streaks intensity={streak} color={COLOUR[spec.outcome]} />
      <Cut durationInFrames={durationInFrames}>
        <Punch absFrame={absFrame} hits={hits} amount={jackpot ? 0.06 : 0.04} shake={jackpot ? 14 : 4}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <Slam from={40}>
              <Typewriter text={prompt} delay={2} cps={2.6} style={{ fontSize: 36, color: theme.colors.textDim, marginBottom: 34, textAlign: "center" }} />
            </Slam>
            <Slam delay={3} from={70}>
              <div style={{ position: "relative", boxShadow: `0 0 140px ${glow}px ${machineHue}` }}>
                <Machine scale={27} state={{ variant, offsets, balance, overlay }} />
                <Stamp absFrame={absFrame} at={spec.leverFrame} text="PULL" color={theme.colors.primary} style={{ right: -150, top: 300 }} />
              </div>
            </Slam>
            <div style={{ height: 140, marginTop: 36, opacity: Math.min(1, resultIn * 1.4), transform: `translateY(${interpolate(resultIn, [0, 1], [34, 0])}px) scale(${interpolate(resultIn, [0, 1], [1.1, 1])})` }}>
              <div style={{ fontFamily: theme.fonts.mono, fontSize: 46, color: COLOUR[spec.outcome], textAlign: "center" }}>{result}</div>
              <div style={{ fontFamily: theme.fonts.body, fontSize: 34, color: theme.colors.textDim, textAlign: "center", marginTop: 12 }}>{CAPTION[spec.outcome]}</div>
            </div>
          </AbsoluteFill>
          {HEADLINE[spec.outcome] && stopped && (
            <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 14 }}>
              <Slam delay={lastStop + 2 - sceneStart} from={-80}>
                <GlitchText text={HEADLINE[spec.outcome]} size={jackpot ? 128 : 116} color={COLOUR[spec.outcome]} shift={jackpot ? 9 : 6} />
              </Slam>
            </AbsoluteFill>
          )}
        </Punch>
        <Hud pull={index} of={of} balance={balance} color={stopped ? COLOUR[spec.outcome] : theme.colors.textDim} />
      </Cut>
      <Flash absFrame={absFrame} hits={spec.reelStops} color={COLOUR[spec.outcome]} peak={jackpot ? 0.5 : spec.outcome === "LOSE" ? 0.12 : 0.3} />
      <Post />
    </AbsoluteFill>
  );
};
