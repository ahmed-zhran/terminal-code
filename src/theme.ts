export type ThemeName =
  | "signal"
  | "dark-plus"
  | "dracula"
  | "catppuccin"
  | "tokyo-night"
  | "nord"
  | "rose-pine"
  | "github-light"

export type Theme = {
  name: ThemeName
  label: string
  editorBg: string
  sidebarBg: string
  activityBg: string
  activityActive: string
  accent: string
  brand: string
  titleFg: string
  listFg: string
  listDim: string
  listActive: string
  listInactive: string
  listHover: string
  tabBar: string
  tabActive: string
  tabInactive: string
  tabFg: string
  tabInactiveFg: string
  tabMark: string
  statusBg: string
  statusFg: string
  statusSegment: string
  statusMuted: string
  divider: string
  editorText: string
  cursor: string
  selection: string
  dirty: string
  inputBg: string
  emptyFg: string
  emptyDim: string
  git: {
    conflict: string
    deleted: string
    modified: string
    renamed: string
    added: string
    untracked: string
  }
}

function theme(
  partial: Omit<Theme, "brand" | "tabMark" | "statusMuted" | "emptyFg" | "emptyDim"> &
    Partial<Pick<Theme, "brand" | "tabMark" | "statusMuted" | "emptyFg" | "emptyDim">>,
): Theme {
  return {
    ...partial,
    brand: partial.brand ?? partial.accent,
    tabMark: partial.tabMark ?? partial.accent,
    statusMuted: partial.statusMuted ?? partial.listDim,
    emptyFg: partial.emptyFg ?? partial.listFg,
    emptyDim: partial.emptyDim ?? partial.listDim,
  }
}

export const themes: Record<ThemeName, Theme> = {
  signal: theme({
    name: "signal",
    label: "Signal",
    // Depth ladder (darkest → most readable): activity rail → sidebar → editor chrome → content.
    editorBg: "#141C26",
    sidebarBg: "#0C131B",
    activityBg: "#030508",
    activityActive: "#0A1219",
    accent: "#3DDC97",
    brand: "#5EEAD4",
    titleFg: "#5EEAD4",
    listFg: "#D7E0EA",
    listDim: "#6B7C8F",
    listActive: "#143528",
    listInactive: "#121A22",
    listHover: "#0F171F",
    tabBar: "#101820",
    tabActive: "#141C26",
    tabInactive: "#0C131B",
    tabFg: "#E8EEF5",
    tabInactiveFg: "#6B7C8F",
    tabMark: "#3DDC97",
    statusBg: "#0E1A16",
    statusFg: "#D7F5E8",
    statusSegment: "#163A2C",
    statusMuted: "#7AA892",
    divider: "#1E2A38",
    editorText: "#E8EEF5",
    cursor: "#5EEAD4",
    selection: "#1B3A48",
    dirty: "#F0C674",
    inputBg: "#15202B",
    emptyFg: "#E8EEF5",
    emptyDim: "#6B7C8F",
    git: {
      conflict: "#F87171",
      deleted: "#F87171",
      modified: "#F0C674",
      renamed: "#7DD3FC",
      added: "#3DDC97",
      untracked: "#86EFAC",
    },
  }),
  "dark-plus": theme({
    name: "dark-plus",
    label: "Dark+",
    editorBg: "#1E1E1E",
    sidebarBg: "#252526",
    activityBg: "#333333",
    activityActive: "#37373D",
    accent: "#007ACC",
    titleFg: "#BBBBBB",
    listFg: "#CCCCCC",
    listDim: "#858585",
    listActive: "#04395E",
    listInactive: "#37373D",
    listHover: "#2A2D2E",
    tabBar: "#252526",
    tabActive: "#1E1E1E",
    tabInactive: "#2D2D2D",
    tabFg: "#FFFFFF",
    tabInactiveFg: "#969696",
    statusBg: "#007ACC",
    statusFg: "#FFFFFF",
    statusSegment: "#0062A3",
    divider: "#444444",
    editorText: "#D4D4D4",
    cursor: "#AEAFAD",
    selection: "#264F78",
    dirty: "#E2C08D",
    inputBg: "#3C3C3C",
    git: {
      conflict: "#E4676B",
      deleted: "#C74E39",
      modified: "#E2C08D",
      renamed: "#73C991",
      added: "#81B88B",
      untracked: "#73C991",
    },
  }),
  dracula: theme({
    name: "dracula",
    label: "Dracula",
    editorBg: "#282A36",
    sidebarBg: "#21222C",
    activityBg: "#191A21",
    activityActive: "#44475A",
    accent: "#BD93F9",
    titleFg: "#F8F8F2",
    listFg: "#F8F8F2",
    listDim: "#6272A4",
    listActive: "#44475A",
    listInactive: "#343746",
    listHover: "#2E303E",
    tabBar: "#191A21",
    tabActive: "#282A36",
    tabInactive: "#21222C",
    tabFg: "#F8F8F2",
    tabInactiveFg: "#6272A4",
    statusBg: "#BD93F9",
    statusFg: "#282A36",
    statusSegment: "#9B72E0",
    divider: "#44475A",
    editorText: "#F8F8F2",
    cursor: "#F8F8F2",
    selection: "#44475A",
    dirty: "#FFB86C",
    inputBg: "#44475A",
    git: {
      conflict: "#FF5555",
      deleted: "#FF5555",
      modified: "#F1FA8C",
      renamed: "#8BE9FD",
      added: "#50FA7B",
      untracked: "#50FA7B",
    },
  }),
  catppuccin: theme({
    name: "catppuccin",
    label: "Catppuccin",
    editorBg: "#1E1E2E",
    sidebarBg: "#181825",
    activityBg: "#11111B",
    activityActive: "#313244",
    accent: "#CBA6F7",
    titleFg: "#CBA6F7",
    listFg: "#CDD6F4",
    listDim: "#6C7086",
    listActive: "#45475A",
    listInactive: "#313244",
    listHover: "#313244",
    tabBar: "#181825",
    tabActive: "#1E1E2E",
    tabInactive: "#11111B",
    tabFg: "#CDD6F4",
    tabInactiveFg: "#6C7086",
    statusBg: "#CBA6F7",
    statusFg: "#11111B",
    statusSegment: "#B4A0E0",
    divider: "#313244",
    editorText: "#CDD6F4",
    cursor: "#F5E0DC",
    selection: "#45475A",
    dirty: "#F9E2AF",
    inputBg: "#313244",
    git: {
      conflict: "#F38BA8",
      deleted: "#F38BA8",
      modified: "#F9E2AF",
      renamed: "#89DCEB",
      added: "#A6E3A1",
      untracked: "#A6E3A1",
    },
  }),
  "tokyo-night": theme({
    name: "tokyo-night",
    label: "Tokyo Night",
    editorBg: "#1A1B26",
    sidebarBg: "#16161E",
    activityBg: "#13131A",
    activityActive: "#292E42",
    accent: "#7AA2F7",
    titleFg: "#7AA2F7",
    listFg: "#C0CAF5",
    listDim: "#565F89",
    listActive: "#283457",
    listInactive: "#292E42",
    listHover: "#1F2335",
    tabBar: "#16161E",
    tabActive: "#1A1B26",
    tabInactive: "#13131A",
    tabFg: "#C0CAF5",
    tabInactiveFg: "#565F89",
    statusBg: "#7AA2F7",
    statusFg: "#1A1B26",
    statusSegment: "#5D84E0",
    divider: "#292E42",
    editorText: "#C0CAF5",
    cursor: "#C0CAF5",
    selection: "#283457",
    dirty: "#E0AF68",
    inputBg: "#292E42",
    git: {
      conflict: "#F7768E",
      deleted: "#F7768E",
      modified: "#E0AF68",
      renamed: "#7DCFFF",
      added: "#9ECE6A",
      untracked: "#9ECE6A",
    },
  }),
  nord: theme({
    name: "nord",
    label: "Nord",
    editorBg: "#2E3440",
    sidebarBg: "#272C36",
    activityBg: "#232831",
    activityActive: "#3B4252",
    accent: "#88C0D0",
    titleFg: "#88C0D0",
    listFg: "#D8DEE9",
    listDim: "#616E88",
    listActive: "#3B4252",
    listInactive: "#353B49",
    listHover: "#323845",
    tabBar: "#272C36",
    tabActive: "#2E3440",
    tabInactive: "#232831",
    tabFg: "#ECEFF4",
    tabInactiveFg: "#7B88A1",
    statusBg: "#5E81AC",
    statusFg: "#ECEFF4",
    statusSegment: "#4C6A94",
    divider: "#3B4252",
    editorText: "#E5E9F0",
    cursor: "#D8DEE9",
    selection: "#434C5E",
    dirty: "#EBCB8B",
    inputBg: "#3B4252",
    git: {
      conflict: "#BF616A",
      deleted: "#BF616A",
      modified: "#EBCB8B",
      renamed: "#88C0D0",
      added: "#A3BE8C",
      untracked: "#A3BE8C",
    },
  }),
  "rose-pine": theme({
    name: "rose-pine",
    label: "Rose Pine",
    editorBg: "#191724",
    sidebarBg: "#1F1D2E",
    activityBg: "#16141F",
    activityActive: "#26233A",
    accent: "#C4A7E7",
    titleFg: "#C4A7E7",
    listFg: "#E0DEF4",
    listDim: "#6E6A86",
    listActive: "#403D52",
    listInactive: "#26233A",
    listHover: "#26233A",
    tabBar: "#1F1D2E",
    tabActive: "#191724",
    tabInactive: "#16141F",
    tabFg: "#E0DEF4",
    tabInactiveFg: "#6E6A86",
    statusBg: "#C4A7E7",
    statusFg: "#191724",
    statusSegment: "#A88CC8",
    divider: "#26233A",
    editorText: "#E0DEF4",
    cursor: "#E0DEF4",
    selection: "#403D52",
    dirty: "#F6C177",
    inputBg: "#26233A",
    git: {
      conflict: "#EB6F92",
      deleted: "#EB6F92",
      modified: "#F6C177",
      renamed: "#9CCFD8",
      added: "#31748F",
      untracked: "#9CCFD8",
    },
  }),
  "github-light": theme({
    name: "github-light",
    label: "GitHub Light",
    editorBg: "#FFFFFF",
    sidebarBg: "#F6F8FA",
    activityBg: "#E8EAED",
    activityActive: "#D0D7DE",
    accent: "#0969DA",
    brand: "#0550AE",
    titleFg: "#0969DA",
    listFg: "#1F2328",
    listDim: "#656D76",
    listActive: "#DDF4FF",
    listInactive: "#EAEFF2",
    listHover: "#EEF1F4",
    tabBar: "#F6F8FA",
    tabActive: "#FFFFFF",
    tabInactive: "#E8EAED",
    tabFg: "#1F2328",
    tabInactiveFg: "#656D76",
    statusBg: "#0969DA",
    statusFg: "#FFFFFF",
    statusSegment: "#0550AE",
    statusMuted: "#B6D4F5",
    divider: "#D0D7DE",
    editorText: "#1F2328",
    cursor: "#0969DA",
    selection: "#B6E3FF",
    dirty: "#9A6700",
    inputBg: "#FFFFFF",
    emptyFg: "#1F2328",
    emptyDim: "#656D76",
    git: {
      conflict: "#CF222E",
      deleted: "#CF222E",
      modified: "#9A6700",
      renamed: "#8250DF",
      added: "#1A7F37",
      untracked: "#1A7F37",
    },
  }),
}

export const themeOrder: ThemeName[] = [
  "signal",
  "dark-plus",
  "dracula",
  "catppuccin",
  "tokyo-night",
  "nord",
  "rose-pine",
  "github-light",
]

export function isThemeName(value: string): value is ThemeName {
  return value in themes
}
