---
description: Preview a Mind the Mug mascot (cat, dog, hen, lake, oven) without waiting for a turn
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/demo.js" *)
argument-hint: "[cat|dog|hen|lake|oven|random|all] [none|feature|client|life|abort|error]"
---

Run this exact command and relay its full output to the user verbatim — it is
already a complete, self-contained picture and its words, not something to
summarize or re-describe:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/demo.js" $ARGUMENTS
```

Notes for you (the assistant), not for the script:

- This never touches the real record — it is a standalone render using the
  same `lib/` engine, purely for previewing a mascot without a live turn.
- `$ARGUMENTS` may name a mascot (`cat`, `dog`, `hen`, `lake`, `oven`,
  `random`, or `all` for every one) and what comes back (`none`, `feature`,
  `client`, `life`, `abort`, `error`), in any order; with no arguments it is
  the cat, rolled at the real odds. `--help` lists the flags.
- Run from here the script prints the mascot's resting frame (the animation
  only plays in a real terminal: `node bin/demo.js dog life`).
- Print the script's stdout exactly as received (inside a fenced code block
  if the surrounding chat strips ANSI) — do not re-render or re-describe the
  frames yourself.
- To change which mascot shows, or when, the user types `/mascot`.
