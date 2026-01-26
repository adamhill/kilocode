import * as path from "path"
import os from "os"

export namespace KilocodePaths {
  /**
   * Get the platform-specific VSCode global storage path for Kilocode extension.
   * - macOS: ~/Library/Application Support/Code/User/globalStorage/kilocode.kilo-code
   * - Windows: %APPDATA%/Code/User/globalStorage/kilocode.kilo-code
   * - Linux: ~/.config/Code/User/globalStorage/kilocode.kilo-code
   */
  export function vscodeGlobalStorage(): string {
    const home = os.homedir()
    switch (process.platform) {
      case "darwin":
        return path.join(home, "Library", "Application Support", "Code", "User", "globalStorage", "kilocode.kilo-code")
      case "win32":
        return path.join(
          process.env.APPDATA || path.join(home, "AppData", "Roaming"),
          "Code",
          "User",
          "globalStorage",
          "kilocode.kilo-code",
        )
      default:
        return path.join(home, ".config", "Code", "User", "globalStorage", "kilocode.kilo-code")
    }
  }

  /** Global Kilocode directory in user home: ~/.kilocode */
  export function globalDir(): string {
    return path.join(os.homedir(), ".kilocode")
  }
}
