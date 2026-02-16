import path from "node:path"
import fs from "node:fs"
import ignore, { type Ignore } from "ignore"

const KILOCODEIGNORE = ".kilocodeignore"
const GITIGNORE = ".gitignore"

/**
 * Patterns for sensitive environment files, applied only when no .kilocodeignore exists.
 */
const SENSITIVE_PATTERNS = [".env", ".env.*"]

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, "/")
}

export class FileIgnoreController {
  private readonly hasWorkspace: boolean
  private workspacePath: string
  private ignoreInstance: Ignore = ignore()
  private loadedContents: Array<{ file: string; content: string }> = []

  constructor(workspacePath?: string) {
    this.hasWorkspace = Boolean(workspacePath)
    this.workspacePath = this.hasWorkspace ? path.resolve(workspacePath!) : ""
  }

  async initialize(): Promise<void> {
    this.ignoreInstance = ignore()
    this.loadedContents = []

    if (!this.hasWorkspace) {
      return
    }

    // Try .kilocodeignore first — if it exists, use only that.
    // Use existsSync to distinguish "missing" from "unreadable" — permission
    // errors on readFileSync will propagate instead of being silently swallowed.
    const kilocodeignorePath = path.join(this.workspacePath, KILOCODEIGNORE)
    if (fs.existsSync(kilocodeignorePath)) {
      const kilocodeignoreContent = fs.readFileSync(kilocodeignorePath, "utf-8")
      if (kilocodeignoreContent.trim()) {
        this.ignoreInstance.add(kilocodeignoreContent)
        this.ignoreInstance.add(KILOCODEIGNORE)
        this.loadedContents.push({ file: KILOCODEIGNORE, content: kilocodeignoreContent })
        return
      }
    }

    // Fallback: use .gitignore + hardcoded sensitive patterns.
    const gitignorePath = path.join(this.workspacePath, GITIGNORE)
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8")
      if (gitignoreContent.trim()) {
        this.ignoreInstance.add(gitignoreContent)
        this.loadedContents.push({ file: GITIGNORE, content: gitignoreContent })
      }
    }

    // Always add sensitive patterns in the fallback path.
    this.ignoreInstance.add(SENSITIVE_PATTERNS)
  }

  private toRelativePath(filePath: string): string | null {
    if (!filePath) {
      return null
    }

    let withoutUri = filePath
    if (filePath.startsWith("file:///")) {
      withoutUri = filePath.slice("file:///".length)
    } else if (filePath.startsWith("file://")) {
      withoutUri = filePath.slice("file://".length)
    }
    const absoluteInput = path.isAbsolute(withoutUri) ? withoutUri : path.resolve(this.workspacePath, withoutUri)

    let resolved = absoluteInput
    try {
      resolved = fs.realpathSync(absoluteInput)
    } catch {
      // Keep unresolved path when file does not exist yet.
    }

    const relative = path.relative(this.workspacePath, resolved)
    if (!relative || relative.startsWith("..")) {
      return null
    }

    return toPosix(relative)
  }

  /**
   * Returns true if the file can be read/used as autocomplete context.
   * When no workspace path was provided, denies all access.
   */
  validateAccess(filePath: string): boolean {
    if (!this.hasWorkspace) {
      return false
    }

    const relative = this.toRelativePath(filePath)
    if (!relative) {
      // Outside workspace or unresolvable path: deny by default for security.
      return false
    }

    return !this.ignoreInstance.ignores(relative)
  }

  /**
   * Filter a list of candidate paths to those allowed.
   * When no workspace path was provided, returns an empty array.
   */
  filterPaths(paths: string[]): string[] {
    if (!this.hasWorkspace) {
      return []
    }
    return paths.filter((candidate) => this.validateAccess(candidate))
  }

  /**
   * Returns user-facing instructions explaining why access is restricted.
   */
  getInstructions(): string | undefined {
    if (this.loadedContents.length === 0) {
      return undefined
    }

    const sections = this.loadedContents.map(({ file, content }) => `# ${file}\n\n${content.trimEnd()}`)
    return sections.join("\n\n")
  }

  dispose(): void {
    this.loadedContents = []
    this.ignoreInstance = ignore()
  }
}
