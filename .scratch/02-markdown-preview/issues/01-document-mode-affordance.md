# 01: Document-mode affordance

**Base:** spec/02
**Status:** done
**Blocked by:** none
**Surfaces:** terminal-code

## What to build

Make Source vs Preview an obvious, calm control in editor chrome for Markdown paths, keep `Ctrl+Alt+V` as the Herdr-safe toggle, and reflect document mode in status/tab cues without noise.

## What it delivers

A Markdown file can be switched between Source and Preview by click or chord with unambiguous mode feedback.

## Acceptance criteria

- Markdown tabs show a clear Source/Preview control; non-Markdown hides or disables it
- `Ctrl+Alt+V` toggles document mode and stays Herdr-safe
- Status or tab cue indicates Preview without cluttering non-Markdown files
- Dirty state remains visible while previewing
- `bun test` and `bun check` pass

## Comments

Landed into `spec/02` via https://github.com/ahmed-zhran/terminal-code/pull/4.
