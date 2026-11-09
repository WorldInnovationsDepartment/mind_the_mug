import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFrame, span, line, frameToPlainText } from '../lib/frame.js';
import { renderAnsi } from '../lib/render-ansi.js';
import { renderTree } from '../lib/render-tree.js';
import * as S from '../lib/show.js';

function sampleFrame() {
  const fr = makeFrame(6);
  fr.lines.push(line(span('ab', { color: '#ff00aa', bold: true }), span('cd', { dim: true }), span('ef')));
  fr.lines.push(line(span('gh', { inverse: true }), span('ij', { bg: '#112233' }), span('kl')));
  return fr;
}

test("renderAnsi: stripping SGR codes recovers exactly frameToPlainText's output", () => {
  const fr = sampleFrame();
  // eslint-disable-next-line no-control-regex
  assert.equal(renderAnsi(fr).replace(/\x1b\[[0-9;]*m/g, ''), frameToPlainText(fr));
});

test('renderAnsi: truecolor emits 38;2/48;2, and the 256-color fallback stays in the 38;5/48;5 family', () => {
  const fr = sampleFrame();
  assert.match(renderAnsi(fr, { truecolor: true }), /\x1b\[[0-9;]*38;2;255;0;170m/);
  const c256 = renderAnsi(fr, { truecolor: false });
  assert.doesNotMatch(c256, /38;2;/);
  assert.match(c256, /38;5;\d+m/);
});

const ALLOWED = new Set(['color', 'backgroundColor', 'bold', 'dimColor', 'inverse']);

test('renderTree: a mascot frame is a column of 10 Text rows whose spans carry both colours', () => {
  const show = S.createShow({ mascot: 'cat', outcome: 'feature', reason: 'answer', toolCalls: 2, at: 0 });
  for (const t of [0, 1500, 3000, S.totalMs(show)]) {
    const tree = renderTree(S.frame(show, t));
    assert.equal(tree.type, 'Box');
    assert.deepEqual(tree.props, { flexDirection: 'column' });
    assert.equal(tree.children.length, 10);
    for (const row of tree.children) {
      assert.equal(row.type, 'Text');
      let width = 0;
      for (const cell of row.children) {
        assert.equal(cell.type, 'Text');
        for (const k of Object.keys(cell.props)) assert.ok(ALLOWED.has(k), k);
        assert.ok(cell.props.color && cell.props.backgroundColor);
        width += cell.children[0].length;
      }
      assert.equal(width, 40);
    }
  }
});

test('renderTree: the turn line is one Text row', () => {
  const show = S.createShow({ mascot: 'hen', outcome: 'client', reason: 'answer', at: 0, durationMs: 5000, tally: 2 });
  const tree = renderTree(S.resultLine(show));
  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].children.map((c) => c.children[0]).join(''), '✻ Brooded for 5s · a golden egg · CLIENT · 2 in the basket');
});
