// LaunchV2.tsx — the launch video, second cut: 1920 × 1080 @ 30 fps, 30 s.
// Half the length of v1 at 160 BPM, hard cuts, camera punches on every reel
// stop, and the jackpot is TOUCH GRASS. Scene starts and reel stops come from
// timeline-v2.json, shared with scripts/dev/make-music.js --v2 so the
// soundtrack's accents land on the stops.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import timeline from "./timeline-v2.json";
import { Title } from "./launch-v2/Title.tsx";
import { Terminal } from "./launch-v2/Terminal.tsx";
import { Pull, type PullSpec } from "./launch-v2/Pull.tsx";
import { Payoff } from "./launch-v2/Payoff.tsx";
import { Progress } from "./launch-v2/Fx.tsx";

const PROMPTS: Record<string, string> = {
  lose: "fix the flaky test in ci",
  feature: "add dark mode to settings",
  client: "draft the client proposal",
  "touch-grass": "what should I do this weekend",
};

export const LaunchV2: React.FC = () => {
  const frame = useCurrentFrame();
  const scenes = timeline.scenes;
  const startOf = (id: string) => scenes.find((s) => s.id === id)!.start;
  const lengthOf = (id: string) => {
    const i = scenes.findIndex((s) => s.id === id);
    const next = scenes[i + 1] ? scenes[i + 1].start : timeline.durationInFrames;
    return next - scenes[i].start;
  };
  const pulls = timeline.pulls as unknown as PullSpec[];
  const turns = pulls.length + 1; // the terminal scene is a pull too
  return (
    <AbsoluteFill>
      <Audio src={staticFile("launch-track-v2.wav")} />
      <Sequence from={startOf("title")} durationInFrames={lengthOf("title")} name="title">
        <Title durationInFrames={lengthOf("title")} />
      </Sequence>
      <Sequence from={startOf("terminal")} durationInFrames={lengthOf("terminal")} name="terminal">
        <Terminal durationInFrames={lengthOf("terminal")} spec={timeline.terminal} sceneStart={startOf("terminal")} />
      </Sequence>
      {pulls.map((p, i) => (
        <Sequence key={p.id} from={startOf(`pull-${p.id}`)} durationInFrames={lengthOf(`pull-${p.id}`)} name={`pull-${p.id}`}>
          <Pull spec={p} sceneStart={startOf(`pull-${p.id}`)} durationInFrames={lengthOf(`pull-${p.id}`)} prompt={PROMPTS[p.id]} index={i + 2} of={turns} />
        </Sequence>
      ))}
      <Sequence from={startOf("payoff")} durationInFrames={lengthOf("payoff")} name="payoff">
        <Payoff durationInFrames={lengthOf("payoff")} />
      </Sequence>
      <Progress absFrame={frame} total={timeline.durationInFrames} />
    </AbsoluteFill>
  );
};
