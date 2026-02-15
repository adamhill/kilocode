import path from "node:path"
import fs from "node:fs/promises"
import fsSync from "node:fs"
import ignore, { type Ignore } from "ignore"

const SENSITIVE_PATTERNS = [".env", ".env.local", ".env.production", ".env.staging", ".env.development", ".env.*"]
const IGNORE_FILES = [".kilocodeignore", ".gitignore"]

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, "/")
}

function isSensitiveFile(filePath: string): boolean {
  const basename = toPosix(filePath).split("/").pop() ?? ""
  return SENSITIVE_PATTERNS.some((pattern) => {
    if (pattern.includes("*")) {
      const prefix = pattern.split("*")[0]
      return basename.startsWith(prefix)
    }
    return basename === pattern
  })
}

export class FileIgnoreController {
  private workspacePath: string
  private ignoreInstance: Ignore = ignore()
  private loadedContents: Array<{ file: string; content: string }> = []

  constructor(workspacePath?: string) {
    this.workspacePath = path.resolve(workspacePath ?? process.cwd())
  }

  async initialize(): Promise<void> {
    this.ignoreInstance = ignore()
    this.loadedContents = []

    for (const fileName of IGNORE_FILES) {
      const ignorePath = path.join(this.workspacePath, fileName)
      let content: string
      try {
        content = await fs.readFile(ignorePath, "utf-8")
      } catch {
        continue
      }

      if (!content.trim()) {
        continue
      }

      this.ignoreInstance.add(content)
      this.ignoreInstance.add(fileName)
      this.loadedContents.push({ file: fileName, content })
    }
  }

  private toRelativePath(filePath: string): string | null {
    if (!filePath) {
      return null
    }

    const withoutUri = filePath.startsWith("file://") ? filePath.slice("file://".length) : filePath
    const absoluteInput = path.isAbsolute(withoutUri) ? withoutUri : path.resolve(this.workspacePath, withoutUri)

    let resolved = absoluteInput
    try {
      resolved = fsSync.realpathSync(absoluteInput)
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
   */
  validateAccess(filePath: string): boolean {
    if (isSensitiveFile(filePath)) {
      return false
    }

    const relative = this.toRelativePath(filePath)
    if (!relative) {
      // Outside workspace or unresolved path: allow by default for compatibility.
      return true
    }

    return !this.ignoreInstance.ignores(relative)
  }

  /**
   * Filter a list of candidate paths to those allowed.
   */
  filterPaths(paths: string[]): string[] {
    return paths.filter((candidate) => this.validateAccess(candidate))
  }

  /**
   * Returns user-facing instructions explaining why access is restricted.
   */
  getInstructions(): string | undefined {
    if (this.loadedContents.length === 0) {
      return undefined
    }

    const sections = this.loadedContents.map(
      ({ file, content }) => `# ${file}\n\n${content.trimEnd()}\n\n${file}`,
    )
    return sections.join("\n\n")
  }

  dispose(): void {
    this.loadedContents = []
    this.ignoreInstance = ignore()
  }
}
