# Stack

Single product surface: the OpenTUI + React terminal editor.

| Concern | Choice |
| --- | --- |
| Runtime | Bun |
| UI | OpenTUI (`@opentui/core`, `@opentui/react`) + React 19 |
| Language | TypeScript |
| Tests | `bun test` |
| Config | `~/.config/terminal-code/settings.json` |
| Themes | Signal (default / design reference) plus named alternate themes in `theme.ts` |

No separate web, mobile, or backend deployable in this repo.
