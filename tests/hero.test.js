import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { heroSvg } from '../scripts/dev/readme-hero.js';

test('the README picture is generated from the plugin, deterministically, and the committed file is up to date', () => {
  const svg = heroSvg();
  assert.equal(svg, heroSvg());
  assert.equal(fs.readFileSync(new URL('../docs/hero.svg', import.meta.url), 'utf8'), svg, 'docs/hero.svg is stale: run `node scripts/dev/readme-hero.js`');
});

test('it says the reminder, shows the turn line, and stays small', () => {
  const svg = heroSvg();
  assert.match(svg, />Don't delegate your reasoning\.</);
  assert.match(svg, />Or you'll get a mug\.</);
  assert.match(svg, />the mug, again</);
  assert.doesNotMatch(svg, /NaN|undefined|null/);
  assert.ok(svg.length < 80 * 1024, `${svg.length} bytes`);
  assert.equal((svg.match(/<svg/g) || []).length, (svg.match(/<\/svg>/g) || []).length);
});

test('without animation it is the resting state, and a frozen moment pauses the loop', () => {
  const svg = heroSvg();
  assert.match(svg, /prefers-reduced-motion:reduce\)\{\.a,\.blink\{animation:none\}\}/);
  assert.match(svg, /\.spin\{opacity:0;/); // the spinner is hidden unless the loop shows it
  assert.match(svg, /@keyframes strip\{0%\{transform:translateX\(0\)\}/); // strip position 0 is the resting frame
  const frozen = heroSvg({ at: 5000 });
  assert.match(frozen, /animation-play-state:paused;animation-delay:-5000ms/);
  assert.doesNotMatch(frozen, /prefers-reduced-motion/);
});
