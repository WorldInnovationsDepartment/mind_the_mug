#!/usr/bin/env node
// Mind the Mug — contact sheet and icon (scripts/dev/contact-sheet.js)
//
// Draws every mascot with the same lib/ engine the mod uses and writes two
// PNGs for human review and for the docs (zero dependencies; node:zlib only):
//
//   docs/mascots.png            one row per mascot: the ask, a tap, then the
//                               resting frame of every outcome (nothing,
//                               FEATURE, CLIENT, A LIFE, interrupted, error)
//   .claude-plugin/icon.png     the default mascot (the cat) waiting on its shelf
//
// Deterministic: the scenes are pure functions of time, so two runs are
// byte-identical.
//
// Usage: node scripts/dev/contact-sheet.js

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as showing from '../../lib/show.js';
import { Buf, W, H } from '../../lib/pixels.js';
import { MASCOT_IDS, MASCOTS, DEFAULT_MASCOT } from '../../lib/mascots.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** An RGB image as a PNG file. */
function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

class Image {
  constructor(width, height, hex) {
    this.width = width;
    this.height = height;
    this.rgb = Buffer.alloc(width * height * 3);
    this.fill(0, 0, width, height, hex);
  }
  fill(x0, y0, w, h, hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.rgb.set([r, g, b], (y * this.width + x) * 3);
  }
  /** Stamp a pixel buffer at (x0, y0), each pixel `scale` wide and tall. */
  stamp(buf, x0, y0, scale) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) this.fill(x0 + x * scale, y0 + y * scale, scale, scale, buf.get(x, y));
  }
  write(file) {
    fs.writeFileSync(file, encodePng(this.width, this.height, this.rgb));
    process.stdout.write(`wrote ${path.relative(ROOT, file)} (${this.width} x ${this.height})\n`);
  }
}

const REST = Number.MAX_SAFE_INTEGER / 4;
const MOMENTS = [
  { outcome: 'none', reason: 'answer', t: 500 },
  { outcome: 'none', reason: 'answer', t: showing.TIMINGS.startMs + showing.TIMINGS.firstTapMs + 250 },
  { outcome: 'none', reason: 'answer', t: REST },
  { outcome: 'feature', reason: 'answer', t: REST },
  { outcome: 'client', reason: 'answer', t: REST },
  { outcome: 'life', reason: 'answer', t: REST },
  { outcome: 'none', reason: 'aborted', t: REST },
  { outcome: 'none', reason: 'error', t: REST },
];

function contactSheet() {
  const scale = 5;
  const pad = 4;
  const img = new Image(MOMENTS.length * (W * scale + pad) + pad, MASCOT_IDS.length * (H * scale + pad) + pad, '#1f2328');
  MASCOT_IDS.forEach((mascot, row) => {
    MOMENTS.forEach((m, col) => {
      const show = showing.createShow({ mascot, outcome: m.outcome, reason: m.reason, toolCalls: 3, kept: ['none', 'feature', 'client'], at: 0 });
      img.stamp(showing.draw(show, m.t), pad + col * (W * scale + pad), pad + row * (H * scale + pad), scale);
    });
  });
  img.write(path.join(ROOT, 'docs', 'mascots.png'));
}

function icon() {
  const scale = 24;
  const size = W * scale;
  const scene = MASCOTS[DEFAULT_MASCOT].scene;
  const buf = new Buf();
  scene.draw(buf, { phase: 'idle', t0: 0, outcome: 'none', pulses: [], kept: [] }, 0);
  const top = Math.floor((size - H * scale) / 2);
  const img = new Image(size, size, buf.get(0, 0));
  img.fill(0, top + H * scale, size, size - top - H * scale, buf.get(0, H - 1));
  img.stamp(buf, 0, top, scale);
  img.write(path.join(ROOT, '.claude-plugin', 'icon.png'));
}

contactSheet();
icon();
