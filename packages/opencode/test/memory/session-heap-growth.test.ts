import { describe, test, expect } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Bus } from "../../src/bus"
import { tmpdir } from "../fixture/fixture"
import { measureGrowth, stableHeapMB } from "./helper"

describe("memory: session heap growth", () => {
  test(
    "Session create/remove cycle doesn't leak",
    async () => {
      // Exercise the full session lifecycle: create → subscribe to events → remove
      // This tests Database + Bus + State interactions without needing LLM mocks.
      const { growth } = await measureGrowth(10, async (i) => {
        await using tmp = await tmpdir({ git: true })

        await Instance.provide({
          directory: tmp.path,
          fn: async () => {
            // Subscribe to session events (like bootstrap does)
            const unsub1 = Bus.subscribe(Session.Event.Created, () => {})
            const unsub2 = Bus.subscribe(Session.Event.Updated, () => {})
            const unsub3 = Bus.subscribe(Session.Event.Deleted, () => {})

            // Create a session
            const session = await Session.create()

            // Touch the session (updates timestamp, publishes events)
            await Session.touch(session.id)

            // Create another session
            const session2 = await Session.create({ title: `Test session ${i}` })

            // List sessions
            const sessions = [...Session.list()]
            expect(sessions.length).toBeGreaterThanOrEqual(2)

            // Remove sessions
            await Session.remove(session.id)
            await Session.remove(session2.id)

            // Dispose instance (clears Bus state, State entries)
            await Instance.dispose()
          },
        })
      })

      console.log(`  Session create/remove 10x growth: ${growth.toFixed(2)} MB`)
      expect(growth).toBeLessThan(10)
    },
    60_000,
  )

  test(
    "Session message update/query cycle doesn't leak",
    async () => {
      await using tmp = await tmpdir({ git: true })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const session = await Session.create()

          // Warm up
          await Session.updateMessage({
            id: "message_warm",
            sessionID: session.id,
            role: "user",
            time: { created: Date.now() },
            agent: "code",
            model: { providerID: "test", modelID: "test-model" },
          })

          const baseline = await stableHeapMB()

          // Create and query many messages
          for (let i = 0; i < 50; i++) {
            const msgId = `message_${String(i).padStart(6, "0")}`
            await Session.updateMessage({
              id: msgId,
              sessionID: session.id,
              role: "user",
              time: { created: Date.now() },
              agent: "code",
              model: { providerID: "test", modelID: "test-model" },
            })

            await Session.updatePart({
              id: `part_${String(i).padStart(6, "0")}`,
              messageID: msgId,
              sessionID: session.id,
              type: "text",
              text: `Test message content ${i} with some padding to make it larger`.repeat(10),
            })
          }

          // Query messages
          const msgs = await Session.messages({ sessionID: session.id })
          expect(msgs.length).toBeGreaterThan(0)

          const after = await stableHeapMB()
          const growth = after - baseline

          console.log(`  Message update/query 50x growth: ${growth.toFixed(2)} MB`)
          // DB operations should be bounded — data is in SQLite, not in JS heap
          expect(growth).toBeLessThan(10)

          await Session.remove(session.id)
          await Instance.dispose()
        },
      })
    },
    60_000,
  )

  test(
    "Multiple session lifecycles with events don't accumulate",
    async () => {
      // This is the closest to the real scenario: multiple instances, each with
      // sessions, events, and cleanup — similar to what happens when Kilo CLI
      // is restarted multiple times.
      const { growth } = await measureGrowth(5, async (i) => {
        await using tmp = await tmpdir({ git: true })

        await Instance.provide({
          directory: tmp.path,
          fn: async () => {
            // Simulate bootstrap-like subscriptions
            Bus.subscribe(Session.Event.Created, () => {})
            Bus.subscribe(Session.Event.Updated, () => {})
            Bus.subscribe(Session.Event.Deleted, () => {})
            Bus.subscribe(Session.Event.Error, () => {})
            Bus.subscribe(Session.Event.TurnOpen, () => {})
            Bus.subscribe(Session.Event.TurnClose, () => {})
            Bus.subscribeAll(() => {})

            // Create sessions with messages
            for (let j = 0; j < 5; j++) {
              const session = await Session.create({ title: `Iter ${i} Session ${j}` })

              for (let k = 0; k < 5; k++) {
                const msgId = `message_${i}_${j}_${String(k).padStart(4, "0")}`
                await Session.updateMessage({
                  id: msgId,
                  sessionID: session.id,
                  role: "user",
                  time: { created: Date.now() },
                  agent: "code",
                  model: { providerID: "test", modelID: "test-model" },
                })
                await Session.updatePart({
                  id: `part_${i}_${j}_${String(k).padStart(4, "0")}`,
                  messageID: msgId,
                  sessionID: session.id,
                  type: "text",
                  text: `Content for iteration ${i}, session ${j}, message ${k}`,
                })
              }

              await Session.remove(session.id)
            }

            await Instance.dispose()
          },
        })
      })

      console.log(`  Multiple session lifecycles growth: ${growth.toFixed(2)} MB`)
      expect(growth).toBeLessThan(10)
    },
    120_000,
  )
})
