// Drives hooks/mug.js end to end with a stand-in for the engine: a fake
// `on` that collects the hooks and a fake `$` with a clock, a store and a
// recorder for what the mod asked the interface to do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from '../hooks/mug.js';
import { STORE_KEY } from '../lib/mod-helpers.js';
import { TIMINGS } from '../lib/show.js';

const DAY = 86400000;
const NOON = new Date(2026, 10, 9, 12).getTime();

function engine(options, { configWorks = true } = {}) {
  const hooks = {};
  const store = new Map();
  const world = { now: NOON, turns: 0, timers: [], status: [], commands: [], configSets: [], invalidations: 0 };
  const $ = {
    clock: {
      now: async () => world.now,
      every: (ms, fn) => {
        const t = { fn, cancelled: false, cancel() { this.cancelled = true; } };
        world.timers.push(t);
        return t;
      },
      after: (ms, fn) => {
        const t = { fn, cancelled: false, cancel() { this.cancelled = true; } };
        world.timers.push(t);
        return t;
      },
    },
    store: { get: async (k) => store.get(k), set: async (k, v) => void store.set(k, JSON.parse(JSON.stringify(v))) },
    session: { id: async () => 'session-1', turns: async () => world.turns },
    ui: { invalidate: () => void world.invalidations++, status: (t) => void world.status.push(t), toast: () => {} },
    command: { register: async (spec) => void world.commands.push(spec) },
    config: {
      set: async (row) => {
        world.configSets.push(row);
        if (!configWorks) throw new Error('no such row');
        return { value: row.value };
      },
    },
  };
  const on = (event, matcherOrHook, maybeHook) => {
    const hook = maybeHook || matcherOrHook;
    const key = maybeHook && matcherOrHook.component ? `${event}:${matcherOrHook.component}` : event;
    hooks[key] = hook;
    return { catch: (handler) => void (hooks[key + ':catch'] = handler) };
  };
  register(on, options);
  const ENGINE = { type: 'engine' };
  const api = {
    world,
    store,
    start: () => hooks['session.start']($, {}, async () => ({})),
    prompt: (e = {}) => hooks['prompt.submit']($, { text: 'hi', ...e }, async () => ({})),
    async turn({ reason = 'answer', tools = 1, durationMs = 4200, agentId } = {}) {
      world.turns += 1;
      await hooks['turn.start']($, { text: 'hi', agentId }, async () => ({}));
      const step = hooks['turn.step']($, { agentId }, async function* () {
        yield 'chunk';
        return { toolUses: new Array(tools).fill({}) };
      });
      const chunks = [];
      let r = await step.next();
      while (!r.done) {
        chunks.push(r.value);
        r = await step.next();
      }
      assert.deepEqual(chunks, ['chunk']);
      await hooks['turn.complete']($, { reason, durationMs, agentId, turnId: 't' + world.turns }, async () => ({}));
    },
    band: (props = { bodyColumns: 120, maxRows: 20, hasSurvey: false }) => hooks['ui.render:AbovePrompt']($, { surface: 'terminal', props }, async () => ENGINE),
    turnLine: (requestId, durationMs, extra = {}) => hooks['ui.render:TurnDuration']($, { surface: 'terminal', requestId, props: { durationMs, ...extra } }, async () => ENGINE),
    command: (args) => hooks['command.run']($, { command: 'mascot', args }),
    ENGINE,
  };
  return api;
}

const isSprite = (tree) => tree.type === 'Box' && tree.props.justifyContent === 'flex-end';
const text = (tree) => JSON.stringify(tree);

test('by default the cat shows after the first answer of the day and stays until the next prompt', async () => {
  const e = engine({});
  await e.start();
  assert.deepEqual(e.world.commands.map((c) => c.name), ['mascot']);
  assert.equal(await e.band(), e.ENGINE, 'nothing before the first answer');

  await e.prompt();
  await e.turn({ tools: 2 });
  const band = await e.band();
  assert.ok(isSprite(band));
  assert.equal(band.children.length, 2, 'caption and sprite');
  assert.match(text(band), /Shelf Life/);
  assert.match(text(band), /Don't delegate your reasoning\./);
  assert.match(text(band), /Or you'll get a mug\./);
  assert.equal(band.children[1].children.length, 10);
  assert.match(text(await e.turnLine('r1', 4200)), /Deliberated for 4s/);
  assert.equal(await e.turnLine('r0', 9999), e.ENGINE, "another turn's line is left alone");
  assert.equal(await e.turnLine('r1', 4200, { isExpanded: true }), e.ENGINE);

  // it rests, and stays, however long the person takes
  e.world.now += 3 * 60 * 60 * 1000;
  assert.ok(isSprite(await e.band()));

  // the next prompt sends it away, and it does not come back today
  await e.prompt();
  assert.equal(await e.band(), e.ENGINE);
  await e.turn();
  assert.equal(await e.band(), e.ENGINE);

  // tomorrow it shows again
  e.world.now += DAY;
  await e.prompt();
  await e.turn();
  assert.ok(isSprite(await e.band()));
  assert.equal(e.store.get(STORE_KEY).shows, 2);
});

test('nothing is drawn while the turn runs: only the last response gets a show', async () => {
  const e = engine({ show: 'always' });
  await e.start();
  await e.turn({ agentId: 'sub-1' });
  assert.equal(await e.band(), e.ENGINE, "a subagent's answer is not the last response");
  await e.turn();
  assert.ok(isSprite(await e.band()));
  await e.prompt({ command: { name: 'mascot' } });
  assert.ok(isSprite(await e.band()), 'a slash command is not a prompt');
  await e.prompt();
  assert.equal(await e.band(), e.ENGINE);
});

test('daily: an interrupted turn neither shows nor uses up the day', async () => {
  const e = engine({});
  await e.start();
  await e.turn({ reason: 'aborted' });
  assert.equal(await e.band(), e.ENGINE);
  await e.turn({ reason: 'error' });
  assert.equal(await e.band(), e.ENGINE);
  await e.turn();
  assert.ok(isSprite(await e.band()));
});

test('always: every turn shows, an interrupted one as the nap', async () => {
  const e = engine({ show: 'always', mascot: 'cat' });
  await e.start();
  await e.turn();
  assert.ok(isSprite(await e.band()));
  await e.prompt();
  await e.turn({ reason: 'aborted' });
  assert.match(text(await e.band()), /lost interest · napping/);
  assert.ok(e.world.status.includes('Shelf Life · lost interest · napping'));
});

test('off: never; random: one of the five', async () => {
  const off = engine({ show: 'off' });
  await off.start();
  await off.turn();
  assert.equal(await off.band(), off.ENGINE);

  const any = engine({ show: 'always', mascot: 'random' });
  await any.start();
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    any.world.now += 1000;
    await any.turn();
    seen.add(/(Shelf Life|Fetch|Hatch|Catch of the Day|Proof)/.exec(text(await any.band()))[1]);
  }
  assert.ok(seen.size >= 4, [...seen].join(', '));
});

test('the ticker runs only while the show moves', async () => {
  const e = engine({});
  await e.start();
  await e.turn();
  const ticker = e.world.timers[0];
  assert.equal(ticker.cancelled, false);
  e.world.now += TIMINGS.startMs + TIMINGS.workBaseMs + TIMINGS.tapEveryMs + TIMINGS.revealMs + 1;
  await e.world.timers[e.world.timers.length - 1].fn();
  assert.equal(ticker.cancelled, true);
});

test('a narrow band drops the caption, a tiny one falls back to one line', async () => {
  const e = engine({});
  await e.start();
  await e.turn();
  assert.equal((await e.band({ bodyColumns: 60, maxRows: 12 })).children.length, 1);
  const line = await e.band({ bodyColumns: 30, maxRows: 3 });
  assert.match(text(line), /Don't delegate your reasoning, or you'll get a mug/);
});

test('/mascot shows the settings, changes them, and they take effect', async () => {
  const e = engine({});
  await e.start();
  assert.match((await e.command('')).text, /Mascot: cat · Shelf Life/);
  assert.match((await e.command('zebra')).text, /Not a mascot or a setting: zebra/);

  const out = await e.command('dog always');
  assert.match(out.text, /^Saved\./);
  assert.match(out.text, /Mascot: dog · Fetch/);
  assert.match(out.text, /after every answer/);
  assert.deepEqual(e.world.configSets, [{ key: 'mind-the-mug.show', value: 'always' }, { key: 'mind-the-mug.mascot', value: 'dog' }]);
  await e.turn();
  await e.prompt();
  await e.turn();
  assert.match(text(await e.band()), /Fetch/);
});

test('/mascot still works where the /config rows cannot be written, and survives a reload', async () => {
  const e = engine({}, { configWorks: false });
  await e.start();
  assert.match((await e.command('hen')).text, /Mascot: hen · Hatch/);
  await e.start(); // a reload: module state starts over, the store stays
  await e.turn();
  assert.match(text(await e.band()), /Hatch/);
});

test('/mascot now shows after the next answer, even when the day is used up or it is off', async () => {
  const e = engine({ show: 'off' });
  await e.start();
  assert.match((await e.command('now')).text, /after the next answer/);
  await e.turn();
  assert.ok(isSprite(await e.band()));
  await e.prompt();
  await e.turn();
  assert.equal(await e.band(), e.ENGINE);
});
