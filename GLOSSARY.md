# terminal-code

A terminal code editor: explore files, edit buffers, preview Markdown, and manage git — all inside a Signal-themed OpenTUI shell that stays out of Herdr Desktop's shortcut map.

## Language

**Chrome**:
The persistent non-document UI around the editor: activity rail, sidebar header, tabs, status bar, and dividers.
_Avoid_: Frame, shell chrome, window decoration

**Activity rail**:
The leftmost narrow strip that switches Explorer, Search, Source Control, and Settings.
_Avoid_: Icon bar, toolbar, navbar

**Sidebar**:
The resizable panel beside the activity rail that shows the active view's list or form.
_Avoid_: Drawer, panel (alone), explorer pane (for the whole thing)

**Editor pane**:
The main area that shows open file tabs and either the source buffer or a Markdown preview.
_Avoid_: Content area, main panel

**Document mode**:
Whether the editor pane shows Markdown **Source** (editable buffer) or **Preview** (rendered Markdown). Only meaningful for Markdown paths.
_Avoid_: Preview mode (as the umbrella term), view mode

**Signal**:
The default ink-and-mint theme and the visual reference for chrome hierarchy and polish.
_Avoid_: Default theme (when naming the design system), mint theme

**Herdr-safe chord**:
A keybinding chosen so it does not collide with Herdr Desktop defaults (`~/.config/herdr-app/keys.json`).
_Avoid_: Safe shortcut, non-conflicting key
