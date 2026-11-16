import { SyntaxStyle, getTreeSitterClient, type NativeResourceOwner, type TextareaRenderable } from "@opentui/core"
import { extname } from "node:path"
import type { Theme } from "./theme.ts"

type Range = [number, number, string]

const KEYWORDS = new Set([
  "if", "else", "elif", "for", "while", "do", "switch", "case", "break", "continue", "return",
  "function", "func", "fn", "def", "class", "struct", "enum", "interface", "type", "impl",
  "import", "export", "from", "as", "package", "module", "use", "pub", "public", "private",
  "protected", "static", "const", "let", "var", "val", "mut", "async", "await", "yield",
  "try", "catch", "finally", "throw", "throws", "new", "this", "super", "self", "in", "of",
  "extends", "implements", "typeof", "instanceof", "void", "null", "nil", "none", "true",
  "false", "and", "or", "not", "with", "match", "where", "select", "from", "default",
])

const TREE_SITTER: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "typescriptreact",
  ".md": "markdown",
  ".markdown": "markdown",
  ".zig": "zig",
}

const DARK = {
  comment: "#6A9955",
  keyword: "#C586C0",
  string: "#CE9178",
  number: "#B5CEA8",
  function: "#DCDCAA",
  type: "#4EC9B0",
  variable: "#9CDCFE",
  constant: "#4FC1FF",
  punctuation: "#808080",
}

const PALETTES: Record<string, typeof DARK> = {
  signal: {
    comment: "#5B6B7C",
    keyword: "#5EEAD4",
    string: "#86EFAC",
    number: "#F0C674",
    function: "#7DD3FC",
    type: "#3DDC97",
    variable: "#D7E0EA",
    constant: "#F0C674",
    punctuation: "#6B7C8F",
  },
  "dark-plus": DARK,
  dracula: {
    comment: "#6272A4",
    keyword: "#FF79C6",
    string: "#F1FA8C",
    number: "#BD93F9",
    function: "#50FA7B",
    type: "#8BE9FD",
    variable: "#F8F8F2",
    constant: "#BD93F9",
    punctuation: "#6272A4",
  },
  catppuccin: {
    comment: "#6C7086",
    keyword: "#CBA6F7",
    string: "#A6E3A1",
    number: "#FAB387",
    function: "#89B4FA",
    type: "#F9E2AF",
    variable: "#CDD6F4",
    constant: "#F38BA8",
    punctuation: "#585B70",
  },
  "tokyo-night": {
    comment: "#565F89",
    keyword: "#BB9AF7",
    string: "#9ECE6A",
    number: "#FF9E64",
    function: "#7AA2F7",
    type: "#2AC3DE",
    variable: "#C0CAF5",
    constant: "#FF9E64",
    punctuation: "#565F89",
  },
  nord: {
    comment: "#616E88",
    keyword: "#81A1C1",
    string: "#A3BE8C",
    number: "#B48EAD",
    function: "#88C0D0",
    type: "#8FBCBB",
    variable: "#D8DEE9",
    constant: "#B48EAD",
    punctuation: "#4C566A",
  },
  "rose-pine": {
    comment: "#6E6A86",
    keyword: "#C4A7E7",
    string: "#F6C177",
    function: "#EBBCBA",
    number: "#EA9A97",
    type: "#9CCFD8",
    variable: "#E0DEF4",
    constant: "#F6C177",
    punctuation: "#6E6A86",
  },
  "github-light": {
    comment: "#6A737D",
    keyword: "#D73A49",
    string: "#032F62",
    number: "#005CC5",
    function: "#6F42C1",
    type: "#005CC5",
    variable: "#24292E",
    constant: "#005CC5",
    punctuation: "#6A737D",
  },
}

const styles = new Map<string, SyntaxStyle>()
let paintToken = 0

export function lexHighlights(text: string): Range[] {
  const ranges: Range[] = []
  if (text.length > 200_000) return ranges
  const pattern =
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w]*\b/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) && ranges.length < 4000) {
    const token = match[0]
    const start = match.index
    const end = start + token.length
    let group = "variable"
    if (token.startsWith("//") || token.startsWith("/*") || token.startsWith("#")) group = "comment"
    else if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) group = "string"
    else if (token[0]! >= "0" && token[0]! <= "9") group = "number"
    else if (KEYWORDS.has(token)) group = "keyword"
    else if (/^\s*\(/.test(text.slice(end))) group = "function"
    else if (token[0] === token[0]?.toUpperCase()) group = "type"
    ranges.push([start, end, group])
  }
  return ranges
}

function runningTest(): boolean {
  return process.argv.some((part) => part === "test" || part.endsWith(".test.ts") || part.endsWith(".test.tsx"))
}

export function getSyntaxStyle(theme: Theme, owner: NativeResourceOwner): SyntaxStyle {
  const cached = styles.get(theme.name)
  if (cached) return cached
  const palette = PALETTES[theme.name] ?? DARK
  const created = SyntaxStyle.fromStyles(
    {
      default: { fg: theme.editorText },
      text: { fg: theme.editorText },
      comment: { fg: palette.comment, italic: true },
      keyword: { fg: palette.keyword },
      string: { fg: palette.string },
      number: { fg: palette.number },
      function: { fg: palette.function },
      type: { fg: palette.type },
      variable: { fg: palette.variable },
      constant: { fg: palette.constant },
      punctuation: { fg: palette.punctuation },
      operator: { fg: palette.punctuation },
      tag: { fg: palette.type },
      attribute: { fg: palette.variable },
      property: { fg: palette.variable },
      conceal: { fg: theme.listDim },
      "markup.heading": { fg: theme.brand, bold: true },
      "markup.heading.1": { fg: theme.brand, bold: true },
      "markup.heading.2": { fg: theme.accent, bold: true },
      "markup.heading.3": { fg: theme.titleFg, bold: true },
      "markup.strong": { fg: theme.editorText, bold: true },
      "markup.italic": { fg: theme.editorText, italic: true },
      "markup.strikethrough": { fg: theme.listDim, dim: true },
      "markup.raw": { fg: palette.string },
      "markup.quote": { fg: theme.listDim, italic: true },
      "markup.list": { fg: theme.accent },
      "markup.link": { fg: theme.accent },
      "markup.link.label": { fg: theme.accent, underline: true },
      "markup.link.url": { fg: palette.function, underline: true },
      "string.special.url": { fg: palette.function, underline: true },
    },
    owner,
  )
  styles.set(theme.name, created)
  return created
}

function styleFor(theme: Theme, owner: NativeResourceOwner): SyntaxStyle {
  return getSyntaxStyle(theme, owner)
}

function styleId(style: SyntaxStyle, group: string): number | null {
  const name = group.replace(/^@/, "")
  return style.resolveStyleId(name) ?? style.resolveStyleId(name.split(".")[0] ?? name) ?? style.resolveStyleId("variable")
}

async function rangesFor(path: string, text: string): Promise<Range[]> {
  const filetype = TREE_SITTER[extname(path).toLowerCase()]
  if (filetype && !runningTest()) {
    try {
      const result = await getTreeSitterClient().highlightOnce(text, filetype)
      if (result.highlights && result.highlights.length > 0) {
        return result.highlights
          .slice(0, 8000)
          .map(([start, end, group]) => [start, end, group.replace(/^@/, "")] as Range)
      }
    } catch {
      // The lexer still colors the buffer when a parser is missing.
    }
  }
  return lexHighlights(text)
}

export async function paintSyntax(
  editor: TextareaRenderable,
  path: string,
  theme: Theme,
  owner: NativeResourceOwner,
): Promise<void> {
  const token = ++paintToken
  try {
    const text = editor.plainText
    const style = styleFor(theme, owner)
    editor.syntaxStyle = style
    if (text.length > 200_000 || text.includes("\0")) {
      editor.extmarks.clear()
      return
    }
    const ranges = await rangesFor(path, text)
    if (token !== paintToken || editor.plainText !== text) return
    editor.extmarks.clear()
    for (const [start, end, group] of ranges) {
      if (end <= start) continue
      const id = styleId(style, group)
      if (id == null) continue
      editor.extmarks.create({ start, end, styleId: id })
    }
  } catch {
    // Coloring is cosmetic; the editor still works without it.
  }
}
