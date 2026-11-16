import type { ExplorerRow } from "./files.ts"

export type IconTone = "folder" | "code" | "script" | "doc" | "data" | "web" | "image" | "file" | "dim"

const BY_EXT: Record<string, { mark: string; tone: IconTone }> = {
  ts: { mark: "◇", tone: "code" },
  tsx: { mark: "◈", tone: "code" },
  mts: { mark: "◇", tone: "code" },
  cts: { mark: "◇", tone: "code" },
  js: { mark: "○", tone: "script" },
  jsx: { mark: "◎", tone: "script" },
  mjs: { mark: "○", tone: "script" },
  cjs: { mark: "○", tone: "script" },
  json: { mark: "{}", tone: "data" },
  jsonc: { mark: "{}", tone: "data" },
  md: { mark: "¶", tone: "doc" },
  mdx: { mark: "¶", tone: "doc" },
  txt: { mark: "·", tone: "doc" },
  css: { mark: "#", tone: "web" },
  scss: { mark: "#", tone: "web" },
  html: { mark: "<>", tone: "web" },
  htm: { mark: "<>", tone: "web" },
  svg: { mark: "▣", tone: "image" },
  png: { mark: "▣", tone: "image" },
  jpg: { mark: "▣", tone: "image" },
  jpeg: { mark: "▣", tone: "image" },
  gif: { mark: "▣", tone: "image" },
  webp: { mark: "▣", tone: "image" },
  py: { mark: "λ", tone: "script" },
  go: { mark: "〉", tone: "code" },
  rs: { mark: "⚙", tone: "code" },
  rb: { mark: "◆", tone: "script" },
  java: { mark: "⊞", tone: "code" },
  kt: { mark: "⊞", tone: "code" },
  c: { mark: "C", tone: "code" },
  h: { mark: "H", tone: "code" },
  cpp: { mark: "C+", tone: "code" },
  cs: { mark: "C#", tone: "code" },
  php: { mark: "P", tone: "script" },
  sh: { mark: "$", tone: "script" },
  bash: { mark: "$", tone: "script" },
  zsh: { mark: "$", tone: "script" },
  yml: { mark: "≡", tone: "data" },
  yaml: { mark: "≡", tone: "data" },
  toml: { mark: "≡", tone: "data" },
  xml: { mark: "<>", tone: "data" },
  sql: { mark: "▦", tone: "data" },
  vue: { mark: "V", tone: "web" },
  svelte: { mark: "S", tone: "web" },
  zig: { mark: "Z", tone: "code" },
  lock: { mark: "·", tone: "dim" },
  env: { mark: "·", tone: "data" },
}

export function fileMark(kind: ExplorerRow["kind"], label: string): { mark: string; tone: IconTone } {
  if (kind === "hint") return { mark: " ", tone: "dim" }
  if (kind === "dir" || kind === "section") return { mark: "▸", tone: "folder" }
  const slash = Math.max(label.lastIndexOf("/"), label.lastIndexOf("\\"))
  const name = slash >= 0 ? label.slice(slash + 1) : label
  const dot = name.lastIndexOf(".")
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ""
  return BY_EXT[ext] ?? { mark: "·", tone: "file" }
}

export function folderMark(expanded: boolean): string {
  return expanded ? "▾" : "▸"
}
