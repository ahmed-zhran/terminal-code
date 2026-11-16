# Spec 01: Signal chrome hierarchy

**Base:** release/1
**Surfaces:** terminal-code (single app)
**Status:** ready-for-agent

## Problem Statement

The editor already uses Signal colors, but chrome layers (activity rail, sidebar, tabs, status) do not always read as a deliberate hierarchy. The product can feel like a dark terminal dump instead of a designed Signal shell.

## Solution

Polish Signal tokens and chrome composition so depth and brand are obvious: deepest activity rail, calmer sidebar, clearer editor chrome, most readable content. Preserve structure for other themes without redesigning their palettes. Add no new chrome widgets.

## User Stories

1. As a developer opening the app, I want Signal’s brand cue visible in chrome immediately, so that the product feels owned rather than generic.
2. As a developer scanning the UI, I want the activity rail darker than the sidebar, so that I can tell where I am without reading labels.
3. As a developer focused on a file, I want tabs and status quieter than the buffer text, so that content wins.
4. As a developer switching Explorer / Search / SCM / Settings, I want the active activity mark obvious, so that the current view is unambiguous.
5. As a developer resizing the sidebar, I want the divider and widths still feel intentional after polish, so that layout changes do not break hierarchy.
6. As a developer using a non-Signal theme, I want the same chrome structure to remain usable, so that polish does not strand alternate themes.
7. As a developer living in Herdr, I want existing Herdr-safe chords unchanged, so that muscle memory and Desktop chords stay conflict-free.
8. As a designer reviewing the release, I want empty states and titles to share Signal typography cues, so that chrome does not look unfinished next to the editor.

## Implementation Decisions

- Treat Signal as the design-reference theme (ADR-0002); adjust Signal tokens first.
- Prefer token/contrast/label hierarchy changes over new widgets (ADR-0004).
- Keep theme shape in the existing theme module; do not invent a second theme system.
- Structural hierarchy (rail → sidebar → editor chrome → content) must remain valid for every theme even if only Signal gets palette polish.
- Do not change default Herdr-safe chords (ADR-0003).
- Prefer extracting small presentational helpers only when it clarifies chrome layers; avoid a wide rewrite of the app shell.

## Testing Decisions

- Assert external behavior: theme token relationships that encode hierarchy (e.g. distinct activity vs sidebar backgrounds in Signal), and that default keys remain Herdr-safe.
- Prefer extending existing settings/theme tests over snapshotting full TUI frames.
- Manual visual check on Signal remains part of human testing for this release.

## Out of Scope

- Full redesign of Dark+, Dracula, and other alternate themes
- Markdown document-mode UX (spec 02)
- New views, LSP, or non-chrome features

## Further Notes

Craft while implementing: `design-taste-frontend` then `codebase-design` where module seams move. Release framing: `docs/releases/1/README.md`.
