export type DocumentMode = "source" | "preview"

/**
 * Document mode policy when the active editor path changes.
 * Intentional reset: leaving a tab always returns to Source on the next activation,
 * so Preview never sticks across tabs.
 */
export function documentModeAfterActivate(
  previousPath: string | null,
  nextPath: string,
  current: DocumentMode,
): DocumentMode {
  if (previousPath === nextPath) return current
  return "source"
}
