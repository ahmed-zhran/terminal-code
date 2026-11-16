# Spec 02: Markdown document-mode UX

**Base:** release/1
**Surfaces:** terminal-code (single app)
**Status:** ready-for-agent

## Problem Statement

Markdown Source/Preview works, but document mode still feels bolted on: the affordance is easy to miss, preview chrome competes with content, and the mode switch is not clearly part of the editor’s hierarchy.

## Solution

Make Markdown **document mode** first-class: Source vs Preview is an obvious, calm control in editor chrome; Preview is content-first; status/tab cues stay consistent with Signal hierarchy; `Ctrl+Alt+V` remains the Herdr-safe toggle.

## User Stories

1. As a developer on a `.md` file, I want Source and Preview clearly labeled in editor chrome, so that I know which document mode I am in.
2. As a developer toggling with `Ctrl+Alt+V`, I want the mode to switch immediately, so that keyboard flow matches the clickable control.
3. As a developer in Preview, I want the rendered Markdown to dominate the pane, so that chrome does not fight readability.
4. As a developer in Preview, I want dirty/save state still discoverable, so that I do not lose track of unsaved edits.
5. As a developer opening a non-Markdown file, I want Preview controls hidden or inert, so that chrome stays honest.
6. As a developer switching away from a Markdown tab and back, I want document mode behavior to feel predictable, so that I am not surprised by a stuck Preview.
7. As a developer reading status text, I want Preview reflected in the status line without noise, so that mode is glanceable.
8. As a developer in Herdr, I want the Preview chord to stay Herdr-safe, so that Desktop shortcuts never collide.

## Implementation Decisions

- Keep document mode as Source vs Preview (glossary); do not invent a third mode this release.
- Preview continues to use OpenTUI’s markdown renderer; polish composition and chrome around it rather than replacing the renderer.
- Source/Preview control lives in existing editor chrome (tab region), not a new floating widget (ADR-0004).
- Preserve `preview: ctrl+alt+v` unless an unavoidable conflict appears; any change must stay Herdr-safe (ADR-0003).
- Align Preview chrome with Signal hierarchy from spec 01 when both land; soft product order is chrome polish first, then document mode.

## Testing Decisions

- Cover `isMarkdownPath` and preview toggle behavior at existing seams (settings chords, markdown path detection, app-level mode notices where already tested).
- Prefer behavior tests over renderer snapshot tests.
- Human testing walks Source ↔ Preview on a sample Markdown file under Signal.

## Out of Scope

- WYSIWYG editing inside Preview
- Sync-scroll or split Source|Preview
- Non-Markdown previewers
- Shortcut remapping beyond Herdr-safe rules

## Further Notes

Depends product-wise on Signal chrome polish for shared hierarchy language, but tickets must not cross-block to spec 01 (blocker checker). Ship after or beside chrome via release order. Craft: `design-taste-frontend` first.
