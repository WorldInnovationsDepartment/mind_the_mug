import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MASCOTS, MASCOT_IDS, MASCOT_CHOICES, DEFAULT_MASCOT, IDEA, IDEA_SHORT, WHY, ideaFor, findMascot, getMascot } from '../lib/mascots.js';

test('there are five mascots and the cat is the default', () => {
  assert.deepEqual([...MASCOT_IDS], ['cat', 'dog', 'hen', 'lake', 'oven']);
  assert.equal(DEFAULT_MASCOT, 'cat');
  assert.deepEqual([...MASCOT_CHOICES], [...MASCOT_IDS, 'random']);
  assert.equal(getMascot('nope').id, 'cat');
});

test('every mascot has a scene and every word it needs', () => {
  for (const id of MASCOT_IDS) {
    const m = MASCOTS[id];
    assert.equal(m.id, id);
    assert.equal(typeof m.scene.draw, 'function');
    assert.equal(typeof m.scene.keeps, 'function');
    for (const k of ['name', 'thing', 'tag', 'line2', 'dud', 'past', 'abortMsg', 'errorMsg']) assert.ok(m[k] && typeof m[k] === 'string', `${id}.${k}`);
    for (const o of ['none', 'feature', 'client', 'life']) assert.ok(m.item[o], `${id}.item.${o}`);
    assert.equal(m.lesson.length, 2);
    assert.match(m.lesson[0], /^You can't pick/);
    assert.match(m.lesson[1], /^You pick/);
    assert.match(m.tally(3), /^3 /);
  }
});

test("the reminder: don't delegate your reasoning, or you'll get a mug", () => {
  assert.deepEqual([...IDEA], ["Don't delegate your reasoning.", "Or you'll get a mug."]);
  assert.equal(IDEA_SHORT, "Don't delegate your reasoning, or you'll get a mug.");
  assert.match(WHY[0], /can't control what the model returns/);
  assert.match(WHY[1], /control what you delegate/);
});

test('every mascot says the reminder with what it hands you instead', () => {
  assert.deepEqual(ideaFor('cat'), [...IDEA]);
  assert.deepEqual(ideaFor('dog'), ["Don't delegate your reasoning.", "Or you'll get a sock."]);
  assert.deepEqual(ideaFor('hen')[1], "Or you'll get a plain egg.");
  assert.deepEqual(ideaFor('lake')[1], "Or you'll get an old boot.");
  assert.deepEqual(ideaFor('oven')[1], "Or you'll get a plain roll.");
});

test('findMascot resolves ids, names and aliases, whatever the case', () => {
  assert.equal(findMascot('Dog'), 'dog');
  assert.equal(findMascot('fetch'), 'dog');
  assert.equal(findMascot('shelf-life'), 'cat');
  assert.equal(findMascot('fishing'), 'lake');
  assert.equal(findMascot('bake'), 'oven');
  assert.equal(findMascot('chicken'), 'hen');
  assert.equal(findMascot('zebra'), null);
  assert.equal(findMascot(''), null);
});
