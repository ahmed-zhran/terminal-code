import { resolve } from "node:path"

// Same decoration names VS Code uses in the explorer (gitDecoration.*).
export type GitMark = "conflict" | "deleted" | "modified" | "renamed" | "added" | "untracked"

const RANK: Record<GitMark, number> = {
  untracked: 1,
  added: 2,
  renamed: 3,
  modified: 4,
  deleted: 5,
  conflict: 6,
}

export const GIT_LETTER: Record<GitMark, string> = {
  conflict: "!",
  deleted: "D",
  modified: "M",
  renamed: "R",
  added: "A",
  untracked: "U",
}

export function stronger(current: GitMark | null, next: GitMark): GitMark {
  if (!current || RANK[next] > RANK[current]) return next
  return current
}

export function parsePorcelain(payload: string, cwd: string): Map<string, GitMark> {
  const parts = payload.split("\0")
  const marks = new Map<string, GitMark>()

  for (let index = 0; index < parts.length; index++) {
    const record = parts[index]
    if (!record || record.length < 4) continue

    const x = record[0] ?? " "
    const y = record[1] ?? " "
    const relative = record.slice(3)
    if (!relative) continue

    // Rename and copy records are `XY new\0old\0`.
    if (x === "R" || x === "C") index += 1

    const mark = markFrom(x, y)
    if (mark) marks.set(resolve(cwd, relative), mark)
  }

  return marks
}

export function decorationFor(path: string, kind: "file" | "dir", marks: ReadonlyMap<string, GitMark>): GitMark | null {
  if (kind === "file") return marks.get(path) ?? null

  const prefix = path.endsWith("/") ? path : `${path}/`
  let found = marks.get(path) ?? null
  for (const [file, mark] of marks) {
    if (file.startsWith(prefix)) found = stronger(found, mark)
  }
  return found
}

export function parseBranchList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("("))
}

export async function listBranches(cwd: string): Promise<string[]> {
  const proc = Bun.spawn(["git", "branch", "--format=%(refname:short)"], {
    cwd,
    stdout: "pipe",
    stderr: "ignore",
  })
  const code = await proc.exited
  if (code !== 0) return []
  return parseBranchList(await new Response(proc.stdout).text())
}

export async function checkoutBranch(cwd: string, name: string): Promise<string> {
  const proc = Bun.spawn(["git", "checkout", name], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const code = await proc.exited
  const message = `${await new Response(proc.stdout).text()}${await new Response(proc.stderr).text()}`.trim()
  if (code !== 0) throw new Error(message || `Could not switch to ${name}`)
  return message || `Switched to ${name}`
}

export async function readGit(cwd: string): Promise<{ branch: string | null; marks: Map<string, GitMark> }> {
  const status = Bun.spawn(["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd,
    stdout: "pipe",
    stderr: "ignore",
  })
  const branch = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
    stdout: "pipe",
    stderr: "ignore",
  })

  const [statusCode, branchCode] = await Promise.all([status.exited, branch.exited])
  if (statusCode !== 0) return { branch: null, marks: new Map() }

  const payload = await new Response(status.stdout).text()
  const branchName = branchCode === 0 ? (await new Response(branch.stdout).text()).trim() : null
  return { branch: branchName || null, marks: parsePorcelain(payload, cwd) }
}

function markFrom(x: string, y: string): GitMark | null {
  if (x === "?" && y === "?") return "untracked"
  if (x === "U" || y === "U" || (x === "A" && y === "A") || (x === "D" && y === "D")) return "conflict"
  if (x === "R" || x === "C") return y === "M" ? "modified" : "renamed"
  if (x === "D" || y === "D") return "deleted"
  if (x === "A") return "added"
  if (x === "M" || y === "M" || x === "T" || y === "T") return "modified"
  return null
}
