// Mind the Mug — one showing of a mascot (lib/show.js)
//
// Pure ESM, zero dependencies. A "show" is what appears above the prompt
// after the last response of a turn: the mascot plays the whole turn back as
// a short story (you ask, one tap per tool call, then whatever comes back)
// and then rests on its last frame until the next prompt is sent, with the
// reminder beside it: don't delegate your reasoning, or you'll get a mug.
//
//   at                 start   the ask (1.0 s)
//   at + 1.0 s         work    1.2 s + 0.5 s per tap, at most four taps
//   then               reveal  4.4 s, or abort / error for 2.8 s
//   after that         the last frame, held still; nothing left to redraw
//
// A show is plain JSON data and every function here is a pure function of
// (show, now), so the demo, the tests and the live mod agree frame for frame.

import { Buf, W, H, T } from './pixels.js';
import { makeFrame, span } from './frame.js';
import { getMascot, ideaFor } from './mascots.js';

export const SPRITE_COLUMNS = W;
export const SPRITE_ROWS = H / 2;
export const HALF_BLOCK = '▀';

export const TIMINGS = Object.freeze({
  tickMs: 100,
  startMs: T.start,
  workBaseMs: 1200,
  tapEveryMs: 500,
  firstTapMs: 400,
  maxTaps: 4,
  revealMs: T.reveal,
  failMs: T.fail,
});

/** How many past outcomes a scene keeps on display (the bucket, the rack, the pile, the basket). */
export const KEPT_MAX = 4;

const ENDINGS = { answer: 'reveal', refusal: 'reveal', aborted: 'abort', error: 'error' };

/**
 * @typedef {{
 *   mascot: string, outcome: 'none'|'feature'|'client'|'life', ending: 'reveal'|'abort'|'error',
 *   at: number, taps: number, kept: string[], tally: number, durationMs: number,
 * }} Show
 */

/**
 * @param {{mascot: string, outcome?: string, reason?: string, toolCalls?: number, kept?: string[], tally?: number, at: number, durationMs?: number}} input
 * @returns {Show}
 */
export function createShow(input) {
  const taps = Math.max(0, Math.min(TIMINGS.maxTaps, Math.floor(Number(input.toolCalls) || 0)));
  return {
    mascot: getMascot(input.mascot).id,
    outcome: ['feature', 'client', 'life'].includes(input.outcome) ? input.outcome : 'none',
    ending: ENDINGS[input.reason] || 'reveal',
    at: Number(input.at) || 0,
    taps,
    kept: Array.isArray(input.kept) ? input.kept.slice(-KEPT_MAX) : [],
    tally: Math.max(0, Math.floor(Number(input.tally) || 0)),
    durationMs: Math.max(0, Number(input.durationMs) || 0),
  };
}

export function workMs(show) {
  return TIMINGS.workBaseMs + show.taps * TIMINGS.tapEveryMs;
}

function endingMs(show) {
  return show.ending === 'reveal' ? TIMINGS.revealMs : TIMINGS.failMs;
}

/** How long the show moves before it comes to rest. */
export function totalMs(show) {
  return TIMINGS.startMs + workMs(show) + endingMs(show);
}

/** True while there is still something to redraw. */
export function isAnimating(show, now) {
  return now - show.at < totalMs(show);
}

/**
 * Where the show is at `now`: the scene phase, the instant that phase began
 * and the clock the scene should draw with (frozen once the show has come to rest).
 * @returns {{phase: 'start'|'work'|'reveal'|'abort'|'error', t0: number, now: number, isResting: boolean}}
 */
export function stageAt(show, now) {
  const t = Math.max(0, now - show.at);
  if (t < TIMINGS.startMs) return { phase: 'start', t0: show.at, now: show.at + t, isResting: false };
  const workStart = show.at + TIMINGS.startMs;
  const endStart = workStart + workMs(show);
  if (show.at + t < endStart) return { phase: 'work', t0: workStart, now: show.at + t, isResting: false };
  const isResting = t >= totalMs(show);
  return { phase: show.ending, t0: endStart, now: isResting ? endStart + endingMs(show) : show.at + t, isResting };
}

/** The instants of the taps (one per tool call of the turn, capped), as the scenes' `pulses`. */
export function tapTimes(show) {
  const workStart = show.at + TIMINGS.startMs;
  return Array.from({ length: show.taps }, (_, k) => workStart + TIMINGS.firstTapMs + k * TIMINGS.tapEveryMs);
}

/** Draw the show at `now` into a fresh 40 x 20 pixel buffer. */
export function draw(show, now) {
  const stage = stageAt(show, now);
  const b = new Buf();
  getMascot(show.mascot).scene.draw(b, { phase: stage.phase, t0: stage.t0, outcome: show.outcome, pulses: tapTimes(show), kept: show.kept }, stage.now);
  return b;
}

/**
 * Pack a pixel buffer into a Frame of half-block cells: pixel rows 2k and
 * 2k+1 become cell row k of `▀`, coloured top pixel over bottom pixel. Every
 * cell carries both colours, so the terminal paints the whole rectangle.
 * @returns {import('./frame.js').Frame}
 */
export function bufToFrame(b) {
  const frame = makeFrame(W);
  for (let y = 0; y + 1 < H; y += 2) {
    const spans = [];
    let run = 0;
    let top = null;
    let bottom = null;
    for (let x = 0; x < W; x++) {
      const t = b.get(x, y);
      const u = b.get(x, y + 1);
      if (run > 0 && t === top && u === bottom) {
        run++;
        continue;
      }
      if (run > 0) spans.push(span(HALF_BLOCK.repeat(run), { color: top, bg: bottom }));
      top = t;
      bottom = u;
      run = 1;
    }
    spans.push(span(HALF_BLOCK.repeat(run), { color: top, bg: bottom }));
    frame.lines.push(spans);
  }
  return frame;
}

/** The mascot at `now` as a Frame: 10 rows of 40 painted cells. */
export function frame(show, now) {
  return bufToFrame(draw(show, now));
}

/** What came back, in words: the item, or the abort / error line. */
export function outcomeText(show) {
  const m = getMascot(show.mascot);
  if (show.ending === 'abort') return m.abortMsg;
  if (show.ending === 'error') return m.errorMsg;
  return m.item[show.outcome];
}

/** `3s`, `1m 4s`: a duration the way the turn line spells it. */
export function formatDuration(ms) {
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** The transcript's turn line, e.g. `✻ Deliberated for 42s · the mug, again · 3 off the shelf`. */
export function resultText(show) {
  const m = getMascot(show.mascot);
  const tally = show.tally > 0 ? ` · ${m.tally(show.tally)}` : '';
  return `✻ ${m.past} ${formatDuration(show.durationMs)} · ${outcomeText(show)}${tally}`;
}

const ACCENT = '#d97757';

/** The turn line as a one-line Frame. */
export function resultLine(show) {
  const m = getMascot(show.mascot);
  const tally = show.tally > 0 ? ` · ${m.tally(show.tally)}` : '';
  const text = resultText(show);
  const fr = makeFrame(text.length);
  fr.lines.push([
    span('✻ ', { color: ACCENT }),
    span(`${m.past} ${formatDuration(show.durationMs)} · `, { dim: true }),
    span(outcomeText(show), { bold: show.ending === 'reveal' && show.outcome !== 'none' }),
    ...(tally ? [span(tally, { dim: true })] : []),
  ]);
  return fr;
}

/**
 * The words beside the mascot: its name, its line, its lesson and the reminder.
 * @returns {{text: string, bold?: boolean, dim?: boolean, color?: string}[]}
 */
export function captionLines(show) {
  const m = getMascot(show.mascot);
  const idea = ideaFor(show.mascot);
  return [
    { text: `${m.name} · ${outcomeText(show)}`, bold: true },
    { text: m.tag },
    { text: m.lesson[0], dim: true },
    { text: m.lesson[1], dim: true },
    { text: '' },
    { text: idea[0], color: ACCENT },
    { text: idea[1], color: ACCENT, bold: true },
  ];
}

/** The widest caption line, in columns. */
export function captionWidth(show) {
  return Math.max(...captionLines(show).map((l) => l.text.length));
}

/** One line for a band too small for the sprite. */
export function fallbackText(show) {
  const m = getMascot(show.mascot);
  return `✻ ${m.name} · ${outcomeText(show)} · Don't delegate your reasoning, or you'll get ${m.dud}.`;
}

export function fallbackLine(show) {
  const text = fallbackText(show);
  const fr = makeFrame(text.length);
  fr.lines.push([span(text, { color: ACCENT })]);
  return fr;
}
