# Herdr-safe shortcuts stay frozen this release

Default chords remain the Herdr-safe map in settings (`ctrl+alt+*` for view switches and Markdown preview, `ctrl+b` for sidebar, etc.). Design polish must not reintroduce Herdr Desktop collisions. New affordances may only add chords after an explicit collision check against `~/.config/herdr-app/keys.json`.

**Why:** Shortcut regressions are high-cost for agents living in Herdr; design quality is the release theme, not remapping the keyboard.
