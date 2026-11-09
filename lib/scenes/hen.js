import { W, hash, clamp, lerp, ease, blink } from '../pixels.js';

// E: Hatch — a hen on a nest. Prompt = grain, tool call = a cluck, turn end = an egg.
// Plain egg (nothing) / blue egg (FEATURE) / golden egg (CLIENT) / a chick (A LIFE).
const PE = {
  skyT: '#bfe6f5', sky: '#ffeec7', sun: '#ffd23f', barn: '#d9534a', barnD: '#b03e38', roof: '#7a4a3a', door: '#fff3da',
  ground: '#b9dc7a', groundD: '#97c25e', straw: '#f2cf63', strawD: '#d1a83c',
  hen: '#c8693a', henD: '#9c4a26', henL: '#f0c9a0', comb: '#e5484d', beak: '#ffa630', ink: '#3b2a20',
  egg: '#fff8ec', eggS: '#e6d9c3', blue: '#8fd0e8', blueD: '#5aa6c4', gold: '#ffd23f', goldD: '#e0a21a', goldL: '#fff2a8',
  chick: '#ffe14d', yolk: '#ffb52e', heart: '#ff5c8a', white: '#ffffff', band: '#5a3a26', basket: '#c68b4e', basketD: '#8e5b2c', hot: '#ff8a7a',
};
const SCENE_E = (() => {
  const P = PE;
  const M = { r: P.comb, h: P.hen, o: P.beak, k: P.ink, t: P.henD, c: P.henL };
  const HEN = ['..rr......', '.rhhh.....', 'ohkhhhhh..', '.rhhhhhhht', '..hhhhhhtt', '..chhhhhht', '...cccchh.'];
  const LEGS = ['...o..o...', '..oo.oo...'];
  const CHICK = ['.yyy..', 'ykyyo.', 'yyyy..', 'yyyyy.', '.yyy..', '.o.o..'];
  const EGGC = { none: [P.egg, P.eggS], feature: [P.blue, P.blueD], client: [P.gold, P.goldD] };
  const LABEL = { none: ['EGG', P.eggS], feature: ['FEATURE', P.blue], client: ['CLIENT', P.gold], life: ['A LIFE', P.chick] };

  function yard(b, t, kept) {
    for (let y = 0; y < 13; y++) b.rect(0, y, W, 1, y < 6 ? P.skyT : P.sky);
    b.disc(7, 13, 3.2, P.sun);
    // barn
    for (let k = 0; k < 4; k++) b.rect(34 - k, 3 + k, 2 + k * 2, 1, P.roof);
    b.rect(30, 7, 10, 6, P.barn); b.rect(30, 7, 1, 6, P.barnD); b.rect(34, 9, 3, 4, P.door);
    b.rect(0, 13, W, 7, P.ground); for (let x = 0; x < W; x++) for (let y = 14; y < 20; y++) if (hash(x * 71 + y * 113) > 0.88) b.set(x, y, P.groundD);
    // basket with what you kept
    b.rect(2, 16, 7, 3, P.basket); b.rect(3, 19, 5, 1, P.basketD); b.rect(2, 16, 7, 1, P.basketD);
    kept.slice(-3).forEach((o, k) => { const c = o === 'life' ? P.chick : EGGC[o][0]; b.rect(3 + k * 2, 14, 2, 2, c); });
  }
  const nestBack = b => { b.rect(14, 14, 13, 1, P.straw); };
  const nestFront = b => { b.rect(13, 15, 15, 1, P.straw); b.rect(14, 16, 13, 1, P.strawD); for (const x of [15, 19, 24]) b.set(x, 15, P.strawD); b.set(12, 14, P.straw); b.set(28, 14, P.straw); };
  const hen = (b, x, y, stand, flip) => { b.spr(HEN, x, y, M, flip); if (stand) b.spr(LEGS, x, y + 7, M, flip); };
  function egg(b, x, y, o, cracked) {
    const [c, s] = EGGC[o] || EGGC.none;
    b.spr(['.eee.', 'eeeee', 'eeeee', 'eeees', 'eeess', '.sss.'], x, y, { e: c, s });
    if (o === 'feature') for (const [dx, dy] of [[1, 1], [3, 2], [2, 4]]) b.set(x + dx, y + dy, P.blueD);
    if (o === 'client') { b.set(x + 1, y + 1, P.goldL); b.set(x + 1, y + 2, P.goldL); }
    if (cracked) { for (const [dx, dy] of [[0, 2], [1, 3], [2, 2], [3, 3], [4, 2]]) b.set(x + dx, y + dy, P.ink); b.rect(x + 1, y + 6, 4, 1, P.yolk); b.set(x + 5, y + 7, P.yolk); }
  }
  function sparkle(b, x, y, on, c) { if (!on) return; b.set(x, y, c); b.set(x - 1, y, c); b.set(x + 1, y, c); b.set(x, y - 1, c); b.set(x, y + 1, c); }
  function band(b, text, color, e, from) {
    if (e < from) return;
    b.rect(0, 13, W, 7, P.band);
    if (e > from + 400 || blink(e - from, 200)) b.textC(text, 14, color);
  }
  return {
    id: 'e', palette: P, keeps: o => ['none', 'feature', 'client', 'life'].includes(o),
    draw(b, st, now) {
      const e = now - st.t0, o = st.outcome;
      yard(b, now, st.kept); nestBack(b);
      if (st.phase === 'idle') {
        nestFront(b); hen(b, 19 + ((now % 2600) < 300 ? 1 : 0), 7, true, false);
      } else if (st.phase === 'start') {
        for (let k = 0; k < 4; k++) { const y = Math.min(17, Math.round(e / 30) - 3 + k * 2); if (y >= 0) b.set(9 + k * 2, y, P.goldD); }
        const p = ease((e - 300) / 700);
        hen(b, Math.round(lerp(19, 15, p)), e > 900 ? 8 : 7, e <= 900, false); nestFront(b);
      } else if (st.phase === 'work') {
        let up = (e % 1800) < 250 ? 1 : 0, cluck = false;
        for (const p of st.pulses) { const a = now - p; if (a >= 0 && a < 420) { up = 1; cluck = true; if (a > 100) b.set(26 + Math.floor(a / 100), 6 - Math.floor(a / 100), P.henL); } }
        hen(b, 15, 8 - up, false, false); nestFront(b);
        if (cluck) { b.set(13, 8, P.ink); b.set(12, 7, P.ink); b.set(13, 11, P.ink); }
      } else if (st.phase === 'reveal') {
        if (e < 400) { hen(b, 15 + (blink(e, 100) ? 1 : 0), 8, false, false); nestFront(b); }
        else {
          hen(b, Math.round(lerp(15, 27, ease((e - 400) / 600))), 7, true, e < 1000);
          nestFront(b);
          const y = Math.round(lerp(10, 3, ease((e - 400) / 600)));
          if (o === 'life') { b.spr(CHICK, 18, y, { y: P.chick, k: P.ink, o: P.beak }); b.spr(['e...e', 'eeeee', '.eee.'], 18, 12, { e: P.egg }); }
          else egg(b, 18, y, o, false);
          if (o !== 'none' && e > 1000) { const c = o === 'life' ? P.heart : P.white; sparkle(b, 12, 4, blink(e, 260), c); sparkle(b, 27, 2, !blink(e, 260), c); }
          if (o === 'life' && e > 1000) b.spr(['.h.h.', 'hhhhh', '.hhh.', '..h..'], 24, 5 - (Math.floor(e / 250) % 3), { h: P.heart });
        }
        const [txt, col] = LABEL[o]; band(b, txt, col, e, 1000);
      } else if (st.phase === 'abort') {
        nestFront(b);
        const p = clamp(e / 900, 0, 1);
        hen(b, Math.round(lerp(15, -12, p)), Math.round(lerp(8, -4, p)), true, false);
        if (p < 1 && blink(e, 100)) { const hx = Math.round(lerp(15, -12, p)), hy = Math.round(lerp(8, -4, p)); b.rect(hx + 4, hy - 1, 3, 1, P.henD); }
        for (let k = 0; k < 3; k++) { const y = 4 + Math.floor(e / 160) + k * 2; if (y < 14) b.set(15 + k * 4 + (Math.floor(e / 300) % 2), y, P.henL); }
        band(b, 'FLEW OFF', P.white, e, 700);
      } else if (st.phase === 'error') {
        hen(b, 27, 7, true, false); nestFront(b);
        egg(b, 18, 5, 'none', true);
        band(b, 'CRACKED', P.hot, e, 500);
      }
    },
  };
})();

export const PALETTE = PE;
export default SCENE_E;
