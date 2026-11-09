// Mind the Mug — pure helpers for the mod module (lib/mod-helpers.js)
//
// Everything hooks/mug.js needs that is ordinary data-in/data-out: the two
// settings and the `/mascot` command's grammar, the once-a-day rule, the
// record kept in `$.store`, the queue that binds a finished show to the
// TurnDuration instance that will draw its line, and the band's layout.
// No `$`, no `on`, no `next` — importable and testable from plain Node.

import { MASCOTS, MASCOT_IDS, MASCOT_CHOICES, DEFAULT_MASCOT, findMascot, getMascot, IDEA } from './mascots.js';
import { KEPT_MAX, SPRITE_COLUMNS, SPRITE_ROWS } from './show.js';

export const STORE_KEY = 'mind-the-mug.record';
export const PLUGIN_NAME = 'mind-the-mug';
export const COMMAND_NAME = 'mascot';
export const PENDING_CAP = 50;

// ---------------------------------------------------------------------------
// Settings: when it shows, and who shows up.
// ---------------------------------------------------------------------------

/** `daily`: after the first answer of the day (the default). `always`: after every answer. `off`: never. */
export const SHOW_MODES = Object.freeze(['daily', 'always', 'off']);
export const DEFAULT_SHOW = 'daily';

export const SHOW_LABELS = Object.freeze({
  daily: 'once a day, after the first answer of the day',
  always: 'after every answer',
  off: 'never (switched off)',
});

/** The plugin's options (plugin.json `userConfig`), with anything unknown falling back to the defaults. */
export function resolveOptions(options) {
  const o = options || {};
  const show = String(o.show || '').toLowerCase();
  const mascot = String(o.mascot || '').toLowerCase();
  return {
    show: SHOW_MODES.includes(show) ? show : DEFAULT_SHOW,
    mascot: MASCOT_CHOICES.includes(mascot) ? mascot : DEFAULT_MASCOT,
  };
}

/**
 * The settings in force. `/mascot` keeps its choice in the store beside the
 * options it was made over (`basedOn`), and the last change wins, field by
 * field: the stored choice stands while the `/config` row still holds what
 * it held then (or already holds the choice itself); a row changed in
 * `/config` since then takes over again.
 */
export function effectiveSettings(options, override) {
  const base = resolveOptions(options);
  if (!override || typeof override !== 'object') return base;
  const b = override.basedOn || {};
  const pick = (field) => (override[field] && (base[field] === b[field] || base[field] === override[field]) ? override[field] : base[field]);
  return resolveOptions({ show: pick('show'), mascot: pick('mascot') });
}

/** The override `/mascot` stores: the settings chosen, over the options as they will stand. */
export function makeOverride(settings, optionsAfter) {
  const basedOn = resolveOptions(optionsAfter);
  return { show: settings.show, mascot: settings.mascot, basedOn };
}

const SHOW_WORDS = {
  daily: 'daily', day: 'daily', once: 'daily', on: 'daily',
  always: 'always', every: 'always', each: 'always',
  off: 'off', never: 'off', none: 'off', stop: 'off', hide: 'off',
};
const RANDOM_WORDS = ['random', 'any', 'surprise', 'shuffle'];
const NOW_WORDS = ['now', 'preview', 'next'];
const RESET_WORDS = ['default', 'defaults', 'reset'];
const FILLER_WORDS = ['a', 'the', 'per', 'prompt', 'prompts', 'turn', 'answer', 'time', 'mascot', 'show', 'mode', 'set', 'use', 'to', 'on', 'me'];

/**
 * Read what a person typed after `/mascot`. Words may come in any order:
 * `dog`, `always`, `random daily`, `every prompt hen`, `once a day`, `off`, `reset`.
 * @returns {{changes: {show?: string, mascot?: string}, isNow: boolean, unknown: string[]}}
 */
export function parseCommand(args) {
  const words = String(args || '').toLowerCase().split(/[\s,=:]+/).filter(Boolean);
  const changes = {};
  const unknown = [];
  let isNow = false;
  for (const w of words) {
    const mascot = findMascot(w);
    if (mascot) changes.mascot = mascot;
    else if (RESET_WORDS.includes(w)) Object.assign(changes, { show: DEFAULT_SHOW, mascot: DEFAULT_MASCOT });
    else if (RANDOM_WORDS.includes(w)) changes.mascot = 'random';
    else if (NOW_WORDS.includes(w)) isNow = true;
    else if (SHOW_WORDS[w] && !(w === 'on' && words.length > 1)) changes.show = SHOW_WORDS[w];
    else if (!FILLER_WORDS.includes(w)) unknown.push(w);
  }
  return { changes, isNow, unknown };
}

function mascotLabel(id) {
  return id === 'random' ? 'a random one each time' : `${id} · ${MASCOTS[id].name} (${MASCOTS[id].thing})`;
}

/** What `/mascot` prints: the settings in force, then every way to change them. */
export function settingsText(cfg, note) {
  const lines = [];
  if (note) lines.push(note, '');
  lines.push(
    `Mascot: ${mascotLabel(cfg.mascot)}`,
    `Shows:  ${SHOW_LABELS[cfg.show]}, and stays until your next prompt`,
    '',
    'Change it by typing the words you want, in any order:',
    `  /mascot ${MASCOT_IDS.join(' | ')} | random`,
    '  /mascot daily | always | off',
    '  /mascot now        show it after the next answer, whatever the setting',
    '',
    ...MASCOT_IDS.map((id) => `  ${id.padEnd(5)} ${MASCOTS[id].name} — ${MASCOTS[id].tag}`),
    '',
    `${IDEA[0]} ${IDEA[1]}`,
  );
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// The once-a-day rule.
// ---------------------------------------------------------------------------

/** The local calendar day of an epoch-millisecond instant, as `YYYY-MM-DD`. */
export function dayKey(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Whether the turn that just ended gets a show.
 *
 * `daily` shows after the first turn of the day that ended with an answer:
 * an interrupted or failed turn has no last response, so it neither shows
 * nor uses up the day. `always` shows after every turn, those included.
 * `isForced` (`/mascot now`) shows whatever the setting.
 */
export function isDue({ show, lastDay, today, reason, isForced }) {
  if (isForced) return true;
  if (show === 'off') return false;
  if (show === 'always') return true;
  if (reason === 'aborted' || reason === 'error') return false;
  return lastDay !== today;
}

// ---------------------------------------------------------------------------
// The record in `$.store`: the last day shown, and what each mascot has brought back.
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   lastDay: string|null, shows: number, showNext: boolean, settings: object|null,
 *   outcomes: Record<string, number>,
 *   mascots: Record<string, {tally: number, kept: string[]}>,
 * }} Record
 */

/** @returns {Record} */
export function emptyRecord() {
  return {
    lastDay: null,
    shows: 0,
    showNext: false,
    settings: null,
    outcomes: { none: 0, feature: 0, client: 0, life: 0, abort: 0, error: 0 },
    mascots: Object.fromEntries(MASCOT_IDS.map((id) => [id, { tally: 0, kept: [] }])),
  };
}

/** A stored value as a well-formed record (anything malformed is dropped). */
export function normalizeRecord(stored) {
  const rec = emptyRecord();
  if (!stored || typeof stored !== 'object') return rec;
  if (typeof stored.lastDay === 'string') rec.lastDay = stored.lastDay;
  if (Number.isFinite(stored.shows)) rec.shows = Math.max(0, stored.shows);
  rec.showNext = stored.showNext === true;
  if (stored.settings && typeof stored.settings === 'object' && stored.settings.basedOn && typeof stored.settings.basedOn === 'object') {
    rec.settings = makeOverride(resolveOptions(stored.settings), stored.settings.basedOn);
  }
  if (stored.outcomes && typeof stored.outcomes === 'object') {
    for (const k of Object.keys(rec.outcomes)) if (Number.isFinite(stored.outcomes[k])) rec.outcomes[k] = Math.max(0, stored.outcomes[k]);
  }
  if (stored.mascots && typeof stored.mascots === 'object') {
    for (const id of MASCOT_IDS) {
      const m = stored.mascots[id];
      if (!m || typeof m !== 'object') continue;
      if (Number.isFinite(m.tally)) rec.mascots[id].tally = Math.max(0, m.tally);
      if (Array.isArray(m.kept)) rec.mascots[id].kept = m.kept.filter((o) => typeof o === 'string').slice(-KEPT_MAX);
    }
  }
  return rec;
}

/**
 * Write a finished show into the record: the day, the counts, and (for an
 * answered turn) what the mascot now keeps on display. Mutates `record` and
 * sets `show.tally`; returns `show`.
 */
export function recordShow(record, show, today) {
  const m = getMascot(show.mascot);
  const mine = record.mascots[m.id];
  record.lastDay = today;
  record.showNext = false;
  record.shows += 1;
  if (show.ending === 'reveal') {
    record.outcomes[show.outcome] += 1;
    if (m.counts(show.outcome)) mine.tally += 1;
    if (m.scene.keeps(show.outcome)) mine.kept = [...mine.kept, show.outcome].slice(-KEPT_MAX);
  } else {
    record.outcomes[show.ending] += 1;
  }
  show.tally = mine.tally;
  return show;
}

// ---------------------------------------------------------------------------
// The queue binding a finished show to its TurnDuration line.
// ---------------------------------------------------------------------------

/**
 * Finished shows waiting for (or bound to) a TurnDuration instance. Each
 * TurnDuration mounts with a fresh requestId, so a show is matched by its
 * exact `durationMs`; a line whose duration matches none is not ours.
 */
export class ShowQueue {
  constructor(cap = PENDING_CAP) {
    this.cap = cap;
    this.pending = [];
    this.bound = new Map();
  }

  push(show) {
    this.pending.push(show);
    if (this.pending.length > this.cap) this.pending.splice(0, this.pending.length - this.cap);
  }

  /** @returns the show for this instance, binding it on first sight, or null when it belongs to another turn. */
  resolve(requestId, durationMs) {
    if (this.bound.has(requestId)) return this.bound.get(requestId);
    const idx = this.pending.findIndex((s) => s.durationMs === durationMs);
    if (idx === -1) return null;
    const show = this.pending.splice(idx, 1)[0];
    this.bound.set(requestId, show);
    if (this.bound.size > this.cap) this.bound.delete(this.bound.keys().next().value);
    return show;
  }

  clear() {
    this.pending = [];
    this.bound = new Map();
  }
}

// ---------------------------------------------------------------------------
// The band above the prompt.
// ---------------------------------------------------------------------------

export const CAPTION_GAP = 2;

/** Whether the band has room for the 40 x 10 sprite (`props` is the band's render input). */
export function bandFitsSprite(props) {
  if (!props) return false;
  const cols = Number(props.bodyColumns);
  const rows = Number(props.maxRows);
  return Number.isFinite(cols) && Number.isFinite(rows) && cols >= SPRITE_COLUMNS && rows >= SPRITE_ROWS;
}

/** Whether the caption also fits, to the left of the sprite. */
export function bandFitsCaption(props, captionColumns) {
  return bandFitsSprite(props) && Number(props.bodyColumns) >= SPRITE_COLUMNS + CAPTION_GAP + captionColumns;
}

/** Caption lines as a right-aligned column of Text elements (an empty line keeps its row). */
export function captionTree(lines) {
  const children = lines.map((l) => {
    const props = {};
    if (l.color) props.color = l.color;
    if (l.bold) props.bold = true;
    if (l.dim) props.dimColor = true;
    const el = { type: 'Text', children: [l.text || ' '] };
    if (Object.keys(props).length) el.props = props;
    return el;
  });
  return { type: 'Box', props: { flexDirection: 'column', alignItems: 'flex-end', marginRight: CAPTION_GAP }, children };
}

/**
 * A full-width row that pushes its children to the right edge and the bottom
 * of the band, so the mascot sits at the bottom-right of the screen whatever
 * the terminal width. `columns` is the band's `bodyColumns`.
 */
export function bandTree(children, columns) {
  const props = { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' };
  const width = Number(columns);
  if (Number.isFinite(width) && width > 0) props.width = width;
  return { type: 'Box', props, children: children.filter(Boolean) };
}
