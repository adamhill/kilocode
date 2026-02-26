import { describe, test, expect } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MCP } from "../../src/mcp"
import { tmpdir } from "../fixture/fixture"
import { PROJECT_ROOT, snapshotDescendants, assertNoOrphans, forceKillAll, stableHeapMB, waitForExit } from "./helper"

const FAKE_MCP_SERVER = path.join(PROJECT_ROOT, "test/fixture/mcp/fake-mcp-server.js")

describe("memory: MCP lifecycle", () => {
  const cleanup = async (baseline: Set<number>, name: string) => {
    try {
      const afterPids = await snapshotDescendants(process.pid)
      const orphans = [...afterPids].filter((pid) => !baseline.has(pid))
      forceKillAll(orphans)
    } catch (err) {
      console.log(`[${name}] cleanup failed: ${err}`)
    }
  }

  test("MCP.add closes existing client before overwriting", async () => {
    await using tmp = await tmpdir({ git: true })
    const baseline = await snapshotDescendants(process.pid)

    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          try {
            // Add first server
            await MCP.add("lifecycle-test", {
              type: "local",
              command: ["bun", FAKE_MCP_SERVER],
            })

            const afterFirstPids = await snapshotDescendants(process.pid)
            const firstOnlyPids = [...afterFirstPids].filter((p) => !baseline.has(p))
            const firstCount = firstOnlyPids.length

            // Add second server with same key — should close first
            await MCP.add("lifecycle-test", {
              type: "local",
              command: ["bun", FAKE_MCP_SERVER],
            })

            expect(await waitForExit(firstOnlyPids)).toBe(true)
            const afterSecondPids = await snapshotDescendants(process.pid)
            const secondCount = [...afterSecondPids].filter((p) => !baseline.has(p)).length

            // Process count should stay roughly constant (old killed, new spawned)
            // Allow +1 for timing of process teardown
            expect(secondCount).toBeLessThanOrEqual(firstCount + 1)
          } finally {
            await Instance.dispose()
          }
        },
      })

      const beforeAssertPids = await snapshotDescendants(process.pid)
      expect(await waitForExit([...beforeAssertPids].filter((p) => !baseline.has(p)))).toBe(true)
      const afterPids = await snapshotDescendants(process.pid)
      await assertNoOrphans(baseline, afterPids)
    } finally {
      await cleanup(baseline, "MCP.add closes existing client before overwriting")
    }
  }, 120_000)

  test("MCP.connect closes existing client before reconnecting", async () => {
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
    const baseline = await snapshotDescendants(process.pid)

    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          try {
            // First connect (state init may already connect from config)
            await MCP.connect("connect-test")

            const afterFirstPids = await snapshotDescendants(process.pid)
            const firstOnlyPids = [...afterFirstPids].filter((p) => !baseline.has(p))
            const firstCount = firstOnlyPids.length

            // Second connect — should close existing before reconnecting
            await MCP.connect("connect-test")

            expect(await waitForExit(firstOnlyPids)).toBe(true)
            const afterSecondPids = await snapshotDescendants(process.pid)
            const secondCount = [...afterSecondPids].filter((p) => !baseline.has(p)).length

            // Should not accumulate processes
            expect(secondCount).toBeLessThanOrEqual(firstCount + 1)
          } finally {
            await Instance.dispose()
          }
        },
      })

      const beforeAssertPids = await snapshotDescendants(process.pid)
      expect(await waitForExit([...beforeAssertPids].filter((p) => !baseline.has(p)))).toBe(true)
      const afterPids = await snapshotDescendants(process.pid)
      await assertNoOrphans(baseline, afterPids)
    } finally {
      await cleanup(baseline, "MCP.connect closes existing client before reconnecting")
    }
  }, 120_000)

  test("MCP.tools() does not leak memory", async () => {
    await using tmp = await tmpdir({ git: true })
    const baseline = await snapshotDescendants(process.pid)

    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          try {
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
          } finally {
            await Instance.dispose()
          }
        },
      })
    } finally {
      await cleanup(baseline, "MCP.tools() does not leak memory")
    }
  }, 60_000)
})
