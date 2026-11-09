import { W, hash, clamp, lerp, ease, blink, ellipse } from '../pixels.js';

// C: Fetch — a dog in a sunny yard above the prompt. Prompt = throw, tool call = rustle in the bush,
// turn end = it trots back proud. Sock (nothing) / the ball (FEATURE) / a letter (CLIENT) / the leash (A LIFE).
const PC = {
  sky: '#93d5f5', skyL: '#c4ebfb', cloud: '#ffffff', cloudS: '#e3f2f9', sun: '#ffe066',
  fence: '#ffffff', fenceS: '#d5e2e8', bush: '#46b35f', bushD: '#2f8f4e', bushL: '#7cd47f',
  grass: '#69c55a', grassD: '#4fa845', grassL: '#8fdd72', flowerP: '#ff7aa8', flowerY: '#ffe066',
  dirt: '#a0703f', dog: '#e8a752', dogS: '#c7843a', dogL: '#f7dcae', ear: '#a8622a', ink: '#2b2b33', collar: '#3d7dd8',
  ball: '#e5484d', ballL: '#ff9a9d', white: '#ffffff', grey: '#b9c4cc', stripe: '#3d7dd8',
  leash: '#3d7dd8', clip: '#9aa5ad', squirrel: '#a86a3d', squirrelL: '#d19a6a', heart: '#ff5c8a', mud: '#7a522b',
  band: '#ffffff', bandB: '#d5e2e8', txtGrey: '#7a8590',
};

const SCENE_C = (() => {
  const P = PC;
  const M = { o: P.dog, s: P.dogS, l: P.dogL, e: P.ear, k: P.ink, c: P.collar };
  // sitting, facing left (toward you), 12 x 11; tail drawn separately
  const SIT = [
    '...o..o.....',
    '..oeooeo....',
    '..oooooo....',
    '.okoooooo...',
    'klloooooo...',
    '.lllooooo...',
    '...cccooo...',
    '...llooooo..',
    '...lloooooo.',
    '...llsoooooo',
    '...ll.lloooo',
  ];
  const BLINK = { ...M, k: P.dog };
  // standing, facing left, 14 x 8, two leg frames
  const RUN_TOP = [
    '..o..o........',
    '.oeooeo.......',
    '.okooooo......',
    'kllooooooooooo',
    '.llloooooooooo',
    '...ccsoooooooo',
  ];
  const RUN_A = ['...oo....oo...', '...o......o...'];
  const RUN_B = ['..o..o..o..o..', '.o....oo....o.'];
  const HEAD = ['...o..o.', '..oeooeo', '..oooooo', '.okooooo', 'klloooo.'];
  const ITEM = {
    none: { rows: ['bwb', 'www', 'www', 'www', 'wwww', '.www'], map: { b: P.stripe, w: P.white }, w: 4 },
    feature: { rows: ['.rr.', 'rLrr', 'rrrr', '.rr.'], map: { r: P.ball, L: P.ballL }, w: 4 },
    client: { rows: ['wwwwrr', 'gwwgrr', 'wggwww', 'wwwwww'], map: { w: P.white, g: P.grey, r: P.ball }, w: 6 },
    life: { rows: ['.LLLL.', 'L....L', 'L....L', '.LLLLL', '....Lg'], map: { L: P.leash, g: P.clip }, w: 6 },
  };
  const PILE = {
    none: { rows: ['b.', 'w.', 'ww'], map: { b: P.stripe, w: P.white } },
    feature: { rows: ['rr', 'rr'], map: { r: P.ball } },
    client: { rows: ['www', 'wgw'], map: { w: P.white, g: P.grey } },
    life: { rows: ['LLL', 'L.L', 'LLL'], map: { L: P.leash } },
  };
  const LABEL = { none: ['SOCK', P.txtGrey], feature: ['FEATURE', P.ball], client: ['CLIENT', P.collar], life: ['A LIFE', P.heart] };

  function yard(b, t, kept) {
    for (let y = 0; y < 13; y++) b.rect(0, y, W, 1, y < 5 ? P.sky : P.skyL);
    b.disc(4, 2.6, 2.4, P.sun);
    const cx = Math.floor(t / 650) % 58 - 12;
    b.spr(['..ww....', '.wwwww..', 'wwwwwwww', '.ssssss.'], cx, 1, { w: P.cloud, s: P.cloudS });
    // picket fence
    b.rect(0, 8, 28, 1, P.fence); b.rect(0, 11, 28, 1, P.fence);
    for (let x = 1; x < 28; x += 3) { b.rect(x, 7, 2, 6, P.fence); b.set(x, 6, P.fence); b.rect(x + 1, 7, 1, 6, P.fenceS); }
    // grass
    b.rect(0, 13, W, 7, P.grass); b.rect(0, 13, W, 1, P.grassL);
    for (let x = 0; x < W; x++) for (let y = 14; y < 20; y++) if (hash(x * 57 + y * 131) > 0.86) b.set(x, y, P.grassD);
    for (const [x, y, c] of [[1, 17, P.flowerP], [13, 18, P.flowerY], [22, 15, P.flowerP], [37, 18, P.flowerY]]) b.set(x, y, c);
    // pile of everything it ever brought back
    kept.slice(-4).forEach((o, k) => { const it = PILE[o]; b.spr(it.rows, 22 + k * 4, 20 - it.rows.length, it.map); });
  }
  function bush(b, t, shake) {
    const dx = shake ? (Math.floor(t / 90) % 2) : 0;
    ellipse(b, 27 + dx, 4, 14, 13, (i, j) => (j > 9 ? P.bushD : P.bush));
    for (let k = 0; k < 14; k++) {
      const x = 28 + dx + Math.floor(hash(k * 17 + 3) * 11), y = 5 + Math.floor(hash(k * 29 + 5) * 8);
      if (b.get(x, y) === P.bush) b.set(x, y, P.bushL);
    }
  }
  function sitDog(b, x, y, t, blinkOn, mud) {
    b.spr(SIT, x, y, blinkOn ? BLINK : M);
    const wag = Math.floor(t / 300) % 2;
    for (const [tx, ty] of wag ? [[11, 6], [12, 5], [12, 4]] : [[12, 7], [13, 6], [13, 5]]) b.set(x + tx, y + ty, P.dog);
    if (mud) for (const [mx, my] of [[5, 3], [8, 7], [6, 9], [9, 9], [3, 8]]) b.set(x + mx, y + my, P.mud);
  }
  function runDog(b, x, y, t, flip, mud) {
    b.spr(RUN_TOP, x, y, M, flip);
    b.spr(Math.floor(t / 110) % 2 ? RUN_A : RUN_B, x, y + 6, M, flip);
    const tx = flip ? x - 1 : x + 14;
    b.set(tx, y + 2, P.dog); b.set(tx, y + 3, P.dog);
    if (mud) for (const [mx, my] of [[6, 4], [9, 3], [11, 5]]) b.set(x + (flip ? 13 - mx : mx), y + my, P.mud);
  }
  const item = (b, o, mx, my) => { const it = ITEM[o]; b.spr(it.rows, mx - it.w + 1, my, it.map); };
  function heart(b, x, y) { b.spr(['.h.h.', 'hhhhh', '.hhh.', '..h..'], x, y, { h: P.heart }); }
  function sparkle(b, x, y, on, c) { if (!on) return; b.set(x, y, c); b.set(x - 1, y, c); b.set(x + 1, y, c); b.set(x, y - 1, c); b.set(x, y + 1, c); }
  function band(b, text, color, e, from) {
    if (e < from) return;
    b.rect(0, 0, W, 7, P.band); b.rect(0, 7, W, 1, P.bandB);
    if (e > from + 400 || blink(e - from, 200)) b.textC(text, 1, color);
  }
  const SX = 4, SY = 9; // where the dog sits

  return {
    id: 'c', palette: P,
    keeps: o => o === 'none' || o === 'feature' || o === 'client' || o === 'life',
    draw(b, st, now) {
      const e = now - st.t0, o = st.outcome;
      yard(b, now, st.kept);

      if (st.phase === 'idle') {
        bush(b, now, false);
        sitDog(b, SX, SY, now, (now % 3200) < 160, false);
      } else if (st.phase === 'start') {
        const p = clamp(e / 700, 0, 1);
        if (e < 260) sitDog(b, SX, SY, now * 2, false, false);
        else runDog(b, Math.round(lerp(SX, 30, ease((e - 260) / 740))), 11, now, true, false);
        bush(b, now, e > 850);
        if (p < 1) { const x = Math.round(lerp(-3, 32, p)), y = Math.round(11 - 10 * Math.sin(Math.PI * p)); b.spr(ITEM.feature.rows, x, y, ITEM.feature.map); }
      } else if (st.phase === 'work') {
        let shake = (e % 1800) < 360, bang = false;
        for (const p of st.pulses) { const a = now - p; if (a >= 0 && a < 520) { shake = true; bang = true; } }
        // tail sticking out of the bush, wagging
        const wag = Math.floor(now / 200) % 2;
        b.set(26, 12, P.dog); b.set(25, wag ? 11 : 13, P.dog); b.set(24, wag ? 10 : 13, P.dog);
        // feet under the bush
        b.rect(29, 17, 1, 2, P.dog); b.rect(31, 17, 1, 2, P.dog); b.rect(35, 17, 1, 2, P.dog); b.rect(37, 17, 1, 2, P.dog);
        bush(b, now, shake);
        // dirt flicks out of the bush while it digs
        const d = e % 1800;
        if (d < 600) for (let k = 0; k < 3; k++) b.set(26 - Math.floor(d / 70) - k * 2, 14 - Math.round(3 * Math.sin(Math.PI * d / 600)) + k, P.dirt);
        // now and then it peeks out
        if (e % 7000 > 5600 && e % 7000 < 6500) b.spr(HEAD, 29, 1, M);
        if (bang) { b.text('!', 34, 0, P.ink); for (let k = 0; k < 3; k++) b.set(29 - k * 2, 5 - k, P.bushL); }
      } else if (st.phase === 'reveal' || st.phase === 'error') {
        const mud = st.phase === 'error';
        bush(b, now, e < 300);
        if (e < 300) { b.rect(29, 17, 1, 2, P.dog); b.rect(35, 17, 1, 2, P.dog); }
        else if (e < 1300) {
          const x = Math.round(lerp(26, SX - 1, ease((e - 300) / 1000)));
          runDog(b, x, 11, now, false, mud);
          if (!mud) item(b, o, x + 1, 15);
        } else {
          sitDog(b, SX, SY, now, false, mud);
          if (!mud) item(b, o, SX + 1, SY + 5);
          if (!mud && o !== 'none') {
            const c = o === 'life' ? P.heart : P.sun;
            sparkle(b, 19, 10, blink(e, 260), c); sparkle(b, 2, 10, !blink(e, 260), c);
          }
          if (o === 'life' && !mud) { const k = Math.floor((e - 1300) / 200) % 4; heart(b, SX + 10, 12 - k); }
        }
        if (mud) band(b, 'MUDDY', P.mud, e, 700);
        else { const [txt, col] = LABEL[o]; band(b, txt, col, e, 1300); }
      } else if (st.phase === 'abort') {
        bush(b, now, e < 400);
        const sx = Math.round(lerp(28, -7, clamp(e / 1000, 0, 1)));
        b.spr(['....tt', 'kss.tt', 'sssss.', '.s.s..'], sx, 3, { t: P.squirrelL, s: P.squirrel, k: P.ink });
        if (e > 250) runDog(b, Math.round(lerp(26, -16, clamp((e - 250) / 1250, 0, 1))), 11, now, false, false);
        band(b, 'SQUIRREL', P.squirrel, e, 500);
      }
    },
  };
})();

export const PALETTE = PC;
export default SCENE_C;
