# Release 1 — Design quality

Frame: make terminal-code *feel* excellent before adding more features.

## Goals

1. **Signal polish** — ink/mint tokens, contrast, and brand cues read as intentional, not default-dark.
2. **Chrome hierarchy** — activity rail → sidebar → editor chrome → content depth is obvious at a glance.
3. **Markdown document mode** — Source vs Preview is clear, calm, and Herdr-safe (`Ctrl+Alt+V` stays).

## Non-goals

- Redesigning every alternate theme palette
- Remapping the Herdr-safe shortcut table
- New chrome widgets, badges, or status clutter
- Non-design feature work (unless it unblocks a design ticket)

## Specs (base `release/1`)

1. `.scratch/01-signal-chrome/spec.md` — Signal + chrome hierarchy
2. `.scratch/02-markdown-preview/spec.md` — Markdown document-mode UX

## Gate

Do not start ticket implementation or tag until Ahmed approves (a) craft skills and (b) this release plan in the setup pane.
