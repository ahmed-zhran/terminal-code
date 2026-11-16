# terminal-code

A terminal editor with Signal-first chrome: explorer, search, source control, and settings. Built with OpenTUI + React on Bun.

```bash
bun install
bun start
bun start /path/to/project
```

Default theme is **Signal** (ink + mint). Themes and shortcuts live in `~/.config/terminal-code/settings.json`.

Default shortcuts are chosen to avoid Herdr Desktop chords (`~/.config/herdr-app/keys.json`).

| Key | Action |
| --- | --- |
| Up / Down | Move in the current list |
| Left / Right | Collapse or expand |
| Enter or click | Open a file, apply a theme, or switch branch |
| Tab | Type in the open file |
| Esc | Back to the sidebar |
| Ctrl+S | Save |
| Ctrl+Z | Undo |
| Ctrl+Alt+Z or Ctrl+Y | Redo |
| Ctrl+Alt+W | Close file |
| Ctrl+B | Hide or show the sidebar |
| Ctrl+Alt+H / L | Narrow / widen the sidebar |
| Ctrl+Alt+E | Explorer |
| Ctrl+Alt+S | Search |
| Ctrl+Alt+G | Source control |
| Ctrl+Alt+, | Settings |
| Ctrl+Alt+V | Toggle Markdown preview |
| Ctrl+Enter | Replace all in search |
| Ctrl+C | Quit |

The left rail switches Explorer, Search, Source Control, and Settings. Drag the divider between the sidebar and the editor to resize it. Click the branch name in the status bar to check out another branch.

Open a `.md` / `.markdown` / `.mdx` file, then press **Ctrl+Alt+V** (or click **Preview** / **Source** in the tab bar) to render it with OpenTUI's markdown previewer.
