import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme.ts";
import { BgMesh, Post, GlitchText } from "../launch/Layers.tsx";
import { Cut, Slam } from "./Fx.tsx";

const LINES = [
  "Five pulls.",
  "A feature. A client. Grass, touched.",
  "Balance: 220 credits.",
  "The feature still needs tests.",
];

/** The deadpan payoff card, 5 s: one line every 12 frames, then the install line. */
export const Payoff: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 24) * 3;
  return (
    <AbsoluteFill>
      <BgMesh hue="yellow" />
      <Cut durationInFrames={durationInFrames}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 16, transform: `translateY(${float}px)` }}>
          {LINES.map((l, i) => (
            <Slam key={l} delay={4 + i * 12} from={40}>
              <div style={{ fontFamily: theme.fonts.body, fontSize: 56, color: i === LINES.length - 1 ? theme.colors.primary : theme.colors.text, textAlign: "center" }}>{l}</div>
            </Slam>
          ))}
          <Slam delay={64} from={50}>
            <div style={{ marginTop: 54, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <GlitchText text="Claude Slots" size={96} color={theme.colors.primary} shift={5} />
              <div style={{ fontFamily: theme.fonts.mono, fontSize: 32, color: theme.colors.accent }}>/plugin install slots@slots-local</div>
              <div style={{ fontFamily: theme.fonts.mono, fontSize: 24, color: theme.colors.textDim }}>github.com/WorldInnovationsDepartment/mind_the_mug · no eddies were harmed</div>
            </div>
          </Slam>
        </AbsoluteFill>
      </Cut>
      <Post />
    </AbsoluteFill>
  );
};
