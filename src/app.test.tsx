import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { App } from "./app.tsx"

const originalError = console.error

beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) return
    originalError(...args)
  }
})

afterEach(() => {
  console.error = originalError
})

test("opens a file from the tree with the keyboard or the mouse, then saves", async () => {
  const root = await mkdtemp(join(tmpdir(), "terminal-code-app-"))
  await mkdir(join(root, "src", "app"), { recursive: true })
  await writeFile(join(root, "notes.txt"), "notes-body\n")
  await writeFile(join(root, "src", "app", "main.ts"), "marker-line\n")

  const setup = await testRender(<App root={root} watchFiles={false} />, { width: 100, height: 24 })

  try {
    await setup.waitForFrame((frame) => frame.includes("src/app") && frame.includes("EXPLORER"), { maxPasses: 40 })

    expect(await clickText(setup, "notes.txt")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("notes-body"), { maxPasses: 40 })

    setup.mockInput.pressArrow("up")
    await setup.renderOnce()
    setup.mockInput.pressArrow("right")
    await setup.waitForFrame((frame) => frame.includes("main.ts"), { maxPasses: 40 })

    setup.mockInput.pressArrow("down")
    await setup.renderOnce()
    setup.mockInput.pressEnter()
    await setup.waitForFrame((frame) => frame.includes("marker-line"), { maxPasses: 40 })

    setup.mockInput.pressTab()
    await setup.renderOnce()
    await setup.mockInput.typeText("Z")
    await setup.renderOnce()
    setup.mockInput.pressKey("s", { ctrl: true })
    await setup.waitForFrame((frame) => frame.includes("Saved"), { maxPasses: 40 })

    expect(await readFile(join(root, "src", "app", "main.ts"), "utf8")).toBe("Zmarker-line\n")
  } catch (error) {
    throw new Error(`${setup.captureCharFrame()}\n\n${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await setup.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

async function clickText(setup: Awaited<ReturnType<typeof testRender>>, label: string): Promise<boolean> {
  const frame = setup.captureSpans()
  for (let y = 0; y < frame.lines.length; y++) {
    const line = frame.lines[y]
    if (!line) continue
    let x = 0
    for (const span of line.spans) {
      const at = span.text.indexOf(label)
      if (at !== -1) {
        await setup.mockMouse.click(x + at, y)
        return true
      }
      x += span.width
    }
  }
  return false
}
