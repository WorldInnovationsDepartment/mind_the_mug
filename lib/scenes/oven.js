import { W, hash, lerp, ease, blink, T } from '../pixels.js';

// B: Proof — a countertop oven above the prompt. Prompt = tray in, tool call = puff of steam,
// turn end = ding. Plain roll (nothing) / croissant (FEATURE) / cake (CLIENT) / picnic basket (A LIFE).
const PB = {
  wall: '#fff4e2', tile: '#fffaf1', grout: '#f0dcc0', frame: '#d9a873', frameD: '#b9844f',
  sky: '#a9ddf5', skyL: '#d6f0fb', sunny: '#fff2b0', sun: '#ffe066', leaf: '#6dbe6a', leafD: '#3f8e4b', pot: '#d9714e',
  oven: '#9ed9c3', ovenL: '#c9f0e1', ovenS: '#6fbfa3', ovenD: '#3e8c76', chrome: '#e8eef0', chromeD: '#a9b4b8',
  glass: '#4b5258', glassL: '#6c757c', cavity: '#7a4a2a',
  glow1: '#ffb04a', glow2: '#ff8a2a', glow3: '#ffd27a', elem: '#ff5a3d',
  dough: '#fff1d6', crust: '#e3a458', crustD: '#b8742f', crustL: '#f5c77e', burnt: '#4a3226',
  steam: '#d2dce2', smoke: '#9a9a9a', smokeD: '#6e6e6e',
  counter: '#d39b5f', counterL: '#e8b47a', counterD: '#9c6638', ink: '#4a3426',
  red: '#e5484d', white: '#ffffff', pink: '#f7b6c8', pinkD: '#e88aa5', sponge: '#f6d58e', plate: '#e9eef0',
  basket: '#c68b4e', basketD: '#8e5b2c', bell: '#f2c14e', bellD: '#c99a2e', hot: '#ff7a59',
};

const SCENE_B = (() => {
  const P = PB;
  const ITEMS = {
    none: { rows: ['..ccccc..', '.cCCCCCc.', 'cCLCCLCCc', 'cCCCCCCCc', '.ccccccc.'], map: { c: P.crustD, C: P.crust, L: P.crustL } },
    feature: { rows: ['....LLLL....', '..LLcCCcLL..', '.LCCcCCcCCL.', 'LCCCcCCcCCCL', 'CCCc.CC.cCCC', 'cCc......cCc'], map: { c: P.crustD, C: P.crust, L: P.crustL } },
    client: { rows: ['.....r.....', '....PPP....', '...PPPPP...', '...SSSSS...', '.PPPPPPPPP.', '.PdPPdPPdP.', '.SSSSSSSSS.', '.SSSSSSSSS.', 'wwwwwwwwwww'], map: { r: P.red, P: P.pink, d: P.pinkD, S: P.sponge, w: P.plate } },
    life: { rows: ['....hhhh....', '...h....h...', '..h......h..', '.RWRWRWRWRW.', '.WRWRWRWRWR.', 'bbbbbbbbbbbb', 'bBbBbBbBbBbB', '.bbbbbbbbbb.', '..BBBBBBBB..'], map: { h: P.basketD, R: P.red, W: P.white, b: P.basket, B: P.basketD } },
  };
  const MINI = { none: [P.crustL, P.crustL], feature: [P.crust, P.crustD], client: [P.pink, P.sponge], life: [P.red, P.basket] };
  const LABEL = { none: ['ROLL', P.crustL], feature: ['FEATURE', P.glow3], client: ['CLIENT', P.pink], life: ['A LIFE', P.sun] };

  function kitchen(b, t, sunny, kept) {
    b.rect(0, 0, W, 16, P.wall);
    // backsplash tiles
    b.rect(0, 11, W, 5, P.tile);
    for (let x = 0; x < W; x++) b.set(x, 13, P.grout);
    for (let y = 11; y < 16; y++) for (let x = (y < 13 ? 0 : 2); x < W; x += 4) b.set(x, y, P.grout);
    // window to the outside
    b.rect(1, 1, 12, 9, P.frame);
    for (let y = 2; y < 9; y++) b.rect(2, y, 10, 1, sunny ? P.sunny : y < 5 ? P.sky : P.skyL);
    if (!sunny) { b.rect(9, 3, 2, 2, P.sun); }
    b.spr(['.ll.', 'llLl', 'lLll'], 2, 6, { l: P.leaf, L: P.leafD });
    b.rect(7, 2, 1, 7, P.frame); b.rect(2, 5, 10, 1, P.frame);
    b.rect(0, 9, 14, 1, P.frameD);
    b.spr(['.l.', 'lll', 'ppp', '.p.'], 9, 5, { l: P.leafD, p: P.pot });
    if (sunny) for (let k = 0; k < 4; k++) for (let d = 0; d < 3; d++) b.set(13 + k + d, 2 + k * 2 + d, P.glow3);
    // counter
    b.rect(0, 16, W, 1, P.counterL); b.rect(0, 17, W, 3, P.counter); b.rect(0, 17, W, 1, P.counterD);
    b.rect(13, 18, 1, 2, P.counterD); b.rect(27, 18, 1, 2, P.counterD);
    // cooling rack with what came out of the oven
    b.rect(1, 15, 12, 1, P.chromeD); b.set(2, 16, P.chromeD); b.set(11, 16, P.chromeD);
    kept.slice(-3).forEach((o, k) => { const [c1, c2] = MINI[o]; b.rect(2 + k * 4, 13, 3, 1, c1); b.rect(2 + k * 4, 14, 3, 1, c2); });
  }

  function oven(b, st) {
    b.rect(16, 3, 21, 1, P.ovenD); b.rect(16, 14, 21, 1, P.ovenD);
    b.rect(15, 4, 1, 10, P.ovenD); b.rect(37, 4, 1, 10, P.ovenD);
    b.rect(16, 4, 21, 10, P.oven); b.rect(16, 4, 21, 1, P.ovenL); b.rect(36, 5, 1, 9, P.ovenS); b.rect(16, 13, 20, 1, P.ovenS);
    b.rect(17, 15, 2, 1, P.ovenD); b.rect(34, 15, 2, 1, P.ovenD);
    for (const x of [22, 24, 26]) b.set(x, 2, P.chromeD);
    b.rect(19, 5, 11, 1, P.chrome); b.set(18, 5, P.chromeD); b.set(30, 5, P.chromeD);
    // door frame
    b.rect(17, 6, 15, 1, P.chromeD); b.rect(17, 13, 15, 1, P.chromeD); b.rect(17, 6, 1, 8, P.chromeD); b.rect(31, 6, 1, 8, P.chromeD);
    // controls
    b.rect(33, 6, 3, 3, P.chrome); b.set(34, 7, P.chromeD);
    b.rect(33, 10, 3, 1, P.chrome); b.rect(33, 11, 3, 1, P.chromeD);
  }
  const DIAL = [[34, 6], [35, 6], [35, 7], [35, 8], [34, 8], [33, 8], [33, 7], [33, 6]];
  const dial = (b, k) => { const [x, y] = DIAL[((k % 8) + 8) % 8]; b.set(x, y, P.ink); };
  const lamp = (b, c) => b.set(34, 13, c);

  function glassOff(b) {
    b.rect(18, 7, 13, 6, P.glass);
    for (const [x, y] of [[19, 11], [20, 10], [21, 9], [22, 8], [23, 7], [26, 12], [27, 11]]) b.set(x, y, P.glassL);
  }
  function glassOn(b, now, flash) {
    for (let y = 7; y < 13; y++) b.rect(18, y, 13, 1, flash ? P.glow3 : y === 7 || y === 12 ? P.glow2 : P.glow1);
    for (let x = 18; x < 31; x += 2) { b.set(x, 7, P.elem); b.set(x + 1, 12, P.elem); }
    if (!flash) for (let k = 0; k < 3; k++) b.set(19 + Math.floor(hash(Math.floor(now / 300) * 3 + k) * 12), 8 + k, P.glow3);
  }
  // dough on the tray; stage 0..2, browning 0..2
  function dough(b, stage, brown, burnt) {
    b.rect(19, 11, 11, 1, P.chromeD);
    const rows = stage === 0 ? [[21, 10, 7]] : stage === 1 ? [[22, 9, 5], [21, 10, 7]] : [[22, 8, 5], [21, 9, 7], [20, 10, 9]];
    rows.forEach(([x, y, w], i) => {
      const c = burnt ? P.burnt : i === 0 && brown > 0 ? (brown > 1 ? P.crust : P.crustL) : brown > 1 ? P.crustL : P.dough;
      b.rect(x, y, w, 1, c);
    });
  }
  function puff(b, x0, age, c) {
    if (age < 0 || age > 1000) return;
    const k = Math.floor(age / 250), x = x0 + (k % 2);
    b.set(x, 2 - k, c); b.set(x + 1, 2 - k, c);
  }
  function band(b, text, color, e, from) {
    if (e < from) return;
    b.rect(0, 13, W, 7, P.ink);
    if (e > from + 400 || blink(e - from, 200)) b.textC(text, 14, color);
  }
  function sparkle(b, x, y, on, c) { if (!on) return; b.set(x, y, c); b.set(x - 1, y, c); b.set(x + 1, y, c); b.set(x, y - 1, c); b.set(x, y + 1, c); }

  return {
    id: 'b', palette: P,
    keeps: o => o === 'none' || o === 'feature' || o === 'client' || o === 'life',
    draw(b, st, now) {
      const e = now - st.t0, o = st.outcome;
      const sunny = st.phase === 'reveal' && o === 'life' && e > 400;
      kitchen(b, now, sunny, st.kept);
      oven(b, st);

      if (st.phase === 'idle') {
        glassOff(b); b.rect(19, 11, 11, 1, P.chromeD); dial(b, 0); lamp(b, P.ovenD);
      } else if (st.phase === 'start') {
        if (e < 400) { glassOff(b); const dx = Math.round(lerp(-8, 0, e / 400)); b.rect(19, 11, 11, 1, P.chromeD); b.rect(21 + dx, 10, 7, 1, P.dough); }
        else { glassOn(b, now, e < 550); dough(b, 0, 0, false); }
        dial(b, e < 400 ? 0 : 1); lamp(b, e < 400 ? P.ovenD : P.elem);
      } else if (st.phase === 'work') {
        const bake = e + T.start;
        let flash = false;
        for (const p of st.pulses) { const a = now - p; if (a >= 0 && a < 160) flash = true; puff(b, 24, a, P.steam); }
        puff(b, 22, e % 2600, P.steam);
        glassOn(b, now, flash);
        dough(b, bake < 3000 ? 0 : bake < 7000 ? 1 : 2, bake < 5000 ? 0 : bake < 10000 ? 1 : 2, false);
        dial(b, 1 + Math.floor(e / 1200) + st.pulses.length); lamp(b, P.elem);
      } else if (st.phase === 'reveal') {
        dial(b, 0); lamp(b, P.ovenD);
        if (e < 400) { glassOn(b, now, blink(e, 100)); dough(b, 2, 2, false); }
        else { b.rect(18, 7, 13, 6, P.cavity); b.rect(19, 11, 11, 1, P.chromeD); }
        if (e < 1600) {
          b.spr(['.bbb.', 'bbbbb', '..d..'], 32 + (blink(e, 120) ? 0 : 1), 0, { b: P.bell, d: P.bellD });
          if (blink(e, 200)) for (const [x, y] of [[30, 0], [30, 2], [38, 0], [38, 2]]) b.set(x, y, P.bellD);
        }
        if (e >= 400) {
          const it = ITEMS[o], w = it.rows[0].length, h = it.rows.length;
          const p = ease((e - 400) / 600);
          const y = Math.round(lerp(12 - h, 11 - h, p) - p * (h > 6 ? 0 : 3));
          b.spr(it.rows, 24 - Math.floor(w / 2), Math.max(1, y), it.map);
          if (o !== 'none' && e > 1000) {
            const c = o === 'life' ? P.white : P.bell;
            sparkle(b, 15, 2, blink(e, 260), c); sparkle(b, 31, 3, !blink(e, 260), c); sparkle(b, 13, 11, blink(e + 130, 260), c);
          }
        }
        const [txt, col] = LABEL[o]; band(b, txt, col, e, 1000);
      } else if (st.phase === 'abort') {
        b.rect(18, 7, 13, 6, P.cavity);
        dough(b, e < 250 ? 2 : e < 500 ? 1 : 0, 1, false);
        if (e > 200 && e < 900) { const k = Math.floor((e - 200) / 230); b.set(23 + k % 2, 6 - k, P.steam); b.set(25 - k % 2, 6 - k, P.steam); }
        dial(b, 0); lamp(b, P.ovenD);
        band(b, 'IT FELL', P.white, e, 700);
      } else if (st.phase === 'error') {
        for (let y = 7; y < 13; y++) for (let x = 18; x < 31; x++) b.set(x, y, hash(x * 31 + y * 7 + Math.floor(now / 200)) > 0.5 ? P.smoke : P.smokeD);
        dough(b, 2, 2, true);
        for (let k = 0; k < 4; k++) puff(b, 21 + k * 2, (e + k * 260) % 1000, P.smokeD);
        dial(b, 0); lamp(b, blink(e, 200) ? P.red : P.ovenD);
        band(b, 'BURNT', P.hot, e, 500);
      }
    },
  };
})();

export const PALETTE = PB;
export default SCENE_B;
