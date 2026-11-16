# 01: Signal token hierarchy

**Base:** spec/01
**Status:** claimed
**Blocked by:** none
**Surfaces:** terminal-code

## What to build

Tighten Signal theme tokens so activity rail, sidebar, editor chrome, and content read as four clear depth layers (rail deepest → content most readable), with brand/title cues that feel intentional.

## What it delivers

Opening the app on Signal shows an obvious ink/mint hierarchy without new widgets; alternate themes keep working with the same structural roles.

## Acceptance criteria

- Signal activity background is distinctly deeper than sidebar background
- Brand/title accents remain mint/teal and readable on rail and sidebar headers
- Editor text contrast stays stronger than inactive tab/status muted text
- Default Herdr-safe chords unchanged
- `bun test` and `bun check` pass

## Comments
