// Mind the Mug — the mascot registry (lib/mascots.js)
//
// Pure ESM, zero dependencies. The five worlds that can sit above the prompt
// and every word they say. Each one is the same kind reminder in its own
// words: you can ask, and you cannot choose what comes back. What you can
// choose is what you hand over, and the one thing never to hand over is
// your own reasoning. Hand that over and you get a mug.
//
//   cat   Shelf Life        (the default)
//   dog   Fetch
//   hen   Hatch
//   lake  Catch of the Day
//   oven  Proof

import cat from './scenes/cat.js';
import dog from './scenes/dog.js';
import hen from './scenes/hen.js';
import lake from './scenes/lake.js';
import oven from './scenes/oven.js';

export const DEFAULT_MASCOT = 'cat';

/** The reminder, in the default mascot's words. */
export const IDEA = Object.freeze(["Don't delegate your reasoning.", "Or you'll get a mug."]);
export const IDEA_SHORT = "Don't delegate your reasoning, or you'll get a mug.";

/** Why: the two facts the reminder rests on. */
export const WHY = Object.freeze(["You can't control what the model returns.", 'You control what you delegate.']);

/**
 * @typedef {{
 *   id: string, scene: {draw: Function, keeps: Function}, name: string, tag: string, line2: string,
 *   lesson: [string, string], dud: string, past: string, thing: string,
 *   item: Record<'none'|'feature'|'client'|'life', string>,
 *   counts: (o: string) => boolean, tally: (n: number) => string,
 *   abortMsg: string, errorMsg: string, aliases: string[],
 * }} Mascot
 */

/** @type {Record<string, Mascot>} */
export const MASCOTS = Object.freeze({
  cat: {
    id: 'cat',
    scene: cat,
    name: 'Shelf Life',
    thing: 'a cat on a shelf',
    tag: 'You can ask. The cat decides.',
    line2: 'Look at what landed before you pick it up.',
    lesson: ["You can't pick what falls.", 'You pick what goes on the shelf.'],
    dud: 'a mug',
    past: 'Deliberated for',
    item: { none: 'the mug, again', feature: 'the rubber duck · FEATURE', client: 'the phone · CLIENT', life: 'the plant · A LIFE' },
    counts: () => true,
    tally: (n) => `${n} off the shelf`,
    abortMsg: 'lost interest · napping',
    errorMsg: 'hairball · ask again',
    aliases: ['shelf', 'shelf-life', 'shelflife', 'kitty', 'kitten'],
  },
  dog: {
    id: 'dog',
    scene: dog,
    name: 'Fetch',
    thing: 'a dog in a sunny yard',
    tag: 'Every throw comes back different.',
    line2: "Good dog. Now check what's in its mouth.",
    lesson: ["You can't pick what comes back.", 'You pick what you throw.'],
    dud: 'a sock',
    past: 'Fetched in',
    item: { none: 'a sock', feature: 'the ball · FEATURE', client: 'a letter · CLIENT', life: 'the leash · A LIFE' },
    counts: () => true,
    tally: (n) => `${n} by the door`,
    abortMsg: "squirrel! · it'll be back",
    errorMsg: 'rolled in mud · throw again',
    aliases: ['fetch', 'puppy', 'doggo'],
  },
  hen: {
    id: 'hen',
    scene: hen,
    name: 'Hatch',
    thing: 'a hen on a nest',
    tag: 'Same hen, different egg.',
    line2: "Don't count your chickens before they hatch.",
    lesson: ["You can't pick the egg.", 'You pick what you feed her.'],
    dud: 'a plain egg',
    past: 'Brooded for',
    item: { none: 'a plain egg', feature: 'a blue egg · FEATURE', client: 'a golden egg · CLIENT', life: 'a chick · A LIFE' },
    counts: () => true,
    tally: (n) => `${n} in the basket`,
    abortMsg: 'startled · she flew off',
    errorMsg: 'cracked · try again',
    aliases: ['hatch', 'chicken', 'egg'],
  },
  lake: {
    id: 'lake',
    scene: lake,
    name: 'Catch of the Day',
    thing: 'a fishing line on a lake',
    tag: 'Same bait, different fish.',
    line2: "Here's the catch: you have to watch the line.",
    lesson: ["You can't pick the fish.", 'You pick where you cast.'],
    dud: 'an old boot',
    past: 'Fished for',
    item: { none: 'an old boot, thrown back', feature: 'a perch · FEATURE', client: 'a salmon · CLIENT', life: 'a life ring · A LIFE' },
    counts: (o) => o !== 'none',
    tally: (n) => `${n} in the bucket`,
    abortMsg: 'line cut · the one that got away',
    errorMsg: 'snagged on the reeds · cast again',
    aliases: ['catch', 'fish', 'fishing', 'rod'],
  },
  oven: {
    id: 'oven',
    scene: oven,
    name: 'Proof',
    thing: 'a countertop oven',
    tag: 'Same recipe, different bake.',
    line2: 'Taste before you serve.',
    lesson: ["You can't pick how it bakes.", 'You pick what goes in.'],
    dud: 'a plain roll',
    past: 'Baked for',
    item: { none: 'just a roll', feature: 'a croissant · FEATURE', client: 'a cake · CLIENT', life: 'a picnic basket · A LIFE' },
    counts: () => true,
    tally: (n) => `${n} on the rack`,
    abortMsg: 'door opened · it fell',
    errorMsg: 'something burnt · bake again',
    aliases: ['proof', 'bake', 'bakery', 'bread'],
  },
});

/** Mascot ids in the order the settings list them (the default first). */
export const MASCOT_IDS = Object.freeze(Object.keys(MASCOTS));

/** What the `mascot` setting may hold: one mascot, or a different one each time. */
export const MASCOT_CHOICES = Object.freeze([...MASCOT_IDS, 'random']);

/** The four things that can come back, and how often (decided when the turn ends). */
export const OUTCOMES = Object.freeze(['none', 'feature', 'client', 'life']);

/** Resolve a word a person typed (`dog`, `fetch`, `Shelf-Life`) to a mascot id, or null. */
export function findMascot(word) {
  const w = String(word || '').trim().toLowerCase();
  if (!w) return null;
  if (MASCOTS[w]) return w;
  for (const m of Object.values(MASCOTS)) if (m.aliases.includes(w)) return m.id;
  return null;
}

/** The mascot for an id, falling back to the default for anything unknown. */
export function getMascot(id) {
  return MASCOTS[id] || MASCOTS[DEFAULT_MASCOT];
}

/** The reminder in a mascot's own words: the second line names what that mascot hands you instead. */
export function ideaFor(id) {
  return [IDEA[0], `Or you'll get ${getMascot(id).dud}.`];
}
