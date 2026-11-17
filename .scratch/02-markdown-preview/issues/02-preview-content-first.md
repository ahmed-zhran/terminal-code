# 02: Preview content-first layout

**Base:** spec/02
**Status:** done
**Blocked by:** 01
**Surfaces:** terminal-code

## What to build

Polish Markdown Preview composition so rendered content dominates the editor pane under Signal hierarchy: quiet surrounding chrome, readable preview body, predictable mode when switching tabs.

## What it delivers

Preview feels like a first-class document mode, not a bolted-on panel, consistent with release design quality goals.

## Acceptance criteria

- Preview body uses content-first contrast under Signal
- Surrounding editor chrome stays secondary while Preview is active
- Leaving and returning to a Markdown tab has predictable document-mode behavior (documented in ticket notes if intentional reset vs sticky)
- No WYSIWYG editing or split Source|Preview
- `bun test` and `bun check` pass

## Comments

- Document mode policy: **reset to Source** when the active path changes (leave/return a Markdown tab). Preview is not sticky across tabs; returning always opens Source.

## Comments

- Landed into `spec/02` via https://github.com/ahmed-zhran/terminal-code/pull/5
