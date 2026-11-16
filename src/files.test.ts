import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "bun:test"
import { TreeModel, buildExplorerRows, sortEntries, type DirEntry } from "./files.ts"
import { decorationFor, parseBranchList, parsePorcelain } from "./git.ts"
import { lexHighlights } from "./highlight.ts"
import { fileMark } from "./icons.ts"
import { isMarkdownPath } from "./markdown.ts"
import { actionFor, chordFromEvent, normalizeSettings } from "./settings.ts"
import { findInText, parseRgLine, replaceLiteral } from "./search.ts"

describe("sortEntries", () => {
  test("puts folders before files, then sorts names naturally", () => {
    const entries: DirEntry[] = [
      { name: "b.ts", path: "/b.ts", kind: "file" },
      { name: "src", path: "/src", kind: "dir" },
      { name: "a.ts", path: "/a.ts", kind: "file" },
      { name: "file10.ts", path: "/file10.ts", kind: "file" },
      { name: "file2.ts", path: "/file2.ts", kind: "file" },
    ]

    expect(sortEntries(entries).map((entry) => entry.name)).toEqual(["src", "a.ts", "b.ts", "file2.ts", "file10.ts"])
  })
})

describe("TreeModel", () => {
  test("hides the default VS Code excludes and compacts single-child folders", async () => {
    const root = await mkdtemp(join(tmpdir(), "terminal-code-tree-"))
    try {
      await mkdir(join(root, "src", "app"), { recursive: true })
      await mkdir(join(root, ".git"), { recursive: true })
      await writeFile(join(root, "readme.txt"), "hi")
      await writeFile(join(root, ".git", "config"), "x")
      await writeFile(join(root, "src", "app", "main.ts"), "export {}\n")
      await writeFile(join(root, ".DS_Store"), "x")

      const model = new TreeModel()
      await model.reload(root, [])
      const top = model.children.get(root)?.map((entry) => entry.label) ?? []

      expect(top).toEqual(["src/app", "readme.txt"])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe("git decorations", () => {
  test("parses porcelain records the way the explorer colors files", () => {
    const cwd = "/repo"
    const marks = parsePorcelain(" D a.txt\0A  staged.txt\0A  sub/d.txt\0?? new.txt\0", cwd)

    expect(marks.get("/repo/a.txt")).toBe("deleted")
    expect(marks.get("/repo/staged.txt")).toBe("added")
    expect(marks.get("/repo/sub/d.txt")).toBe("added")
    expect(marks.get("/repo/new.txt")).toBe("untracked")
    expect(decorationFor("/repo/sub", "dir", marks)).toBe("added")
  })

  test("keeps the new path for a rename and drops the old one", () => {
    const marks = parsePorcelain("RM new.txt\0old.txt\0", "/repo")
    expect(marks.get("/repo/new.txt")).toBe("modified")
    expect(marks.has("/repo/old.txt")).toBe(false)
  })
})

describe("unsaved edits in the tree", () => {
  test("marks the file and its parent folder", () => {
    const children = new Map([
      [
        "/repo",
        [
          { kind: "file" as const, path: "/repo/a.ts", label: "a.ts" },
          { kind: "dir" as const, path: "/repo/src", label: "src" },
        ],
      ],
      ["/repo/src", [{ kind: "file" as const, path: "/repo/src/b.ts", label: "b.ts" }]],
    ])
    const rows = buildExplorerRows({
      root: "/repo",
      rootLabel: "repo",
      editorsExpanded: false,
      workspaceExpanded: true,
      openPaths: [],
      dirty: new Set(["/repo/src/b.ts"]),
      expandedDirs: new Set(["/repo/src"]),
      children,
      git: new Map(),
    })

    expect(rows.find((row) => row.path === "/repo/src/b.ts")?.dirty).toBe(true)
    expect(rows.find((row) => row.path === "/repo/src")?.dirty).toBe(true)
    expect(rows.find((row) => row.path === "/repo/a.ts")?.dirty).toBe(false)
  })
})

describe("shortcuts and search", () => {
  test("maps the Herdr-safe default chords", () => {
    const keys = normalizeSettings({}).keys
    expect(actionFor(chordFromEvent({ name: "z", ctrl: true, shift: false, meta: true }), keys)).toBe("redo")
    expect(actionFor(chordFromEvent({ name: "y", ctrl: true, shift: false, meta: false }), keys)).toBe("redoAlt")
    expect(actionFor(chordFromEvent({ name: "z", ctrl: true, shift: false, meta: false }), keys)).toBe("undo")
    expect(actionFor(chordFromEvent({ name: "v", ctrl: true, shift: false, meta: true }), keys)).toBe("preview")
    expect(actionFor(chordFromEvent({ name: "e", ctrl: true, shift: false, meta: true }), keys)).toBe("explorer")
    expect(actionFor(chordFromEvent({ name: "s", ctrl: true, shift: false, meta: true }), keys)).toBe("search")
    expect(actionFor(chordFromEvent({ name: "w", ctrl: true, shift: false, meta: true }), keys)).toBe("close")
    expect(actionFor("ctrl+b", keys)).toBe("sidebar")
    expect(actionFor("ctrl+shift+b", keys)).toBe(null)
    expect(actionFor("ctrl+shift+f", keys)).toBe(null)
    expect(actionFor("ctrl+w", keys)).toBe(null)
  })

  test("colors code tokens and picks file icons", () => {
    const ranges = lexHighlights('const name = "hi" // note')
    expect(ranges.some((range) => range[2] === "keyword")).toBe(true)
    expect(ranges.some((range) => range[2] === "string")).toBe(true)
    expect(ranges.some((range) => range[2] === "comment")).toBe(true)
    expect(fileMark("dir", "src/app").mark).toBe("▸")
    expect(fileMark("file", "main.ts").mark).toBe("◇")
  })

  test("finds and replaces literal text", () => {
    expect(findInText("alpha\nbeta alpha", "alpha").map((hit) => hit.line)).toEqual([1, 2])
    expect(replaceLiteral("a.b.a", ".", "-")).toEqual({ text: "a-b-a", count: 2 })
    expect(parseRgLine("/repo", "/repo/src/a.ts:4:2:const alpha = 1")?.line).toBe(4)
  })

  test("parses branch names", () => {
    expect(parseBranchList("main\nrelease/1\n\n")).toEqual(["main", "release/1"])
  })

  test("detects markdown paths for preview", () => {
    expect(isMarkdownPath("README.md")).toBe(true)
    expect(isMarkdownPath("docs/Guide.MD")).toBe(true)
    expect(isMarkdownPath("notes.mdx")).toBe(true)
    expect(isMarkdownPath("main.ts")).toBe(false)
  })
})
