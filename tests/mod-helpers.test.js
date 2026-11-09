import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../lib/mod-helpers.js';
import { createShow } from '../lib/show.js';

test('the defaults are once a day, with the cat', () => {
  assert.deepEqual(H.resolveOptions(null), { show: 'daily', mascot: 'cat' });
  assert.deepEqual(H.resolveOptions({ show: 'ALWAYS', mascot: 'Random' }), { show: 'always', mascot: 'random' });
  assert.deepEqual(H.resolveOptions({ show: 'hourly', mascot: 'zebra' }), { show: 'daily', mascot: 'cat' });
});

test('parseCommand reads words in any order', () => {
  assert.deepEqual(H.parseCommand(''), { changes: {}, isNow: false, unknown: [] });
  assert.deepEqual(H.parseCommand('dog').changes, { mascot: 'dog' });
  assert.deepEqual(H.parseCommand('always').changes, { show: 'always' });
  assert.deepEqual(H.parseCommand('every prompt, random').changes, { show: 'always', mascot: 'random' });
  assert.deepEqual(H.parseCommand('once a day cat').changes, { show: 'daily', mascot: 'cat' });
  assert.deepEqual(H.parseCommand('Fetch DAILY').changes, { show: 'daily', mascot: 'dog' });
  assert.deepEqual(H.parseCommand('off').changes, { show: 'off' });
  assert.deepEqual(H.parseCommand('on').changes, { show: 'daily' });
  assert.deepEqual(H.parseCommand('reset').changes, { show: 'daily', mascot: 'cat' });
  assert.equal(H.parseCommand('now').isNow, true);
  assert.deepEqual(H.parseCommand('zebra hen').unknown, ['zebra']);
});

test('settingsText names the settings, every option and the idea', () => {
  const text = H.settingsText({ show: 'daily', mascot: 'cat' }, 'Saved.');
  assert.match(text, /^Saved\./);
  assert.match(text, /Mascot: cat · Shelf Life/);
  assert.match(text, /once a day/);
  assert.match(text, /\/mascot cat \| dog \| hen \| lake \| oven \| random/);
  assert.match(text, /\/mascot daily \| always \| off/);
  assert.match(text, /Don't delegate your reasoning\. Or you'll get a mug\.$/);
  assert.match(H.settingsText({ show: 'always', mascot: 'random' }), /a random one each time/);
});

test('dayKey is the local calendar day', () => {
  assert.equal(H.dayKey(new Date(2026, 10, 9, 0, 0, 1).getTime()), '2026-11-09');
  assert.equal(H.dayKey(new Date(2026, 10, 9, 23, 59, 59).getTime()), '2026-11-09');
  assert.equal(H.dayKey(new Date(2027, 0, 1, 8).getTime()), '2027-01-01');
});

test('isDue: daily shows once a day, on a turn that ended with an answer', () => {
  const base = { show: 'daily', lastDay: null, today: '2026-11-09', reason: 'answer', isForced: false };
  assert.equal(H.isDue(base), true);
  assert.equal(H.isDue({ ...base, lastDay: '2026-11-09' }), false);
  assert.equal(H.isDue({ ...base, lastDay: '2026-11-08' }), true);
  assert.equal(H.isDue({ ...base, reason: 'refusal' }), true);
  assert.equal(H.isDue({ ...base, reason: 'aborted' }), false);
  assert.equal(H.isDue({ ...base, reason: 'error' }), false);
});

test('isDue: always shows every turn, off never, forced whatever', () => {
  const base = { lastDay: '2026-11-09', today: '2026-11-09', reason: 'answer', isForced: false };
  assert.equal(H.isDue({ ...base, show: 'always' }), true);
  assert.equal(H.isDue({ ...base, show: 'always', reason: 'aborted' }), true);
  assert.equal(H.isDue({ ...base, show: 'off' }), false);
  assert.equal(H.isDue({ ...base, show: 'off', isForced: true }), true);
  assert.equal(H.isDue({ ...base, show: 'daily', isForced: true }), true);
});

test('effectiveSettings: /mascot wins until /config changes after it', () => {
  const options = { show: 'daily', mascot: 'cat' };
  assert.deepEqual(H.effectiveSettings(options, null), options);
  const override = H.makeOverride({ show: 'always', mascot: 'dog' }, options);
  assert.deepEqual(H.effectiveSettings(options, override), { show: 'always', mascot: 'dog' });
  // a row changed in /config afterwards takes over, the other field keeps the /mascot choice
  assert.deepEqual(H.effectiveSettings({ show: 'daily', mascot: 'hen' }, override), { show: 'always', mascot: 'hen' });
  // a row that already took the choice (the engine reloaded the mod before `basedOn` caught up) still stands
  assert.deepEqual(H.effectiveSettings({ show: 'always', mascot: 'cat' }, override), { show: 'always', mascot: 'dog' });
});

test('the record: normalize, then write shows into it', () => {
  const rec = H.normalizeRecord({ lastDay: 5, shows: 'x', mascots: { cat: { tally: 2, kept: ['none', 3] } }, showNext: true, junk: 1 });
  assert.equal(rec.lastDay, null);
  assert.equal(rec.shows, 0);
  assert.equal(rec.showNext, true);
  assert.deepEqual(rec.mascots.cat, { tally: 2, kept: ['none'] });
  assert.deepEqual(H.normalizeRecord(undefined), H.emptyRecord());

  const dog = createShow({ mascot: 'dog', outcome: 'feature', reason: 'answer', at: 0 });
  H.recordShow(rec, dog, '2026-11-09');
  assert.equal(rec.lastDay, '2026-11-09');
  assert.equal(rec.showNext, false);
  assert.equal(rec.shows, 1);
  assert.equal(rec.outcomes.feature, 1);
  assert.deepEqual(rec.mascots.dog, { tally: 1, kept: ['feature'] });
  assert.equal(dog.tally, 1);

  const boot = createShow({ mascot: 'lake', outcome: 'none', reason: 'answer', at: 0 });
  H.recordShow(rec, boot, '2026-11-10');
  assert.deepEqual(rec.mascots.lake, { tally: 0, kept: [] }); // a boot is thrown back

  const nap = createShow({ mascot: 'cat', outcome: 'life', reason: 'aborted', at: 0 });
  H.recordShow(rec, nap, '2026-11-10');
  assert.equal(rec.outcomes.abort, 1);
  assert.equal(rec.outcomes.life, 0);
  assert.equal(rec.mascots.cat.tally, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(rec)), H.normalizeRecord(JSON.parse(JSON.stringify(rec))));
});

test('ShowQueue binds a show to the turn line with its exact duration, and only that one', () => {
  const q = new H.ShowQueue();
  const show = { durationMs: 4200 };
  q.push(show);
  assert.equal(q.resolve('old-line', 9000), null);
  assert.equal(q.resolve('r1', 4200), show);
  assert.equal(q.resolve('r1', 4200), show);
  assert.equal(q.resolve('r2', 4200), null);
  q.clear();
  assert.equal(q.resolve('r1', 4200), null);
});

test('the band: sprite needs 40 x 10, the caption needs room beside it', () => {
  assert.equal(H.bandFitsSprite({ bodyColumns: 40, maxRows: 10 }), true);
  assert.equal(H.bandFitsSprite({ bodyColumns: 39, maxRows: 10 }), false);
  assert.equal(H.bandFitsSprite({ bodyColumns: 120, maxRows: 9 }), false);
  assert.equal(H.bandFitsSprite(null), false);
  assert.equal(H.bandFitsCaption({ bodyColumns: 83, maxRows: 12 }, 41), true);
  assert.equal(H.bandFitsCaption({ bodyColumns: 82, maxRows: 12 }, 41), false);
});

test('bandTree and captionTree use only allow-listed props', () => {
  const caption = H.captionTree([{ text: 'Shelf Life', bold: true }, { text: '' }, { text: 'x', dim: true, color: '#d97757' }]);
  assert.deepEqual(caption.props, { flexDirection: 'column', alignItems: 'flex-end', marginRight: 2 });
  assert.deepEqual(caption.children[0], { type: 'Text', children: ['Shelf Life'], props: { bold: true } });
  assert.deepEqual(caption.children[1], { type: 'Text', children: [' '] });
  assert.deepEqual(caption.children[2].props, { color: '#d97757', dimColor: true });
  const band = H.bandTree([null, { type: 'Box' }], 120);
  assert.deepEqual(band.props, { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', width: 120 });
  assert.equal(band.children.length, 1);
});
