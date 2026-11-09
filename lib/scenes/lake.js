import { W, clamp, lerp, ease, blink, ellipse } from '../pixels.js';

// A: Catch of the Day — a lake above the prompt. Prompt = cast, tool call = nibble,
// turn end = reel in. Boot (nothing) / perch (FEATURE) / salmon (CLIENT) / life ring (A LIFE).
const PA = {
  skyT: '#8fd3f4', sky: '#b3e3f7', haze: '#daf2fb', cloud: '#ffffff', cloudS: '#e1eff6',
  sun: '#ffe066', sunD: '#ff9f43', dusk1: '#ff9e7a', dusk2: '#ffbf8a', dusk3: '#ffe0ae',
  hill: '#86cba8', hillDusk: '#c98f8a', tree: '#4fa884', treeD: '#2f7d62',
  water: '#3bb0c9', waterL: '#8adcea', waterDusk: '#e39a7f', deep: '#2a8fae', deeper: '#1f7395', shadow: '#165a76',
  wood: '#b07a47', woodL: '#d6a066', woodD: '#7a5230', rod: '#9c5a2e', reel: '#a7b4bd', line: '#56656e',
  red: '#e8483a', white: '#ffffff', ink: '#24343c', reed: '#5e9e3a', cat: '#8a5a2b',
  pail: '#a7b4bd', pailD: '#7d8a93',
  fish: '#ffb547', fishS: '#e07b2e', fishB: '#ffe29a', salm: '#f28c7b', salmS: '#d9665a', salmB: '#ffd6c8',
  boot: '#6b4a33', bootS: '#3b2a20', bootL: '#9a7354', band: '#1f4e5f', grey: '#c9d6df',
};

const SCENE_A = (() => {
  const P = PA, TIPX = 15, BX = 26, WY = 9;

  function scenery(b, t, sunset, kept, shakeReeds) {
    const sky = sunset ? [P.dusk1, P.dusk2, P.dusk3] : [P.skyT, P.sky, P.haze];
    for (let y = 0; y < 9; y++) b.rect(0, y, W, 1, y < 3 ? sky[0] : y < 6 ? sky[1] : sky[2]);
    b.disc(33.5, sunset ? 6.6 : 3.4, 2.6, sunset ? P.sunD : P.sun);
    const cx = Math.floor(t / 700) % 56 - 12;
    b.spr(['..ww....', '.wwwww..', 'wwwwwwww', '.ssssss.'], cx, 1, { w: P.cloud, s: P.cloudS });
    for (let x = 0; x < W; x++) {
      const top = 7 - ((Math.sin(x * 0.45) + Math.sin(x * 0.17 + 2)) > 0.9 ? 1 : 0);
      b.rect(x, top, 1, 9 - top, sunset ? P.hillDusk : P.hill);
    }
    for (const tx of [3, 4, 10, 11, 12, 19, 24, 25, 30]) { b.set(tx, 7, sunset ? P.treeD : P.tree); b.set(tx, 8, P.treeD); }
    // water
    b.rect(0, 9, W, 3, sunset ? P.waterDusk : P.water); b.rect(0, 12, W, 4, P.deep); b.rect(0, 16, W, 4, P.deeper);
    for (const [y, sp, c] of [[10, 260, sunset ? P.dusk3 : P.waterL], [12, 340, P.water], [14, 420, P.water], [17, 520, P.deep]])
      for (let k = 0; k < 5; k++) b.rect(((k * 11 + y * 7 + Math.floor(t / sp)) % 48) - 4, y, 2 + (k % 2), 1, c);
    if (sunset) for (let y = 9; y < 13; y++) b.set(33 + ((y + Math.floor(t / 200)) % 3) - 1, y, P.sunD);
    // reeds on the right
    for (const [x, top, cat] of [[33, 8, 0], [35, 4, 1], [37, 6, 1], [39, 5, 0]]) {
      const sway = shakeReeds ? (Math.floor(t / 90 + x) % 2) : (Math.floor(t / 1300 + x) % 2);
      for (let y = top; y <= 13; y++) b.set(x - (y < top + 2 ? sway : 0), y, P.reed);
      if (cat) { b.set(x - sway, top, P.cat); b.set(x - sway, top + 1, P.cat); }
    }
    // dock, bucket (with whatever you kept), reel
    b.rect(0, 9, 9, 1, P.woodL); b.rect(0, 10, 9, 1, P.wood); b.rect(1, 11, 1, 3, P.woodD); b.rect(7, 11, 1, 3, P.woodD);
    const tails = kept.slice(-3);
    tails.forEach((o, k) => { const c = o === 'client' ? P.salm : o === 'life' ? P.red : P.fish; b.set(1 + k, 5 - (k % 2), c); b.set(1 + k, 6 - (k % 2), c); });
    b.set(0, 5, P.pailD); b.set(5, 5, P.pailD); b.rect(1, 6, 4, 1, P.pailD); b.rect(1, 7, 4, 2, P.pail); b.set(4, 7, P.pailD); b.set(4, 8, P.pailD);
  }

  const rod = (b, tipY) => { b.rect(6, 7, 2, 2, P.reel); b.line(5, 9, TIPX, tipY, P.rod); };

  function bobber(b, x, wy, dip) { // wy: waterline row; dip 0 floating, 1 dipped, 2 under
    if (dip >= 2) { b.set(x, wy, P.ink); return [x, wy]; }
    b.set(x, wy - 2 + dip, P.ink); b.rect(x - 1, wy - 1 + dip, 3, 1, P.red);
    if (dip === 0) b.rect(x - 1, wy, 3, 1, P.white);
    return [x, wy - 2 + dip];
  }
  const lineTo = (b, tipY, x, y) => b.curve(TIPX, tipY, (TIPX + x) / 2 + 1, Math.max(tipY, y) + 1, x, y, P.line);

  function ripple(b, x, age) {
    if (age < 0 || age > 900) return;
    const r = 2 + Math.floor(age / 150);
    for (const dx of [-r - 1, -r, r, r + 1]) b.set(x + dx, 10, P.waterL);
  }
  function splash(b, x, wy, a) {
    if (a < 0 || a > 420) return;
    const h = a < 140 ? 1 : a < 280 ? 2 : 1;
    for (const [dx, dy] of [[-2, 0], [2, 0], [-1, -1], [1, -1], [0, -2]]) b.set(x + dx * (a < 200 ? 1 : 1.5), wy - 1 - h + dy, P.white);
  }
  function sparkle(b, x, y, on, c) { if (!on) return; b.set(x, y, c); b.set(x - 1, y, c); b.set(x + 1, y, c); b.set(x, y - 1, c); b.set(x, y + 1, c); }

  // catch sprites, positioned by their attachment point (ax, ay)
  function fish(b, x, y, w, h, back, belly, stripe, tail, spots) {
    ellipse(b, x, y, w, h, (i, j) => (j < h / 2 ? back : belly));
    for (const sx of spots) for (let j = 1; j < h - 1; j++) b.set(x + sx, y + j, stripe);
    b.set(x + 1, y + Math.floor(h / 2) - 1, P.ink);
    const cy = y + Math.floor(h / 2);
    for (let k = 0; k < (h > 5 ? 3 : 2); k++) { b.set(x + w + k, cy - k - 1, tail); b.set(x + w + k, cy + k + 1, tail); if (k === 0) b.set(x + w, cy, tail); }
  }
  function drawCatch(b, o, ax, ay) {
    if (o === 'feature') fish(b, ax, ay - 2, 9, 5, P.fish, P.fishB, P.fishS, P.fishS, [3, 6]);
    else if (o === 'client') fish(b, ax, ay - 3, 14, 7, P.salm, P.salmB, P.salmS, P.salmS, [5, 9]);
    else if (o === 'life') {
      for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
        const dx = i + 0.5 - 5, dy = j + 0.5 - 5, d = Math.hypot(dx, dy);
        if (d <= 5 && d >= 2.3) {
          const seg = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 2) + 0.5) % 2;
          b.set(ax - 5 + i, ay + j, seg ? P.white : P.red);
        }
      }
    } else b.spr(['..bbb...', '..blb...', '..bbb...', '..blb...', '..bbbb..', '..bbbbbb', '.bbbbbbb', '.sssssss'], ax - 3, ay, { b: P.boot, l: P.bootL, s: P.bootS });
  }
  const LABEL = { none: ['BOOT', P.grey], feature: ['FEATURE', P.fish], client: ['CLIENT', P.salm], life: ['A LIFE', P.sun] };
  function band(b, text, color, e, from) {
    if (e < from) return;
    b.rect(0, 13, W, 7, P.band);
    if (e > from + 400 || blink(e - from, 200)) b.textC(text, 14, color);
  }

  return {
    id: 'a', palette: P,
    keeps: o => o === 'feature' || o === 'client' || o === 'life',
    draw(b, st, now) {
      const e = now - st.t0, o = st.outcome;
      const sunset = st.phase === 'reveal' && o === 'life' && e > 300;
      scenery(b, now, sunset, st.kept, st.phase === 'error' && e < 1200);

      if (st.phase === 'idle') {
        rod(b, 1);
        const sw = Math.floor(now / 1100) % 2;
        b.line(TIPX, 1, TIPX + sw, 4, P.line);
        b.set(TIPX + sw, 4, P.ink); b.rect(TIPX - 1 + sw, 5, 3, 1, P.red); b.rect(TIPX - 1 + sw, 6, 3, 1, P.white);
      } else if (st.phase === 'start') {
        rod(b, 1);
        const p = clamp(e / 700, 0, 1);
        if (p < 1) {
          const x = Math.round(lerp(TIPX, BX, p)), y = Math.round(lerp(5, WY, p) - 6 * Math.sin(Math.PI * p));
          b.line(TIPX, 1, x, y - 1, P.line);
          b.set(x, y - 1, P.ink); b.rect(x - 1, y, 3, 1, P.red); b.rect(x - 1, y + 1, 3, 1, P.white);
        } else {
          ripple(b, BX, e - 700); splash(b, BX, WY, e - 700);
          const [x, y] = bobber(b, BX, WY, 0); lineTo(b, 1, x, y);
        }
      } else if (st.phase === 'work') {
        let dip = (e % 2200) < 260 ? 1 : 0, tip = 1;
        ripple(b, BX, e % 2600);
        for (const p of st.pulses) {
          const a = now - p;
          if (a >= 0 && a < 560) { dip = a < 140 ? 1 : a < 300 ? 2 : a < 440 ? 1 : 0; tip = a < 440 ? 2 : 1; }
          ripple(b, BX, a - 140);
        }
        const sx = 19 + Math.round(5 * Math.sin(e / 1500)), dir = Math.cos(e / 1500) > 0;
        b.spr(['.ss..', 'sssss', '.ss..'], sx, 14, { s: P.shadow }, !dir);
        const [x, y] = bobber(b, BX, WY, dip); rod(b, tip); lineTo(b, tip, x, y);
      } else if (st.phase === 'reveal') {
        if (e < 300) {
          ripple(b, BX, e); rod(b, 2);
          const [x, y] = bobber(b, BX, WY, 2); lineTo(b, 2, x, y);
        } else {
          const p = ease((e - 300) / 600);
          const sway = e > 900 ? Math.floor(e / 520) % 2 : 0;
          const ax = Math.round(lerp(BX, 18, p)) + sway, ay = Math.round(lerp(WY + 1, o === 'none' || o === 'life' ? 3 : 4, p));
          ripple(b, BX, e - 300); splash(b, BX, WY, e - 300);
          rod(b, 2);
          b.line(TIPX, 2, ax, ay, P.line);
          drawCatch(b, o, ax, ay);
          if (o !== 'none' && e > 900) {
            const c = o === 'life' ? P.white : P.sun;
            sparkle(b, 38, 1, blink(e, 260), c); sparkle(b, 12, 8, !blink(e, 260), c); sparkle(b, 28, 10, blink(e + 130, 260), c);
          }
          const [txt, col] = LABEL[o]; band(b, txt, col, e, 900);
        }
      } else if (st.phase === 'abort') {
        rod(b, 1);
        b.line(TIPX, 1, TIPX + 1, 5, P.line);
        if (e < 200) b.set(TIPX + 2, 3, P.white);
        const bx = BX + Math.floor(e / 240);
        if (bx < 42) bobber(b, bx, WY, (e % 1400) < 220 ? 1 : 0);
        ripple(b, BX, e);
        if (e > 250 && e < 900) { b.spr(['f.f', '.f.', '.f.'], BX + 5, 6 + (e > 600 ? 1 : 0), { f: P.fish }); splash(b, BX + 6, WY, e - 600); }
        band(b, 'GOT AWAY', P.white, e, 700);
      } else if (st.phase === 'error') {
        rod(b, 2);
        b.curve(TIPX, 2, 27, 2, 35, 6, P.line);
        for (const [x, y] of [[34, 6], [35, 5], [36, 6], [35, 7], [37, 7], [36, 8], [34, 8]]) b.set(x, y, P.line);
        b.set(36, 9, P.red); b.set(35, 9, P.red);
        band(b, 'SNAGGED', P.red, e, 500);
      }
    },
  };
})();

export const PALETTE = PA;
export default SCENE_A;
