# Apple Human Interface Guidelines — Agent Skill

An [Agent Skill](https://agentskills.io) that gives Claude (and other skill-compatible agents) the full text of Apple's [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) — all 172 pages, from Design principles and Foundations to Components, Inputs, and Technologies — so design answers and UI reviews come from what Apple actually documents.

## What's inside

```
SKILL.md              # When to use the skill, how to consult it, and an index of every page
references/*.md       # One file per HIG page, converted verbatim from developer.apple.com
scripts/sync_hig.py   # Re-downloads the HIG and rebuilds references/ and the index
```

- **Verbatim content only.** Every page is generated from the structured data Apple publishes for the HIG website (the same data the site renders). No summaries, rewrites, or added guidance.
- **Complete.** Headings, lists, tables (sizes, spacing, and other values), notes, and cross-links are preserved. Images and videos appear as Apple's own alt text and captions — including the correct/incorrect example markers.
- **Traceable.** Each file starts with its source URL, supported platforms, and Apple's latest change notice for that page.
- **Organized like the HIG.** The index in `SKILL.md` mirrors the HIG navigation and includes Apple's one-line summary for each page.

## Install

**Claude Code** (personal skill, available in every project):

```bash
git clone https://github.com/valentinllpz/apple-human-interface-guidelines.git \
  ~/.claude/skills/apple-human-interface-guidelines
```

Or clone into a project's `.claude/skills/` directory to share it with that project's collaborators.

Claude loads the skill automatically when a task involves designing or reviewing an interface for Apple platforms, or when you ask what the HIG says.

## Update to the latest HIG

Apple updates the guidelines regularly. To pull the current version (Python 3, standard library only):

```bash
python3 scripts/sync_hig.py
```

## Disclaimer

The Human Interface Guidelines content is © Apple Inc. All rights reserved. It is reproduced here from developer.apple.com for reference. This project is not affiliated with, endorsed by, or sponsored by Apple. For the authoritative version, always refer to [developer.apple.com/design/human-interface-guidelines](https://developer.apple.com/design/human-interface-guidelines).
