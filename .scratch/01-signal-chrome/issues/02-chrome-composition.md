# 02: Chrome composition polish

**Base:** spec/01
**Status:** claimed
**Blocked by:** 01
**Surfaces:** terminal-code

## What to build

Apply the Signal hierarchy to activity marks, sidebar titles/dividers, tabs, and status composition so active vs inactive chrome is obvious and empty states share the same visual language.

## What it delivers

A demoable Signal shell where view switching and focus states feel designed end-to-end, without adding badges or extra chrome strips.

## Acceptance criteria

- Active activity rail item is visually stronger than inactive ones
- Sidebar title row and divider align with Signal hierarchy
- Active tab reads clearer than inactive tabs; dirty mark remains visible
- Status bar segments stay secondary to editor content
- No new floating chrome widgets
- `bun test` and `bun check` pass

## Comments
