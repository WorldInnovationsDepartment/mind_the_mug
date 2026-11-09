// Mind the Mug — seeded randomness (lib/rng.js)
//
// Pure ESM, zero dependencies. What comes back is rolled once, when the turn
// ends, straight from a published table, and it has nothing to do with how
// good the answer was. That is the point: you do not control it. A given
// seed always reproduces the same roll.

/** FEATURE 10 %, CLIENT 4 %, A LIFE 1 %, nothing 85 %. */
export const ODDS = Object.freeze({ life: 0.01, client: 0.04, feature: 0.1, none: 0.85 });

/** Rarest first, so the cumulative walk below is exact. */
export const OUTCOME_ORDER = Object.freeze(['life', 'client', 'feature', 'none']);

/** mulberry32: a fast, small, seedable 32-bit PRNG yielding floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function mulberry32Next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministically hash any string to a uint32 (FNV-1a variant with a final avalanche). */
export function hashSeed(str) {
  const s = String(str);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

function toUint32Seed(seed) {
  if (typeof seed === 'number') return seed >>> 0;
  return hashSeed(seed);
}

/**
 * @param {number|string} seed
 * @returns {'none'|'feature'|'client'|'life'}
 */
export function rollOutcome(seed) {
  const r = mulberry32(toUint32Seed(seed))();
  let acc = 0;
  for (const o of OUTCOME_ORDER) {
    acc += ODDS[o];
    if (r < acc) return o;
  }
  return 'none';
}

/** Pick one entry of `list` for `seed`, on a stream independent of rollOutcome's. */
export function pickFrom(seed, list) {
  const r = mulberry32(hashSeed('pick:' + toUint32Seed(seed)))();
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}
