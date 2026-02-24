import { describe, test, expect } from "bun:test"
import { Instance } from "../../src/project/instance"
import { State } from "../../src/project/state"
import { tmpdir } from "../fixture/fixture"

describe("memory: disposal lifecycle", () => {
  test(
    "Instance.dispose calls State.dispose",
    async () => {
      await using tmp = await tmpdir({ git: true })

      let disposeCalled = false

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const getState = Instance.state(
            () => ({ value: "test" }),
            async () => {
              disposeCalled = true
            },
          )
          // Materialize the state
          getState()

          await Instance.dispose()
        },
      })

      expect(disposeCalled).toBe(true)
    },
    30_000,
  )

  test(
    "disposeAll disposes multiple instances",
    async () => {
      await using tmp1 = await tmpdir({ git: true })
      await using tmp2 = await tmpdir({ git: true })

      let dispose1Called = false
      let dispose2Called = false

      await Instance.provide({
        directory: tmp1.path,
        fn: async () => {
          const getState = Instance.state(
            () => ({ value: "inst1" }),
            async () => {
              dispose1Called = true
            },
          )
          getState()
        },
      })

      await Instance.provide({
        directory: tmp2.path,
        fn: async () => {
          const getState = Instance.state(
            () => ({ value: "inst2" }),
            async () => {
              dispose2Called = true
            },
          )
          getState()
        },
      })

      await Instance.disposeAll()

      expect(dispose1Called).toBe(true)
      expect(dispose2Called).toBe(true)
    },
    30_000,
  )

  test(
    "disposeAll is idempotent",
    async () => {
      await using tmp = await tmpdir({ git: true })

      let disposeCount = 0

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const getState = Instance.state(
            () => ({ value: "idem" }),
            async () => {
              disposeCount++
            },
          )
          getState()
        },
      })

      await Instance.disposeAll()
      await Instance.disposeAll()

      // Dispose should only be called once — second disposeAll is a no-op
      // because the cache is already cleared
      expect(disposeCount).toBe(1)
    },
    30_000,
  )

  test(
    "State.dispose removes entries from recordsByKey",
    async () => {
      await using tmp = await tmpdir({ git: true })

      let firstValue: any
      let secondValue: any

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const getState = Instance.state(
            () => ({ createdAt: Date.now() }),
            async () => {},
          )

          firstValue = getState()
          expect(firstValue.createdAt).toBeGreaterThan(0)

          await Instance.dispose()
        },
      })

      // Re-provide and re-materialize — should create fresh state
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const getState = Instance.state(
            () => ({ createdAt: Date.now() }),
            async () => {},
          )

          secondValue = getState()

          // Fresh state should have a different or later timestamp
          // (the exact time may be the same if fast, but the object reference must differ)
          expect(secondValue).not.toBe(firstValue)

          await Instance.dispose()
        },
      })
    },
    30_000,
  )

  test(
    "Slow disposal completes without error",
    async () => {
      await using tmp = await tmpdir({ git: true })

      let disposed = false

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const getState = Instance.state(
            () => ({ value: "slow" }),
            async () => {
              await Bun.sleep(200)
              disposed = true
            },
          )
          getState()

          await Instance.dispose()
        },
      })

      expect(disposed).toBe(true)
    },
    30_000,
  )
})
