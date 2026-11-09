# Architecture

Mind the Mug is one Claude Code mod (plugin id `mind-the-mug`). After the last
response of a turn, once a day by default, it draws a 40 × 10-cell pixel-art
mascot in the `AbovePrompt` band, bottom-right, with a few words beside it,
and keeps it there until the next prompt is sent. The words are the point,
a kind reminder: don't delegate your reasoning, or you'll get a mug
([CONCEPT.md](CONCEPT.md)).

```
hooks/mug.js ── the only file that touches the engine ($ / on / next)
      │
      ├─ lib/mod-helpers.js   settings, /mascot grammar, once-a-day rule, the record, band layout
      ├─ lib/show.js          one showing: timeline → pixel buffer → Frame, turn line, caption
      │     ├─ lib/mascots.js     the five mascots and their words
      │     ├─ lib/scenes/*.js    cat, dog, hen, lake, oven: draw(buffer, state, now)
      │     └─ lib/pixels.js      40 × 20 buffer, 3×5 font, maths
      ├─ lib/rng.js           the odds table and the seeded roll
      └─ lib/render-tree.js   Frame → element tree   (lib/render-ansi.js → ANSI, for bin/demo.js)
```

Everything under `lib/` is pure ESM with no dependencies and no engine
access, so it runs unchanged in the mod, in `bin/demo.js`, in
`scripts/dev/contact-sheet.js` and under `node --test`.

## 1. The mod module (`hooks/mug.js`)

| Event | What the mod does |
| --- | --- |
| `session.start` | Clears its in-memory state and registers the `/mascot` command. |
| `turn.start` (main loop) | Resets the tool-call count; hides a mascot still on screen. |
| `turn.step` (streaming) | Passes every chunk through; counts the main loop's tool calls. |
| `turn.complete` (main loop) | Decides whether this last response gets a show, rolls it, records it, starts it. |
| `prompt.submit` | After the chain has run and nothing dropped the prompt: hides the mascot. A slash command is not a prompt. |
| `ui.render` `AbovePrompt` | Draws the show while one is live; otherwise `next(e)`: the band is not ours. |
| `ui.render` `TurnDuration` | Draws the mascot's turn line for the turn that got the show; every other line is the engine's. |
| `command.run` `mascot` | Reads the words, stores the choice, answers with the settings in force. |

Three rules make "only the last response" true:

1. A show is created in `turn.complete` and nowhere else. Nothing is drawn
   while a turn runs, so no response in the middle of a turn can have one.
2. `turn.*` events with `e.agentId` belong to a subagent's loop and are
   ignored: a subagent's answer is not the turn's last response.
3. The show is removed at the next `prompt.submit` (or `turn.start`, for a
   turn that starts without a typed prompt).

### When a turn gets a show (`isDue`)

| Setting | Shows after… |
| --- | --- |
| `daily` (default) | the first turn of the local day that ended with an answer (or a refusal). An interrupted or failed turn neither shows nor uses up the day. |
| `always` | every turn, interrupted and failed ones included (as the mascot's abort / error scene). |
| `off` | nothing. |
| `/mascot now` | the next turn, whatever the setting (a one-shot flag in the record). |

The day already shown is read from `$.store` at each `turn.complete`, so it
is shared by every session on the machine.

### Settings

Two settings, declared as `userConfig` in `.claude-plugin/plugin.json`, both
string pickers: `show` (`daily` · `always` · `off`) and `mascot` (`cat` ·
`dog` · `hen` · `lake` · `oven` · `random`). They arrive as `register`'s
`options` and are rows in `/config`.

`/mascot` changes them without the menu. It stores the choice in the record
together with the options it was made over (`basedOn`) and then mirrors each
changed field into its `/config` row with `$.config.set`. The settings in
force (`effectiveSettings`) are, per field: the stored choice while the row
still holds what it held then (or already holds the choice), otherwise the
row. So the last change wins whichever way it was made, and the command
works even where the rows cannot be written.

### State

| Where | What | Lifetime |
| --- | --- | --- |
| module variables | the live show, the tool-call count, the ticker, the queue binding a show to its `TurnDuration` line | until reload / `session.start` |
| `$.store` key `mind-the-mug.record` | `lastDay`, `showNext`, `settings` (the `/mascot` choice), `shows`, `outcomes`, and per mascot `tally` + `kept` (the last four things it brought back, drawn in the scene) | across sessions |

A redraw ticker (`$.clock.every`, 100 ms) runs only while a show is still
moving, about 7 to 9 seconds, and is stopped by a poll once the show rests.
A resting show costs nothing: no timers, and the frame is frozen.

Every hook body is wrapped in try/catch and falls back to `next(e)`; the
mascot not showing is always the failure mode.

## 2. The engine (`lib/`)

**A show** (`lib/show.js`) is plain JSON: `{ mascot, outcome, ending, at,
taps, kept, tally, durationMs }`. Every function is pure in `(show, now)`:

```
at                start    the ask                      1.0 s
at + 1.0 s        work     1.2 s + 0.5 s per tap        taps = tool calls of the turn, at most 4
then              reveal   what came back               4.4 s   (abort / error: 2.8 s)
after that        rest     the last frame, held still   until the next prompt
```

`stageAt(show, now)` maps that to the scene's phase, the instant the phase
began, and the clock the scene draws with (frozen at rest). `draw` calls the
mascot's scene into a 40 × 20 pixel buffer; `bufToFrame` packs pixel rows 2k
and 2k+1 into cell row k of `▀`, foreground = top pixel, background = bottom
pixel, so every one of the 400 cells is painted with two colours and no
stale text can show through.

**A scene** (`lib/scenes/*.js`) is `{ draw(buffer, state, now), keeps(outcome) }`
with `state = { phase, t0, outcome, pulses, kept }` and phases `idle`,
`start`, `work`, `reveal`, `abort`, `error`. Scenes are procedural: sprites
are small string grids, everything else is rectangles, lines and curves.
There is no sprite sheet and no build step.

**The roll** (`lib/rng.js`): `rollOutcome(seed)` walks the table A LIFE 1%,
CLIENT 4%, FEATURE 10%, nothing 85% with one draw of a seeded mulberry32;
the seed is a hash of session id, turn count and the clock. It is rolled
when the turn ends and is independent of everything about the turn.

**The Frame model** (`lib/frame.js`): `{ width, lines: Span[][] }` with
`Span = { text, color?, bg?, bold?, dim? }`, rendered to an element tree for
the mod (`render-tree.js`, allow-listed Text props only) or to ANSI for the
demo (`render-ansi.js`).

**The band** (`bandTree`): a full-width row Box, `justifyContent: flex-end`,
`alignItems: flex-end`, holding the caption column (right-aligned, 2 cells
of margin) and the sprite. The caption is dropped when `bodyColumns` has no
room for it beside the sprite; when the band has fewer than 40 columns or
10 rows the whole thing falls back to one line of text.

## 3. Art

The scenes come from the "Lighter worlds" direction study (five worlds
drawn at the mod's real size); `lib/scenes/*.js` are those drawings, and
[ART-SPEC.md](ART-SPEC.md) describes them. `scripts/dev/contact-sheet.js`
renders `docs/mascots.png` and the plugin icon from the same code.

`art/` is the Remotion project of the launch video. `LaunchV3` imports
`lib/scenes/` through `art/src/launch-v3/engine.ts`, so the video shows
exactly what the mod draws; the plugin reads nothing from `art/`. `Launch`
and `LaunchV2` there are the videos of version 1 (the slot machine).

## 4. Verification gates

1. `claude plugin validate .` passes with zero errors.
2. `node --test tests/*.test.js`: scenes paint a full 40 × 10 frame at
   every moment for every mascot and outcome; a resting show never changes;
   the odds match the table; the once-a-day rule; the `/mascot` grammar;
   and `tests/hooks.test.js`, which drives `hooks/mug.js` end to end with
   a stand-in engine (first answer of the day shows, the next prompt hides,
   the same day stays quiet, the next day shows again, subagents and
   interrupted turns are ignored, `/mascot` takes effect).
3. `node bin/demo.js all` and `node scripts/dev/contact-sheet.js` for a
   look at the art.
4. `scripts/dev/pty-smoke.py` in a real terminal, both layouts: the 40 × 10
   rectangle appears only after the answer and is gone once the next prompt
   is sent.
