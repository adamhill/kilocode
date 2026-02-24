import { describe, test, expect, afterEach } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MCP } from "../../src/mcp"
import { tmpdir } from "../fixture/fixture"
import {
  PROJECT_ROOT,
  snapshotDescendants,
  assertNoOrphans,
  forceKillAll,
  stableHeapMB,
} from "./helper"

const FAKE_MCP_SERVER = path.join(PROJECT_ROOT, "test/fixture/mcp/fake-mcp-server.js")

let beforePids: Set<number> = new Set()

describe("memory: MCP lifecycle", () => {
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

  test(
    "MCP.add closes existing client before overwriting",
    async () => {
      await using tmp = await tmpdir({ git: true })

      beforePids = await snapshotDescendants(process.pid)

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          // Add first server
          await MCP.add("lifecycle-test", {
            type: "local",
            command: ["bun", FAKE_MCP_SERVER],
          })

          const afterFirstPids = await snapshotDescendants(process.pid)
          const firstCount = [...afterFirstPids].filter((p) => !beforePids.has(p)).length

          // Add second server with same key — should close first
          await MCP.add("lifecycle-test", {
            type: "local",
            command: ["bun", FAKE_MCP_SERVER],
          })

          await Bun.sleep(500)
          const afterSecondPids = await snapshotDescendants(process.pid)
          const secondCount = [...afterSecondPids].filter((p) => !beforePids.has(p)).length

          // Process count should stay roughly constant (old killed, new spawned)
          // Allow +1 for timing of process teardown
          expect(secondCount).toBeLessThanOrEqual(firstCount + 1)

          await Instance.dispose()
        },
      })

      await Bun.sleep(500)
      const afterPids = await snapshotDescendants(process.pid)
      await assertNoOrphans(beforePids, afterPids)
    },
    120_000,
  )

  test(
    "MCP.connect closes existing client before reconnecting",
    async () => {
      await using tmp = await tmpdir({
        git: true,
        config: {
          mcp: {
            "connect-test": {
              type: "local",
              command: ["bun", FAKE_MCP_SERVER],
            },
          },
        },
      })

      beforePids = await snapshotDescendants(process.pid)

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          // First connect (state init may already connect from config)
          await MCP.connect("connect-test")

          const afterFirstPids = await snapshotDescendants(process.pid)
          const firstCount = [...afterFirstPids].filter((p) => !beforePids.has(p)).length

          // Second connect — should close existing before reconnecting
          await MCP.connect("connect-test")

          await Bun.sleep(500)
          const afterSecondPids = await snapshotDescendants(process.pid)
          const secondCount = [...afterSecondPids].filter((p) => !beforePids.has(p)).length

          // Should not accumulate processes
          expect(secondCount).toBeLessThanOrEqual(firstCount + 1)

          await Instance.dispose()
        },
      })

      await Bun.sleep(500)
      const afterPids = await snapshotDescendants(process.pid)
      await assertNoOrphans(beforePids, afterPids)
    },
    120_000,
  )

  test(
    "MCP.tools() does not leak memory",
    async () => {
      await using tmp = await tmpdir({ git: true })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          await MCP.add("tools-test", {
            type: "local",
            command: ["bun", FAKE_MCP_SERVER],
          })

          // Warm up
          await MCP.tools()

          const baseline = await stableHeapMB()

          for (let i = 0; i < 50; i++) {
            await MCP.tools()
          }

          const after = await stableHeapMB()
          const growth = after - baseline

          console.log(`  MCP.tools() 50x growth: ${growth.toFixed(2)} MB`)
          expect(growth).toBeLessThan(5)

          await Instance.dispose()
        },
      })
    },
    60_000,
  )
})
