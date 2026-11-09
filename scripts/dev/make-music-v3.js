#!/usr/bin/env node
// Mind the Mug — soundtrack of the mascots launch video (scripts/dev/make-music-v3.js)
//
// Synthesizes the track for art/src/LaunchV3.tsx from code alone (no samples,
// no licensed audio, no network), driven by art/src/timeline-v3.json: the
// tempo, the scene starts, the drop, the final hit and every other hit come
// from that file, so the thuds land when the mugs do, the drop lands on
// "Don't delegate your reasoning.", and the track ends with the picture: the
// loop stops on the end card, resolved to C, and the last sound is the last
// mug landing, ringing out to the final frame."
//
// The sound is daylight, like the video: plucks over a four-chord loop in C,
// a round sine bass, a soft kick and claps, a noise riser into the drop.
//
//   thud   a mug hitting the desk: a short sine drop and a click
//   slam   a headline landing: a big kick, a splash of noise, a chord stab
//   pop    a mascot or a label popping in: a rising blip
//
// Deterministic: a fixed-seed noise generator, so two runs are byte-identical.
//
// Run: node scripts/dev/make-music-v3.js   -> art/public/launch-track-v3.wav

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TIMELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'art', 'src', 'timeline-v3.json'), 'utf8'));
const OUT = path.join(ROOT, 'art', 'public', 'launch-track-v3.wav');

const SAMPLE_RATE = 44100;
const FPS = TIMELINE.fps;
const BEAT = 60 / TIMELINE.bpm;
const BAR = 4 * BEAT;
const DURATION_S = TIMELINE.durationInFrames / FPS;
const N = Math.round(DURATION_S * SAMPLE_RATE);
const L = new Float32Array(N);
const R = new Float32Array(N);
const TAU = Math.PI * 2;

const frameS = (f) => f / FPS;
const startOf = (id) => frameS(TIMELINE.scenes.find((s) => s.id === id).start);
const AGAIN = startOf('again');
const TURN = startOf('turn');
const DROP = frameS(TIMELINE.drop);
const PRODUCT = startOf('product');
const MASCOTS = startOf('mascots');
const CTA = startOf('cta'); // the loop stops here: nothing plays over the end card but its own chord
const FINAL = frameS(TIMELINE.final);

let seed = 0x2f6e2b1;
function noise() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
}

/** Add a mono signal fn(t) over [startS, startS + lenS) with a stereo pan (-1..1). */
function add(startS, lenS, fn, pan = 0, gain = 1) {
  const i0 = Math.max(0, Math.round(startS * SAMPLE_RATE));
  const i1 = Math.min(N, Math.round((startS + lenS) * SAMPLE_RATE));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = i0; i < i1; i++) {
    const v = fn((i - i0) / SAMPLE_RATE);
    L[i] += v * gl;
    R[i] += v * gr;
  }
}

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const tri = (x) => 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1;

// --- instruments -----------------------------------------------------------

const kick = (t) => Math.sin(TAU * (48 * t + (70 / 28) * (1 - Math.exp(-28 * t)))) * Math.exp(-9 * t);
const clap = (t) => noise() * (Math.exp(-38 * t) + 0.6 * Math.exp(-38 * Math.max(0, t - 0.012))) * (t < 0.2 ? 1 : 0);
const hat = (t) => noise() * Math.exp(-90 * t);
const pluck = (midi) => (t) => (tri(hz(midi) * t) * 0.7 + Math.sin(TAU * hz(midi) * 2 * t) * 0.2) * Math.exp(-7 * t) * Math.min(1, t * 400);
const bass = (midi) => (t) => Math.tanh(Math.sin(TAU * hz(midi) * t) * 1.6) * Math.exp(-3.2 * t) * Math.min(1, t * 300);
/** A held note that starts dying away at `hold` seconds, slowly enough to ring to the end. */
const pad = (midi, hold) => (t) => (Math.sin(TAU * hz(midi) * t) + Math.sin(TAU * hz(midi) * 1.004 * t)) * 0.5 * Math.min(1, t * 6) * (t < hold ? 1 : Math.exp(-(t - hold) * 1.5));

const thud = (t) => Math.sin(TAU * (46 * t + (95 / 22) * (1 - Math.exp(-22 * t)))) * Math.exp(-11 * t) + noise() * Math.exp(-160 * t) * 0.5;
const crash = (t) => noise() * Math.exp(-5.5 * t) * Math.min(1, t * 200);
const pop = (t) => Math.sin(TAU * (520 * t + 2600 * t * t)) * Math.exp(-26 * t) * Math.min(1, t * 500);
const riser = (len) => (t) => noise() * Math.pow(t / len, 2.2) * 0.9 + Math.sin(TAU * (180 * t + (520 / (2 * len)) * t * t)) * Math.pow(t / len, 2) * 0.35;

// --- the loop: C, Am, F, G, one bar each -----------------------------------

const CHORDS = [
  { root: 36, notes: [60, 64, 67, 72] },
  { root: 33, notes: [57, 60, 64, 69] },
  { root: 29, notes: [53, 57, 60, 65] },
  { root: 31, notes: [55, 59, 62, 67] },
];
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];

/** How much of the band is playing at `t`: 0 silent .. 1 everything. */
function energyAt(t) {
  if (t >= CTA) return 0;
  if (t >= MASCOTS) return 1;
  if (t >= PRODUCT) return 0.8; // a little room while there is a terminal to read
  if (t >= DROP) return 1;
  if (t >= TURN) return 0.15; // the two facts: almost nothing, and a riser
  if (t >= AGAIN) return 0.7;
  return 0.4;
}

// The progression starts over on the drop and on the end card, so both land on C.
const RESTARTS = [DROP, CTA].map((t) => Math.round(t / BAR));
function chordAt(bar) {
  let from = 0;
  for (const r of RESTARTS) if (bar >= r) from = r;
  return CHORDS[(bar - from) % CHORDS.length];
}

for (let bar = 0; bar * BAR < CTA; bar++) {
  const chord = chordAt(bar);
  for (let step = 0; step < 8; step++) {
    const t = bar * BAR + step * (BEAT / 2);
    const e = energyAt(t);
    if (e === 0) continue;
    const beat = step / 2;
    const onBeat = step % 2 === 0;
    // plucks: eighths, or just the downbeats while the band is held back
    if (e >= 0.4 || step % 4 === 0) add(t, 0.45, pluck(chord.notes[ARP[step]] + (e === 1 ? 12 : 0)), step % 2 ? 0.35 : -0.35, 0.16 * (0.5 + e / 2));
    if (e < 0.4) continue;
    if (onBeat && (e >= 0.7 || beat % 2 === 0)) add(t, 0.4, kick, 0, 0.62);
    if (e >= 0.7 && onBeat && beat % 2 === 1) add(t, 0.2, clap, 0.1, e === 1 ? 0.2 : 0.12);
    if (e >= 0.7 && !onBeat) add(t, 0.06, hat, -0.3, 0.1);
    if (e >= 0.7 && (step === 0 || step === 3 || step === 4 || step === 6)) add(t, 0.42, bass(chord.root + (step === 3 ? 12 : 0)), 0, 0.3);
  }
}

// --- the riser into the drop, and the hits ----------------------------------

add(DROP - 1.5, 1.5, riser(1.5), 0, 0.22);

for (const hit of TIMELINE.hits) {
  const t = frameS(hit.frame);
  if (hit.kind === 'thud') {
    add(t, 0.4, thud, 0, 0.8);
  } else if (hit.kind === 'pop') {
    add(t, 0.2, pop, 0.25, 0.3);
  } else if (hit.kind === 'slam') {
    add(t, 0.5, kick, 0, 0.9);
    add(t, 0.9, crash, 0, 0.22);
    for (const n of [48, 60, 64, 67, 72]) add(t, 0.9, pluck(n), 0, 0.14);
  }
}

// the end card: one held C major chord, three slow plucks down the chord
// while the cat waits, and the last mug: a low C under the thud. Everything
// after that only rings out, and it reaches silence on the final frame.
for (const [i, n] of [48, 55, 60, 64, 67].entries()) add(CTA, DURATION_S - CTA, pad(n, FINAL - CTA + 0.2), (i - 2) * 0.25, 0.07);
[72, 67, 64].forEach((n, i) => add(CTA + (i + 1) * 2 * BEAT, 0.9, pluck(n), i % 2 ? 0.3 : -0.3, 0.13));
add(FINAL, 1.2, bass(36), 0, 0.34);
for (const n of [48, 60, 64, 67]) add(FINAL, 1.4, pluck(n), 0, 0.12);

// --- master: soft clip, normalise, and a short fade so the last sample is zero

let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.3);
  R[i] = Math.tanh(R[i] * 1.3);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;
const fadeN = Math.round(0.6 * SAMPLE_RATE);
for (let i = 0; i < N; i++) {
  const fade = i > N - fadeN ? (N - i) / fadeN : 1;
  L[i] *= norm * fade;
  R[i] *= norm * fade;
}

function encodeWavStereo(l, r, sampleRate) {
  const data = Buffer.alloc(l.length * 4);
  for (let i = 0; i < l.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i])) * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

fs.writeFileSync(OUT, encodeWavStereo(L, R, SAMPLE_RATE));
console.log(`wrote ${path.relative(ROOT, OUT)}: ${DURATION_S.toFixed(2)} s stereo @ ${SAMPLE_RATE} Hz, ${TIMELINE.bpm} BPM, drop at ${DROP.toFixed(2)} s, loop stops at ${CTA.toFixed(2)} s, last hit at ${FINAL.toFixed(2)} s, ${TIMELINE.hits.length} hits`);
