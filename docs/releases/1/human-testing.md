# Human testing: release/1

Derived from this release's user stories and acceptance criteria. Grouped by surface. The human marks each check, adds notes on fails or observations, then signs off. The release does **not** tag until Sign-off is **Approved**. After the tag, the filled file is feedback for next-release prep (unchecked items, fails, and notes → tickets / pending-release work).

**How to fill:** open this file in an interactive markdown preview when available (e.g. Herdr `md-preview`) so checkboxes and notes write back here. Otherwise edit the markdown directly.

**Run:** from `/data/projects/terminal-code` on `release/1`, use the Signal theme (default): `bun run` / the app's usual start command.

## Surfaces under test

- terminal-code: OpenTUI + React Bun terminal editor (Signal chrome + Markdown document mode)

## Checklist

### terminal-code

#### Spec 01 — Signal chrome hierarchy

- [ ] On launch with Signal, brand/mint cues are visible in chrome (activity rail / sidebar titles), not a flat dark dump
  - Notes:
- [ ] Activity rail is clearly darker/deeper than the sidebar
  - Notes:
- [ ] Editor buffer text reads stronger than inactive tabs and status muted text
  - Notes:
- [ ] Switching Explorer / Search / SCM / Settings shows an obvious active activity mark vs inactive
  - Notes:
- [ ] Sidebar title row and divider still feel intentional after resize
  - Notes:
- [ ] Empty states / titles share Signal typography cues with the rest of chrome
  - Notes:
- [ ] Switch briefly to a non-Signal theme: chrome structure still usable (no broken layout)
  - Notes:
- [ ] Default Herdr-safe chords unchanged (spot-check Preview `Ctrl+Alt+V` and a couple of editor chords you use)
  - Notes:

#### Spec 02 — Markdown document mode

- [ ] Open a `.md` file: Source / Preview control is clear in editor chrome
  - Notes:
- [ ] Open a non-Markdown file: Preview control is hidden or inert
  - Notes:
- [ ] Click Source ↔ Preview; mode is unambiguous
  - Notes:
- [ ] `Ctrl+Alt+V` toggles document mode the same way as the control
  - Notes:
- [ ] In Preview, rendered content dominates; surrounding chrome stays quiet
  - Notes:
- [ ] Dirty / unsaved mark remains discoverable while Preview is active
  - Notes:
- [ ] Status (or tab cue) reflects Preview without noisy chrome on non-Markdown files
  - Notes:
- [ ] Leave a Markdown tab and return: document mode behavior feels predictable (reset to Source is OK if intentional)
  - Notes:

## Sign-off

- Status: Approved | Blocked
- Approved / blocked by:
- Date:
- Summary (optional):

Sign-off is complete only when Status is **Approved** and Approved by / Date are filled. **Blocked** means the release stops until fails are fixed or explicitly deferred with tickets whose `**Base:**` is this release (before tag) or the next release (after tag, via the pending-release feedback box).
