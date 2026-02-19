import { describe, expect, spyOn, test } from "bun:test"
import { Bus } from "../../src/bus"
import { TuiEvent } from "../../src/cli/cmd/tui/event"
import { Identifier } from "../../src/id/id"
import { PlanFollowup } from "../../src/kilocode/plan-followup"
import { Instance } from "../../src/project/instance"
import { Question } from "../../src/question"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionPrompt } from "../../src/session/prompt"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

const model = {
  providerID: "openai",
  modelID: "gpt-4",
}

async function seed(input: { text: string }) {
  const session = await Session.create({})
  const user = await Session.updateMessage({
    id: Identifier.ascending("message"),
    role: "user",
    sessionID: session.id,
    time: {
      created: Date.now(),
    },
    agent: "plan",
    model,
  })
  await Session.updatePart({
    id: Identifier.ascending("part"),
    messageID: user.id,
    sessionID: session.id,
    type: "text",
    text: "Create a plan",
  })

  const assistant: MessageV2.Assistant = {
    id: Identifier.ascending("message"),
    role: "assistant",
    sessionID: session.id,
    time: {
      created: Date.now(),
    },
    parentID: user.id,
    modelID: model.modelID,
    providerID: model.providerID,
    mode: "plan",
    agent: "plan",
    path: {
      cwd: Instance.directory,
      root: Instance.worktree,
    },
    cost: 0,
    tokens: {
      total: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      cache: {
        read: 0,
        write: 0,
      },
    },
    finish: "end_turn",
  }
  await Session.updateMessage(assistant)
  await Session.updatePart({
    id: Identifier.ascending("part"),
    messageID: assistant.id,
    sessionID: session.id,
    type: "text",
    text: input.text,
  })

  const messages = await Session.messages({ sessionID: session.id })
  return {
    sessionID: session.id,
    messages,
  }
}

async function latestUser(sessionID: string) {
  const messages = await Session.messages({ sessionID })
  return messages.slice().reverse().find((item) => item.info.role === "user")
}

async function sessions() {
  return Array.fromAsync(Session.list())
}

describe("plan follow-up", () => {
  test("ask - returns break when dismissed", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const seeded = await seed({ text: "1. Step one\n2. Step two" })
        const pending = PlanFollowup.ask({
          sessionID: seeded.sessionID,
          messages: seeded.messages,
          abort: AbortSignal.any([]),
        })

        const list = await Question.list()
        expect(list).toHaveLength(1)
        await Question.reject(list[0].id)

        await expect(pending).resolves.toBe("break")
      },
    })
  })

  test("ask - returns continue and creates code message on Continue here", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const seeded = await seed({ text: "1. Build\n2. Test" })
        const pending = PlanFollowup.ask({
          sessionID: seeded.sessionID,
          messages: seeded.messages,
          abort: AbortSignal.any([]),
        })

        const list = await Question.list()
        await Question.reply({
          requestID: list[0].id,
          answers: [["Continue here"]],
        })

        await expect(pending).resolves.toBe("continue")

        const user = await latestUser(seeded.sessionID)
        expect(user?.info.role).toBe("user")
        if (!user || user.info.role !== "user") return
        expect(user.info.agent).toBe("code")

        const part = user.parts.find((item) => item.type === "text")
        expect(part?.type).toBe("text")
        if (!part || part.type !== "text") return
        expect(part.text).toBe("Implement the plan above.")
        expect(part.synthetic).toBe(true)
      },
    })
  })

  test("ask - returns continue and creates plan message for custom text", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const seeded = await seed({ text: "1. Build\n2. Test" })
        const pending = PlanFollowup.ask({
          sessionID: seeded.sessionID,
          messages: seeded.messages,
          abort: AbortSignal.any([]),
        })

        await Question.reply({
          requestID: (await Question.list())[0].id,
          answers: [["Add rollback support too"]],
        })

        await expect(pending).resolves.toBe("continue")

        const user = await latestUser(seeded.sessionID)
        expect(user?.info.role).toBe("user")
        if (!user || user.info.role !== "user") return
        expect(user.info.agent).toBe("plan")

        const part = user.parts.find((item) => item.type === "text")
        expect(part?.type).toBe("text")
        if (!part || part.type !== "text") return
        expect(part.text).toBe("Add rollback support too")
        expect(part.synthetic).toBe(true)
      },
    })
  })

  test("ask - creates a new session on Start new session", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const loop = spyOn(SessionPrompt, "loop").mockResolvedValue({
          info: {
            id: "msg_test",
            role: "assistant",
            sessionID: "ses_test",
            time: {
              created: Date.now(),
            },
            parentID: "msg_parent",
            modelID: "test",
            providerID: "test",
            mode: "code",
            agent: "code",
            path: {
              cwd: tmp.path,
              root: tmp.path,
            },
            cost: 0,
            tokens: {
              total: 0,
              input: 0,
              output: 0,
              reasoning: 0,
              cache: {
                read: 0,
                write: 0,
              },
            },
          },
          parts: [],
        })
        using _ = {
          [Symbol.dispose]() {
            loop.mockRestore()
          },
        }
        const seeded = await seed({ text: "1. Add API\n2. Add tests" })
        const before = await sessions()
        const created = [] as string[]
        const unsub = Bus.subscribe(TuiEvent.SessionSelect, (event) => {
          created.push(event.properties.sessionID)
        })

        const pending = PlanFollowup.ask({
          sessionID: seeded.sessionID,
          messages: seeded.messages,
          abort: AbortSignal.any([]),
        })

        await Question.reply({
          requestID: (await Question.list())[0].id,
          answers: [["Start new session"]],
        })

        await expect(pending).resolves.toBe("break")
        unsub()

        const after = await sessions()
        const prev = new Set(before.map((item) => item.id))
        const added = after.filter((item) => !prev.has(item.id))
        expect(added).toHaveLength(1)
        expect(created).toHaveLength(1)
        expect(loop).toHaveBeenCalledTimes(1)

        const newSessionID = created[0]
        expect(added[0].id).toBe(newSessionID)
        const messages = await Session.messages({ sessionID: newSessionID })
        const user = messages.find((item) => item.info.role === "user")
        expect(user?.info.role).toBe("user")
        if (!user || user.info.role !== "user") throw new Error("expected seeded user message")
        expect(user.info.agent).toBe("code")

        const part = user.parts.find((item) => item.type === "text")
        expect(part?.type).toBe("text")
        if (!part || part.type !== "text") throw new Error("expected text part")
        expect(part.text).toContain("Implement the following plan:")
        expect(part.text).toContain("1. Add API\n2. Add tests")
        expect(part.synthetic).toBe(true)

        SessionPrompt.cancel(newSessionID)
      },
    })
  })

  test("ask - returns break when assistant text is empty", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const seeded = await seed({ text: "   " })
        const result = await PlanFollowup.ask({
          sessionID: seeded.sessionID,
          messages: seeded.messages,
          abort: AbortSignal.any([]),
        })

        expect(result).toBe("break")
        expect(await Question.list()).toHaveLength(0)
      },
    })
  })

  test("ask - returns break when aborted", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const abort = new AbortController()
        abort.abort()

        const result = await PlanFollowup.ask({
          sessionID: "ses_test",
          messages: [],
          abort: abort.signal,
        })

        expect(result).toBe("break")
      },
    })
  })

  test("ask - returns break for blank custom answer", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const seeded = await seed({ text: "1. Build\n2. Test" })
        const pending = PlanFollowup.ask({
          sessionID: seeded.sessionID,
          messages: seeded.messages,
          abort: AbortSignal.any([]),
        })

        await Question.reply({
          requestID: (await Question.list())[0].id,
          answers: [["   "]],
        })

        await expect(pending).resolves.toBe("break")
        expect((await Session.messages({ sessionID: seeded.sessionID })).length).toBe(2)
      },
    })
  })
})
