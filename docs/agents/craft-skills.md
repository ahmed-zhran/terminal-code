# Craft skills

Approved coding-craft router for this repo. `/implement` and `ticket-flow` read **only** this file before writing product code.

These skills fill the gap in the **coding itself**. They are not before-code gates and not after-code gates: `tdd`, typecheck, and `code-review` stay in the implement flow.

Written by `/empower-crafting` after approval. To change it, re-run that skill. `/sync-skills` never overwrites this file.

**Rules**

1. Match the ticket (and the surfaces it touches) to every row that applies. One ticket can match several rows.
2. For each matched row, call the Skill tool with each named skill that is **installed** in this harness, then follow that skill while writing code. Do not invent the skill's content when it is missing: skip it and note the miss once.

| When the work is… | Call these skills (in order) | Why |
| --- | --- | --- |
| Chrome / Signal / Markdown **visual polish** | `design-taste-frontend` | Design-first ui-taste winner for OpenTUI shell and document-mode polish |
| Layout / composition in the TUI shell (after taste) | `frontend-design` | Composes with ui-taste for hierarchy and pane composition; not a second taste skill |
| Module / seam design while reshaping chrome | `codebase-design` | Deep-module vocabulary when shell seams move |

After craft skills: continue the implement flow (`tdd` at seams, typecheck/tests, then `code-review`).
