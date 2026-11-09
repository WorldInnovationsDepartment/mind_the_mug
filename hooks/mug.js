// Mind the Mug — the mod module (hooks/mug.js)
//
// Once a day (by default), after the LAST response of a turn, a small
// pixel-art mascot appears in the band above the prompt, bottom-right. It
// plays the turn back as a short story (you ask, one tap per tool call, then
// whatever comes back), rests on its last frame, and leaves when the next
// prompt is sent. Beside it sits the kind reminder the whole mod exists for:
// don't delegate your reasoning, or you'll get a mug. (You can't control
// what the model returns; you control what you delegate.)
//
// Nothing is drawn while a turn is running, and nothing is drawn for the
// responses in the middle of a turn: a show starts at `turn.complete` of the
// main loop and ends at the next `prompt.submit` / `turn.start`.
//
// This is the ONLY file in the plugin allowed to touch `$` / `on` / `next`;
// the static scanner behind `claude plugin validate` enforces that:
//
//   - `register` is a same-file exported function.
//   - Every `$` use is either `$.noun.method(...)` written directly inside a
//     hook body / a top-level helper, or `$` passed *whole* as an argument
//     to a top-level function declared in this same file.
//   - `next` is only ever called directly as `next(e)` (or `yield* next(e)`
//     in the streaming `turn.step` generator), inline inside the `on(...)`
//     callback that received it.
//   - `on` is only ever called directly inside `register(...)`.
//   - Everything else (the scenes, the show's timeline, the settings, the
//     once-a-day rule) lives in lib/ and is imported as plain, `$`-free code.
//
// Every hook body is wrapped in try/catch and falls back to `next(e)` (or a
// silent no-op for observe-only events): a hook that throws is skipped by
// the engine, and the mascot not showing beats anything else going wrong.
//
// Contract notes: `$.clock.now()` resolves a promise; `turn.step` streams,
// so its hook is an async generator; `turn.*` events also fire for subagent
// loops (with `e.agentId` set) and are ignored here, so a subagent's turn
// never counts as the last response.

import * as showing from '../lib/show.js';
import { renderTree } from '../lib/render-tree.js';
import { hashSeed, rollOutcome, pickFrom } from '../lib/rng.js';
import { MASCOT_IDS, getMascot } from '../lib/mascots.js';
import {
  STORE_KEY,
  PLUGIN_NAME,
  resolveOptions,
  effectiveSettings,
  makeOverride,
  parseCommand,
  settingsText,
  dayKey,
  isDue,
  normalizeRecord,
  recordShow,
  ShowQueue,
  bandFitsSprite,
  bandFitsCaption,
  captionTree,
  bandTree,
} from '../lib/mod-helpers.js';

// ---------------------------------------------------------------------------
// Module-level state. `session.start` is treated as the reload/reset signal
// and clears all of it; what must outlive a session (the day already shown,
// what each mascot keeps, the `/mascot` choice) lives in `$.store`.
// ---------------------------------------------------------------------------

const NOTICE_STATUS_MS = 4000;
const COMMAND_FAILED = 'mascot: that did not work. Open /config and change the settings under Mind the Mug.';
const TICK_MS = showing.TIMINGS.tickMs;
const TICKER_POLL_MS = 200;

/** The plugin's options for this activation (set once, at the top of `register`). */
let cfg = resolveOptions(null);

/** The show on screen now (lib/show.js Show — plain JSON data), or null between shows. */
let liveShow = null;

/** Tool calls the running main-loop turn has made so far: one tap each when it is played back. */
let toolCalls = 0;

/** The shared ~10fps redraw ticker. */
let tickerHandle = null;
let tickerRunning = false;

/** Bumped whenever a show starts or is hidden; lets a stale scheduled ticker-stop recognize a newer one. */
let generation = 0;

/** Finished shows waiting for / bound to their TurnDuration instance. */
const shows = new ShowQueue();

/** The pending timer that will clear the status line set by the most recent setTimedStatus() call. */
let statusClearHandle = null;

function resetTransientState() {
  stopTickerNow();
  if (statusClearHandle) {
    statusClearHandle.cancel();
    statusClearHandle = null;
  }
  shows.clear();
  liveShow = null;
  toolCalls = 0;
  generation += 1;
}

// ---------------------------------------------------------------------------
// Ticker — the shared ~10fps redraw heartbeat, running only while a show is
// still moving. Named top-level functions forwarding `$` explicitly, so the
// scanner attributes `$.clock.every` / `$.clock.after` through them.
// ---------------------------------------------------------------------------

function tick($) {
  $.ui.invalidate('ui.render');
}

function startTicker($) {
  if (tickerRunning) return;
  tickerRunning = true;
  tickerHandle = $.clock.every(TICK_MS, () => tick($));
}

function stopTickerNow() {
  if (tickerHandle) {
    tickerHandle.cancel();
    tickerHandle = null;
  }
  tickerRunning = false;
}

/** Keeps the ticker running until this show has come to rest, then stops it. */
async function pollTickerStop($, gen) {
  if (gen !== generation) return;
  const now = await $.clock.now();
  if (liveShow && showing.isAnimating(liveShow, now)) {
    $.clock.after(TICKER_POLL_MS, () => pollTickerStop($, gen));
    return;
  }
  stopTickerNow();
  tick($); // one last redraw so the band settles on the resting frame
}

function clearStatus($) {
  $.ui.status(undefined);
}

/** Pins a status line for `ms`, then clears it (`$.ui.status` never auto-expires). */
function setTimedStatus($, text, ms) {
  if (statusClearHandle) {
    statusClearHandle.cancel();
    statusClearHandle = null;
  }
  $.ui.status(text);
  statusClearHandle = $.clock.after(ms, () => {
    statusClearHandle = null;
    clearStatus($);
  });
}

/** The next prompt was sent: the mascot leaves, and an unclaimed turn line is dropped. */
function hideShow($) {
  shows.pending = [];
  if (!liveShow) return;
  liveShow = null;
  generation += 1;
  stopTickerNow();
  tick($);
}

// ---------------------------------------------------------------------------
// $-touching async helpers — each receives `$` as its first argument, used
// only as `$.noun.method(...)`.
// ---------------------------------------------------------------------------

async function loadRecord($) {
  try {
    return normalizeRecord(await $.store.get(STORE_KEY));
  } catch (err) {
    return normalizeRecord(null);
  }
}

async function saveRecord($, record) {
  try {
    await $.store.set(STORE_KEY, JSON.parse(JSON.stringify(record)));
    return true;
  } catch (err) {
    return false; // persistence is best-effort; losing one write never blocks the turn
  }
}

async function registerCommand($) {
  try {
    await $.command.register({
      name: 'mascot',
      description: 'Choose the mascot above the prompt and when it shows (daily, always, off).',
      argumentHint: '[cat|dog|hen|lake|oven|random] [daily|always|off] [now]',
    });
  } catch (err) {
    // without the command the settings still stand in /config
  }
}

/** Mirrors one setting into the `/config` menu's row; false when the row could not be changed from here. */
async function setConfigRow($, field, value) {
  try {
    const res = await $.config.set({ key: `${PLUGIN_NAME}.${field}`, value });
    return !(res && res.deny);
  } catch (err) {
    return false;
  }
}

/** `/mascot …`: reads the words, stores the choice, and answers with the settings now in force. */
async function runCommand($, args) {
  const { changes, isNow, unknown } = parseCommand(args);
  const record = await loadRecord($);
  const before = effectiveSettings(cfg, record.settings);
  if (unknown.length) return settingsText(before, `Not a mascot or a setting: ${unknown.join(', ')}. Nothing was changed.`);

  const after = { ...before, ...changes };
  const isChanged = after.show !== before.show || after.mascot !== before.mascot;
  if (!isChanged && !isNow) return settingsText(before);

  // The store holds the choice first, so it stands even where the /config
  // rows cannot be written; each row that does take the value is recorded
  // in `basedOn`, which is how a later change in /config wins again.
  const optionsAfter = { ...cfg };
  if (isChanged) record.settings = makeOverride(after, optionsAfter);
  if (isNow) record.showNext = true;
  const isSaved = await saveRecord($, record);
  if (isChanged) {
    for (const field of ['show', 'mascot']) {
      if (after[field] === cfg[field]) continue;
      if (await setConfigRow($, field, after[field])) {
        optionsAfter[field] = after[field];
        record.settings = makeOverride(after, optionsAfter);
        await saveRecord($, record);
      }
    }
    cfg = resolveOptions(optionsAfter);
  }

  const notes = [];
  if (!isSaved) notes.push('Could not save that here. Open /config and change it under Mind the Mug.');
  else if (isChanged) notes.push('Saved.');
  if (isNow) notes.push('It will show after the next answer.');
  return settingsText(after, notes.join(' '));
}

/** The main loop's turn just ended: decide whether this last response gets a show, and start it. */
async function handleTurnComplete($, e) {
  const calls = toolCalls;
  toolCalls = 0;
  const now = await $.clock.now();
  const today = dayKey(now);
  const record = await loadRecord($);
  const settings = effectiveSettings(cfg, record.settings);
  if (!isDue({ show: settings.show, lastDay: record.lastDay, today, reason: e.reason, isForced: record.showNext })) return;

  const sessionId = await $.session.id();
  const turns = await $.session.turns();
  const seed = hashSeed(sessionId + ':' + turns + ':' + now);
  const mascot = settings.mascot === 'random' ? pickFrom(seed, MASCOT_IDS) : settings.mascot;
  const show = showing.createShow({
    mascot,
    outcome: rollOutcome(seed),
    reason: e.reason,
    toolCalls: calls,
    kept: record.mascots[mascot].kept,
    at: now,
    durationMs: e.durationMs,
  });
  recordShow(record, show, today);
  await saveRecord($, record);

  liveShow = show;
  shows.push(show);
  generation += 1;
  startTicker($);
  pollTickerStop($, generation);

  // TurnDuration never mounts for an interrupted turn, so its line goes to the status line for a few seconds.
  if (show.ending !== 'reveal') setTimedStatus($, `${getMascot(mascot).name} · ${showing.outcomeText(show)}`, NOTICE_STATUS_MS);
}

/** The band: the words and the mascot, right-aligned, or one line where the band is too small for the sprite. */
async function renderBand($, e) {
  const show = liveShow;
  if (!bandFitsSprite(e.props)) return bandTree([renderTree(showing.fallbackLine(show))], e.props.bodyColumns);
  const now = await $.clock.now();
  const sprite = renderTree(showing.frame(show, now));
  const caption = bandFitsCaption(e.props, showing.captionWidth(show)) ? captionTree(showing.captionLines(show)) : null;
  return bandTree([caption, sprite], e.props.bodyColumns);
}

// ---------------------------------------------------------------------------
// register(on, options) — the module's only export.
// ---------------------------------------------------------------------------

/** @type {import('claude-code').Register} */
export function register(on, options) {
  cfg = resolveOptions(options);

  on('session.start', async ($, e, next) => {
    try {
      resetTransientState();
      await registerCommand($);
      return next(e);
    } catch (err) {
      return next(e);
    }
  });

  // The matcher and the registered name are the literal 'mascot' (COMMAND_NAME
  // in lib/mod-helpers.js), so the scanner can read which command is hooked.
  on('command.run', { command: 'mascot' }, async ($, e) => {
    try {
      return { text: await runCommand($, e.args) };
    } catch (err) {
      return { text: COMMAND_FAILED };
    }
  }).catch(() => ({ text: COMMAND_FAILED }));

  on('prompt.submit', async ($, e, next) => {
    // The chain runs FIRST: a downstream hook can stop the prompt with
    // `{ drop: reason }`, and a prompt that was never sent hides nothing.
    // next(e) is intentionally NOT wrapped in the try below: it must be
    // called exactly once. A slash command is not a prompt either; if it
    // starts a turn, `turn.start` hides the mascot.
    const result = await next(e);
    try {
      if (!(result && result.drop) && !e.command) hideShow($);
    } catch (err) {
      // hiding is our own visual bookkeeping — never let it affect the prompt
    }
    return result;
  }).catch(($, e, next) => next(e)); // not a guard: a failure here lets the prompt through

  on('turn.start', async ($, e, next) => {
    try {
      if (!e.agentId) {
        toolCalls = 0;
        hideShow($);
      }
    } catch (err) {
      // never let our own bookkeeping alter or block the turn
    }
    return next(e);
  });

  on('turn.step', async function* ($, e, next) {
    // Streams: every chunk from beneath is yielded through unchanged and the
    // result is returned as is. The only side effect is counting the tool
    // calls the main loop asked for.
    const result = yield* next(e);
    try {
      if (!e.agentId && result && result.toolUses) toolCalls += result.toolUses.length;
    } catch (err) {
      // a failed count never alters the step's result
    }
    return result;
  });

  on('turn.complete', async ($, e, next) => {
    try {
      if (!e.agentId) await handleTurnComplete($, e);
    } catch (err) {
      // never let our own bookkeeping alter or block the turn's answer
    }
    return next(e);
  });

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    try {
      if (e.surface !== 'terminal') return next(e);
      if (e.props.hasSurvey) return next(e); // a survey owns the band; yield to it
      if (!liveShow) return next(e); // no show: the band is not ours
      // Ticker lifecycle is owned solely by turn.complete / hideShow; a
      // render hook must never restart it.
      return await renderBand($, e);
    } catch (err) {
      return next(e);
    }
  });

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    try {
      if (e.surface !== 'terminal') return next(e);
      if (e.props.isExpanded) return next(e); // ctrl+o shows the engine's own line
      const show = shows.resolve(e.requestId, e.props.durationMs);
      if (!show) return next(e);
      return renderTree(showing.resultLine(show));
    } catch (err) {
      return next(e);
    }
  });
}
