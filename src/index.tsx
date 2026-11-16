#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { stat } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { App } from "./app.tsx"

const requested = resolve(process.argv[2] ?? process.cwd())

let workspace = requested
let initialFile: string | undefined

try {
  const info = await stat(requested)
  if (info.isFile()) {
    workspace = dirname(requested)
    initialFile = requested
  } else if (!info.isDirectory()) {
    console.error(`Not a folder: ${requested}`)
    process.exit(1)
  }
} catch {
  console.error(`Cannot open ${requested}`)
  process.exit(1)
}

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  backgroundColor: "#0B0F14",
})

createRoot(renderer).render(<App root={workspace} initialFile={initialFile} />)
