#!/usr/bin/env node
// Mind the Mug — read-only record reporter (`/mind-the-mug:stats`).
//
// Prints what the mod has kept through `$.store`: the settings in force
// when `/mascot` set them, the last day a mascot showed, and what each one
// has brought back. Never writes anything.
//
// `$.store` persists to a JSON file under
//   ~/.claude/plugins/store/<plugin-name>_<load-kind>-<hash>.json
// one file per distinct way the plugin was loaded (--plugin-dir vs. a
// marketplace install), so this globs every `mind-the-mug*.json` there and reports
// each. Inside, the record lives under the key `mind-the-mug.record`
// (lib/mod-helpers.js STORE_KEY).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { STORE_KEY, SHOW_LABELS, normalizeRecord } from '../lib/mod-helpers.js';
import { MASCOT_IDS, MASCOTS, IDEA } from '../lib/mascots.js';

const STORE_DIR = process.env.MUG_STORE_DIR || path.join(os.homedir(), '.claude', 'plugins', 'store');

function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function listStoreFiles() {
  try {
    return fs
      .readdirSync(STORE_DIR)
      .filter((f) => f.startsWith('mind-the-mug') && f.endsWith('.json'))
      .map((f) => path.join(STORE_DIR, f));
  } catch {
    return [];
  }
}

function report(stored) {
  const rec = normalizeRecord(stored);
  const o = rec.outcomes;
  if (rec.settings) console.log(`    set by /mascot: ${rec.settings.mascot}, ${SHOW_LABELS[rec.settings.show]}`);
  console.log(`    shown:      ${rec.shows} time${rec.shows === 1 ? '' : 's'}, last on ${rec.lastDay || 'no day yet'}`);
  console.log(`    came back:  A LIFE ${o.life} · CLIENT ${o.client} · FEATURE ${o.feature} · nothing ${o.none}`);
  console.log(`    cut short:  interrupted ${o.abort} · errors ${o.error}`);
  for (const id of MASCOT_IDS) {
    const m = rec.mascots[id];
    if (m.tally > 0) console.log(`    ${id.padEnd(5)}       ${MASCOTS[id].tally(m.tally)}`);
  }
}

function main() {
  console.log('Mind the Mug — what came back\n');
  let found = 0;
  for (const f of listStoreFiles()) {
    const data = safeReadJson(f);
    const stored = data && typeof data === 'object' ? data[STORE_KEY] : null;
    if (!stored || typeof stored !== 'object') continue;
    found++;
    console.log(`  ${f}`);
    report(stored);
    console.log('');
  }
  if (!found) {
    console.log('Nothing yet: the mascot shows after the first answer of the day with the plugin active.');
    console.log(`Looked for ${path.join(STORE_DIR, 'mind-the-mug*.json')} with key ${JSON.stringify(STORE_KEY)}.\n`);
  }
  console.log('None of it measures the work. The odds are fixed: FEATURE 10%, CLIENT 4%, A LIFE 1%, nothing 85%.');
  console.log(`${IDEA[0]} ${IDEA[1]}`);
}

main();
