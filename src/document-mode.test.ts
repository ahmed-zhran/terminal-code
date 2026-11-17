import { expect, test } from "bun:test"
import { documentModeAfterActivate } from "./document-mode.ts"

test("activating a different path resets document mode to Source", () => {
  expect(documentModeAfterActivate("/a.md", "/b.txt", "preview")).toBe("source")
  expect(documentModeAfterActivate("/a.md", "/a.md", "preview")).toBe("preview")
  expect(documentModeAfterActivate(null, "/a.md", "preview")).toBe("source")
  expect(documentModeAfterActivate("/a.md", "/b.md", "source")).toBe("source")
})
