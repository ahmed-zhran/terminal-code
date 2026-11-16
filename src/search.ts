import { readdir, readFile, stat } from "node:fs/promises"
import { join, relative } from "node:path"

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage", ".next", "out", "build"])

export type SearchHit = {
  path: string
  relative: string
  line: number
  column: number
  text: string
}

export function findInText(text: string, query: string): Array<{ line: number; column: number; text: string }> {
  if (!query) return []
  const hits: Array<{ line: number; column: number; text: string }> = []
  const lines = text.split("\n")
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ""
    let from = 0
    while (from <= line.length) {
      const at = line.indexOf(query, from)
      if (at === -1) break
      hits.push({ line: index + 1, column: at + 1, text: line.trim() })
      from = at + Math.max(1, query.length)
    }
  }
  return hits
}

export function replaceLiteral(text: string, query: string, replacement: string): { text: string; count: number } {
  if (!query) return { text, count: 0 }
  const parts = text.split(query)
  return { text: parts.join(replacement), count: Math.max(0, parts.length - 1) }
}

export async function searchWorkspace(root: string, query: string, limit = 200): Promise<SearchHit[]> {
  if (!query) return []
  const rg = Bun.which("rg")
  if (rg) {
    const hits = await searchWithRg(rg, root, query, limit)
    if (hits) return hits
  }
  return searchByWalk(root, query, limit)
}

export async function filesContaining(root: string, query: string): Promise<string[]> {
  if (!query) return []
  const rg = Bun.which("rg")
  if (rg) {
    const proc = Bun.spawn(
      [rg, "-l", "-F", "--hidden", "-g", "!.git/**", "-g", "!node_modules/**", "-g", "!dist/**", "--max-filesize", "1M", query, root],
      { stdout: "pipe", stderr: "ignore" },
    )
    const code = await proc.exited
    if (code === 0 || code === 1) {
      return (await new Response(proc.stdout).text())
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 400)
    }
  }

  const hits = await searchByWalk(root, query, 4000)
  return [...new Set(hits.map((hit) => hit.path))]
}

async function searchWithRg(rg: string, root: string, query: string, limit: number): Promise<SearchHit[] | null> {
  const proc = Bun.spawn(
    [
      rg,
      "-n",
      "--column",
      "-F",
      "--hidden",
      "-g",
      "!.git/**",
      "-g",
      "!node_modules/**",
      "-g",
      "!dist/**",
      "--max-count",
      "40",
      "--max-filesize",
      "1M",
      query,
      root,
    ],
    { stdout: "pipe", stderr: "ignore" },
  )
  const code = await proc.exited
  if (code !== 0 && code !== 1) return null
  const hits: SearchHit[] = []
  for (const line of (await new Response(proc.stdout).text()).split("\n")) {
    const hit = parseRgLine(root, line)
    if (!hit) continue
    hits.push(hit)
    if (hits.length >= limit) break
  }
  return hits
}

export function parseRgLine(root: string, line: string): SearchHit | null {
  const match = /^(.*):(\d+):(\d+):(.*)$/.exec(line)
  if (!match) return null
  const path = match[1]
  const row = Number(match[2])
  const column = Number(match[3])
  const text = match[4] ?? ""
  if (!path || !Number.isFinite(row) || !Number.isFinite(column)) return null
  return { path, relative: relative(root, path) || path, line: row, column, text: text.trim() }
}

async function searchByWalk(root: string, query: string, limit: number): Promise<SearchHit[]> {
  const hits: SearchHit[] = []
  await walk(root, async (path) => {
    if (hits.length >= limit) return
    let text: string
    try {
      const info = await stat(path)
      if (info.size > 1024 * 1024) return
      text = await readFile(path, "utf8")
    } catch {
      return
    }
    if (text.includes("\u0000")) return
    for (const hit of findInText(text, query)) {
      hits.push({ path, relative: relative(root, path) || path, ...hit })
      if (hits.length >= limit) return
    }
  })
  return hits
}

async function walk(dir: string, visit: (path: string) => Promise<void>): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path, visit)
    else if (entry.isFile()) await visit(path)
  }
}
