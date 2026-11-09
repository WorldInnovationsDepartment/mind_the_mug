#!/usr/bin/env node
// Mind the Mug — standalone demo player (Node ESM, `/mind-the-mug:demo`).
//
// Plays one showing of a mascot in the terminal (the ask, the taps, what
// comes back, then the resting frame and its words) using the same lib/
// engine the live mod uses, at 10 fps through lib/render-ansi.js. Never
// touches the real record: every run is its own throwaway show.
//
// Usage:
//   node bin/demo.js [mascot] [outcome]        words in any order
//   node bin/demo.js dog life --taps=3
//   node bin/demo.js all                       the resting frame of every mascot
//   node bin/demo.js cat --still               only the resting frame (the default when not a terminal)
//
//   mascot:  cat (default) | dog | hen | lake | oven | random | all
//   outcome: none | feature | client | life | abort | error   (default: rolled at the real odds)

import * as showing from '../lib/show.js';
import { renderAnsi } from '../lib/render-ansi.js';
import { rollOutcome, pickFrom } from '../lib/rng.js';
import { MASCOT_IDS, DEFAULT_MASCOT, findMascot, getMascot } from '../lib/mascots.js';

const OUTCOME_WORDS = { none: 'none', nothing: 'none', lose: 'none', feature: 'feature', client: 'client', life: 'life', abort: 'abort', aborted: 'abort', esc: 'abort', error: 'error' };

function printHelp() {
  process.stdout.write(`demo.js [mascot] [outcome]

  mascot    one of: ${MASCOT_IDS.join(', ')}, random, all (default: ${DEFAULT_MASCOT})
  outcome   one of: none, feature, client, life, abort, error (default: rolled at the real odds)

Flags:
  --taps=<n>         tool calls to play back as taps, 0 to ${showing.TIMINGS.maxTaps} (default 3)
  --fps=<n>          playback frame rate (default 10)
  --seed=<n|string>  seed the roll
  --still            print only the resting frame and its words
  --help, -h         show this help

Renders the same engine the live plugin uses. Never touches the real record.
`);
}

function parseArgs(argv) {
  const args = { mascot: DEFAULT_MASCOT, outcome: null, taps: 3, fps: 10, seed: null, still: !process.stdout.isTTY, help: false };
  for (const raw of argv.flatMap((a) => (a.startsWith('--') ? [a] : a.split(/\s+/))).filter(Boolean)) {
    const word = raw.toLowerCase();
    if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw === '--still') args.still = true;
    else if (raw.startsWith('--taps=')) args.taps = Number(raw.slice(7)) || 0;
    else if (raw.startsWith('--fps=')) args.fps = Number(raw.slice(6)) || 10;
    else if (raw.startsWith('--seed=')) args.seed = raw.slice(7);
    else if (word === 'all' || word === 'random') args.mascot = word;
    else if (findMascot(word)) args.mascot = findMascot(word);
    else if (OUTCOME_WORDS[word]) args.outcome = OUTCOME_WORDS[word];
    else process.stderr.write(`demo: ignoring unrecognized argument ${JSON.stringify(raw)}\n`);
  }
  return args;
}

function buildShow(args, mascot) {
  const seed = args.seed ?? `${Date.now()}:${mascot}`;
  const outcome = args.outcome || rollOutcome(seed);
  const reason = outcome === 'abort' ? 'aborted' : outcome === 'error' ? 'error' : 'answer';
  return showing.createShow({ mascot, outcome, reason, toolCalls: args.taps, kept: ['none', 'feature'], tally: 3, at: 0, durationMs: 42000 });
}

const useTruecolor = () => !/^(0|false)$/i.test(process.env.DEMO_TRUECOLOR || '') && (/truecolor|24bit/i.test(process.env.COLORTERM || '') || !process.env.COLORTERM);

/** The resting frame's words, under the sprite. */
function words(show) {
  const caption = showing.captionLines(show).map((l) => l.text).join('\n');
  return `${caption}\n\n${showing.resultText(show)}\n`;
}

function printStill(show) {
  const truecolor = useTruecolor();
  process.stdout.write(renderAnsi(showing.frame(show, showing.totalMs(show)), { truecolor }) + '\n' + words(show));
}

function playAnimation(show, fps) {
  const intervalMs = Math.max(50, Math.round(1000 / (fps || 10)));
  const truecolor = useTruecolor();
  const endAt = showing.totalMs(show);
  let prevLineCount = 0;
  const draw = (text) => {
    if (prevLineCount > 0) process.stdout.write(`\x1b[${prevLineCount}F\x1b[0J`);
    process.stdout.write(text + '\n');
    prevLineCount = text.split('\n').length;
  };
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    process.stdout.write('\x1b[?25h');
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.stdout.write('\x1b[?25l');
  const t0 = Date.now();
  const timer = setInterval(() => {
    const now = Date.now() - t0;
    draw(renderAnsi(showing.frame(show, now), { truecolor }));
    if (now >= endAt) {
      clearInterval(timer);
      process.stdout.write(words(show));
      cleanup();
    }
  }, intervalMs);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();
  if (args.mascot === 'all') {
    for (const id of MASCOT_IDS) {
      process.stdout.write(`\n${id} · ${getMascot(id).name}\n`);
      printStill(buildShow(args, id));
    }
    return;
  }
  const mascot = args.mascot === 'random' ? pickFrom(args.seed ?? Date.now(), MASCOT_IDS) : args.mascot;
  const show = buildShow(args, mascot);
  if (args.still) return printStill(show);
  playAnimation(show, args.fps);
}

main();
