import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollOutcome, pickFrom, hashSeed, ODDS, OUTCOME_ORDER } from '../lib/rng.js';

test('the odds table sums to 1 and is the published one', () => {
  assert.deepEqual({ ...ODDS }, { life: 0.01, client: 0.04, feature: 0.1, none: 0.85 });
  assert.ok(Math.abs(OUTCOME_ORDER.reduce((s, o) => s + ODDS[o], 0) - 1) < 1e-9);
});

test('rollOutcome is deterministic per seed, for numbers and strings', () => {
  for (const seed of [0, 1, 42, 'abc', 'session:3:1700000000000']) assert.equal(rollOutcome(seed), rollOutcome(seed));
});

test('rollOutcome follows the table over many seeds', () => {
  const n = 200000;
  const counts = { none: 0, feature: 0, client: 0, life: 0 };
  for (let i = 0; i < n; i++) counts[rollOutcome(hashSeed('s:' + i))] += 1;
  for (const o of OUTCOME_ORDER) assert.ok(Math.abs(counts[o] / n - ODDS[o]) < 0.005, `${o}: ${counts[o] / n}`);
});

test('pickFrom is deterministic and reaches every entry', () => {
  const list = ['cat', 'dog', 'hen', 'lake', 'oven'];
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const p = pickFrom(i, list);
    assert.equal(p, pickFrom(i, list));
    seen.add(p);
  }
  assert.deepEqual([...seen].sort(), [...list].sort());
});
