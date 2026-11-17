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

test("Markdown chrome shows Source and Preview; non-Markdown hides them", async () => {
  const root = await mkdtemp(join(tmpdir(), "terminal-code-doc-mode-"))
  await writeFile(join(root, "readme.md"), "# Title\n\nhello\n")
  await writeFile(join(root, "notes.txt"), "plain notes\n")

  const setup = await testRender(<App root={root} watchFiles={false} />, { width: 100, height: 24 })

  try {
    await setup.waitForFrame((frame) => frame.includes("EXPLORER"), { maxPasses: 40 })

    expect(await clickText(setup, "notes.txt")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("plain notes"), { maxPasses: 40 })
    expect(setup.captureCharFrame()).not.toMatch(/\bSource\b/)
    expect(setup.captureCharFrame()).not.toMatch(/\bPreview\b/)

    expect(await clickText(setup, "readme.md")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("# Title") && frame.includes("Source") && frame.includes("Preview"), {
      maxPasses: 40,
    })
    const sourceFrame = setup.captureCharFrame()
    expect(sourceFrame).toMatch(/\bSource\b/)
    expect(sourceFrame).toMatch(/\bPreview\b/)
    expect(sourceFrame).not.toMatch(/·\s+Preview/)
  } catch (error) {
    throw new Error(`${setup.captureCharFrame()}\n\n${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await setup.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test("leaving and returning to a Markdown tab resets document mode to Source", async () => {
  const root = await mkdtemp(join(tmpdir(), "terminal-code-doc-reset-"))
  await writeFile(join(root, "guide.md"), "# Guide\n\npreview-me\n")
  await writeFile(join(root, "notes.txt"), "plain notes\n")

  const setup = await testRender(<App root={root} watchFiles={false} />, { width: 100, height: 24 })

  try {
    await setup.waitForFrame((frame) => frame.includes("EXPLORER"), { maxPasses: 40 })
    expect(await clickText(setup, "notes.txt")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("plain notes"), { maxPasses: 40 })
    expect(await clickText(setup, "guide.md")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("# Guide") && frame.includes("Source"), { maxPasses: 40 })

    expect(await clickText(setup, " Preview ")).toBe(true)
    await setup.waitForFrame(
      (frame) => frame.includes("Markdown preview") || /\·\s+Preview/.test(frame),
      { maxPasses: 40 },
    )
    expect(setup.captureCharFrame()).not.toMatch(/# Guide/)

    expect(await clickTab(setup, "notes.txt")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("plain notes"), { maxPasses: 40 })

    expect(await clickTab(setup, "guide.md")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("# Guide") && frame.includes("Source"), { maxPasses: 40 })
    const back = setup.captureCharFrame()
    expect(back).toMatch(/# Guide/)
    expect(back).not.toMatch(/\·\s+Preview/)
    expect(back).toMatch(/\bSource\b/)
  } catch (error) {
    throw new Error(`${setup.captureCharFrame()}\n\n${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await setup.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test("Preview is exclusive document mode, not WYSIWYG or a Source|Preview split", async () => {
  const root = await mkdtemp(join(tmpdir(), "terminal-code-doc-exclusive-"))
  await writeFile(join(root, "guide.md"), "# Guide\n\nonly-preview-body\n")

  const setup = await testRender(<App root={root} watchFiles={false} />, { width: 100, height: 24 })

  try {
    await setup.waitForFrame((frame) => frame.includes("EXPLORER"), { maxPasses: 40 })
    expect(await clickText(setup, "guide.md")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("# Guide") && frame.includes("Source"), { maxPasses: 40 })

    expect(await clickText(setup, " Preview ")).toBe(true)
    await setup.waitForFrame(
      (frame) => frame.includes("Markdown preview") || /\·\s+Preview/.test(frame),
      { maxPasses: 40 },
    )
    const preview = setup.captureCharFrame()
    expect(preview).not.toMatch(/# Guide/)
    expect(preview).not.toMatch(/Source\s*\|\s*Preview/)
    expect(preview).toMatch(/\bSource\b/)
    expect(preview).toMatch(/\bPreview\b/)

    setup.mockInput.pressTab()
    await setup.renderOnce()
    await setup.mockInput.typeText("WYS")
    await setup.renderOnce()
    expect(await clickText(setup, " Source ")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("# Guide"), { maxPasses: 40 })
    expect(setup.captureCharFrame()).not.toMatch(/WYS/)
  } catch (error) {
    throw new Error(`${setup.captureCharFrame()}\n\n${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await setup.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test("Ctrl+Alt+V toggles document mode with status cue; dirty mark stays in Preview", async () => {
  const root = await mkdtemp(join(tmpdir(), "terminal-code-doc-toggle-"))
  await writeFile(join(root, "guide.md"), "# Guide\n\nbody\n")

  const setup = await testRender(<App root={root} watchFiles={false} />, { width: 100, height: 24 })

  try {
    await setup.waitForFrame((frame) => frame.includes("EXPLORER"), { maxPasses: 40 })
    expect(await clickText(setup, "guide.md")).toBe(true)
    await setup.waitForFrame((frame) => frame.includes("# Guide") && frame.includes("Source"), { maxPasses: 40 })

    setup.mockInput.pressTab()
    await setup.renderOnce()
    await setup.mockInput.typeText("X")
    await setup.renderOnce()
    await setup.waitForFrame((frame) => frame.includes("●"), { maxPasses: 40 })

    setup.mockInput.pressKey("v", { ctrl: true, meta: true })
    await setup.waitForFrame(
      (frame) => frame.includes("Markdown preview") || frame.includes("·  Preview") || frame.includes("· Preview"),
      { maxPasses: 40 },
    )
    const previewFrame = setup.captureCharFrame()
    expect(previewFrame).toMatch(/\bSource\b/)
    expect(previewFrame).toMatch(/\bPreview\b/)
    expect(previewFrame).toMatch(/●/)
    expect(previewFrame).toMatch(/Preview/)

    setup.mockInput.pressKey("v", { ctrl: true, meta: true })
    await setup.waitForFrame((frame) => frame.includes("Markdown source") || frame.includes("Ln "), { maxPasses: 40 })
    expect(setup.captureCharFrame()).toMatch(/●/)
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

/** Click a file tab in the editor tab bar (row 0), not the explorer list. */
async function clickTab(setup: Awaited<ReturnType<typeof testRender>>, name: string): Promise<boolean> {
  const frame = setup.captureSpans()
  const line = frame.lines[0]
  if (!line) return false
  let x = 0
  for (const span of line.spans) {
    const at = span.text.indexOf(name)
    if (at !== -1) {
      await setup.mockMouse.click(x + at, 0)
      return true
    }
    x += span.width
  }
  return false
}
