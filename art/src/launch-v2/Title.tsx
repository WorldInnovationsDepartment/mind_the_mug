import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../theme.ts";
import { BgMesh, Post, GlitchText } from "../launch/Layers.tsx";
import { Cut, Slam } from "./Fx.tsx";

/** Cold open, 1.6 s: the name slams in, the tagline snaps under it. */
export const Title: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bar = spring({ frame: frame - 1, fps, config: theme.spring.hard });
  const flicker = frame % 11 === 0 ? 0.75 : 1;
  return (
    <AbsoluteFill>
      <BgMesh hue="yellow" />
      <Cut durationInFrames={durationInFrames}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: interpolate(bar, [0, 1], [0, 28]), background: theme.colors.primary }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, opacity: flicker }}>
            <Slam delay={2} from={90}>
              <GlitchText text="CLAUDE" size={230} color={theme.colors.text} shift={8} />
            </Slam>
            <Slam delay={7} from={90}>
              <GlitchText text="SLOTS" size={230} color={theme.colors.primary} shift={8} />
            </Slam>
            <Slam delay={16} from={30}>
              <div style={{ display: "flex", gap: 28, marginTop: 22, fontFamily: theme.fonts.display, fontSize: 48, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {["PULL.", "WAIT.", "WIN."].map((w, i) => (
                  <Slam key={w} delay={18 + i * 4} from={20}>
                    <span style={{ color: i === 2 ? theme.colors.accent : theme.colors.textDim }}>{w}</span>
                  </Slam>
                ))}
              </div>
            </Slam>
            <Slam delay={30} from={16}>
              <div style={{ fontFamily: theme.fonts.mono, fontSize: 30, color: theme.colors.textDim, letterSpacing: "0.12em", marginTop: 6 }}>a Claude Code plugin</div>
            </Slam>
          </div>
        </AbsoluteFill>
      </Cut>
      <Post />
    </AbsoluteFill>
  );
};
