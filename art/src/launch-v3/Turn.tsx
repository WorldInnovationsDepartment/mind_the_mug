import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { t3 } from "./theme3.ts";
import { IDEA, WHY } from "./engine.ts";
import { Ground, Post, Cut, Punch, Flash, Slam, Words, Sprite, useBreath } from "./Kit.tsx";

/** The two facts, one under the other: the first dims when the second lands. */
const Why: React.FC<{ durationInFrames: number; second: number }> = ({ durationInFrames, second }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - second, fps, config: t3.spring.snappy });
  const type: React.CSSProperties = { fontFamily: t3.fonts.display, fontWeight: 600, fontSize: 112, lineHeight: 1.12, textAlign: "center" };
  return (
    <AbsoluteFill>
      <Ground id="cat" />
      <Cut durationInFrames={durationInFrames}>
        <Punch hits={[second]} amount={0.025}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 1500, transform: `translateY(${interpolate(p, [0, 1], [150, 0])}px)` }}>
              <div style={{ opacity: interpolate(p, [0, 1], [1, 0.42]), transform: `scale(${interpolate(p, [0, 1], [1, 0.86])})` }}>
                <Words text={WHY[0]} delay={4} every={3} style={{ ...type, color: t3.colors.ink }} />
              </div>
              <div style={{ height: 300, marginTop: 40 }}>
                <Words text={WHY[1]} delay={second} every={3} accent="delegate" accentColor={t3.colors.hero} style={{ ...type, fontWeight: 700, fontSize: 128, color: t3.colors.ink }} />
              </div>
            </div>
          </AbsoluteFill>
        </Punch>
      </Cut>
      <Post />
    </AbsoluteFill>
  );
};

/** The drop: the reminder itself on the dark ground, and then the mug lands next to it. */
const Reminder: React.FC<{ durationInFrames: number; mug: number }> = ({ durationInFrames, mug }) => {
  const frame = useCurrentFrame();
  const breath = useBreath(0.008);
  const [l1, l2] = [IDEA[0].split(" ").slice(0, 2).join(" "), IDEA[0].split(" ").slice(2).join(" ")];
  // the mug falls for ten frames and lands exactly on the hit
  const fall = interpolate(frame, [mug - 10, mug], [-760, 0], { easing: t3.ease.in, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const squash = interpolate(frame, [mug, mug + 3, mug + 8], [1, 0.82, 1], { easing: t3.ease.out, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Ground id="night" />
      <Cut durationInFrames={durationInFrames}>
        <Punch hits={[0, mug]} amount={0.06} shake={14}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: `scale(${breath})`, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: t3.fonts.display, fontWeight: 700, color: t3.colors.white, lineHeight: 1.04 }}>
              <Words text={l1} delay={0} every={3} style={{ fontSize: 184 }} />
              <Words text={l2} delay={7} every={4} accent="reasoning" accentColor={t3.colors.heroDark} style={{ fontSize: 184 }} />
            </div>
            <div style={{ height: 150, marginTop: 64, display: "flex", alignItems: "flex-end", gap: 40 }}>
              <Slam delay={mug} from={30} style={{ fontFamily: t3.fonts.display, fontWeight: 600, fontSize: 108, lineHeight: 1, color: t3.colors.white, whiteSpace: "nowrap" }}>
                {IDEA[1]}
              </Slam>
              <div style={{ opacity: frame >= mug - 10 ? 1 : 0, transform: `translateY(${fall}px) scaleY(${squash})`, transformOrigin: "center bottom" }}>
                <Sprite rows={t3.mug.rows} map={t3.mug.map} px={30} />
              </div>
            </div>
          </AbsoluteFill>
        </Punch>
      </Cut>
      <Flash hits={[0]} color={t3.colors.white} peak={0.16} />
      <Post dark />
    </AbsoluteFill>
  );
};

/** The turn, 12 s: what you can't control, what you can, and so, on the drop, the reminder. */
export const Turn: React.FC<{ durationInFrames: number; second: number; drop: number; mug: number }> = ({ durationInFrames, second, drop, mug }) => (
  <AbsoluteFill>
    <Sequence durationInFrames={drop} name="why">
      <Why durationInFrames={drop} second={second} />
    </Sequence>
    <Sequence from={drop} durationInFrames={durationInFrames - drop} name="reminder">
      <Reminder durationInFrames={durationInFrames - drop} mug={mug - drop} />
    </Sequence>
  </AbsoluteFill>
);
