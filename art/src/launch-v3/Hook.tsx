import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { t3 } from "./theme3.ts";
import { Ground, Post, Cut, Punch, Flash, Slam, Words, PixelScene, SceneCard, useMs } from "./Kit.tsx";

/** Frames into the scene at which the cat starts for the mug, so that it lands on `hit`. */
const LAND_MS = 1100;

/** The hook, 6 s: you wanted a feature; the cat looks at you and knocks the mug off. */
export const Hook: React.FC<{ durationInFrames: number; hit: number }> = ({ durationInFrames, hit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clock = useMs();
  const revealFrom = hit - (LAND_MS / 1000) * fps;
  const isReveal = frame >= revealFrom;
  return (
    <AbsoluteFill>
      <Ground id="cat" />
      <Cut durationInFrames={durationInFrames}>
        <Punch hits={[hit]} amount={0.05} shake={12}>
          <AbsoluteFill style={{ alignItems: "center" }}>
            <Words text="You wanted a feature." delay={3} every={3} accent="feature" accentColor={t3.colors.inkSoft} style={{ position: "absolute", top: 50, width: 1700, fontFamily: t3.fonts.display, fontWeight: 600, fontSize: 96, color: t3.colors.ink }} />
            <SceneCard px={28} style={{ position: "absolute", top: 196 }}>
              <PixelScene mascot="cat" px={28} clock={clock} phase={isReveal ? "reveal" : "idle"} e={isReveal ? ((frame - revealFrom) / fps) * 1000 : clock} />
            </SceneCard>
            <Slam delay={hit} from={90} style={{ position: "absolute", top: 828, fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 168, lineHeight: 1, color: t3.colors.ink, whiteSpace: "nowrap" }}>
              You got <span style={{ color: t3.colors.hero }}>a mug.</span>
            </Slam>
          </AbsoluteFill>
        </Punch>
      </Cut>
      <Flash hits={[hit]} color={t3.colors.hero} peak={0.16} />
      <Post />
    </AbsoluteFill>
  );
};
