import type { MousePointerStyle, ScrollBoxRenderable, TextareaRenderable } from "@opentui/core"
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react"
import { watch, type FSWatcher } from "node:fs"
import { basename, relative } from "node:path"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { TreeModel, buildExplorerRows, loadFile, type ExplorerRow } from "./files.ts"
import { GIT_LETTER, checkoutBranch, listBranches, readGit, type GitMark } from "./git.ts"
import { getSyntaxStyle, paintSyntax } from "./highlight.ts"
import { fileMark, folderMark, type IconTone } from "./icons.ts"
import { isMarkdownPath } from "./markdown.ts"
import { filesContaining, replaceLiteral, searchWorkspace, type SearchHit } from "./search.ts"
import {
  ACTION_LABELS,
  actionFor,
  chordFromEvent,
  loadSettings,
  saveSettings,
  type Action,
  type Settings,
} from "./settings.ts"
import { themeOrder, themes, type Theme } from "./theme.ts"

const ACTIVITY = 4

type Buffer = {
  saved: string
  current: string
  dirty: boolean
  blocked: string | null
}

type Focus = "sidebar" | "editor" | "query" | "replace"
type View = "explorer" | "search" | "scm" | "settings"

type Change = {
  path: string
  label: string
  badge: string
  unsaved: boolean
  mark: GitMark | null
}

export function App({
  root,
  initialFile,
  watchFiles = true,
  settingsFile,
}: {
  root: string
  initialFile?: string
  watchFiles?: boolean
  settingsFile?: string
}) {
  const renderer = useRenderer()
  const { width, height } = useTerminalDimensions()
  const model = useRef(new TreeModel()).current
  const initialSettings = useRef(loadSettings(settingsFile)).current

  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [sidebarWidth, setSidebarWidth] = useState(initialSettings.sidebarWidth)
  const [version, setVersion] = useState(0)
  const [editorsExpanded, setEditorsExpanded] = useState(true)
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set())
  const [openPaths, setOpenPaths] = useState<string[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [mountText, setMountText] = useState("")
  const [editorGeneration, setEditorGeneration] = useState(0)
  const [dirtyTick, setDirtyTick] = useState(0)
  const [focus, setFocus] = useState<Focus>("sidebar")
  const [view, setView] = useState<View>("explorer")
  const [selectedKey, setSelectedKey] = useState("section:workspace")
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [sidebar, setSidebar] = useState(true)
  const [git, setGit] = useState<Map<string, GitMark>>(() => new Map())
  const [branch, setBranch] = useState<string | null>(null)
  const [branches, setBranches] = useState<string[]>([])
  const [branchMenu, setBranchMenu] = useState(false)
  const [branchIndex, setBranchIndex] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [typeahead, setTypeahead] = useState("")
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  const [query, setQuery] = useState("")
  const [replacement, setReplacement] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searchIndex, setSearchIndex] = useState(0)
  const [scmIndex, setScmIndex] = useState(0)
  const [settingsIndex, setSettingsIndex] = useState(1)
  const [rebind, setRebind] = useState<Action | null>(null)
  const [dividerHot, setDividerHot] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const theme = themes[settings.theme]
  const buffers = useRef(new Map<string, Buffer>())
  const expandedRef = useRef(expandedDirs)
  const rowsRef = useRef<ExplorerRow[]>([])
  const selectedKeyRef = useRef(selectedKey)
  const focusRef = useRef(focus)
  const activeRef = useRef(activePath)
  const viewRef = useRef(view)
  const settingsRef = useRef(settings)
  const sidebarWidthRef = useRef(sidebarWidth)
  const findQuery = useRef("")
  const findTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmClose = useRef<string | null>(null)
  const lastToggle = useRef<{ key: string; at: number } | null>(null)
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  const editorRef = useRef<TextareaRenderable | null>(null)
  const loadingDirs = useRef(new Set<string>())
  const jumpRef = useRef<{ path: string; line: number; column: number } | null>(null)
  const hitsRef = useRef(hits)
  const changesRef = useRef<Change[]>([])
  const settingsRowsRef = useRef<SettingsRow[]>([])
  const searchIndexRef = useRef(0)
  const scmIndexRef = useRef(0)
  const settingsIndexRef = useRef(1)
  const rebindRef = useRef<Action | null>(null)
  const branchMenuRef = useRef(false)
  const branchIndexRef = useRef(0)
  const branchesRef = useRef(branches)
  const branchRef = useRef(branch)
  const settingsFileRef = useRef(settingsFile)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  expandedRef.current = expandedDirs
  selectedKeyRef.current = selectedKey
  focusRef.current = focus
  activeRef.current = activePath
  viewRef.current = view
  settingsRef.current = settings
  sidebarWidthRef.current = sidebarWidth
  hitsRef.current = hits
  searchIndexRef.current = searchIndex
  scmIndexRef.current = scmIndex
  settingsIndexRef.current = settingsIndex
  rebindRef.current = rebind
  branchMenuRef.current = branchMenu
  branchIndexRef.current = branchIndex
  branchesRef.current = branches
  branchRef.current = branch
  settingsFileRef.current = settingsFile

  const dirty = useMemo(() => {
    const paths = new Set<string>()
    for (const [path, buffer] of buffers.current) {
      if (buffer.dirty) paths.add(path)
    }
    return paths
  }, [dirtyTick])

  const rows = useMemo(
    () =>
      buildExplorerRows({
        root,
        rootLabel: basename(root),
        editorsExpanded,
        workspaceExpanded,
        openPaths,
        dirty,
        expandedDirs,
        children: model.children,
        git,
      }),
    [root, editorsExpanded, workspaceExpanded, openPaths, dirty, expandedDirs, git, version, model],
  )
  rowsRef.current = rows

  const changes = useMemo(() => buildChanges(root, git, dirty), [root, git, dirty])
  changesRef.current = changes

  const settingsRows = useMemo(() => buildSettingsRows(settings), [settings])
  settingsRowsRef.current = settingsRows

  const selectedIndex = Math.max(0, rows.findIndex((row) => row.key === selectedKey))

  function persist(next: Settings) {
    settingsRef.current = next
    setSettings(next)
    saveSettings(next, settingsFileRef.current)
  }

  function showView(next: View) {
    setView(next)
    setSidebar(true)
    setFocus("sidebar")
    setBranchMenu(false)
  }

  function applyDocumentMode(path: string, next: boolean, current: boolean): boolean {
    if (next === current) return current
    if (!next) {
      const buffer = buffers.current.get(path)
      if (buffer && !buffer.blocked) {
        setMountText(buffer.current)
        setEditorGeneration((generation) => generation + 1)
      }
    } else if (editorRef.current) {
      const buffer = buffers.current.get(path)
      if (buffer && !buffer.blocked) buffer.current = editorRef.current.plainText
    }
    setNotice(next ? "Markdown preview" : "Markdown source")
    setFocus("editor")
    return next
  }

  function enterDocumentMode(mode: "source" | "preview") {
    const path = activeRef.current
    if (!path || !isMarkdownPath(path)) {
      setNotice("Open a Markdown file to preview it.")
      return
    }
    setPreviewMode((current) => applyDocumentMode(path, mode === "preview", current))
  }

  function toggleMarkdownPreview() {
    const path = activeRef.current
    if (!path || !isMarkdownPath(path)) {
      setNotice("Open a Markdown file to preview it.")
      return
    }
    setPreviewMode((current) => applyDocumentMode(path, !current, current))
  }

  function scheduleHighlight() {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => {
      const editor = editorRef.current
      const path = activeRef.current
      if (!editor || !path) return
      void paintSyntax(editor, path, themes[settingsRef.current.theme], renderer.nativeScene).then(() => {
        renderer.requestRender()
      })
    }, 120)
  }

  useEffect(() => {
    scheduleHighlight()
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    }
  }, [activePath, editorGeneration, settings.theme])

  useEffect(() => {
    const box = scrollRef.current
    if (!box || view !== "explorer" || rows.length === 0) return
    box.scrollChildIntoView(`explorer-row-${selectedIndex}`)
  }, [rows, selectedIndex, view])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (focus === "editor") editor.focus()
    else editor.blur()
    const jump = jumpRef.current
    if (focus === "editor" && jump && jump.path === activePath) {
      editor.setCursor(Math.max(0, jump.line - 1), Math.max(0, jump.column - 1))
      jumpRef.current = null
    }
  }, [focus, activePath, mountText, editorGeneration])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await model.reload(root, [])
        if (!cancelled) setVersion((value) => value + 1)
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Could not read this folder.")
      }
      const gitState = await readGit(root)
      if (!cancelled) {
        setGit(gitState.marks)
        setBranch(gitState.branch)
      }
      if (initialFile) await openPath(initialFile)
    })()
    return () => {
      cancelled = true
    }
    // Startup only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, initialFile])

  useEffect(() => {
    if (!watchFiles) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let watcher: FSWatcher
    const onChange = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void model.reload(root, expandedRef.current).then(() => setVersion((value) => value + 1))
        void readGit(root).then((gitState) => {
          setGit(gitState.marks)
          setBranch(gitState.branch)
        })
      }, 150)
    }
    try {
      watcher = watch(root, { recursive: true }, onChange)
    } catch {
      watcher = watch(root, onChange)
    }
    return () => {
      clearTimeout(timer)
      watcher.close()
    }
  }, [root, watchFiles, model])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (view !== "search") return
    const timer = setTimeout(() => {
      void runSearch(query)
    }, 220)
    return () => clearTimeout(timer)
    // runSearch reads the latest query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, view, root])

  async function openPath(path: string) {
    let buffer = buffers.current.get(path)
    if (!buffer) {
      const loaded = await loadFile(path)
      buffer =
        "text" in loaded
          ? { saved: loaded.text, current: loaded.text, dirty: false, blocked: null }
          : { saved: "", current: "", dirty: false, blocked: loaded.blocked }
      buffers.current.set(path, buffer)
    }
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]))
    setActivePath(path)
    setMountText(buffer.current)
    setCursor({ line: 1, column: 1 })
    confirmClose.current = null
  }

  async function toggleDir(path: string) {
    if (expandedRef.current.has(path)) {
      setExpandedDirs((prev) => {
        const next = new Set(prev)
        next.delete(path)
        return next
      })
      return
    }
    if (!model.children.has(path) && !loadingDirs.current.has(path)) {
      loadingDirs.current.add(path)
      try {
        await model.reload(root, [...expandedRef.current, path])
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not open that folder.")
        return
      } finally {
        loadingDirs.current.delete(path)
      }
    }
    setExpandedDirs((prev) => new Set(prev).add(path))
    setVersion((value) => value + 1)
  }

  function toggleSection(section: "editors" | "workspace") {
    if (section === "editors") setEditorsExpanded((value) => !value)
    else setWorkspaceExpanded((value) => !value)
  }

  function toggleRow(row: ExplorerRow) {
    if (row.kind === "section" && row.section) toggleSection(row.section)
    else if (row.kind === "dir" && row.path) void toggleDir(row.path)
  }

  async function save() {
    const path = activeRef.current
    if (!path) return
    const buffer = buffers.current.get(path)
    if (!buffer || buffer.blocked) return
    if (editorRef.current) buffer.current = editorRef.current.plainText
    if (buffer.current === buffer.saved) return
    try {
      await Bun.write(path, buffer.current)
      buffer.saved = buffer.current
      buffer.dirty = false
      setDirtyTick((value) => value + 1)
      setNotice("Saved")
      const gitState = await readGit(root)
      setGit(gitState.marks)
      setBranch(gitState.branch)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the file.")
    }
  }

  function closeActive(force = false) {
    const path = activeRef.current
    if (!path) return
    const buffer = buffers.current.get(path)
    if (buffer?.dirty && !force && confirmClose.current !== path) {
      confirmClose.current = path
      setNotice("Unsaved changes. Press the close shortcut again to close.")
      return
    }
    confirmClose.current = null
    buffers.current.delete(path)
    setOpenPaths((prev) => {
      const index = prev.indexOf(path)
      const next = prev.filter((item) => item !== path)
      const neighbor = next[index] ?? next[index - 1] ?? null
      setActivePath(neighbor)
      setMountText(neighbor ? (buffers.current.get(neighbor)?.current ?? "") : "")
      if (!neighbor) setFocus("sidebar")
      return next
    })
    setDirtyTick((value) => value + 1)
  }

  function resizeSidebar(delta: number) {
    const max = Math.max(18, Math.floor(width * 0.62))
    const next = Math.min(max, Math.max(18, sidebarWidthRef.current + delta))
    sidebarWidthRef.current = next
    setSidebarWidth(next)
    persist({ ...settingsRef.current, sidebarWidth: next })
  }

  async function runSearch(text: string) {
    if (!text) {
      setHits([])
      return
    }
    try {
      const found = await searchWorkspace(root, text)
      setHits(found)
      setSearchIndex(0)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Search failed.")
    }
  }

  async function replaceAll() {
    const text = query
    if (!text) {
      setNotice("Type something to find first.")
      return
    }
    const paths = await filesContaining(root, text)
    let files = 0
    let count = 0
    for (const path of paths) {
      const buffer = buffers.current.get(path)
      let source = buffer && !buffer.blocked ? buffer.current : null
      if (source === null) {
        const loaded = await loadFile(path)
        if (!("text" in loaded)) continue
        source = loaded.text
      }
      const next = replaceLiteral(source, text, replacement)
      if (next.count === 0) continue
      await Bun.write(path, next.text)
      if (buffer && !buffer.blocked) {
        buffer.current = next.text
        buffer.saved = next.text
        buffer.dirty = false
      }
      files += 1
      count += next.count
    }
    if (activeRef.current && paths.includes(activeRef.current)) {
      const buffer = buffers.current.get(activeRef.current)
      if (buffer) {
        setMountText(buffer.current)
        setEditorGeneration((value) => value + 1)
      }
    }
    setDirtyTick((value) => value + 1)
    setNotice(count === 0 ? "No matches to replace." : `Replaced ${count} in ${files} file${files === 1 ? "" : "s"}.`)
    await runSearch(text)
    const gitState = await readGit(root)
    setGit(gitState.marks)
    setBranch(gitState.branch)
  }

  async function toggleBranchMenu() {
    if (branchMenuRef.current) {
      setBranchMenu(false)
      return
    }
    const names = await listBranches(root)
    const current = branchRef.current
    setBranches(names.filter((name) => name !== current))
    setBranchIndex(0)
    setBranchMenu(true)
  }

  async function switchBranch(name: string) {
    try {
      const message = await checkoutBranch(root, name)
      setNotice(message.split("\n")[0] || `Switched to ${name}`)
      setBranchMenu(false)
      await model.reload(root, expandedRef.current)
      setVersion((value) => value + 1)
      const gitState = await readGit(root)
      setGit(gitState.marks)
      setBranch(gitState.branch)
      for (const [path, buffer] of buffers.current) {
        if (buffer.dirty || buffer.blocked) continue
        const loaded = await loadFile(path)
        if (!("text" in loaded)) continue
        buffer.saved = loaded.text
        buffer.current = loaded.text
        if (path === activeRef.current) {
          setMountText(loaded.text)
          setEditorGeneration((value) => value + 1)
        }
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not switch branch.")
    }
  }

  function rowIndex() {
    const index = rowsRef.current.findIndex((row) => row.key === selectedKeyRef.current)
    return index < 0 ? 0 : index
  }

  function selectOffset(delta: number) {
    const list = rowsRef.current
    if (list.length === 0) return
    const next = Math.min(list.length - 1, Math.max(0, rowIndex() + delta))
    const row = list[next]
    if (row) setSelectedKey(row.key)
  }

  function selectParent() {
    const list = rowsRef.current
    const row = list[rowIndex()]
    if (!row) return
    for (let index = rowIndex() - 1; index >= 0; index--) {
      const previous = list[index]
      if (previous && previous.depth < row.depth) {
        setSelectedKey(previous.key)
        return
      }
    }
  }

  function clearTypeahead() {
    findQuery.current = ""
    setTypeahead("")
    if (findTimer.current) clearTimeout(findTimer.current)
  }

  function typeAhead(character: string) {
    const growing = findQuery.current.length > 0
    findQuery.current = `${findQuery.current}${character.toLowerCase()}`
    setTypeahead(findQuery.current)
    if (findTimer.current) clearTimeout(findTimer.current)
    findTimer.current = setTimeout(() => {
      findQuery.current = ""
      setTypeahead("")
    }, 800)
    const list = rowsRef.current
    if (list.length === 0) return
    const begin = growing ? rowIndex() : rowIndex() + 1
    for (let step = 0; step < list.length; step++) {
      const row = list[(begin + step) % list.length]
      if (row?.label.toLowerCase().startsWith(findQuery.current)) {
        setSelectedKey(row.key)
        return
      }
    }
  }

  function moveList(delta: number, length: number, current: number, set: (value: number) => void) {
    if (length === 0) return
    set(Math.min(length - 1, Math.max(0, current + delta)))
  }

  function runAction(action: Action) {
    switch (action) {
      case "undo":
        editorRef.current?.undo()
        return
      case "redo":
      case "redoAlt":
        editorRef.current?.redo()
        return
      case "save":
        void save()
        return
      case "close":
        closeActive()
        return
      case "sidebar":
        setSidebar((open) => {
          if (open && activeRef.current) setFocus("editor")
          return !open
        })
        return
      case "explorer":
        showView("explorer")
        return
      case "search":
        showView("search")
        setFocus("query")
        return
      case "sourceControl":
        showView("scm")
        return
      case "settings":
        showView("settings")
        return
      case "preview":
        toggleMarkdownPreview()
        return
      case "widen":
        setSidebar(true)
        resizeSidebar(2)
        return
      case "narrow":
        resizeSidebar(-2)
        return
      case "replaceAll":
        void replaceAll()
        return
    }
  }

  useKeyboard((key) => {
    if (key.eventType === "release") return

    if (rebindRef.current) {
      key.preventDefault()
      if (key.name === "escape") {
        setRebind(null)
        return
      }
      if (!key.ctrl && !key.meta && !key.shift) {
        setNotice("Use Ctrl, Alt, or Shift in the shortcut.")
        return
      }
      const chord = chordFromEvent(key)
      const action = rebindRef.current
      const next = {
        ...settingsRef.current,
        keys: { ...settingsRef.current.keys, [action]: chord },
      }
      persist(next)
      setRebind(null)
      setNotice(`${ACTION_LABELS[action]} is now ${chord}`)
      return
    }

    const chord = chordFromEvent(key)
    const action = actionFor(chord, settingsRef.current.keys)
    if (action) {
      key.preventDefault()
      if (action === "sidebar") setBranchMenu(false)
      runAction(action)
      return
    }

    if (branchMenuRef.current) {
      const list = branchesRef.current
      if (key.name === "escape") {
        key.preventDefault()
        setBranchMenu(false)
        return
      }
      if (key.name === "up") {
        key.preventDefault()
        setBranchIndex(Math.max(0, branchIndexRef.current - 1))
        return
      }
      if (key.name === "down") {
        key.preventDefault()
        setBranchIndex(Math.min(Math.max(0, list.length - 1), branchIndexRef.current + 1))
        return
      }
      if (key.name === "return") {
        key.preventDefault()
        const name = list[branchIndexRef.current]
        if (name) void switchBranch(name)
        return
      }
      setBranchMenu(false)
    }

    if (key.name === "escape") {
      key.preventDefault()
      if (focusRef.current === "query" || focusRef.current === "replace") {
        setFocus("sidebar")
        return
      }
      if (focusRef.current === "editor") setFocus("sidebar")
      return
    }

    if (key.name === "tab" && !key.shift && !key.ctrl) {
      if (viewRef.current === "search") {
        key.preventDefault()
        setFocus((current) => (current === "query" ? "replace" : current === "replace" ? "sidebar" : "query"))
        return
      }
      if (focusRef.current === "sidebar" && activeRef.current) {
        key.preventDefault()
        setFocus("editor")
      }
      return
    }

    if (focusRef.current === "editor" || focusRef.current === "query" || focusRef.current === "replace") return

    const page = Math.max(1, height - 4)
    if (viewRef.current === "search") {
      const list = hitsRef.current
      if (key.name === "up") {
        key.preventDefault()
        moveList(-1, list.length, searchIndexRef.current, setSearchIndex)
      } else if (key.name === "down") {
        key.preventDefault()
        moveList(1, list.length, searchIndexRef.current, setSearchIndex)
      } else if (key.name === "return") {
        key.preventDefault()
        const hit = list[searchIndexRef.current]
        if (hit) {
          jumpRef.current = { path: hit.path, line: hit.line, column: hit.column }
          void openPath(hit.path).then(() => setFocus("editor"))
        }
      }
      return
    }

    if (viewRef.current === "scm") {
      const list = changesRef.current
      if (key.name === "up") {
        key.preventDefault()
        moveList(-1, list.length, scmIndexRef.current, setScmIndex)
      } else if (key.name === "down") {
        key.preventDefault()
        moveList(1, list.length, scmIndexRef.current, setScmIndex)
      } else if (key.name === "return") {
        key.preventDefault()
        const change = list[scmIndexRef.current]
        if (change) void openPath(change.path)
      }
      return
    }

    if (viewRef.current === "settings") {
      const list = settingsRowsRef.current
      if (key.name === "up") {
        key.preventDefault()
        moveList(-1, list.length, settingsIndexRef.current, setSettingsIndex)
      } else if (key.name === "down") {
        key.preventDefault()
        moveList(1, list.length, settingsIndexRef.current, setSettingsIndex)
      } else if (key.name === "return") {
        key.preventDefault()
        const row = list[settingsIndexRef.current]
        if (!row || row.kind === "header") return
        if (row.kind === "theme") persist({ ...settingsRef.current, theme: row.id })
        else setRebind(row.action)
      }
      return
    }

    const list = rowsRef.current
    const row = list[rowIndex()]
    if (key.name === "up") {
      key.preventDefault()
      clearTypeahead()
      selectOffset(-1)
      return
    }
    if (key.name === "down") {
      key.preventDefault()
      clearTypeahead()
      selectOffset(1)
      return
    }
    if (key.name === "pageup" || key.name === "page_up") {
      key.preventDefault()
      clearTypeahead()
      selectOffset(-page)
      return
    }
    if (key.name === "pagedown" || key.name === "page_down") {
      key.preventDefault()
      clearTypeahead()
      selectOffset(page)
      return
    }
    if (key.name === "home") {
      key.preventDefault()
      clearTypeahead()
      const first = list[0]
      if (first) setSelectedKey(first.key)
      return
    }
    if (key.name === "end") {
      key.preventDefault()
      clearTypeahead()
      const last = list[list.length - 1]
      if (last) setSelectedKey(last.key)
      return
    }
    if (key.name === "left") {
      key.preventDefault()
      clearTypeahead()
      if (row && (row.kind === "dir" || row.kind === "section") && row.expanded) toggleRow(row)
      else selectParent()
      return
    }
    if (key.name === "right") {
      key.preventDefault()
      clearTypeahead()
      if (!row || row.kind === "hint") return
      if ((row.kind === "dir" || row.kind === "section") && !row.expanded) {
        toggleRow(row)
        return
      }
      const next = list[rowIndex() + 1]
      if (next && next.depth > row.depth) setSelectedKey(next.key)
      return
    }
    if (key.name === "return") {
      key.preventDefault()
      clearTypeahead()
      if (!row) return
      if ((row.kind === "file" || row.kind === "editor") && row.path) {
        void openPath(row.path)
        return
      }
      toggleRow(row)
      return
    }

    const character = key.sequence
    if (!key.ctrl && !key.meta && character && character.length === 1 && character >= " ") {
      key.preventDefault()
      typeAhead(character)
    }
  })

  function onRowPress(row: ExplorerRow) {
    setBranchMenu(false)
    setFocus("sidebar")
    setSelectedKey(row.key)
    clearTypeahead()
    if ((row.kind === "file" || row.kind === "editor") && row.path) {
      void openPath(row.path)
      return
    }
    if (row.kind === "hint") return
    const now = Date.now()
    if (lastToggle.current?.key === row.key && now - lastToggle.current.at < 400) return
    lastToggle.current = { key: row.key, at: now }
    toggleRow(row)
  }

  const activeBuffer = activePath ? buffers.current.get(activePath) : undefined
  const markdownActive = Boolean(activePath && isMarkdownPath(activePath))
  const showingPreview = Boolean(previewMode && markdownActive && activeBuffer && !activeBuffer.blocked)
  const previewBody = showingPreview ? (activeBuffer?.current ?? "") : ""
  const maxSidebar = Math.max(18, Math.floor(width * 0.62))
  const shownSidebar = sidebar ? Math.min(maxSidebar, Math.max(18, sidebarWidth)) : 0
  const editorWidth = Math.max(8, width - ACTIVITY - shownSidebar - (sidebar ? 1 : 0))
  const bodyHeight = Math.max(1, height - 1)
  const sidebarPaneHeight = Math.max(1, bodyHeight - 2)
  const paneHeight = Math.max(1, bodyHeight - 1)
  const location = activePath ? relative(root, activePath) || basename(activePath) : basename(root)
  const statusMiddle =
    notice ??
    `${location}${activePath ? (showingPreview ? "  ·  Preview" : `  ·  Ln ${cursor.line}, Col ${cursor.column}`) : ""}`
  const menuHeight = 1 + Math.min(10, Math.max(1, branches.length))
  const point = (style: MousePointerStyle) => {
    renderer.setMousePointer(style)
    renderer.requestRender()
  }

  return (
    <box
      width={width}
      height={height}
      flexDirection="column"
      backgroundColor={theme.editorBg}
      onMouseDown={() => {
        if (branchMenuRef.current) setBranchMenu(false)
      }}
    >
      <box width={width} height={bodyHeight} flexDirection="row">
        <box width={ACTIVITY} height={bodyHeight} flexDirection="column" backgroundColor={theme.activityBg}>
          <box width={ACTIVITY} height={1} backgroundColor={theme.activityBg}>
            <text fg={theme.brand}> ·</text>
          </box>
          <ActivityIcon theme={theme} mark="▣" label="E" active={view === "explorer"} onPress={() => showView("explorer")} />
          <ActivityIcon theme={theme} mark="⌕" label="S" active={view === "search"} onPress={() => showView("search")} />
          <ActivityIcon theme={theme} mark="⎇" label="G" active={view === "scm"} onPress={() => showView("scm")} />
          <box width={ACTIVITY} height={Math.max(0, bodyHeight - 5)} backgroundColor={theme.activityBg} />
          <ActivityIcon theme={theme} mark="⚙" label="," active={view === "settings"} onPress={() => showView("settings")} />
        </box>

        {sidebar ? (
          <box width={shownSidebar} height={bodyHeight} flexDirection="column" backgroundColor={theme.sidebarBg}>
            <box width={shownSidebar} height={1} flexDirection="row" backgroundColor={theme.sidebarBg}>
              <text fg={theme.brand}> ▎</text>
              <text fg={theme.titleFg}>{viewTitle(view)}</text>
            </box>
            <box width={shownSidebar} height={1} backgroundColor={theme.divider} />
            {view === "explorer" ? (
              <scrollbox
                ref={scrollRef}
                width={shownSidebar}
                height={sidebarPaneHeight}
                focused={false}
                focusable={false}
                scrollY
                rootOptions={{ backgroundColor: theme.sidebarBg }}
                viewportOptions={{ backgroundColor: theme.sidebarBg }}
                contentOptions={{ backgroundColor: theme.sidebarBg, flexDirection: "column" }}
                verticalScrollbarOptions={{ trackOptions: { backgroundColor: theme.activityBg, foregroundColor: theme.listDim } }}
              >
                {rows.map((row, index) => (
                  <ExplorerRowView
                    key={row.key}
                    theme={theme}
                    row={row}
                    index={index}
                    width={shownSidebar}
                    selected={index === selectedIndex}
                    sidebarFocused={focus === "sidebar"}
                    hovered={hoveredKey === row.key}
                    onPress={onRowPress}
                    onHover={setHoveredKey}
                  />
                ))}
              </scrollbox>
            ) : null}
            {view === "search" ? (
              <SearchPane
                theme={theme}
                width={shownSidebar}
                height={sidebarPaneHeight}
                query={query}
                replacement={replacement}
                hits={hits}
                selected={searchIndex}
                focus={focus}
                onQuery={setQuery}
                onReplacement={setReplacement}
                onFocus={setFocus}
                onPick={(index) => {
                  setSearchIndex(index)
                  const hit = hits[index]
                  if (!hit) return
                  jumpRef.current = { path: hit.path, line: hit.line, column: hit.column }
                  void openPath(hit.path).then(() => setFocus("editor"))
                }}
              />
            ) : null}
            {view === "scm" ? (
              <ScmPane
                theme={theme}
                width={shownSidebar}
                height={sidebarPaneHeight}
                changes={changes}
                selected={Math.min(scmIndex, Math.max(0, changes.length - 1))}
                focused={focus === "sidebar"}
                onPick={(index) => {
                  setBranchMenu(false)
                  setScmIndex(index)
                  const change = changes[index]
                  if (change) void openPath(change.path)
                }}
              />
            ) : null}
            {view === "settings" ? (
              <SettingsPane
                theme={theme}
                width={shownSidebar}
                height={sidebarPaneHeight}
                rows={settingsRows}
                selected={Math.min(settingsIndex, Math.max(0, settingsRows.length - 1))}
                focused={focus === "sidebar"}
                rebind={rebind}
                onPick={(index) => {
                  setSettingsIndex(index)
                  const row = settingsRows[index]
                  if (!row || row.kind === "header") return
                  if (row.kind === "theme") persist({ ...settings, theme: row.id })
                  else setRebind(row.action)
                }}
              />
            ) : null}
          </box>
        ) : null}

        {sidebar ? (
          <box
            width={1}
            height={bodyHeight}
            backgroundColor={dividerHot ? theme.accent : theme.divider}
            onMouseOver={() => {
              setDividerHot(true)
              point("ew-resize")
            }}
            onMouseOut={() => {
              setDividerHot(false)
              point("default")
            }}
            onMouseDrag={(event) => {
              const next = Math.min(maxSidebar, Math.max(18, event.x - ACTIVITY))
              sidebarWidthRef.current = next
              setSidebarWidth(next)
            }}
            onMouseUp={() => persist({ ...settingsRef.current, sidebarWidth: sidebarWidthRef.current })}
          />
        ) : null}

        <box width={editorWidth} height={bodyHeight} flexDirection="column" backgroundColor={theme.editorBg}>
          <box width={editorWidth} height={1} flexDirection="row" backgroundColor={theme.tabBar}>
            {openPaths.length === 0 ? (
              <box height={1} flexGrow={1} backgroundColor={theme.tabBar}>
                <text fg={theme.listDim}> no file open</text>
              </box>
            ) : (
              openPaths.map((path) => {
                const buffer = buffers.current.get(path)
                const active = path === activePath
                const name = basename(path)
                const tabLabelFg = active ? theme.tabFg : theme.tabInactiveFg
                return (
                  <box
                    key={path}
                    height={1}
                    flexShrink={0}
                    flexDirection="row"
                    backgroundColor={active ? theme.tabActive : theme.tabInactive}
                    onMouseDown={() => {
                      const current = buffers.current.get(path)
                      setActivePath(path)
                      setMountText(current?.current ?? "")
                      setFocus("editor")
                    }}
                    onMouseOver={() => point("pointer")}
                    onMouseOut={() => point("default")}
                  >
                    {active ? <text fg={theme.tabMark}>▎</text> : <text fg={theme.tabInactive}> </text>}
                    <text fg={tabLabelFg}>{` ${name}`}</text>
                    {buffer?.dirty ? <text fg={theme.dirty}> ●</text> : null}
                    <text fg={tabLabelFg}> </text>
                  </box>
                )
              })
            )}
            <box flexGrow={1} backgroundColor={theme.tabBar} />
            {markdownActive ? (
              <box height={1} flexShrink={0} flexDirection="row">
                {(
                  [
                    { mode: "source" as const, label: " Source ", active: !showingPreview },
                    { mode: "preview" as const, label: " Preview ", active: showingPreview },
                  ] as const
                ).map((segment) => (
                  <box
                    key={segment.mode}
                    height={1}
                    flexShrink={0}
                    backgroundColor={segment.active ? theme.listActive : theme.tabInactive}
                    onMouseDown={(event) => {
                      event.stopPropagation()
                      enterDocumentMode(segment.mode)
                    }}
                    onMouseOver={() => point("pointer")}
                    onMouseOut={() => point("default")}
                  >
                    <text fg={segment.active ? theme.brand : theme.listDim}>{segment.label}</text>
                  </box>
                ))}
              </box>
            ) : null}
          </box>
          {activePath && activeBuffer?.blocked ? (
            <box width={editorWidth} height={paneHeight} padding={1} backgroundColor={theme.editorBg} onMouseDown={() => setFocus("editor")}>
              <text fg={theme.listFg}>{activeBuffer.blocked}</text>
            </box>
          ) : activePath && activeBuffer && showingPreview ? (
            <MarkdownPreview
              theme={theme}
              width={editorWidth}
              height={paneHeight}
              content={previewBody}
              focused={focus === "editor"}
              onFocus={() => setFocus("editor")}
            />
          ) : activePath && activeBuffer ? (
            <textarea
              ref={editorRef}
              key={`${activePath}:${editorGeneration}`}
              width={editorWidth}
              height={paneHeight}
              initialValue={mountText}
              wrapMode="none"
              focused={focus === "editor"}
              backgroundColor={theme.editorBg}
              focusedBackgroundColor={theme.editorBg}
              textColor={theme.editorText}
              focusedTextColor={theme.editorText}
              cursorColor={theme.cursor}
              selectionBg={theme.selection}
              tabIndicator="›"
              tabIndicatorColor={theme.listDim}
              onMouseDown={() => setFocus("editor")}
              onMouseOver={() => point("text")}
              onMouseOut={() => point("default")}
              onContentChange={() => {
                const path = activeRef.current
                const buffer = path ? buffers.current.get(path) : undefined
                const text = editorRef.current?.plainText
                if (!path || !buffer || text === undefined || buffer.blocked) return
                buffer.current = text
                const dirtyNow = text !== buffer.saved
                if (dirtyNow !== buffer.dirty) {
                  buffer.dirty = dirtyNow
                  setDirtyTick((value) => value + 1)
                }
                scheduleHighlight()
              }}
              onCursorChange={(event) => setCursor({ line: event.line + 1, column: event.visualColumn + 1 })}
            />
          ) : (
            <WelcomePane theme={theme} width={editorWidth} height={paneHeight} workspace={basename(root)} />
          )}
        </box>
      </box>

      <box width={width} height={1} flexDirection="row" backgroundColor={theme.statusBg}>
        <box
          height={1}
          backgroundColor={branchMenu ? theme.accent : theme.statusSegment}
          onMouseDown={(event) => {
            event.stopPropagation()
            void toggleBranchMenu()
          }}
          onMouseOver={() => point("pointer")}
          onMouseOut={() => point("default")}
        >
          <text fg={branchMenu ? theme.editorBg : theme.statusFg}>{` ⎇ ${branch ?? "no git"} `}</text>
        </box>
        <text fg={theme.statusMuted}>{` ${clip(statusMiddle, Math.max(8, width - (branch?.length ?? 6) - 18))}`}</text>
        <box flexGrow={1} backgroundColor={theme.statusBg} />
        {typeahead ? <text fg={theme.brand}>{`  ${typeahead} `}</text> : null}
        <text fg={theme.statusMuted}>{` ${theme.label} `}</text>
      </box>
      {branchMenu ? (
        <box
          position="absolute"
          left={0}
          bottom={1}
          width={Math.min(40, Math.max(20, width - 2))}
          height={menuHeight + 1}
          zIndex={20}
          flexDirection="column"
          backgroundColor={theme.sidebarBg}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <box height={1} flexDirection="row" backgroundColor={theme.activityBg}>
            <text fg={theme.brand}> ▎</text>
            <text fg={theme.titleFg}>Switch branch</text>
          </box>
          <box width={Math.min(40, Math.max(20, width - 2))} height={1} backgroundColor={theme.divider} />
          <scrollbox
            width={Math.min(40, Math.max(20, width - 2))}
            height={menuHeight - 1}
            focused={false}
            focusable={false}
            scrollY
            contentOptions={{ backgroundColor: theme.sidebarBg, flexDirection: "column" }}
          >
            {branches.length === 0 ? (
              <text fg={theme.listDim}>  No other branches</text>
            ) : (
              branches.map((name, index) => (
                <box
                  key={name}
                  width={Math.min(40, Math.max(20, width - 2))}
                  height={1}
                  flexShrink={0}
                  backgroundColor={index === branchIndex ? theme.listActive : theme.sidebarBg}
                  onMouseOver={() => point("pointer")}
                  onMouseOut={() => point("default")}
                  onMouseDown={(event) => {
                    event.stopPropagation()
                    setBranchIndex(index)
                    void switchBranch(name)
                  }}
                >
                  <text fg={index === branchIndex ? theme.brand : theme.listFg}>{`  ${clip(name, 34)}`}</text>
                </box>
              ))
            )}
          </scrollbox>
        </box>
      ) : null}
    </box>
  )
}

function MarkdownPreview({
  theme,
  width,
  height,
  content,
  focused,
  onFocus,
}: {
  theme: Theme
  width: number
  height: number
  content: string
  focused: boolean
  onFocus: () => void
}) {
  const renderer = useRenderer()
  const style = useMemo(() => getSyntaxStyle(theme, renderer.nativeScene), [theme, renderer])
  const hover = useHover("pointer")
  return (
    <scrollbox
      width={width}
      height={height}
      focused={focused}
      focusable
      scrollY
      rootOptions={{ backgroundColor: theme.editorBg }}
      viewportOptions={{ backgroundColor: theme.editorBg }}
      contentOptions={{ backgroundColor: theme.editorBg, flexDirection: "column", padding: 1 }}
      verticalScrollbarOptions={{ trackOptions: { backgroundColor: theme.activityBg, foregroundColor: theme.listDim } }}
      onMouseDown={() => onFocus()}
      {...hover}
    >
      <markdown
        content={content}
        syntaxStyle={style}
        conceal
        concealCode={false}
        fg={theme.editorText}
        bg={theme.editorBg}
        width={Math.max(8, width - 4)}
      />
    </scrollbox>
  )
}

function WelcomePane({
  theme,
  width,
  height,
  workspace,
}: {
  theme: Theme
  width: number
  height: number
  workspace: string
}) {
  const lines = [
    { text: "▎ TERMINAL·CODE", fg: theme.titleFg },
    { text: "──────────────", fg: theme.divider },
    { text: workspace, fg: theme.emptyFg },
    { text: "", fg: theme.emptyDim },
    { text: "Open a file from the explorer,", fg: theme.emptyDim },
    { text: "or drop a path on the CLI.", fg: theme.emptyDim },
    { text: "", fg: theme.emptyDim },
    { text: "▣  Explorer     Ctrl+Alt+E", fg: theme.emptyFg },
    { text: "⌕  Search       Ctrl+Alt+S", fg: theme.emptyFg },
    { text: "⎇  Source       Ctrl+Alt+G", fg: theme.emptyFg },
    { text: "⚙  Settings     Ctrl+Alt+,", fg: theme.emptyFg },
    { text: "", fg: theme.emptyDim },
    { text: "Tab edit · Esc tree · Ctrl+S save", fg: theme.emptyDim },
    { text: "Ctrl+Alt+V previews Markdown", fg: theme.emptyDim },
    { text: "Ctrl+B sidebar · Ctrl+Alt+H/L resize", fg: theme.emptyDim },
  ]
  return (
    <box width={width} height={height} paddingLeft={2} paddingTop={1} flexDirection="column" backgroundColor={theme.editorBg}>
      {lines.slice(0, Math.max(1, height - 1)).map((line, index) => (
        <box key={index} width={Math.max(1, width - 2)} height={1} flexShrink={0} backgroundColor={theme.editorBg}>
          <text fg={line.fg}>{clip(line.text, Math.max(1, width - 4))}</text>
        </box>
      ))}
    </box>
  )
}

function ActivityIcon({
  theme,
  mark,
  active,
  onPress,
}: {
  theme: Theme
  mark: string
  label: string
  active: boolean
  onPress: () => void
}) {
  const hover = useHover("pointer")
  return (
    <box
      width={ACTIVITY}
      height={1}
      flexDirection="row"
      backgroundColor={active ? theme.activityActive : theme.activityBg}
      onMouseDown={(event) => {
        event.stopPropagation()
        onPress()
      }}
      {...hover}
    >
      <box width={1} height={1} flexShrink={0} backgroundColor={active ? theme.accent : theme.activityBg} />
      <text fg={active ? theme.brand : theme.activityMuted}>{` ${mark}`}</text>
    </box>
  )
}

function SearchPane({
  theme,
  width,
  height,
  query,
  replacement,
  hits,
  selected,
  focus,
  onQuery,
  onReplacement,
  onFocus,
  onPick,
}: {
  theme: Theme
  width: number
  height: number
  query: string
  replacement: string
  hits: SearchHit[]
  selected: number
  focus: Focus
  onQuery: (value: string) => void
  onReplacement: (value: string) => void
  onFocus: (focus: Focus) => void
  onPick: (index: number) => void
}) {
  const listHeight = Math.max(1, height - 3)
  const hover = useHover("pointer")
  return (
    <box width={width} height={height} flexDirection="column" backgroundColor={theme.sidebarBg}>
      <input
        width={width}
        placeholder=" Find in workspace"
        focused={focus === "query"}
        backgroundColor={theme.inputBg}
        focusedBackgroundColor={theme.inputBg}
        textColor={theme.listFg}
        focusedTextColor={theme.listFg}
        onInput={onQuery}
        onMouseDown={() => onFocus("query")}
        onSubmit={() => onFocus("sidebar")}
        {...hover}
      />
      <input
        width={width}
        placeholder=" Replace with"
        focused={focus === "replace"}
        backgroundColor={theme.inputBg}
        focusedBackgroundColor={theme.inputBg}
        textColor={theme.listFg}
        focusedTextColor={theme.listFg}
        onInput={onReplacement}
        onMouseDown={() => onFocus("replace")}
        onSubmit={() => onFocus("sidebar")}
        {...hover}
      />
      <box width={width} height={1} backgroundColor={theme.sidebarBg}>
        <text fg={theme.listDim}>{` ${hits.length} hit${hits.length === 1 ? "" : "s"} · Ctrl+Enter replaces`}</text>
      </box>
      <scrollbox
        width={width}
        height={listHeight}
        focused={false}
        focusable={false}
        scrollY
        rootOptions={{ backgroundColor: theme.sidebarBg }}
        contentOptions={{ backgroundColor: theme.sidebarBg, flexDirection: "column" }}
      >
        {hits.map((hit, index) => {
          const active = index === selected && focus === "sidebar"
          return (
            <ClickRow
              key={`${hit.path}:${hit.line}:${hit.column}:${index}`}
              width={width}
              backgroundColor={active ? theme.listActive : theme.sidebarBg}
              onPress={() => onPick(index)}
            >
              <text fg={theme.listFg}>{` ${clip(`${hit.relative}:${hit.line}  ${hit.text}`, width - 2)}`}</text>
            </ClickRow>
          )
        })}
      </scrollbox>
    </box>
  )
}

function ScmPane({
  theme,
  width,
  height,
  changes,
  selected,
  focused,
  onPick,
}: {
  theme: Theme
  width: number
  height: number
  changes: Change[]
  selected: number
  focused: boolean
  onPick: (index: number) => void
}) {
  return (
    <scrollbox
      width={width}
      height={height}
      focused={false}
      focusable={false}
      scrollY
      contentOptions={{ backgroundColor: theme.sidebarBg, flexDirection: "column" }}
    >
      {changes.length === 0 ? (
        <text fg={theme.listDim}>  Working tree clean</text>
      ) : (
        changes.map((change, index) => {
          const active = index === selected && focused
          const color = change.unsaved ? theme.dirty : change.mark ? theme.git[change.mark] : theme.listFg
          const icon = fileMark("file", change.label)
          return (
            <ClickRow
              key={change.path}
              width={width}
              backgroundColor={active ? theme.listActive : theme.sidebarBg}
              onPress={() => onPick(index)}
            >
              <text fg={active ? theme.brand : theme.listDim}>{active ? "▎" : " "}</text>
              <text fg={iconColor(theme, icon.tone)}>{`${icon.mark} `}</text>
              <text fg={color}>{clip(`${change.badge} ${change.label}`, width - 6)}</text>
            </ClickRow>
          )
        })
      )}
    </scrollbox>
  )
}

type SettingsRow =
  | { kind: "header"; label: string }
  | { kind: "theme"; id: Settings["theme"]; label: string }
  | { kind: "key"; action: Action; label: string; chord: string }

function SettingsPane({
  theme,
  width,
  height,
  rows,
  selected,
  focused,
  rebind,
  onPick,
}: {
  theme: Theme
  width: number
  height: number
  rows: SettingsRow[]
  selected: number
  focused: boolean
  rebind: Action | null
  onPick: (index: number) => void
}) {
  return (
    <box width={width} height={height} flexDirection="column" backgroundColor={theme.sidebarBg}>
      <box width={width} height={1} backgroundColor={theme.sidebarBg}>
        <text fg={theme.listDim}>
          {rebind ? ` Bind a key for ${ACTION_LABELS[rebind]}` : " Enter picks a theme or starts a keybind"}
        </text>
      </box>
      <scrollbox
        width={width}
        height={Math.max(1, height - 1)}
        focused={false}
        focusable={false}
        scrollY
        contentOptions={{ backgroundColor: theme.sidebarBg, flexDirection: "column" }}
      >
        {rows.map((row, index) => {
          const active = index === selected && focused
          const chord = row.kind === "key" ? row.chord : ""
          const label =
            row.kind === "header"
              ? row.label
              : row.kind === "theme"
                ? `${row.label}${theme.name === row.id ? "  · on" : ""}`
                : `${row.label}  ${chord}`
          return (
            <ClickRow
              key={`${row.kind}:${row.kind === "key" ? row.action : label}:${index}`}
              width={width}
              backgroundColor={active ? theme.listActive : theme.sidebarBg}
              onPress={() => onPick(index)}
            >
              <text fg={active ? theme.brand : theme.listDim}>{row.kind === "header" ? " " : active ? "▎" : " "}</text>
              <text fg={row.kind === "header" ? theme.brand : theme.listFg}>{clip(label, width - 3)}</text>
            </ClickRow>
          )
        })}
      </scrollbox>
    </box>
  )
}

function ExplorerRowView({
  theme,
  row,
  index,
  width,
  selected,
  sidebarFocused,
  hovered,
  onPress,
  onHover,
}: {
  theme: Theme
  row: ExplorerRow
  index: number
  width: number
  selected: boolean
  sidebarFocused: boolean
  hovered: boolean
  onPress: (row: ExplorerRow) => void
  onHover: (key: string | null) => void
}) {
  const hover = useHover("pointer")
  const background = selected ? (sidebarFocused ? theme.listActive : theme.listInactive) : hovered ? theme.listHover : theme.sidebarBg
  const twisty = row.kind === "dir" || row.kind === "section" ? folderMark(Boolean(row.expanded)) : " "
  const indent = " ".repeat(row.depth * 2)
  const badge = row.dirty ? "●" : row.git ? GIT_LETTER[row.git] : ""
  const nameColor = row.kind === "hint" ? theme.listDim : row.dirty ? theme.dirty : row.git ? theme.git[row.git] : theme.listFg
  const icon = fileMark(row.kind, row.label)
  const mark = row.kind === "dir" || row.kind === "section" ? twisty : icon.mark
  const markColor = row.kind === "dir" || row.kind === "section" ? theme.listDim : iconColor(theme, icon.tone)
  const prefix = `${indent}`
  const room = Math.max(1, width - prefix.length - 4 - (badge ? 2 : 0))

  return (
    <box
      id={`explorer-row-${index}`}
      width={width}
      height={1}
      flexShrink={0}
      flexDirection="row"
      backgroundColor={background}
      focusable={false}
      onMouseDown={(event) => {
        event.stopPropagation()
        onPress(row)
      }}
      onMouseOver={() => {
        onHover(row.key)
        hover.onMouseOver()
      }}
      onMouseOut={() => {
        onHover(null)
        hover.onMouseOut()
      }}
    >
      <text fg={selected && sidebarFocused ? theme.brand : theme.listDim}>{selected ? "▎" : " "}</text>
      <text fg={theme.listDim}>{prefix}</text>
      <text fg={markColor}>{mark}</text>
      <text fg={nameColor}>{` ${clip(row.label, room)}`}</text>
      <box flexGrow={1} backgroundColor={background} />
      {badge ? <text fg={nameColor}>{`${badge} `}</text> : null}
    </box>
  )
}

function ClickRow({
  width,
  backgroundColor,
  onPress,
  children,
}: {
  width: number
  backgroundColor: string
  onPress: () => void
  children: ReactNode
}) {
  const hover = useHover("pointer")
  return (
    <box
      width={width}
      height={1}
      flexShrink={0}
      flexDirection="row"
      backgroundColor={backgroundColor}
      onMouseDown={(event) => {
        event.stopPropagation()
        onPress()
      }}
      {...hover}
    >
      {children}
    </box>
  )
}

function useHover(style: "pointer" | "ew-resize" | "text") {
  const renderer = useRenderer()
  return {
    onMouseOver: () => {
      renderer.setMousePointer(style)
      renderer.requestRender()
    },
    onMouseOut: () => {
      renderer.setMousePointer("default")
      renderer.requestRender()
    },
  }
}

function iconColor(theme: Theme, tone: IconTone): string {
  if (tone === "folder") return theme.git.modified
  if (tone === "code") return theme.accent
  if (tone === "script") return theme.git.untracked
  if (tone === "doc") return theme.git.added
  if (tone === "data") return theme.git.renamed
  if (tone === "web") return theme.git.conflict
  if (tone === "image") return theme.git.deleted
  if (tone === "dim") return theme.listDim
  return theme.listFg
}

function buildChanges(root: string, git: Map<string, GitMark>, dirty: ReadonlySet<string>): Change[] {
  const byPath = new Map<string, Change>()
  for (const [path, mark] of git) {
    byPath.set(path, {
      path,
      label: relative(root, path) || basename(path),
      badge: GIT_LETTER[mark],
      unsaved: dirty.has(path),
      mark,
    })
  }
  for (const path of dirty) {
    const existing = byPath.get(path)
    if (existing) {
      existing.unsaved = true
      existing.badge = "*"
      continue
    }
    byPath.set(path, {
      path,
      label: relative(root, path) || basename(path),
      badge: "*",
      unsaved: true,
      mark: null,
    })
  }
  return [...byPath.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function buildSettingsRows(settings: Settings): SettingsRow[] {
  const rows: SettingsRow[] = [{ kind: "header", label: "Themes" }]
  for (const name of themeOrder) rows.push({ kind: "theme", id: name, label: themes[name].label })
  rows.push({ kind: "header", label: "Shortcuts" })
  for (const action of Object.keys(ACTION_LABELS) as Action[]) {
    rows.push({ kind: "key", action, label: ACTION_LABELS[action], chord: settings.keys[action] })
  }
  return rows
}

function viewTitle(view: View): string {
  if (view === "explorer") return "EXPLORER"
  if (view === "search") return "SEARCH"
  if (view === "settings") return "SETTINGS"
  return "SOURCE CONTROL"
}

function clip(value: string, width: number): string {
  if (value.length <= width) return value
  if (width <= 1) return value.slice(0, width)
  return `${value.slice(0, width - 1)}…`
}
