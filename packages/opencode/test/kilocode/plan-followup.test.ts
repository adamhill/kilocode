import { describe, expect, spyOn, test } from "bun:test"
import { Bus } from "../../src/bus"
import { TuiEvent } from "../../src/cli/cmd/tui/event"
import { Identifier } from "../../src/id/id"
import { extractContext, PlanFollowup } from "../../src/kilocode/plan-followup"
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

async function withInstance(fn: () => Promise<void>) {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({ directory: tmp.path, fn })
}

async function seed(input: {
  text: string
  tools?: Array<{ tool: string; input: Record<string, unknown>; output: string }>
}) {
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

  for (const t of input.tools ?? []) {
    await Session.updatePart({
      id: Identifier.ascending("part"),
      messageID: assistant.id,
      sessionID: session.id,
      type: "tool",
      callID: Identifier.ascending("tool"),
      tool: t.tool,
      state: {
        status: "completed",
        input: t.input,
        output: t.output,
        title: t.tool,
        metadata: {},
        time: { start: Date.now(), end: Date.now() },
      },
    } satisfies MessageV2.ToolPart)
  }

  const messages = await Session.messages({ sessionID: session.id })
  return {
    sessionID: session.id,
    messages,
  }
}

async function latestUser(sessionID: string) {
  const messages = await Session.messages({ sessionID })
  return messages
    .slice()
    .reverse()
    .find((item) => item.info.role === "user")
}

async function sessions() {
  return Array.fromAsync(Session.list())
}

describe("plan follow-up", () => {
  test("ask - returns break when dismissed", () =>
    withInstance(async () => {
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
    }))

  test("ask - returns continue and creates code message on Continue here", () =>
    withInstance(async () => {
      const seeded = await seed({ text: "1. Build\n2. Test" })
      const pending = PlanFollowup.ask({
        sessionID: seeded.sessionID,
        messages: seeded.messages,
        abort: AbortSignal.any([]),
      })

      const list = await Question.list()
      await Question.reply({
        requestID: list[0].id,
        answers: [[PlanFollowup.ANSWER_CONTINUE]],
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
    }))

  test("ask - returns continue and creates plan message for custom text", () =>
    withInstance(async () => {
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
    }))

  test("ask - creates a new session on Start new session", () =>
    withInstance(async () => {
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
            cwd: "/tmp",
            root: "/tmp",
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
      const seeded = await seed({
        text: "1. Add API\n2. Add tests",
        tools: [
          {
            tool: "task",
            input: { prompt: "explore the codebase", subagent_type: "explore" },
            output: "Found src/api.ts with REST endpoints and src/db.ts with database layer",
          },
          {
            tool: "read",
            input: { filePath: "/project/src/api.ts", offset: 1, limit: 50 },
            output: "file content here",
          },
        ],
      })
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
        answers: [[PlanFollowup.ANSWER_NEW_SESSION]],
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
      expect(part.text).toContain("## Context from planning research")
      expect(part.text).toContain("Found src/api.ts with REST endpoints")
      expect(part.text).toContain("- /project/src/api.ts (lines 1-50)")
      expect(part.synthetic).toBe(true)

      SessionPrompt.cancel(newSessionID)
    }))

  test("ask - returns break when assistant text is empty", () =>
    withInstance(async () => {
      const seeded = await seed({ text: "   " })
      const result = await PlanFollowup.ask({
        sessionID: seeded.sessionID,
        messages: seeded.messages,
        abort: AbortSignal.any([]),
      })

      expect(result).toBe("break")
      expect(await Question.list()).toHaveLength(0)
    }))

  test("ask - returns break when already aborted", () =>
    withInstance(async () => {
      const abort = new AbortController()
      abort.abort()

      const result = await PlanFollowup.ask({
        sessionID: "ses_test",
        messages: [],
        abort: abort.signal,
      })

      expect(result).toBe("break")
    }))

  test("ask - returns break when aborted while question is pending", () =>
    withInstance(async () => {
      const abort = new AbortController()
      const seeded = await seed({ text: "1. Step one\n2. Step two" })
      const pending = PlanFollowup.ask({
        sessionID: seeded.sessionID,
        messages: seeded.messages,
        abort: abort.signal,
      })

      const list = await Question.list()
      expect(list).toHaveLength(1)

      abort.abort()

      await expect(pending).resolves.toBe("break")
      expect(await Question.list()).toHaveLength(0)
    }))

  test("ask - returns break for blank custom answer", () =>
    withInstance(async () => {
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
    }))

  test("extractContext - returns empty string with no tool results", () =>
    withInstance(async () => {
      const seeded = await seed({ text: "1. Build\n2. Test" })
      expect(extractContext(seeded.messages)).toBe("")
    }))

  test("extractContext - includes task outputs and read paths", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "task",
            input: { prompt: "explore", subagent_type: "explore" },
            output: "The auth module lives in src/auth/",
          },
          {
            tool: "read",
            input: { filePath: "/project/src/auth/login.ts" },
            output: "file content",
          },
          {
            tool: "read",
            input: { filePath: "/project/src/auth/session.ts", offset: 10, limit: 20 },
            output: "file content",
          },
        ],
      })
      const context = extractContext(seeded.messages)
      expect(context).toContain("## Context from planning research")
      expect(context).toContain("### Explored")
      expect(context).toContain("The auth module lives in src/auth/")
      expect(context).toContain("### Files read")
      expect(context).toContain("- /project/src/auth/login.ts")
      expect(context).toContain("- /project/src/auth/session.ts (lines 10-29)")
    }))

  test("extractContext - filters empty and whitespace-only task outputs", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "task",
            input: { prompt: "explore", subagent_type: "explore" },
            output: "",
          },
          {
            tool: "task",
            input: { prompt: "explore more", subagent_type: "explore" },
            output: "   ",
          },
        ],
      })
      expect(extractContext(seeded.messages)).toBe("")
    }))

  test("extractContext - deduplicates file reads", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "read",
            input: { filePath: "/project/src/api.ts" },
            output: "content",
          },
          {
            tool: "read",
            input: { filePath: "/project/src/api.ts" },
            output: "content again",
          },
          {
            tool: "read",
            input: { filePath: "/project/src/api.ts", offset: 10, limit: 20 },
            output: "different range",
          },
        ],
      })
      const context = extractContext(seeded.messages)
      const matches = context.match(/- \/project\/src\/api\.ts\b/g)
      expect(matches).toHaveLength(2)
    }))

  test("extractContext - includes only explored section when no reads", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "task",
            input: { prompt: "explore", subagent_type: "explore" },
            output: "Found important patterns",
          },
        ],
      })
      const context = extractContext(seeded.messages)
      expect(context).toContain("### Explored")
      expect(context).toContain("Found important patterns")
      expect(context).not.toContain("### Files read")
    }))

  test("extractContext - includes only files section when no tasks", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "read",
            input: { filePath: "/project/src/index.ts" },
            output: "content",
          },
        ],
      })
      const context = extractContext(seeded.messages)
      expect(context).not.toContain("### Explored")
      expect(context).toContain("### Files read")
      expect(context).toContain("- /project/src/index.ts")
    }))

  test("extractContext - ignores non-task non-read tools", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "grep",
            input: { pattern: "foo", path: "/project" },
            output: "Found 5 matches",
          },
          {
            tool: "bash",
            input: { command: "ls" },
            output: "file1.ts\nfile2.ts",
          },
        ],
      })
      expect(extractContext(seeded.messages)).toBe("")
    }))

  test("extractContext - strips task_id prefix and task_result tags", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "task",
            input: { prompt: "explore", subagent_type: "explore" },
            output:
              "task_id: ses_abc123 (for resuming)\n\n<task_result>\nThe auth module is in src/auth/\n</task_result>",
          },
        ],
      })
      const context = extractContext(seeded.messages)
      expect(context).toContain("The auth module is in src/auth/")
      expect(context).not.toContain("task_id:")
      expect(context).not.toContain("<task_result>")
    }))

  test("extractContext - shows first N lines for limit-only reads", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "read",
            input: { filePath: "/project/src/config.ts", limit: 50 },
            output: "content",
          },
        ],
      })
      const context = extractContext(seeded.messages)
      expect(context).toContain("- /project/src/config.ts (first 50 lines)")
    }))

  test("extractContext - truncates at 10000 chars", () =>
    withInstance(async () => {
      const seeded = await seed({
        text: "Plan text",
        tools: [
          {
            tool: "task",
            input: { prompt: "explore", subagent_type: "explore" },
            output: "x".repeat(12_000),
          },
        ],
      })
      const context = extractContext(seeded.messages)
      expect(context.length).toBeLessThanOrEqual(10_000)
      expect(context).toEndWith("[context truncated]")
    }))
})
