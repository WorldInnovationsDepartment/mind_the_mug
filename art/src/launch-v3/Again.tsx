import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { t3 } from "./theme3.ts";
import { Ground, Post, Cut, Punch, Flash, Slam, Pop, Words, PixelScene, SceneCard, useMs, type Extra } from "./Kit.tsx";

const LAND_MS = 1100;
const NUDGE_MS = 600;
/** Where the earlier mugs sit on the desk while the next one falls. */
const PILE_X = [21, 26];

/** "So you ask again", 8 s: three more mugs on the beat, then the name for it, held. */
export const Again: React.FC<{ durationInFrames: number; thuds: number[]; slam: number }> = ({ durationInFrames, thuds, slam }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clock = useMs();
  const every = thuds[1] - thuds[0];
  const first = thuds[0] - every / 2; // each round starts half a beat pair before its thud
  const round = Math.max(0, Math.min(thuds.length - 1, Math.floor((frame - first) / every)));
  const u = frame - first - round * every;
  // half a round takes the mug from the nudge to the desk; the rest is the cat sitting down
  const e = NUDGE_MS + (u / (every / 2)) * (LAND_MS - NUDGE_MS);
  const landed = thuds.filter((t) => frame >= t).length;
  const pile: Extra = (b) => {
    for (let i = 0; i < Math.min(round, PILE_X.length); i++) b.spr([...t3.mug.rows], PILE_X[i], 9, t3.mug.map);
  };
  return (
    <AbsoluteFill>
      <Ground id="cat" />
      <Cut durationInFrames={durationInFrames}>
        <Punch hits={[...thuds, slam]} amount={0.04} shake={10}>
          <AbsoluteFill style={{ alignItems: "center" }}>
            <Words text="So you ask again." delay={2} every={3} style={{ position: "absolute", top: 50, width: 1700, fontFamily: t3.fonts.display, fontWeight: 600, fontSize: 96, color: t3.colors.ink }} />
            <SceneCard px={28} style={{ position: "absolute", top: 196 }}>
              <PixelScene mascot="cat" px={28} clock={clock} phase="reveal" e={Math.max(0, e)} extra={pile} />
            </SceneCard>
            {thuds.map((t, i) => (
              <Pop key={t} delay={t} tilt={i % 2 ? 7 : -7} style={{ position: "absolute", top: 150 + i * 8, left: 1450 + i * 30, display: landed === i + 1 || (i === thuds.length - 1 && landed > i) ? "block" : "none" }}>
                <div style={{ width: 190, height: 190, borderRadius: "50%", background: t3.colors.ink, color: t3.colors.white, fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 96, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 18px 40px -16px ${t3.colors.shadow}` }}>×{i + 2}</div>
              </Pop>
            ))}
            <div style={{ position: "absolute", top: 812, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Slam delay={slam - 4} from={40} style={{ fontFamily: t3.fonts.display, fontWeight: 600, fontSize: 64, lineHeight: 1.1, color: t3.colors.inkSoft }}>
                That's not reasoning.
              </Slam>
              <Slam delay={slam} from={90} style={{ fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 150, lineHeight: 1, color: t3.colors.ink, whiteSpace: "nowrap" }}>
                That's <span style={{ color: t3.colors.hero }}>re-rolling.</span>
              </Slam>
            </div>
          </AbsoluteFill>
        </Punch>
      </Cut>
      <Flash hits={thuds} color={t3.colors.hero} peak={0.1} />
      <Post />
    </AbsoluteFill>
  );
};
