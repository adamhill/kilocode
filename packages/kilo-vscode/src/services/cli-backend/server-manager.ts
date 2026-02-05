import { spawn, ChildProcess } from "child_process"
import * as crypto from "crypto"
import * as path from "path"
import * as vscode from "vscode"

export interface ServerInstance {
  port: number
  password: string
  process: ChildProcess
}

export class ServerManager {
  private instance: ServerInstance | null = null
  private startupPromise: Promise<ServerInstance> | null = null

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Get or start the server instance
   */
  async getServer(): Promise<ServerInstance> {
    if (this.instance) {
      return this.instance
    }

    if (this.startupPromise) {
      return this.startupPromise
    }

    this.startupPromise = this.startServer()
    try {
      this.instance = await this.startupPromise
      return this.instance
    } finally {
      this.startupPromise = null
    }
  }

  private async startServer(): Promise<ServerInstance> {
    const password = crypto.randomBytes(32).toString("hex")
    const cliPath = this.getCliPath()

    return new Promise((resolve, reject) => {
      const serverProcess = spawn(cliPath, ["serve", "--port", "0"], {
        env: {
          ...process.env,
          OPENCODE_SERVER_PASSWORD: password,
          OPENCODE_CLIENT: "vscode",
        },
        stdio: ["ignore", "pipe", "pipe"],
      })

      let resolved = false

      serverProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString()
        console.log("[CLI Server]", output)

        // Parse: "kilo server listening on http://127.0.0.1:12345"
        const match = output.match(/listening on http:\/\/[\w.]+:(\d+)/)
        if (match && !resolved) {
          resolved = true
          const port = parseInt(match[1], 10)
          resolve({ port, password, process: serverProcess })
        }
      })

      serverProcess.stderr?.on("data", (data: Buffer) => {
        console.error("[CLI Server Error]", data.toString())
      })

      serverProcess.on("error", (error) => {
        if (!resolved) {
          reject(error)
        }
      })

      serverProcess.on("exit", (code) => {
        console.log("[CLI Server] Exited with code:", code)
        if (this.instance?.process === serverProcess) {
          this.instance = null
        }
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!resolved) {
          serverProcess.kill()
          reject(new Error("Server startup timeout"))
        }
      }, 30000)
    })
  }

  private getCliPath(): string {
    // In development: use the local package
    // In production: use the bundled binary
    const isDev = this.context.extensionMode === vscode.ExtensionMode.Development

    if (isDev) {
      // Navigate from packages/kilo-vscode to packages/opencode
      return path.resolve(__dirname, "../../../opencode/bin/kilo")
    }

    // Bundled with extension
    return path.join(this.context.extensionPath, "bin", "kilo")
  }

  dispose(): void {
    if (this.instance) {
      this.instance.process.kill("SIGTERM")
      this.instance = null
    }
  }
}
