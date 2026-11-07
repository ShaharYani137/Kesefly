# investApp — Project Rules

## Logging (mandatory)
- After every action (file create/edit/delete, command run, install, decision), append a row to `logs/ACTION_LOG.md`.
- At the start of each session, add a new `## Session N — YYYY-MM-DD` section to `logs/SESSION_LOG.md`. Keep it updated with goal, work done, decisions, and next steps before the session ends.

## Communication
- Use the `caveman` skill (`.claude/skills/caveman`) for all chat responses. Its rules exempt code, docs, commits, and log files, which stay in normal prose.

## Design
- iOS / Apple platform UI: follow the `apple-human-interface-guidelines` skill. Base measurements and component choices on its `references/` files.
- Android UI: follow the `m3-expressive` skill (Material 3 Expressive). Take tokens and values from its `references/` files. Label any value not in M3 as a design decision.
