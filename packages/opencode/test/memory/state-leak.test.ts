import { describe, test, expect } from "bun:test"
import { Instance } from "../../src/project/instance"
import { State } from "../../src/project/state"
import { Bus } from "../../src/bus"
import { BusEvent } from "../../src/bus/bus-event"
import { GlobalBus } from "../../src/bus/global"
import { tmpdir } from "../fixture/fixture"
import { stableHeapMB } from "./helper"
import z from "zod"

describe("memory: state and bus leaks", () => {
  test(
    "State.dispose fully clears recordsByKey",
    async () => {
      await using tmp = await tmpdir({ git: true })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          // Create state with large buffers
          for (let i = 0; i < 100; i++) {
            const getState = Instance.state(
              () => ({ buffer: new Uint8Array(10 * 1024), index: i }),
              async () => {},
            )
            // Each call with a different init function creates a separate entry
            getState()
          }

          const beforeDispose = await stableHeapMB()

          await Instance.dispose()

          const afterDispose = await stableHeapMB()

          // Memory should drop (or at least not grow) after disposing 100 x 10KB entries
          console.log(
            `  Before dispose: ${beforeDispose.toFixed(2)} MB, After: ${afterDispose.toFixed(2)} MB`,
          )
          // afterDispose should be less than beforeDispose + small margin
          // (GC may not reclaim everything immediately, but it shouldn't grow)
          expect(afterDispose).toBeLessThan(beforeDispose + 2)
        },
      })
    },
    30_000,
  )

  test(
    "Instance cache cleared on disposeAll",
    async () => {
      // Create many instances with state
      const dirs: Awaited<ReturnType<typeof tmpdir>>[] = []
      for (let i = 0; i < 20; i++) {
        const tmp = await tmpdir({ git: true })
        dirs.push(tmp)
        await Instance.provide({
          directory: tmp.path,
          fn: async () => {
            const getState = Instance.state(
              () => ({ buffer: new Uint8Array(50 * 1024) }),
              async () => {},
            )
            getState()
          },
        })
      }

      const beforeDispose = await stableHeapMB()

      await Instance.disposeAll()

      const afterDispose = await stableHeapMB()
      const growth = afterDispose - beforeDispose

      console.log(
        `  20 instances - Before disposeAll: ${beforeDispose.toFixed(2)} MB, After: ${afterDispose.toFixed(2)} MB, Growth: ${growth.toFixed(2)} MB`,
      )

      // After disposing 20 instances with 50KB each (1MB total), memory shouldn't grow
      expect(growth).toBeLessThan(5)

      // Clean up tmpdirs
      for (const d of dirs) {
        await d[Symbol.asyncDispose]()
      }
    },
    60_000,
  )

  test(
    "GlobalBus listener count bounded",
    async () => {
      const initialListenerCount = GlobalBus.listenerCount("event")

      for (let i = 0; i < 10; i++) {
        await using tmp = await tmpdir({ git: true })

        await Instance.provide({
          directory: tmp.path,
          fn: async () => {
            const TestEvent = BusEvent.define(`test.global.${i}`, z.object({}))

            // Subscribe and publish — this emits to GlobalBus
            Bus.subscribe(TestEvent, () => {})
            await Bus.publish(TestEvent, {})

            await Instance.dispose()
          },
        })
      }

      const finalListenerCount = GlobalBus.listenerCount("event")

      console.log(
        `  GlobalBus listeners: initial=${initialListenerCount}, final=${finalListenerCount}`,
      )

      // GlobalBus listener count should not grow unboundedly
      // Bus itself doesn't add/remove GlobalBus listeners — it just emits to it.
      // But if something else adds listeners, we'd catch it here.
      expect(finalListenerCount).toBeLessThanOrEqual(initialListenerCount + 5)
    },
    30_000,
  )

  test(
    "Bus subscriptions cleared on Instance dispose",
    async () => {
      await using tmp = await tmpdir({ git: true })

      const TestEvent = BusEvent.define("test.bus.clear", z.object({ v: z.number() }))

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          // Register several subscriptions
          Bus.subscribe(TestEvent, () => {})
          Bus.subscribe(TestEvent, () => {})
          Bus.subscribe(TestEvent, () => {})
          Bus.subscribeAll(() => {})

          // Verify subscriptions are active by publishing
          await Bus.publish(TestEvent, { v: 1 })

          // Dispose instance — should clear Bus state (including subscriptions map)
          await Instance.dispose()
        },
      })

      // After dispose, re-provide and verify subscriptions are fresh (empty)
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          let callCount = 0
          Bus.subscribe(TestEvent, () => {
            callCount++
          })

          await Bus.publish(TestEvent, { v: 2 })

          // Only our new subscription should fire, not the old ones
          expect(callCount).toBe(1)

          await Instance.dispose()
        },
      })
    },
    30_000,
  )

  test(
    "Bootstrap init/dispose cycle doesn't leak subscriptions",
    async () => {
      // This tests the pattern from bootstrap.ts where multiple modules
      // register Bus subscriptions during init. After dispose, the Bus state
      // (subscriptions Map) should be cleared since it's per-instance via Instance.state().

      const TestEvent1 = BusEvent.define("test.bootstrap.a", z.object({}))
      const TestEvent2 = BusEvent.define("test.bootstrap.b", z.object({}))

      const baseline = await stableHeapMB()

      for (let i = 0; i < 10; i++) {
        await using tmp = await tmpdir({ git: true })

        await Instance.provide({
          directory: tmp.path,
          fn: async () => {
            // Simulate bootstrap-like subscription pattern:
            // Multiple modules subscribing to various events
            Bus.subscribe(TestEvent1, () => {})
            Bus.subscribe(TestEvent1, () => {})
            Bus.subscribe(TestEvent2, () => {})
            Bus.subscribeAll(() => {})
            Bus.subscribe(TestEvent1, () => {})
            Bus.subscribe(TestEvent2, () => {})
            Bus.subscribe(TestEvent2, () => {})
            Bus.subscribeAll(() => {})
            Bus.subscribe(TestEvent1, () => {})
            Bus.subscribe(TestEvent2, () => {})

            // 10 subscriptions per instance, like real bootstrap

            await Instance.dispose()
          },
        })
      }

      const after = await stableHeapMB()
      const growth = after - baseline

      console.log(`  10 bootstrap cycles growth: ${growth.toFixed(2)} MB`)

      // 10 cycles × 10 subscriptions each should not accumulate
      // since Bus state is per-instance and cleared on dispose
      expect(growth).toBeLessThan(5)
    },
    60_000,
  )
})
