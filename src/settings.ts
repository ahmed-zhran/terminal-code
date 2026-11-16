import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { isThemeName, type ThemeName } from "./theme.ts"

export type Action =
  | "undo"
  | "redo"
  | "redoAlt"
  | "save"
  | "close"
  | "sidebar"
  | "explorer"
  | "search"
  | "sourceControl"
  | "settings"
  | "preview"
  | "widen"
  | "narrow"
  | "replaceAll"

export type KeyMap = Record<Action, string>

export type Settings = {
  theme: ThemeName
  sidebarWidth: number
  keys: KeyMap
}

export const ACTIONS: Action[] = [
  "undo",
  "redo",
  "redoAlt",
  "save",
  "close",
  "sidebar",
  "explorer",
  "search",
  "sourceControl",
  "settings",
  "preview",
  "widen",
  "narrow",
  "replaceAll",
]

export const ACTION_LABELS: Record<Action, string> = {
  undo: "Undo",
  redo: "Redo",
  redoAlt: "Redo (alternate)",
  save: "Save",
  close: "Close file",
  sidebar: "Toggle sidebar",
  explorer: "Explorer",
  search: "Search",
  sourceControl: "Source control",
  settings: "Settings",
  preview: "Toggle markdown preview",
  widen: "Widen sidebar",
  narrow: "Narrow sidebar",
  replaceAll: "Replace all",
}

// Defaults avoid Herdr Desktop chords in ~/.config/herdr-app/keys.json
// (ctrl+shift+*, ctrl+w, ctrl+,, ctrl+alt+f/up/down, alt+hjkl, …).
export const DEFAULT_KEYS: KeyMap = {
  undo: "ctrl+z",
  redo: "ctrl+alt+z",
  redoAlt: "ctrl+y",
  save: "ctrl+s",
  close: "ctrl+alt+w",
  sidebar: "ctrl+b",
  explorer: "ctrl+alt+e",
  search: "ctrl+alt+s",
  sourceControl: "ctrl+alt+g",
  settings: "ctrl+alt+,",
  preview: "ctrl+alt+v",
  widen: "ctrl+alt+l",
  narrow: "ctrl+alt+h",
  replaceAll: "ctrl+enter",
}

export function defaultSettings(): Settings {
  return { theme: "signal", sidebarWidth: 36, keys: { ...DEFAULT_KEYS } }
}

export function settingsPath(): string {
  return join(homedir(), ".config", "terminal-code", "settings.json")
}

export function loadSettings(file = settingsPath()): Settings {
  try {
    return normalizeSettings(JSON.parse(readFileSync(file, "utf8")))
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: Settings, file = settingsPath()): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`)
}

export function normalizeSettings(raw: unknown): Settings {
  const base = defaultSettings()
  if (!raw || typeof raw !== "object") return base
  const record = raw as { theme?: unknown; sidebarWidth?: unknown; keys?: unknown }

  if (typeof record.theme === "string" && isThemeName(record.theme)) base.theme = record.theme
  if (typeof record.sidebarWidth === "number" && record.sidebarWidth >= 18 && record.sidebarWidth <= 80) {
    base.sidebarWidth = Math.round(record.sidebarWidth)
  }
  if (record.keys && typeof record.keys === "object") {
    const keys = record.keys as Record<string, unknown>
    for (const action of ACTIONS) {
      const chord = keys[action]
      if (typeof chord === "string" && chord.length > 0 && chord.length < 48) base.keys[action] = chord.toLowerCase()
    }
  }
  return base
}

export function chordFromEvent(key: { name: string; ctrl: boolean; shift: boolean; meta: boolean }): string {
  const parts: string[] = []
  if (key.ctrl) parts.push("ctrl")
  if (key.meta) parts.push("alt")
  if (key.shift) parts.push("shift")
  const name = key.name === "comma" ? "," : key.name === "return" ? "enter" : key.name.toLowerCase()
  parts.push(name)
  return parts.join("+")
}

export function actionFor(chord: string, keys: KeyMap): Action | null {
  for (const action of ACTIONS) {
    if (keys[action] === chord) return action
  }
  return null
}
