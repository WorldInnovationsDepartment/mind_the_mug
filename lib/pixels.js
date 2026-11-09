// Mind the Mug — the shared pixel engine (lib/pixels.js)
//
// Pure ESM, zero dependencies. A 40 x 20 pixel buffer (the band sprite: 40
// columns x 10 rows of half-block cells), a 5 px tall font and the small maths
// helpers every scene in lib/scenes/ draws with. Pixels are "#rrggbb"
// strings, so a buffer maps straight onto half-block cells (lib/show.js).

export const W = 40, H = 20;

export class Buf {
  constructor() { this.p = new Array(W * H).fill('#000000'); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && x < W && y >= 0 && y < H) this.p[y * W + x] = c; }
  get(x, y) { return this.p[y * W + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  // rows: array of strings; '.' is transparent; map: char -> colour
  spr(rows, x, y, map, flip = false) {
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const ch = flip ? r[r.length - 1 - i] : r[i];
        if (ch !== '.' && map[ch]) this.set(x + i, y + j, map[ch]);
      }
    }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // quadratic bezier, sampled densely
  curve(x0, y0, cx, cy, x1, y1, c) {
    const n = 48;
    for (let k = 0; k <= n; k++) {
      const t = k / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
      this.set(a * x0 + b * cx + d * x1, a * y0 + b * cy + d * y1, c);
    }
  }
  disc(cx, cy, r, c) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) this.set(x, y, c);
  }
  // glyphs are 3 px wide, except M and W (5 px: at 3 px they read as H); 1 px between letters
  text(s, x, y, c) {
    let cx = x;
    for (const ch of s) {
      const g = FONT[ch] || FONT[' '];
      const w = g[0].length;
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) if (g[j][i] === '#') this.set(cx + i, y + j, c);
      cx += w + 1;
    }
  }
  textW(s) { let w = -1; for (const ch of s) w += (FONT[ch] || FONT[' '])[0].length + 1; return w; }
  textC(s, y, c) { this.text(s, Math.floor((W - this.textW(s)) / 2), y, c); }
}

export const FONT = {
  'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
  'C': ['.##', '#..', '#..', '#..', '.##'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'],
  'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
  'G': ['.##', '#..', '#.#', '#.#', '.##'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'],
  'I': ['###', '.#.', '.#.', '.#.', '###'], 'K': ['#.#', '#.#', '##.', '#.#', '#.#'],
  'L': ['#..', '#..', '#..', '#..', '###'], 'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  'N': ['##.', '#.#', '#.#', '#.#', '#.#'], 'O': ['.#.', '#.#', '#.#', '#.#', '.#.'],
  'P': ['##.', '#.#', '##.', '#..', '#..'], 'Q': ['.#.', '#.#', '#.#', '##.', '.##'],
  'R': ['##.', '#.#', '##.', '#.#', '#.#'], 'S': ['.##', '#..', '.#.', '..#', '##.'],
  'T': ['###', '.#.', '.#.', '.#.', '.#.'], 'U': ['#.#', '#.#', '#.#', '#.#', '###'],
  'W': ['#...#', '#...#', '#.#.#', '##.##', '#...#'], 'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], ' ': ['...', '...', '...', '...', '...'],
};

// deterministic hash noise in [0,1)
export function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const blink = (e, ms) => Math.floor(e / ms) % 2 === 0;

// filled ellipse in box (x, y, w, h); colour chosen per row by fn(j)
export function ellipse(b, x, y, w, h, colorAt) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (i + 0.5 - w / 2) / (w / 2), dy = (j + 0.5 - h / 2) / (h / 2);
    if (dx * dx + dy * dy <= 1.0) b.set(x + i, y + j, colorAt(i, j));
  }
}

// Phase timing shared by every scene (ms)
export const T = { start: 1000, reveal: 4400, fail: 2800 };
