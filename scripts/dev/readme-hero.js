#!/usr/bin/env node
// Mind the Mug — the README's main picture (scripts/dev/readme-hero.js)
//
// Writes docs/hero.svg: a terminal in which one turn plays on a loop. A
// prompt is typed, Claude makes three tool calls and answers, and then, after
// that last response, the cat shows up above the prompt, taps the shelf once
// per tool call and knocks the mug off, with the reminder beside it.
//
// The mascot, the caption and the turn line are produced by the plugin's own
// code (lib/show.js), so the picture shows exactly what the mod draws: the
// same 40 x 20 pixels at the same 10 frames a second, the same words.
//
// How it is built (zero dependencies, deterministic):
//   - Everything is one SVG. Text sits on a 9 x 20 px character grid and is
//     pinned to it with `textLength`, so it lines up in whatever monospace
//     font the viewer has.
//   - The resting frame of the mascot is drawn in full. Every earlier frame
//     is stored as only the pixels that differ from it, on a film strip that
//     CSS steps through (`steps(1, end)` keyframes); identical frames share
//     one strip position.
//   - Lines of the transcript, the band and the typed prompt are switched by
//     opacity / transform keyframes on the same 16 s clock.
//   - With no animation (reduced motion, or a renderer that ignores CSS
//     animation) the picture is the resting state: the whole turn, the cat
//     sitting next to the fallen mug, the reminder. The loop also starts
//     there, so that is what a page shows first.
//
// Usage:
//   node scripts/dev/readme-hero.js                    -> docs/hero.svg
//   node scripts/dev/readme-hero.js --at=8400 --out=x  -> one frozen moment (ms into the loop), for review

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as showing from '../../lib/show.js';
import { W, H } from '../../lib/pixels.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// --- the turn on screen ------------------------------------------------------

const ASK = 'add rate limiting to /export';
const TOOLS = [
  ['Read', '(src/routes/export.ts)', ''],
  ['Update', '(src/middleware/bucket.ts)', ''],
  ['Bash', '(npm test -- export)', '12 passed'],
];
const ANSWER = ['Added a token bucket in front of /export.', '60 requests a minute per key. Tests pass.'];
const SPINNER = 'Simmering… (esc to interrupt)';

const SHOW = showing.createShow({ mascot: 'cat', outcome: 'none', reason: 'answer', toolCalls: TOOLS.length, tally: 3, at: 0, durationMs: 42000 });

// --- the clock (ms into the loop) --------------------------------------------

const TYPE_MS = 1200; // the prompt is typed
const SEND = 1400; // ... and sent
const TOOL_AT = [1800, 2300, 2800];
const ANSWER_AT = 3400;
const DONE = 3900; // the last response: the mascot's show starts here
const REST = DONE + showing.totalMs(SHOW); // the show has come to rest
const HOLD_MS = 4000; // and is held before the loop starts over
const LOOP = REST + HOLD_MS;

// --- geometry ------------------------------------------------------------------

const CW = 9; // character cell
const LH = 20;
const FONT_PX = 15;
const COLS = 84;
const PAD = 30;
const BAR = 36;
const TOP = BAR + 16;
const ROWS = 25;
const WIDTH = PAD * 2 + COLS * CW;
const HEIGHT = TOP + ROWS * LH + 12;

const ROW = { ask: 0, tools: 2, answer: 6, turn: 9, band: 11, rule1: 21, prompt: 22, rule2: 23, hint: 24 };
const SPRITE_COL = COLS - W; // the sprite is flush right, as in the mod
const CAPTION_END = SPRITE_COL - 2; // two cells of margin, as in the mod

const C = {
  term: '#17151c',
  bar: '#24212b',
  line: '#3a3542',
  text: '#ece8f1',
  dim: '#8d8598',
  green: '#7ee787',
  accent: '#d97757',
  dots: ['#ff5f57', '#febc2e', '#28c840'],
};
const FONT = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace";

const x = (col) => PAD + col * CW;
const y = (row) => TOP + row * LH;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pct = (ms) => `${+((ms / LOOP) * 100).toFixed(4)}%`;

/** One run of text on the grid. Leading spaces move it; it never holds two spaces in a row. */
function text(col, row, str, style = {}) {
  const lead = str.length - str.trimStart().length;
  const body = str.trim();
  if (!body) return '';
  const attrs = [`x="${x(col + lead)}"`, `y="${y(row) + 15}"`, `textLength="${body.length * CW}"`, `fill="${style.fill || C.text}"`];
  if (style.bold) attrs.push('font-weight="700"');
  return `<text ${attrs.join(' ')}>${esc(body)}</text>`;
}

/** Several styled runs, one after another on a row. */
function runs(col, row, parts) {
  let at = col;
  let out = '';
  for (const [str, style] of parts) {
    out += text(at, row, str, style);
    at += str.length;
  }
  return out;
}

/** A filled dot in a character cell: the transcript's record mark. */
const dot = (col, row, fill) => `<circle cx="${x(col) + CW / 2}" cy="${y(row) + LH / 2}" r="3.6" fill="${fill}"/>`;

// --- the mascot: a resting frame, and a film strip of differences ----------------

/** The pixels of `buf` (those that differ from `base`, when given) as one path per colour. */
function pixelPaths(buf, base) {
  const byColour = new Map();
  for (let py = 0; py < H; py++) {
    let start = -1;
    for (let px = 0; px <= W; px++) {
      const c = px < W ? buf.get(px, py) : null;
      const isDrawn = c !== null && (!base || base.get(px, py) !== c);
      const runColour = start >= 0 ? buf.get(start, py) : null;
      if (start >= 0 && (!isDrawn || c !== runColour)) {
        byColour.set(runColour, (byColour.get(runColour) || '') + `M${start} ${py}h${px - start}v1h${start - px}z`);
        start = -1;
      }
      if (isDrawn && start < 0) start = px;
    }
  }
  return [...byColour.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('');
}

function buildStrip() {
  const rest = showing.draw(SHOW, showing.totalMs(SHOW));
  const frames = ['']; // strip position 0 is empty: the resting frame shows through
  const index = new Map([['', 0]]);
  const keys = []; // [ms into the loop, strip position]
  for (let t = 0; t < showing.totalMs(SHOW); t += showing.TIMINGS.tickMs) {
    const paths = pixelPaths(showing.draw(SHOW, t), rest);
    if (!index.has(paths)) {
      index.set(paths, frames.length);
      frames.push(paths);
    }
    const pos = index.get(paths);
    if (!keys.length || keys[keys.length - 1][1] !== pos) keys.push([DONE + t, pos]);
  }
  keys.push([REST, 0]);
  return { rest: pixelPaths(rest, null), frames, keys };
}

// --- the picture -----------------------------------------------------------------

/**
 * @param {{at?: number|null}} [opts] `at`: freeze the loop at this many ms (for review); otherwise it plays.
 * @returns {string} the SVG
 */
export function heroSvg(opts = {}) {
  const strip = buildStrip();
  const caption = showing.captionLines(SHOW);
  const turnLine = showing.resultLine(SHOW).lines[0];
  const style = (s) => ({ fill: s.color || (s.dim ? C.dim : C.text), bold: s.bold });

  // an element that is hidden until `from` (ms), then stays
  const appear = (name, from) => `.${name}{animation-name:${name}}@keyframes ${name}{0%{opacity:0}${pct(from)}{opacity:1}100%{opacity:1}}`;
  const css = [
    `text{font-family:${FONT};font-size:${FONT_PX}px}`,
    `.a{animation-duration:${LOOP}ms;animation-timing-function:steps(1,end);animation-iteration-count:infinite;animation-delay:-${REST}ms}`,
    appear('ask', SEND),
    ...TOOL_AT.map((t, i) => appear(`tool${i}`, t)),
    appear('answer', ANSWER_AT),
    appear('band', DONE),
    `.spin{opacity:0;animation-name:spin}@keyframes spin{0%{opacity:0}${pct(SEND)}{opacity:1}${pct(DONE)}{opacity:0}100%{opacity:0}}`,
    // the typed prompt: a cover (with the cursor on its left edge) steps right one character at a time, then snaps back
    `.type{animation-name:type}@keyframes type{0%{transform:translateX(0);animation-timing-function:steps(${ASK.length},end)}${pct(TYPE_MS)}{transform:translateX(${ASK.length * CW}px)}${pct(SEND)}{transform:translateX(0)}100%{transform:translateX(0)}}`,
    `.strip{animation-name:strip}@keyframes strip{0%{transform:translateX(0)}${strip.keys.map(([t, pos]) => `${pct(t)}{transform:translateX(${-pos * W}px)}`).join('')}100%{transform:translateX(0)}}`,
    `.blink{animation:blink 1100ms steps(1,end) infinite}@keyframes blink{0%{opacity:1}50%{opacity:0}100%{opacity:1}}`,
    opts.at == null ? '@media (prefers-reduced-motion:reduce){.a,.blink{animation:none}}' : `.a{animation-play-state:paused;animation-delay:-${opts.at}ms}.blink{animation:none}`,
  ].join('');

  const bandTop = y(ROW.band);
  const promptX = x(2);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="A terminal. After Claude's answer, a pixel-art cat appears above the prompt, walks its shelf and knocks the mug off. Beside it: Don't delegate your reasoning. Or you'll get a mug.">`,
    `<style>${css}</style>`,
    // the window
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="12" fill="${C.term}" stroke="${C.line}"/>`,
    `<path d="M1 ${BAR}V12.5A11.5 11.5 0 0 1 12.5 1H${WIDTH - 12.5}A11.5 11.5 0 0 1 ${WIDTH - 1} 12.5V${BAR}z" fill="${C.bar}"/>`,
    ...C.dots.map((c, i) => `<circle cx="${22 + i * 20}" cy="${BAR / 2}" r="6" fill="${c}"/>`),
    `<text x="${22 + 3 * 20 + 6}" y="${BAR / 2 + 5}" fill="${C.dim}">~/projects/app · claude</text>`,
    // the transcript
    `<g class="a ask">${runs(0, ROW.ask, [['> ', { fill: C.dim }], [ASK, {}]])}</g>`,
    ...TOOLS.map(([name, args, result], i) => `<g class="a tool${i}">${dot(0, ROW.tools + i, C.green)}${runs(2, ROW.tools + i, [[name, { bold: true }], [args, {}], [result ? `  ${result}` : '', { fill: C.dim }]])}</g>`),
    `<g class="a answer">${dot(0, ROW.answer, C.text)}${ANSWER.map((l, i) => text(2, ROW.answer + i, l)).join('')}</g>`,
    // while Claude works: the spinner, where the band will be
    `<g class="a spin">${runs(0, ROW.band + showing.SPRITE_ROWS - 1, [['✻', { fill: C.accent }], [' ', {}], [SPINNER.split(' ')[0], { fill: C.accent }], [` ${SPINNER.split(' ').slice(1).join(' ')}`, { fill: C.dim }]])}</g>`,
    // after the last response: the turn line, the caption, the mascot
    `<g class="a band">`,
    (() => {
      let col = 0;
      let out = '';
      for (const s of turnLine) {
        out += text(col, ROW.turn, s.text, style(s));
        col += s.text.length;
      }
      return out;
    })(),
    ...caption.map((l, i) => text(CAPTION_END - l.text.length, ROW.band + showing.SPRITE_ROWS - caption.length + i, l.text, style(l))),
    `<svg x="${x(SPRITE_COL)}" y="${bandTop}" width="${W * CW}" height="${showing.SPRITE_ROWS * LH}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges">`,
    strip.rest,
    `<g class="a strip">${strip.frames.map((f, i) => (f ? `<g transform="translate(${i * W} 0)">${f}</g>` : '')).join('')}</g>`,
    `</svg>`,
    `</g>`,
    // the prompt box
    `<path d="M${PAD} ${y(ROW.rule1) + LH / 2}H${WIDTH - PAD}M${PAD} ${y(ROW.rule2) + LH / 2}H${WIDTH - PAD}" stroke="${C.line}"/>`,
    text(0, ROW.prompt, '>', { fill: C.dim }),
    text(2, ROW.prompt, ASK),
    // (the cover is short enough to stay inside the window when it has stepped all the way right)
    `<g class="a type"><rect x="${promptX}" y="${y(ROW.prompt)}" width="${WIDTH - PAD - promptX - ASK.length * CW}" height="${LH}" fill="${C.term}"/><rect class="blink" x="${promptX}" y="${y(ROW.prompt) + 2}" width="${CW - 1}" height="${LH - 4}" fill="${C.text}"/></g>`,
    text(2, ROW.hint, '? for shortcuts', { fill: C.dim }),
    `</svg>`,
  ];
  return parts.join('\n') + '\n';
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
  const out = path.resolve(args.out || path.join(ROOT, 'docs', 'hero.svg'));
  const svg = heroSvg({ at: args.at == null ? null : Number(args.at) });
  fs.writeFileSync(out, svg);
  process.stdout.write(`wrote ${path.relative(ROOT, out)} (${WIDTH} x ${HEIGHT}, ${(svg.length / 1024).toFixed(1)} KB, a ${LOOP / 1000} s loop)\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
