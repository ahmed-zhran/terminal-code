import { readdir, stat } from "node:fs/promises"
import { basename, join } from "node:path"
import { decorationFor, type GitMark } from "./git.ts"

// VS Code's default files.exclude. node_modules stays visible, same as the explorer.
const EXCLUDED_NAMES = new Set([".git", ".svn", ".hg", "CVS", ".DS_Store", "Thumbs.db"])

const MAX_FILE_BYTES = 1024 * 1024
const MAX_COMPACT = 12

export type DirEntry = {
  name: string
  path: string
  kind: "file" | "dir"
}

export type CompressedEntry = {
  kind: "file" | "dir"
  path: string
  label: string
}

export type ExplorerRow = {
  key: string
  kind: "section" | "hint" | "editor" | "file" | "dir"
  label: string
  depth: number
  path?: string
  section?: "editors" | "workspace"
  expanded?: boolean
  dirty?: boolean
  git: GitMark | null
}

type ReadDir = (dir: string) => Promise<DirEntry[]>

export function sortEntries(entries: readonly DirEntry[]): DirEntry[] {
  return entries.toSorted((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  })
}

export async function readDirectory(dir: string): Promise<DirEntry[]> {
  let listing
  try {
    listing = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === "EACCES" || code === "EPERM" || code === "ENOENT") return []
    throw error
  }

  const entries: DirEntry[] = []
  for (const entry of listing) {
    if (EXCLUDED_NAMES.has(entry.name)) continue
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      entries.push({ name: entry.name, path, kind: "dir" })
      continue
    }
    if (entry.isFile()) {
      entries.push({ name: entry.name, path, kind: "file" })
      continue
    }
    if (!entry.isSymbolicLink()) continue

    try {
      const info = await stat(path)
      if (info.isDirectory()) entries.push({ name: entry.name, path, kind: "dir" })
      else if (info.isFile()) entries.push({ name: entry.name, path, kind: "file" })
    } catch {
      // Broken link. Leave it out of the tree.
    }
  }

  return sortEntries(entries)
}

export async function loadChildren(dir: string, read: ReadDir): Promise<CompressedEntry[]> {
  const entries = await read(dir)
  const children: CompressedEntry[] = []
  for (const entry of entries) children.push(await compress(entry, read))
  return children
}

// explorer.compactFolders: a chain of single-child folders is one row, labeled a/b/c.
async function compress(entry: DirEntry, read: ReadDir): Promise<CompressedEntry> {
  if (entry.kind === "file") return { kind: "file", path: entry.path, label: entry.name }

  const names = [entry.name]
  let current = entry.path
  const seen = new Set<string>([entry.path])

  while (names.length < MAX_COMPACT) {
    const kids = await read(current)
    const only = kids.length === 1 ? kids[0] : undefined
    if (!only || only.kind !== "dir" || seen.has(only.path)) break
    seen.add(only.path)
    names.push(only.name)
    current = only.path
  }

  return { kind: "dir", path: current, label: names.join("/") }
}

export class TreeModel {
  private listings = new Map<string, DirEntry[]>()
  readonly children = new Map<string, CompressedEntry[]>()

  private async read(dir: string): Promise<DirEntry[]> {
    const hit = this.listings.get(dir)
    if (hit) return hit
    const entries = await readDirectory(dir)
    this.listings.set(dir, entries)
    return entries
  }

  async reload(root: string, expanded: Iterable<string>): Promise<void> {
    this.listings.clear()
    const dirs = new Set<string>([root, ...expanded])
    const next = new Map<string, CompressedEntry[]>()
    for (const dir of dirs) {
      next.set(dir, await loadChildren(dir, (path) => this.read(path)))
    }
    this.children.clear()
    for (const [dir, kids] of next) this.children.set(dir, kids)
  }
}

export function buildExplorerRows(input: {
  root: string
  rootLabel: string
  editorsExpanded: boolean
  workspaceExpanded: boolean
  openPaths: readonly string[]
  dirty: ReadonlySet<string>
  expandedDirs: ReadonlySet<string>
  children: ReadonlyMap<string, CompressedEntry[]>
  git: ReadonlyMap<string, GitMark>
}): ExplorerRow[] {
  const rows: ExplorerRow[] = []

  rows.push({
    key: "section:editors",
    kind: "section",
    section: "editors",
    label: "OPEN EDITORS",
    depth: 0,
    expanded: input.editorsExpanded,
    git: null,
  })

  if (input.editorsExpanded) {
    if (input.openPaths.length === 0) {
      rows.push({ key: "hint:editors", kind: "hint", label: "No open files", depth: 1, git: null })
    } else {
      for (const path of input.openPaths) {
        rows.push({
          key: `open:${path}`,
          kind: "editor",
          path,
          label: basename(path),
          depth: 1,
          dirty: input.dirty.has(path),
          git: null,
        })
      }
    }
  }

  rows.push({
    key: "section:workspace",
    kind: "section",
    section: "workspace",
    label: input.rootLabel.toUpperCase(),
    depth: 0,
    expanded: input.workspaceExpanded,
    git: decorationFor(input.root, "dir", input.git),
  })

  if (input.workspaceExpanded) {
    walk(input.root, 1, input, rows)
  }

  return rows
}

function walk(
  dir: string,
  depth: number,
  input: {
    expandedDirs: ReadonlySet<string>
    children: ReadonlyMap<string, CompressedEntry[]>
    git: ReadonlyMap<string, GitMark>
    dirty: ReadonlySet<string>
  },
  rows: ExplorerRow[],
): void {
  const kids = input.children.get(dir)
  if (!kids) {
    rows.push({ key: `loading:${dir}`, kind: "hint", label: "Loading…", depth, git: null })
    return
  }

  for (const child of kids) {
    if (child.kind === "file") {
      rows.push({
        key: `tree:${child.path}`,
        kind: "file",
        path: child.path,
        label: child.label,
        depth,
        dirty: input.dirty.has(child.path),
        git: decorationFor(child.path, "file", input.git),
      })
      continue
    }

    const expanded = input.expandedDirs.has(child.path)
    rows.push({
      key: `tree:${child.path}`,
      kind: "dir",
      path: child.path,
      label: child.label,
      depth,
      expanded,
      dirty: hasDirtyDescendant(child.path, input.dirty),
      git: decorationFor(child.path, "dir", input.git),
    })
    if (expanded) walk(child.path, depth + 1, input, rows)
  }
}

export async function loadFile(path: string): Promise<{ text: string } | { blocked: string }> {
  const file = Bun.file(path)
  if (!(await file.exists())) return { blocked: "This file is not on disk." }
  if (file.size > MAX_FILE_BYTES) {
    return { blocked: `This file is ${formatSize(file.size)}, which is too large to edit here.` }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.includes(0)) return { blocked: "This file looks binary, so it is not opened in the editor." }

  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  } catch {
    return { blocked: "This file is not valid UTF-8, so it is not opened in the editor." }
  }
}

function hasDirtyDescendant(dir: string, dirty: ReadonlySet<string>): boolean {
  const prefix = dir.endsWith("/") ? dir : `${dir}/`
  for (const path of dirty) {
    if (path.startsWith(prefix)) return true
  }
  return false
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
