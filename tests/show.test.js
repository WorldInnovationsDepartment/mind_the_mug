import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../lib/show.js';
import { assertRect, lineWidth } from '../lib/frame.js';
import { MASCOT_IDS, ideaFor } from '../lib/mascots.js';

const mk = (over = {}) => S.createShow({ mascot: 'cat', outcome: 'none', reason: 'answer', toolCalls: 2, at: 1000, durationMs: 42000, ...over });

test('createShow normalizes its input', () => {
  const s = mk({ mascot: 'nope', outcome: 'weird', toolCalls: 99, kept: ['none', 'none', 'feature', 'client', 'life'] });
  assert.equal(s.mascot, 'cat');
  assert.equal(s.outcome, 'none');
  assert.equal(s.taps, S.TIMINGS.maxTaps);
  assert.equal(s.kept.length, S.KEPT_MAX);
  assert.equal(mk({ reason: 'aborted' }).ending, 'abort');
  assert.equal(mk({ reason: 'error' }).ending, 'error');
  assert.equal(mk({ reason: 'refusal' }).ending, 'reveal');
});

test('the timeline runs start -> work -> ending and then rests', () => {
  const s = mk();
  const work = S.workMs(s);
  assert.equal(work, S.TIMINGS.workBaseMs + 2 * S.TIMINGS.tapEveryMs);
  assert.equal(S.stageAt(s, 1000).phase, 'start');
  assert.equal(S.stageAt(s, 1000 + S.TIMINGS.startMs).phase, 'work');
  const endStart = 1000 + S.TIMINGS.startMs + work;
  assert.deepEqual(S.stageAt(s, endStart), { phase: 'reveal', t0: endStart, now: endStart, isResting: false });
  assert.equal(S.isAnimating(s, endStart + S.TIMINGS.revealMs - 1), true);
  assert.equal(S.isAnimating(s, endStart + S.TIMINGS.revealMs), false);
  const rest = S.stageAt(s, endStart + 10 * 60 * 1000);
  assert.equal(rest.isResting, true);
  assert.equal(rest.now, endStart + S.TIMINGS.revealMs);
  assert.equal(S.stageAt(mk({ reason: 'aborted' }), 1e12).phase, 'abort');
});

test('every tap lands inside the work phase', () => {
  for (let n = 0; n <= S.TIMINGS.maxTaps; n++) {
    const s = mk({ toolCalls: n });
    const taps = S.tapTimes(s);
    assert.equal(taps.length, n);
    const end = s.at + S.TIMINGS.startMs + S.workMs(s);
    for (const t of taps) assert.ok(t > s.at + S.TIMINGS.startMs && t + 560 <= end);
  }
});

test('every mascot draws a full 40 x 10 frame of two-colour half blocks at every moment', () => {
  for (const mascot of MASCOT_IDS) {
    for (const [outcome, reason] of [['none', 'answer'], ['feature', 'answer'], ['client', 'answer'], ['life', 'answer'], ['none', 'aborted'], ['none', 'error']]) {
      const s = mk({ mascot, outcome, reason, toolCalls: 4, kept: ['none', 'feature', 'client', 'life'] });
      for (let t = 0; t <= S.totalMs(s) + 500; t += 100) {
        const fr = S.frame(s, s.at + t);
        assert.equal(fr.width, 40);
        assert.equal(fr.lines.length, 10);
        assertRect(fr);
        for (const l of fr.lines) {
          assert.equal(lineWidth(l), 40);
          for (const sp of l) {
            assert.match(sp.text, /^▀+$/);
            assert.match(sp.color, /^#[0-9a-f]{6}$/);
            assert.match(sp.bg, /^#[0-9a-f]{6}$/);
          }
        }
      }
    }
  }
});

test('a resting show never changes again', () => {
  for (const mascot of MASCOT_IDS) {
    const s = mk({ mascot, outcome: 'life' });
    const a = JSON.stringify(S.frame(s, s.at + S.totalMs(s)));
    assert.equal(JSON.stringify(S.frame(s, s.at + S.totalMs(s) + 12345)), a);
    assert.equal(JSON.stringify(S.frame(s, s.at + 86400000)), a);
  }
});

test('the words: turn line, caption, fallback', () => {
  assert.equal(S.resultText(mk({ tally: 3 })), '✻ Deliberated for 42s · the mug, again · 3 off the shelf');
  assert.equal(S.resultText(mk({ mascot: 'dog', outcome: 'client', durationMs: 64000 })), '✻ Fetched in 1m 4s · a letter · CLIENT');
  assert.equal(S.outcomeText(mk({ reason: 'aborted' })), 'lost interest · napping');
  assert.equal(S.outcomeText(mk({ reason: 'error' })), 'hairball · ask again');
  const fr = S.resultLine(mk({ tally: 3 }));
  assert.equal(fr.lines[0].map((x) => x.text).join(''), S.resultText(mk({ tally: 3 })));
  assertRect(fr);
  for (const mascot of MASCOT_IDS) {
    const s = mk({ mascot, outcome: 'life' });
    const lines = S.captionLines(s).map((l) => l.text);
    assert.deepEqual(lines.slice(-2), ideaFor(mascot));
    assert.ok(lines.length <= S.SPRITE_ROWS);
    assert.ok(S.captionWidth(s) <= 44, `${mascot}: ${S.captionWidth(s)}`);
    assert.match(S.fallbackText(s), /Don't delegate your reasoning, or you'll get a/);
    assertRect(S.fallbackLine(s));
  }
});
