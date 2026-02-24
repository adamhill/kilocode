import { describe, test, expect } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MCP } from "../../src/mcp"
import { Bus } from "../../src/bus"
import { BusEvent } from "../../src/bus/bus-event"
import { tmpdir } from "../fixture/fixture"
import { PROJECT_ROOT, measureGrowth } from "./helper"
import z from "zod"

const FAKE_MCP_SERVER = path.join(PROJECT_ROOT, "test/fixture/mcp/fake-mcp-server.js")

describe("memory: heap growth detection", () => {
  test(
    "MCP add/disconnect cycle does not leak",
    async () => {
      await using tmp = await tmpdir({ git: true })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const { growth } = await measureGrowth(3, async (i) => {
            await MCP.add("heap-test-server", {
              type: "local",
              command: ["bun", FAKE_MCP_SERVER],
            })
            await MCP.disconnect("heap-test-server")
            await Bun.sleep(200)
          })

          console.log(`  MCP add/disconnect growth: ${growth.toFixed(2)} MB`)
          expect(growth).toBeLessThan(10)

          await Instance.dispose()
        },
      })
    },
    180_000,
  )

  test(
    "Instance provide/dispose cycle does not leak",
    async () => {
      const { growth } = await measureGrowth(20, async (i) => {
        await using tmp = await tmpdir({ git: true })

        await Instance.provide({
          directory: tmp.path,
          fn: async () => {
            // Create some state to exercise lifecycle
            const getState = Instance.state(
              () => ({ data: new Uint8Array(1024) }),
              async () => {},
            )
            getState()
            await Instance.dispose()
          },
        })
      })

      console.log(`  Instance provide/dispose growth: ${growth.toFixed(2)} MB`)
      expect(growth).toBeLessThan(10)
    },
    60_000,
  )

  test(
    "Bus subscriptions cleaned on dispose",
    async () => {
      const TestEvent = BusEvent.define("test.heap.event", z.object({ i: z.number() }))

      const { growth } = await measureGrowth(100, async (i) => {
        await using tmp = await tmpdir({ git: true })

        await Instance.provide({
          directory: tmp.path,
          fn: async () => {
            // Subscribe to events (creates entries in subscriptions Map)
            const unsub1 = Bus.subscribe(TestEvent, () => {})
            const unsub2 = Bus.subscribe(TestEvent, () => {})
            const unsub3 = Bus.subscribeAll(() => {})

            // Publish some events
            await Bus.publish(TestEvent, { i })

            // Dispose should clear subscription state
            await Instance.dispose()
          },
        })
      })

      console.log(`  Bus subscription growth: ${growth.toFixed(2)} MB`)
      expect(growth).toBeLessThan(10)
    },
    60_000,
  )

  test(
    "State entries cleaned on dispose",
    async () => {
      const { growth } = await measureGrowth(100, async (i) => {
        await using tmp = await tmpdir({ git: true })

        await Instance.provide({
          directory: tmp.path,
          fn: async () => {
            // Create state with a buffer to make leaks detectable
            const getState = Instance.state(
              () => ({ buffer: new Uint8Array(10 * 1024) }),
              async () => {},
            )
            getState()

            await Instance.dispose()
          },
        })
      })

      console.log(`  State entry growth: ${growth.toFixed(2)} MB`)
      expect(growth).toBeLessThan(1)
    },
    60_000,
  )
})
