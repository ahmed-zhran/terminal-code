import { expect, test } from "bun:test"
import { DEFAULT_KEYS } from "./settings.ts"
import { documentModeSegment, themes, themeOrder, type Theme } from "./theme.ts"

function rgbChannels(hex: string): [number, number, number] {
  const n = hex.replace("#", "")
  return [
    Number.parseInt(n.slice(0, 2), 16) / 255,
    Number.parseInt(n.slice(2, 4), 16) / 255,
    Number.parseInt(n.slice(4, 6), 16) / 255,
  ]
}

/** Relative luminance (sRGB → WCAG). Lower = deeper on a dark UI. */
function luminance(hex: string): number {
  const [r, g, b] = rgbChannels(hex)
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

function hueDegrees(hex: string): number {
  const [r, g, b] = rgbChannels(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  return h < 0 ? h + 360 : h
}

function isMintTeal(hex: string): boolean {
  const h = hueDegrees(hex)
  return h >= 145 && h <= 185
}

test("Signal activity rail is distinctly deeper than the sidebar", () => {
  const { activityBg, sidebarBg } = themes.signal
  const activity = luminance(activityBg)
  const sidebar = luminance(sidebarBg)
  expect(activity).toBeLessThan(sidebar)
  // Distinct step, not a near-identical ink mush.
  expect(sidebar / activity).toBeGreaterThanOrEqual(2.2)
})

test("Signal depth ladder rises toward the editor content surface", () => {
  const { activityBg, sidebarBg, tabBar, editorBg } = themes.signal
  expect(luminance(activityBg)).toBeLessThan(luminance(sidebarBg))
  expect(luminance(sidebarBg)).toBeLessThan(luminance(tabBar))
  expect(luminance(tabBar)).toBeLessThanOrEqual(luminance(editorBg))
})

test("Signal brand and title stay mint/teal and readable on rail and sidebar", () => {
  const { activityBg, sidebarBg, brand, titleFg } = themes.signal
  expect(isMintTeal(brand)).toBe(true)
  expect(isMintTeal(titleFg)).toBe(true)
  expect(contrast(brand, activityBg)).toBeGreaterThanOrEqual(7)
  expect(contrast(brand, sidebarBg)).toBeGreaterThanOrEqual(7)
  expect(contrast(titleFg, activityBg)).toBeGreaterThanOrEqual(7)
  expect(contrast(titleFg, sidebarBg)).toBeGreaterThanOrEqual(7)
})

test("Signal editor text contrast beats inactive tab and status muted text", () => {
  const signal = themes.signal
  const editor = contrast(signal.editorText, signal.editorBg)
  const inactiveTab = contrast(signal.tabInactiveFg, signal.tabBar)
  const mutedStatus = contrast(signal.statusMuted, signal.statusBg)
  expect(editor).toBeGreaterThan(inactiveTab)
  expect(editor).toBeGreaterThan(mutedStatus)
  expect(editor).toBeGreaterThanOrEqual(10)
})

test("Signal active activity-rail mark is stronger than inactive", () => {
  const signal = themes.signal
  const active = contrast(signal.brand, signal.activityActive)
  const inactive = contrast(signal.activityMuted, signal.activityBg)
  expect(active).toBeGreaterThanOrEqual(7)
  expect(active).toBeGreaterThanOrEqual(inactive * 3)
  expect(luminance(signal.activityActive)).toBeGreaterThan(luminance(signal.activityBg))
})

test("Signal sidebar title sits above the divider cue", () => {
  const { sidebarBg, titleFg, divider } = themes.signal
  const title = contrast(titleFg, sidebarBg)
  const dividerCue = contrast(divider, sidebarBg)
  expect(isMintTeal(titleFg)).toBe(true)
  expect(isMintTeal(divider)).toBe(false)
  expect(title).toBeGreaterThan(dividerCue * 4)
  expect(luminance(divider)).toBeGreaterThan(luminance(sidebarBg))
})

test("Signal active tab reads clearer than inactive; dirty mark stays visible", () => {
  const signal = themes.signal
  const active = contrast(signal.tabFg, signal.tabActive)
  const inactive = contrast(signal.tabInactiveFg, signal.tabInactive)
  expect(active).toBeGreaterThan(inactive * 2)
  expect(luminance(signal.tabActive)).toBeGreaterThan(luminance(signal.tabInactive))
  expect(contrast(signal.dirty, signal.tabActive)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(signal.dirty, signal.tabInactive)).toBeGreaterThanOrEqual(4.5)
})

test("Signal status bar stays secondary to editor content", () => {
  const signal = themes.signal
  const editor = contrast(signal.editorText, signal.editorBg)
  expect(editor).toBeGreaterThan(contrast(signal.statusFg, signal.statusBg))
  expect(editor).toBeGreaterThan(contrast(signal.statusMuted, signal.statusBg))
  expect(luminance(signal.statusBg)).toBeLessThan(luminance(signal.editorBg))
})

test("Signal Preview body uses content-first contrast over editor chrome", () => {
  const signal = themes.signal
  const body = contrast(signal.previewFg, signal.previewBg)
  const tabChrome = contrast(signal.tabFg, signal.tabBar)
  const status = contrast(signal.statusFg, signal.statusBg)
  const modeQuiet = contrast(signal.previewChromeFg, signal.tabBar)
  expect(body).toBeGreaterThanOrEqual(10)
  expect(body).toBeGreaterThan(tabChrome)
  expect(body).toBeGreaterThan(status)
  expect(body).toBeGreaterThan(modeQuiet * 2)
  expect(luminance(signal.previewBg)).toBeGreaterThanOrEqual(luminance(signal.tabBar))
})

test("Signal Preview-active chrome stays secondary to the Preview body", () => {
  const signal = themes.signal
  const body = contrast(signal.previewFg, signal.previewBg)
  const quietMode = documentModeSegment(signal, true, true)
  const loudSourceMode = documentModeSegment(signal, false, true)
  const quietTab = contrast(signal.statusFg, signal.tabActive)
  const quietInactiveTab = contrast(signal.previewChromeFg, signal.tabInactive)
  expect(contrast(quietMode.fg, quietMode.bg)).toBeLessThan(body / 2)
  expect(contrast(quietMode.fg, quietMode.bg)).toBeLessThan(contrast(loudSourceMode.fg, loudSourceMode.bg))
  expect(luminance(quietMode.bg)).toBeLessThanOrEqual(luminance(signal.previewBg))
  expect(quietTab).toBeLessThan(body)
  expect(quietInactiveTab).toBeLessThan(body / 2)
})

test("Signal empty states share title and content language", () => {
  const signal = themes.signal
  expect(signal.emptyFg).toBe(signal.editorText)
  expect(signal.emptyDim).toBe(signal.listDim)
  expect(isMintTeal(signal.brand)).toBe(true)
  expect(contrast(signal.emptyFg, signal.editorBg)).toBeGreaterThan(
    contrast(signal.emptyDim, signal.editorBg),
  )
})

test("every theme exposes the same chrome role tokens (Signal owns the depth ladder)", () => {
  for (const name of themeOrder) {
    const theme: Theme = themes[name]
    expect(theme.activityBg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.activityMuted).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.sidebarBg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.editorBg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.tabBar).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.statusBg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.brand).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.titleFg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.editorText).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.previewBg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.previewFg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.previewChromeFg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.dirty).toMatch(/^#[0-9A-Fa-f]{6}$/)
  }
})

test("default Herdr-safe chords stay frozen", () => {
  expect(DEFAULT_KEYS).toEqual({
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
  })
})
