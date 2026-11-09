import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { t3 } from "./theme3.ts";
import { IDEA } from "./engine.ts";
import { Ground, Post, Cut, Punch, Flash, Slam, Pop, PixelScene, SceneCard, useMs, useBreath } from "./Kit.tsx";

const INSTALL = ["/plugin marketplace add WorldInnovationsDepartment/mind_the_mug", "/plugin install mind-the-mug@mind-the-mug"];
const LAND_MS = 1100;

/**
 * The end card, 7 s: the name, the reminder, how to get it. The cat waits,
 * then knocks the mug off one last time; it lands on `final`, the last sound
 * of the track, as the second half of the reminder appears. Then it holds.
 */
export const Cta: React.FC<{ durationInFrames: number; final: number }> = ({ durationInFrames, final }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clock = useMs();
  const breath = useBreath(0.006);
  const revealFrom = final - (LAND_MS / 1000) * fps;
  const isReveal = frame >= revealFrom;
  return (
    <AbsoluteFill>
      <Ground id="cat" />
      <Cut durationInFrames={durationInFrames + 30}>
        <Punch hits={[0, final]} amount={0.045} shake={10}>
          <AbsoluteFill>
            <div style={{ position: "absolute", left: 110, top: 150, transform: `scale(${breath})` }}>
              <Pop delay={0} tilt={-2}>
                <SceneCard px={20}>
                  <PixelScene mascot="cat" px={20} clock={clock} phase={isReveal ? "reveal" : "idle"} e={isReveal ? ((frame - revealFrom) / fps) * 1000 : clock} />
                </SceneCard>
              </Pop>
            </div>
            <div style={{ position: "absolute", left: 1010, top: 150, width: 860, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <Slam delay={0} from={80} style={{ fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 132, lineHeight: 1, color: t3.colors.ink, whiteSpace: "nowrap" }}>Mind the Mug</Slam>
              <Slam delay={10} from={40} style={{ marginTop: 56, fontFamily: t3.fonts.display, fontWeight: 600, fontSize: 62, lineHeight: 1.15, color: t3.colors.ink, whiteSpace: "nowrap" }}>{IDEA[0]}</Slam>
              <Slam delay={final} from={50} style={{ fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 84, lineHeight: 1.15, color: t3.colors.hero, whiteSpace: "nowrap" }}>{IDEA[1]}</Slam>
            </div>
            <AbsoluteFill style={{ top: 664, height: 330, alignItems: "center" }}>
              <Pop delay={36} style={{ transformOrigin: "center bottom" }}>
                <div style={{ padding: "34px 48px", borderRadius: 26, background: t3.colors.term, color: t3.colors.termText, fontFamily: t3.fonts.mono, fontSize: 40, lineHeight: 1.6, boxShadow: `0 40px 90px -40px ${t3.colors.shadow}`, whiteSpace: "pre" }}>
                  {INSTALL.map((l) => (
                    <div key={l}><span style={{ color: t3.colors.termDim }}>&gt; </span>{l}</div>
                  ))}
                </div>
              </Pop>
              <Slam delay={50} from={30} style={{ marginTop: 34, fontFamily: t3.fonts.display, fontWeight: 600, fontSize: 46, color: t3.colors.inkSoft }}>
                A kind reminder for Claude Code. Free and open source.
              </Slam>
            </AbsoluteFill>
          </AbsoluteFill>
        </Punch>
      </Cut>
      <Flash hits={[final]} color={t3.colors.hero} peak={0.12} />
      <Post />
    </AbsoluteFill>
  );
};
