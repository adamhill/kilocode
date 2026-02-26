import { describe, test, expect } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MCP } from "../../src/mcp"
import { LSPClient } from "../../src/lsp/client"
import { spawn } from "child_process"
import { tmpdir } from "../fixture/fixture"
import { PROJECT_ROOT, snapshotDescendants, assertNoOrphans, forceKillAll } from "./helper"

const FAKE_MCP_SERVER = path.join(PROJECT_ROOT, "test/fixture/mcp/fake-mcp-server.js")
const FAKE_LSP_SERVER = path.join(PROJECT_ROOT, "test/fixture/lsp/fake-lsp-server.js")

// Don't put MCP in config — the MCP state() init function connects to ALL
// configured servers on first access, which doubles connections and causes timeouts.
// Instead, use empty config and add servers via MCP.add().

describe("memory: orphan process detection", () => {
  const cleanup = async (beforePids: Set<number>) => {
    // Safety net: kill any orphaned processes to prevent cascading failures
    try {
      const afterPids = await snapshotDescendants(process.pid)
      const orphans: number[] = []
      for (const pid of afterPids) {
        if (!beforePids.has(pid)) orphans.push(pid)
      }
      forceKillAll(orphans)
    } catch (error) {
      // Best-effort cleanup
      console.warn("orphan cleanup failed", error)
    }
  }

  const baseline = async (run: (beforePids: Set<number>) => Promise<void>) => {
    const beforePids = await snapshotDescendants(process.pid)
    try {
      await run(beforePids)
    } finally {
      await cleanup(beforePids)
    }
  }

  test("MCP local server: no orphans after dispose", async () => {
    await using tmp = await tmpdir({ git: true })

    await baseline(async (beforePids) => {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          // MCP.add triggers spawn of the fake server via StdioClientTransport
          await MCP.add("test-server", {
            type: "local",
            command: ["bun", FAKE_MCP_SERVER],
          })

          // Verify server is running (new descendants exist)
          const duringPids = await snapshotDescendants(process.pid)
          const newProcesses = [...duringPids].filter((p) => !beforePids.has(p))
          expect(newProcesses.length).toBeGreaterThan(0)

          // Dispose the instance — should close all MCP clients and kill processes
          await Instance.dispose()
        },
      })

      // Wait for processes to exit after disposal
      await Bun.sleep(500)
      const afterPids = await snapshotDescendants(process.pid)
      await assertNoOrphans(beforePids, afterPids)
    })
  }, 60_000)

  test("MCP local server: no orphans after disconnect", async () => {
    await using tmp = await tmpdir({ git: true })

    await baseline(async (beforePids) => {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          await MCP.add("test-server", {
            type: "local",
            command: ["bun", FAKE_MCP_SERVER],
          })

          // Disconnect should close the client (which closes the transport/process)
          await MCP.disconnect("test-server")
          await Bun.sleep(500)

          const afterPids = await snapshotDescendants(process.pid)
          await assertNoOrphans(beforePids, afterPids)

          await Instance.dispose()
        },
      })
    })
  }, 60_000)

  test("disposeAll cleans up all instances", async () => {
    await using tmp1 = await tmpdir({ git: true })
    await using tmp2 = await tmpdir({ git: true })

    await baseline(async (beforePids) => {
      // Create two instances with MCP servers
      await Instance.provide({
        directory: tmp1.path,
        fn: async () => {
          await MCP.add("test-server", {
            type: "local",
            command: ["bun", FAKE_MCP_SERVER],
          })
        },
      })

      await Instance.provide({
        directory: tmp2.path,
        fn: async () => {
          await MCP.add("test-server", {
            type: "local",
            command: ["bun", FAKE_MCP_SERVER],
          })
        },
      })

      // Verify servers are running
      const duringPids = await snapshotDescendants(process.pid)
      const newProcesses = [...duringPids].filter((p) => !beforePids.has(p))
      expect(newProcesses.length).toBeGreaterThan(0)

      // Dispose all
      await Instance.disposeAll()
      await Bun.sleep(500)

      const afterPids = await snapshotDescendants(process.pid)
      await assertNoOrphans(beforePids, afterPids)
    })
  }, 120_000)

  test("LSP server: no orphans after shutdown", async () => {
    await using tmp = await tmpdir({ git: true })

    await baseline(async (beforePids) => {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const serverProcess = spawn("bun", [FAKE_LSP_SERVER], {
            stdio: ["pipe", "pipe", "pipe"],
            cwd: tmp.path,
          })

          const client = await LSPClient.create({
            serverID: "test-lsp",
            server: { process: serverProcess as any },
            root: tmp.path,
          })

          expect(client).toBeTruthy()

          // Shutdown should kill the process
          await client!.shutdown()
          await Bun.sleep(500)

          const afterPids = await snapshotDescendants(process.pid)
          await assertNoOrphans(beforePids, afterPids)

          await Instance.dispose()
        },
      })
    })
  }, 30_000)
})
