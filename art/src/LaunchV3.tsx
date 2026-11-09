// LaunchV3.tsx — the launch video of Mind the Mug: 1920 × 1080 @ 30 fps, 51 s,
// cut for a feed but slow enough to read: every line is on screen as type (it
// works muted) and is held, cuts and hits sit on a 120 BPM grid.
//
//   hook      You wanted a feature. You got a mug.
//   again     So you ask again. That's not reasoning. That's re-rolling.
//   turn      You can't control what the model returns.
//             You control what you delegate.
//             Don't delegate your reasoning. Or you'll get a mug.
//   product   A kind reminder, in your terminal: once a day, after the last
//             response, gone at your next prompt.
//   mascots   Two of the other four, each with what it hands you instead.
//   cta       Mind the Mug, how to install it, and one last mug.
//
// Every picture of a mascot is drawn by the plugin's own code (lib/scenes).
// Scene starts and hits come from timeline-v3.json, shared with
// scripts/dev/make-music-v3.js so the soundtrack's accents land on them and
// its last sound is the last mug landing.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timeline from "./timeline-v3.json";
import { t3 } from "./launch-v3/theme3.ts";
import { Progress } from "./launch-v3/Kit.tsx";
import { Hook } from "./launch-v3/Hook.tsx";
import { Again } from "./launch-v3/Again.tsx";
import { Turn } from "./launch-v3/Turn.tsx";
import { Product } from "./launch-v3/Product.tsx";
import { Mascots } from "./launch-v3/Mascots.tsx";
import { Cta } from "./launch-v3/Cta.tsx";

export const LaunchV3: React.FC = () => {
  const scenes = timeline.scenes;
  const startOf = (id: string) => scenes.find((s) => s.id === id)!.start;
  const lengthOf = (id: string) => {
    const i = scenes.findIndex((s) => s.id === id);
    return (scenes[i + 1] ? scenes[i + 1].start : timeline.durationInFrames) - scenes[i].start;
  };
  /** Hits of one kind that fall inside a scene, as scene-local frames. */
  const hitsIn = (id: string, kind: string) =>
    timeline.hits.filter((h) => h.kind === kind && h.frame >= startOf(id) && h.frame < startOf(id) + lengthOf(id)).map((h) => h.frame - startOf(id));
  return (
    <AbsoluteFill style={{ background: t3.colors.paper }}>
      <Audio src={staticFile("launch-track-v3.wav")} />
      <Sequence from={startOf("hook")} durationInFrames={lengthOf("hook")} name="hook">
        <Hook durationInFrames={lengthOf("hook")} hit={hitsIn("hook", "thud")[0]} />
      </Sequence>
      <Sequence from={startOf("again")} durationInFrames={lengthOf("again")} name="again">
        <Again durationInFrames={lengthOf("again")} thuds={hitsIn("again", "thud")} slam={hitsIn("again", "slam")[0]} />
      </Sequence>
      <Sequence from={startOf("turn")} durationInFrames={lengthOf("turn")} name="turn">
        <Turn durationInFrames={lengthOf("turn")} second={hitsIn("turn", "pop")[0]} drop={timeline.drop - startOf("turn")} mug={hitsIn("turn", "thud")[0]} />
      </Sequence>
      <Sequence from={startOf("product")} durationInFrames={lengthOf("product")} name="product">
        <Product durationInFrames={lengthOf("product")} pop={hitsIn("product", "pop")[0]} />
      </Sequence>
      <Sequence from={startOf("mascots")} durationInFrames={lengthOf("mascots")} name="mascots">
        <Mascots durationInFrames={lengthOf("mascots")} />
      </Sequence>
      <Sequence from={startOf("cta")} durationInFrames={lengthOf("cta")} name="cta">
        <Cta durationInFrames={lengthOf("cta")} final={timeline.final - startOf("cta")} />
      </Sequence>
      <Progress total={timeline.durationInFrames} color={t3.colors.hero} />
    </AbsoluteFill>
  );
};
