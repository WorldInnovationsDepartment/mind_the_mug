import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { t3 } from "./theme3.ts";
import { MASCOTS, ideaFor } from "./engine.ts";
import { Ground, Post, Cut, Punch, Slam, Pop, PixelScene, useMs } from "./Kit.tsx";

const ASK = "add rate limiting to /export";
const NEXT = "now add tests for the limiter";
const LOG: [number, React.ReactNode][] = [
  [13, <><span style={{ color: t3.colors.termGreen }}>⏺</span> <b>Read</b>(src/routes/export.ts)</>],
  [21, <><span style={{ color: t3.colors.termGreen }}>⏺</span> <b>Update</b>(src/middleware/bucket.ts)</>],
  [28, <><span style={{ color: t3.colors.termGreen }}>⏺</span> <b>Bash</b>(npm test -- export) <span style={{ color: t3.colors.termDim }}>12 passed</span></>],
  [38, <>⏺ Added a token bucket in front of /export.</>],
  [38, <>&nbsp;&nbsp;60 requests a minute per key. Tests pass.</>],
];
const SAY = ["Once a day.", "After the last response.", "Gone at your next prompt."];

const typed = (text: string, frame: number, from: number, cps = 1.6) => text.slice(0, Math.max(0, Math.floor((frame - from) * cps)));

/** The product, 9 s: a real turn in a terminal; the cat shows up after the answer and leaves at the next prompt. */
export const Product: React.FC<{ durationInFrames: number; pop: number }> = ({ durationInFrames, pop }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clock = useMs();
  const nextAt = durationInFrames - 78; // the next prompt starts being typed
  const goneAt = nextAt + 18;
  const says = [pop + 6, pop + 60, goneAt];
  const bandIn = spring({ frame: frame - pop, fps, config: t3.spring.bouncy });
  const bandOut = spring({ frame: frame - goneAt, fps, config: t3.spring.hard });
  const band = frame < pop ? 0 : bandIn * (1 - bandOut);
  const cat = MASCOTS.cat;
  const caption = [`${cat.name} · the rubber duck · FEATURE`, cat.tag, cat.lesson[0], cat.lesson[1], "", ...ideaFor("cat")];
  const row: React.CSSProperties = { height: 44, whiteSpace: "pre" };
  return (
    <AbsoluteFill>
      <Ground id="cat" />
      <Cut durationInFrames={durationInFrames}>
        <Punch hits={[pop]} amount={0.025}>
          <AbsoluteFill>
            <Slam delay={2} from={40} style={{ position: "absolute", top: 54, left: 96, fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 84, color: t3.colors.ink }}>
              Mind the Mug. <span style={{ color: t3.colors.inkSoft, fontWeight: 600 }}>A kind reminder, in your terminal.</span>
            </Slam>

            {/* the terminal */}
            <div style={{ position: "absolute", top: 196, left: 96, width: 1200, height: 810, borderRadius: 22, overflow: "hidden", background: t3.colors.term, color: t3.colors.termText, fontFamily: t3.fonts.mono, fontSize: 29, boxShadow: `0 40px 90px -40px ${t3.colors.shadow}` }}>
              <div style={{ height: 50, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", background: t3.colors.termLine, color: t3.colors.termDim, fontSize: 20 }}>
                {[0, 1, 2].map((i) => <i key={i} style={{ width: 15, height: 15, borderRadius: "50%", background: t3.colors.termDim, opacity: 0.55 }} />)}
                <span style={{ marginLeft: 12 }}>~/projects/app — claude</span>
              </div>
              <div style={{ padding: "22px 30px 0" }}>
                <div style={row}><span style={{ color: t3.colors.termDim }}>&gt; </span>{typed(ASK, frame, 3)}</div>
                <div style={{ height: 14 }} />
                {LOG.map(([at, line], i) => (
                  <div key={i} style={{ ...row, opacity: frame >= at ? 1 : 0 }}>{line}</div>
                ))}
                <div style={{ height: 14 }} />
                <div style={{ ...row, opacity: frame >= pop ? 1 : 0 }}>
                  <span style={{ color: t3.colors.termOrange }}>✻</span> <span style={{ color: t3.colors.termDim }}>Deliberated for 42s ·</span> <b>the rubber duck · FEATURE</b>
                </div>
              </div>

              {/* the band above the prompt: caption, then the 40 x 10 cells */}
              <div style={{ position: "absolute", left: 30, right: 30, bottom: 118, height: 200, display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 18, opacity: Math.min(1, band * 1.5), transform: `scale(${interpolate(band, [0, 1], [0.7, 1])})`, transformOrigin: "right bottom" }}>
                <div style={{ textAlign: "right", fontSize: 21, lineHeight: "28.5px", whiteSpace: "pre" }}>
                  {caption.map((l, i) => (
                    <div key={i} style={{ height: 28.5, fontWeight: i === 0 || i === 6 ? 700 : 400, color: i >= 5 ? t3.colors.termOrange : i >= 2 ? t3.colors.termDim : t3.colors.termText }}>{l}</div>
                  ))}
                </div>
                <PixelScene mascot="cat" px={10} clock={clock} phase="reveal" outcome="feature" e={Math.max(0, ((frame - pop) / fps) * 1000)} />
              </div>

              <div style={{ position: "absolute", left: 30, right: 30, bottom: 58, height: 46, borderTop: `2px solid ${t3.colors.termLine}`, borderBottom: `2px solid ${t3.colors.termLine}`, display: "flex", alignItems: "center", whiteSpace: "pre" }}>
                <span style={{ color: t3.colors.termDim }}>&gt; </span>{typed(NEXT, frame, nextAt, 2)}
                <span style={{ opacity: Math.floor(frame / 8) % 2 ? 0 : 1 }}>▌</span>
              </div>
              <div style={{ position: "absolute", left: 30, bottom: 16, color: t3.colors.termDim, fontSize: 20 }}>  ? for shortcuts</div>
            </div>

            {/* what it does, one line per beat */}
            <div style={{ position: "absolute", top: 300, left: 1360, width: 500, display: "flex", flexDirection: "column", gap: 44 }}>
              {SAY.map((s, i) => (
                <Pop key={s} delay={says[i]} tilt={[-2, 1.5, -1.5][i]} style={{ transformOrigin: "left center" }}>
                  <div style={{ fontFamily: t3.fonts.display, fontWeight: 700, fontSize: 76, lineHeight: 1.02, color: i === 2 ? t3.colors.hero : t3.colors.ink }}>{s}</div>
                </Pop>
              ))}
            </div>
          </AbsoluteFill>
        </Punch>
      </Cut>
      <Post />
    </AbsoluteFill>
  );
};
