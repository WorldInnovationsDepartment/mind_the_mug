---
description: Show what the Mind the Mug mascots have brought back so far
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/stats.js" *)
argument-hint: ""
---

Run this exact command and relay its full output to the user verbatim:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/stats.js"
```

Notes for you (the assistant), not for the script:

- This is read-only — it never modifies the record or any setting.
- It reads the mod's `$.store` file under `~/.claude/plugins/store/`
  (key `mind-the-mug.record`). If nothing exists yet, relay the script's
  "nothing yet" message rather than inventing numbers.
- The numbers do not measure the user's work and are not a score; do not
  present them as one.
