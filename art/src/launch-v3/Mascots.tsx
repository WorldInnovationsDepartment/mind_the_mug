import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { t3 } from "./theme3.ts";
import { MASCOTS, ideaFor, type MascotId } from "./engine.ts";
import { Ground, Post, Cut, Punch, Slam, Pop, PixelScene, SceneCard, Chip, useMs } from "./Kit.tsx";

/** Two of the other four, each held long enough to read; `land` is the frame its dud is on screen. */
const CUTS: { id: MascotId; land: number }[] = [
  { id: "dog", land: 40 },
  { id: "hen", land: 32 },
];

const One: React.FC<{ id: MascotId; land: number; durationInFrames: number }> = ({ id, land, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clock = useMs();
  const m = MASCOTS[id];
  const [line, or] = ideaFor(id);
  const dud = or.slice("Or you'll get ".length);
  return (
    <AbsoluteFill>
      <Ground id={id} />
      <Cut durationInFrames={durationInFrames}>
        <Punch hits={[0, land]} amount={0.035}>
          <AbsoluteFill>
            <SceneCard px={22} style={{ position: "absolute", left: 80, top: 250 }}>
              <PixelScene mascot={id} px={22} clock={clock + 4000} phase="reveal" outcome="none" e={(frame / fps) * 1000} />
            </SceneCard>
            <div style={{ position: "absolute", left: 1040, top: 200, width: 840, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <Pop delay={0} tilt={-2} style={{ transformOrigin: "left center" }}>
                <Chip tone="ink" size={46}>/mascot {id}</Chip>
              </Pop>
              <Slam delay={4} from={50} style={{ marginTop: 34, fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 104, lineHeight: 1, color: t3.colors.ink, whiteSpace: "nowrap" }}>{m.name}</Slam>
              <Slam delay={14} from={40} style={{ marginTop: 52, fontFamily: t3.fonts.display, fontWeight: 500, fontSize: 54, lineHeight: 1.1, color: t3.colors.inkSoft, whiteSpace: "nowrap" }}>{line}</Slam>
              <Slam delay={land} from={50} style={{ marginTop: 14, fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 64, lineHeight: 1.1, color: t3.colors.ink, whiteSpace: "nowrap" }}>
                Or you'll get
              </Slam>
              <Slam delay={land + 3} from={60} style={{ fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 128, lineHeight: 1.05, color: t3.colors.hero, whiteSpace: "nowrap" }}>
                {dud}
              </Slam>
            </div>
            <Slam delay={20} from={30} style={{ position: "absolute", left: 0, right: 0, bottom: 84, textAlign: "center", fontFamily: t3.fonts.display, fontWeight: 600, fontSize: 46, color: t3.colors.inkSoft }}>
              Not a cat person? Five mascots. Pick yours with <span style={{ fontFamily: t3.fonts.mono, fontWeight: 700, color: t3.colors.ink }}>/mascot</span>
            </Slam>
          </AbsoluteFill>
        </Punch>
      </Cut>
      <Post />
    </AbsoluteFill>
  );
};

/** The mascots, 9 s: two of them, 4.5 s each, saying the reminder their own way. */
export const Mascots: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const each = Math.floor(durationInFrames / CUTS.length);
  return (
    <AbsoluteFill>
      {CUTS.map((c, i) => (
        <Sequence key={c.id} from={i * each} durationInFrames={i === CUTS.length - 1 ? durationInFrames - i * each : each} name={c.id}>
          <One {...c} durationInFrames={i === CUTS.length - 1 ? durationInFrames - i * each : each} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
