import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../theme.ts";
import { BgMesh, Post } from "../launch/Layers.tsx";
import { Machine } from "../machine/Machine.tsx";
import { reelOffsetsAt, overlayAt } from "../machine/motion.ts";
import { OVERLAY_FRAMES } from "../machine/overlay-grid.ts";
import { Cut, Punch, Slam, Hud, Stamp } from "./Fx.tsx";

const LINES = [
  ["> ", "refactor the auth module and add tests", theme.colors.text],
  ["", "", ""],
  ["⏺ ", "Read(src/auth/session.ts)", theme.colors.textDim],
  ["  ⎿ ", "Read 212 lines", theme.colors.textDim],
  ["⏺ ", "Grep(pattern: \"refreshToken\")", theme.colors.textDim],
  ["  ⎿ ", "Found 9 files", theme.colors.textDim],
  ["⏺ ", "Update(src/auth/session.ts)", theme.colors.textDim],
  ["  ⎿ ", "Updated with 3 additions and 1 removal", theme.colors.textDim],
  ["⏺ ", "Bash(node --test tests/auth.test.js)", theme.colors.textDim],
  ["  ⎿ ", "# pass 14  # fail 0", theme.colors.accent],
] as const;

export type TerminalSpec = { leverFrame: number; stopFrame: number; reelStops: readonly number[]; balanceBefore: number };

/** The mock terminal, 5 s: lines land every 4 frames while the real sprite spins in the spinner's place. */
export const Terminal: React.FC<{ durationInFrames: number; spec: TerminalSpec; sceneStart: number }> = ({ durationInFrames, spec, sceneStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absFrame = sceneStart + frame;
  const nowMs = (absFrame / fps) * 1000;
  const pull = { leverAt: (spec.leverFrame / fps) * 1000, stopAt: (spec.stopFrame / fps) * 1000, symbols: ["PILLS", "GUN", "AGENT"] as const };
  const offsets = reelOffsetsAt(pull, nowMs);
  const overlay = overlayAt(pull, "lose", nowMs);
  const variant = Math.floor(nowMs / 100) % 4;
  const overlayEndFrame = spec.stopFrame + 36 + OVERLAY_FRAMES.lose * 3;
  const spinning = absFrame >= spec.leverFrame && absFrame < overlayEndFrame;
  const done = absFrame >= overlayEndFrame;
  const balance = absFrame >= spec.leverFrame ? spec.balanceBefore - 1 : spec.balanceBefore;
  const resultIn = spring({ frame: absFrame - overlayEndFrame, fps, config: theme.spring.hard });
  const win = spring({ frame, fps, config: theme.spring.hard });
  const linesShown = Math.max(0, Math.floor((frame - 6) / 4));
  const elapsed = Math.max(0, Math.floor((Math.min(absFrame, spec.stopFrame) - spec.leverFrame) / fps));
  return (
    <AbsoluteFill>
      <BgMesh hue="cyan" />
      <Cut durationInFrames={durationInFrames}>
        <Punch absFrame={absFrame} hits={spec.reelStops} amount={0.02}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: 1560, height: 880, borderRadius: 18, background: "#0B0B12", border: `2px solid ${theme.colors.textDim}55`, boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px ${theme.colors.glowCyan}`, overflow: "hidden", opacity: Math.min(1, win * 1.5), transform: `translateY(${interpolate(win, [0, 1], [80, 0])}px) scale(${interpolate(win, [0, 1], [0.94, 1])})` }}>
              <div style={{ height: 52, background: "#15151F", display: "flex", alignItems: "center", gap: 10, padding: "0 20px", fontFamily: theme.fonts.mono, fontSize: 20, color: theme.colors.textDim }}>
                <span style={{ width: 16, height: 16, borderRadius: 8, background: theme.colors.danger }} />
                <span style={{ width: 16, height: 16, borderRadius: 8, background: theme.colors.primary }} />
                <span style={{ width: 16, height: 16, borderRadius: 8, background: theme.colors.accent }} />
                <span style={{ marginLeft: 20 }}>claude — ~/projects/night-city-app</span>
              </div>
              <div style={{ padding: "26px 40px", fontFamily: theme.fonts.mono, fontSize: 28, lineHeight: 1.5, position: "relative" }}>
                {LINES.slice(0, Math.min(LINES.length, linesShown)).map(([pre, text, color], i) => (
                  <Slam key={i} delay={6 + i * 4} from={10}>
                    <div style={{ color, whiteSpace: "pre" }}>
                      <span style={{ color: theme.colors.primary }}>{pre}</span>
                      {text}
                    </div>
                  </Slam>
                ))}
                {spinning && (
                  <div style={{ marginTop: 18, display: "flex", alignItems: "flex-end", gap: 28, position: "relative" }}>
                    <Machine scale={12} state={{ variant, offsets, balance, overlay }} />
                    <div style={{ color: theme.colors.textDim, fontSize: 24, paddingBottom: 6 }}>({elapsed}s · esc to interrupt)</div>
                    <Stamp absFrame={absFrame} at={spec.leverFrame} text="PULL" color={theme.colors.primary} style={{ left: 500, bottom: 150 }} />
                  </div>
                )}
                {done && (
                  <div style={{ marginTop: 18, color: theme.colors.textDim, whiteSpace: "pre", opacity: Math.min(1, resultIn * 1.5), transform: `translateY(${interpolate(resultIn, [0, 1], [14, 0])}px)` }}>
                    ◈ no match  −1 cr  balance {String(balance).padStart(3, "0")}
                  </div>
                )}
              </div>
            </div>
          </AbsoluteFill>
          <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 44 }}>
            <Slam delay={14} from={40}>
              <div style={{ textAlign: "center", fontFamily: theme.fonts.display, fontSize: 60, color: theme.colors.primary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                the agent works. the reels turn.
              </div>
            </Slam>
          </AbsoluteFill>
        </Punch>
        <Hud pull={1} of={5} balance={balance} />
      </Cut>
      <Post />
    </AbsoluteFill>
  );
};
