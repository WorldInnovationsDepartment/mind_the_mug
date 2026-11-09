import { W, clamp, lerp, blink } from '../pixels.js';

// D: Shelf Life — a cat on a shelf. Prompt = you ask, tool call = a paw tap,
// turn end = it knocks one thing off. Mug (nothing) / rubber duck (FEATURE) / phone (CLIENT) / plant (A LIFE).
const PD = {
  wall: '#f3e6f7', wallS: '#e7d6ee', shelf: '#d39b5f', shelfD: '#9c6638', desk: '#e0b07a', deskL: '#efc793', deskD: '#b9844f',
  cat: '#3a3540', catL: '#5a5262', white: '#ffffff', eye: '#ffd84a', nose: '#ff8fa8',
  mugB: '#4f8fe0', handle: '#cfd8dd', duck: '#ffd23f', beak: '#ff8a2a', phone: '#2b2b33', screen: '#7fe0c5',
  leaf: '#5fbf6a', pot: '#d9714e', heart: '#ff5c8a', sun: '#ffd84a', band: '#3a3540', z: '#8a7f95', hair: '#8a6a4a', grey: '#d8cfe0', hot: '#ff8a7a',
};
const SCENE_D = (() => {
  const P = PD;
  const M = { k: P.cat, y: P.eye, p: P.nose, w: P.white, t: P.cat };
  const WALK = ['.k.k.......t', '.kkkk......t', '.ykyk......t', '.kkkkkkkkkkk', '..wkkkkkkkk.', '..kkkkkkkkk.'];
  const LEG_A = ['..w.w...k.k.'], LEG_B = ['.w...w.k...k'];
  const SIT_A = ['k...k...', 'kkkkk...', 'kykyk...', 'kkpkk...', '.kwk....', 'kkwkk...', 'kkwkk..t', 'kwkwkttt'];
  const SIT_B = ['k...k...', 'kkkkk...', 'kykyk...', 'kkpkk...', '.kwk....', 'kkwkk...', 'kkwkk.t.', 'kwkwktt.'];
  const LOAF = ['.k..k....', 'kkkkkkkk.', 'kkkkkkkkk'];
  const ITEMS = {
    none: { x: 16, rows: ['bbb.', 'wwwh', 'www.', 'www.'], map: { b: P.mugB, w: P.white, h: P.handle } },
    feature: { x: 22, rows: ['.yy.', 'oyy.', 'yyyy', 'yyyy'], map: { y: P.duck, o: P.beak } },
    client: { x: 28, rows: ['kkk.', 'kck.', 'kck.', 'kkk.'], map: { k: P.phone, c: P.screen } },
    life: { x: 34, rows: ['.g.g', 'ggg.', '.pp.', '.pp.'], map: { g: P.leaf, p: P.pot } },
  };
  const ORDER = ['none', 'feature', 'client', 'life'];
  const LABEL = { none: ['MUG', P.grey], feature: ['FEATURE', P.duck], client: ['CLIENT', P.screen], life: ['A LIFE', P.heart] };

  function room(b) {
    b.rect(0, 0, W, 13, P.wall);
    for (let x = 2; x < W; x += 6) for (let y = 1; y < 13; y += 4) b.set(x + (y % 8 === 1 ? 0 : 3), y, P.wallS);
    b.rect(1, 8, 38, 1, P.shelf);
    for (const x of [4, 35]) { b.set(x, 9, P.shelfD); b.set(x, 10, P.shelfD); b.set(x + (x < 20 ? 1 : -1), 9, P.shelfD); }
    b.rect(0, 13, W, 1, P.deskL); b.rect(0, 14, W, 6, P.desk); b.rect(0, 16, W, 1, P.deskD); b.rect(19, 17, 2, 1, P.deskD);
  }
  const item = (b, o, dy = 0, y0 = 4) => { const it = ITEMS[o]; b.spr(it.rows, it.x, y0 + dy, it.map); };
  function walkCat(b, x, t, right) { b.spr(WALK, x, 1, M, right); b.spr(Math.floor(t / 130) % 2 ? LEG_A : LEG_B, x, 7, M, right); }
  const sitCat = (b, x, t) => b.spr(Math.floor(t / 700) % 2 ? SIT_A : SIT_B, x, 0, M);
  function sparkle(b, x, y, on, c) { if (!on) return; b.set(x, y, c); b.set(x - 1, y, c); b.set(x + 1, y, c); b.set(x, y - 1, c); b.set(x, y + 1, c); }
  function band(b, text, color, e, from) {
    if (e < from) return;
    b.rect(0, 13, W, 7, P.band);
    if (e > from + 400 || blink(e - from, 200)) b.textC(text, 14, color);
  }
  const tri = e => { const p = (e % 7000) / 3500; return p < 1 ? p : 2 - p; };

  return {
    id: 'd', palette: P, keeps: () => false,
    draw(b, st, now) {
      const e = now - st.t0, o = st.outcome;
      room(b);
      if (st.phase === 'idle') { ORDER.forEach(k => item(b, k)); sitCat(b, 3, now); }
      else if (st.phase === 'start') { ORDER.forEach(k => item(b, k)); if (e < 400) sitCat(b, 3, now); else walkCat(b, 2, 0, true); }
      else if (st.phase === 'work') {
        let hop = -1, tap = false;
        st.pulses.forEach((p, i) => { const a = now - p; if (a >= 0 && a < 320) { hop = i % 4; tap = true; } });
        ORDER.forEach((k, i) => item(b, k, i === hop ? -1 : 0));
        const x = Math.round(2 + 22 * tri(e)), right = (e % 7000) < 3500;
        walkCat(b, x, tap ? 0 : now, right);
        if (tap) b.text('!', ITEMS[ORDER[hop]].x + 1, 0, P.cat);
      } else if (st.phase === 'reveal') {
        const it = ITEMS[o], cx = it.x - 12;
        let dy = 0;
        if (e >= 700) { const p = clamp((e - 700) / 400, 0, 1); dy = Math.round(5 * p * p); if (e >= 1100 && e < 1250) dy = 4; }
        ORDER.forEach(k => { if (k !== o) item(b, k); });
        if (e < 500) walkCat(b, Math.round(lerp(8, cx, e / 500)), now, true);
        else if (e < 1100) { walkCat(b, cx + (e < 700 && blink(e, 100) ? 1 : 0), 0, true); }
        else sitCat(b, Math.max(1, it.x - 10), now);
        item(b, o, dy + (e >= 500 && e < 700 ? -1 : 0));
        if (o !== 'none' && e > 1300) { const c = o === 'life' ? P.heart : P.sun; sparkle(b, it.x - 3, 11, blink(e, 260), c); sparkle(b, Math.min(38, it.x + 6), 10, !blink(e, 260), c); }
        const [txt, col] = LABEL[o]; band(b, txt, col, e, 1300);
      } else if (st.phase === 'abort') {
        ORDER.forEach(k => item(b, k));
        b.spr(LOAF, 3, 5, M);
        const k = Math.floor(e / 400) % 3; b.set(12 + k, 4 - k, P.z); b.set(13 + k, 4 - k, P.z); b.set(13 + k, 3 - k, P.z);
        band(b, 'NAP', P.grey, e, 700);
      } else if (st.phase === 'error') {
        ORDER.forEach(k => item(b, k));
        sitCat(b, 3, 0);
        if (e > 300) b.rect(11, 7, 2, 1, P.hair);
        band(b, 'HAIRBALL', P.hot, e, 500);
      }
    },
  };
})();

export const PALETTE = PD;
export default SCENE_D;
