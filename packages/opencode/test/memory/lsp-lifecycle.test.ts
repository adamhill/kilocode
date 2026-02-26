import { describe, test, expect, afterEach } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { LSPClient } from "../../src/lsp/client"
import type { LSPServer } from "../../src/lsp/server"
import { spawn } from "child_process"
import { tmpdir } from "../fixture/fixture"
import { PROJECT_ROOT, snapshotDescendants, assertNoOrphans, forceKillAll, stableHeapMB, isAlive } from "./helper"

const FAKE_LSP_SERVER = path.join(PROJECT_ROOT, "test/fixture/lsp/fake-lsp-server.js")

let beforePids: Set<number> = new Set()

function spawnLSP(cwd: string): LSPServer.Handle["process"] {
  return spawn("bun", [FAKE_LSP_SERVER], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd,
  })
}

describe("memory: LSP lifecycle", () => {
  afterEach(async () => {
    try {
      const afterPids = await snapshotDescendants(process.pid)
      const orphans: number[] = []
      for (const pid of afterPids) {
        if (!beforePids.has(pid)) orphans.push(pid)
      }
      forceKillAll(orphans)
    } catch {
      // Best-effort cleanup
    }
  })

  test("LSPClient.shutdown kills server process", async () => {
    await using tmp = await tmpdir({ git: true })

    beforePids = await snapshotDescendants(process.pid)

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const serverProcess = spawnLSP(tmp.path)
        const pid = serverProcess.pid!

        const client = await LSPClient.create({
          serverID: "test-lsp",
          server: { process: serverProcess },
          root: tmp.path,
        })
        expect(client).toBeTruthy()

        // Verify process is running
        expect(isAlive(pid)).toBe(true)

        // Shutdown
        await client!.shutdown()
        await Bun.sleep(300)

        // Verify process is gone
        expect(isAlive(pid)).toBe(false)

        await Instance.dispose()
      },
    })
  }, 30_000)

  test("Multiple create/shutdown cycles don't leak processes", async () => {
    await using tmp = await tmpdir({ git: true })

    beforePids = await snapshotDescendants(process.pid)

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        for (let i = 0; i < 5; i++) {
          const serverProcess = spawnLSP(tmp.path)
          const client = await LSPClient.create({
            serverID: `test-lsp-${i}`,
            server: { process: serverProcess },
            root: tmp.path,
          })
          await client!.shutdown()
          await Bun.sleep(100)
        }

        await Bun.sleep(300)
        const afterPids = await snapshotDescendants(process.pid)
        await assertNoOrphans(beforePids, afterPids)

        await Instance.dispose()
      },
    })
  }, 60_000)

  test("LSP create/shutdown doesn't leak memory", async () => {
    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        // Warm-up
        const warmProc = spawnLSP(tmp.path)
        const warmClient = await LSPClient.create({
          serverID: "test-lsp-warm",
          server: { process: warmProc },
          root: tmp.path,
        })
        await warmClient!.shutdown()
        await Bun.sleep(100)

        const baseline = await stableHeapMB()

        for (let i = 0; i < 10; i++) {
          const serverProcess = spawnLSP(tmp.path)
          const client = await LSPClient.create({
            serverID: `test-lsp-mem-${i}`,
            server: { process: serverProcess },
            root: tmp.path,
          })
          await client!.shutdown()
          await Bun.sleep(50)
        }

        const after = await stableHeapMB()
        const growth = after - baseline

        console.log(`  LSP create/shutdown 10x growth: ${growth.toFixed(2)} MB`)
        expect(growth).toBeLessThan(5)

        await Instance.dispose()
      },
    })
  }, 60_000)
})
