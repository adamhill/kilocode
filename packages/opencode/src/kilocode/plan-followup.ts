import { Bus } from "@/bus"
import { TuiEvent } from "@/cli/cmd/tui/event"
import { Identifier } from "@/id/id"
import { Question } from "@/question"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Log } from "@/util/log"

function toText(item: MessageV2.WithParts): string {
  return item.parts
    .filter((part): part is MessageV2.TextPart => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim()
}

const CONTEXT_LIMIT = 10_000

function isTool(part: MessageV2.Part): part is MessageV2.ToolPart & { state: MessageV2.ToolStateCompleted } {
  return part.type === "tool" && part.state.status === "completed"
}

export function extractContext(messages: MessageV2.WithParts[]): string {
  const tasks = [] as string[]
  const files = [] as string[]
  const seen = new Set<string>()

  for (const msg of messages) {
    for (const part of msg.parts) {
      if (!isTool(part)) continue
      if (part.tool === "task" && part.state.output.trim()) {
        const match = part.state.output.match(/<task_result>([\s\S]*?)<\/task_result>/)
        tasks.push(match ? match[1].trim() : part.state.output.trim())
      }
      if (part.tool === "read" && part.state.input.filePath) {
        const path = part.state.input.filePath as string
        const offset = part.state.input.offset as number | undefined
        const limit = part.state.input.limit as number | undefined
        const range =
          offset !== undefined && limit !== undefined
            ? ` (lines ${offset}-${offset + limit - 1})`
            : offset !== undefined
              ? ` (from line ${offset})`
              : limit !== undefined
                ? ` (first ${limit} lines)`
                : ""
        const entry = `- ${path}${range}`
        if (!seen.has(entry)) {
          seen.add(entry)
          files.push(entry)
        }
      }
    }
  }

  if (!tasks.length && !files.length) return ""

  const sections = [] as string[]
  if (tasks.length) {
    sections.push("### Explored\n\n" + tasks.join("\n\n"))
  }
  if (files.length) {
    sections.push("### Files read\n\n" + files.join("\n"))
  }

  const full = "\n\n## Context from planning research\n\n" + sections.join("\n\n")
  if (full.length <= CONTEXT_LIMIT) return full
  const marker = "\n\n[context truncated]"
  const cut = full.slice(0, CONTEXT_LIMIT - marker.length)
  const last = cut.lastIndexOf("\n")
  return (last > 0 ? cut.slice(0, last) : cut) + marker
}

export namespace PlanFollowup {
  const log = Log.create({ service: "plan.followup" })

  export const ANSWER_NEW_SESSION = "Start new session"
  export const ANSWER_CONTINUE = "Continue here"

  async function inject(input: { sessionID: string; agent: string; model: MessageV2.User["model"]; text: string }) {
    const msg: MessageV2.User = {
      id: Identifier.ascending("message"),
      sessionID: input.sessionID,
      role: "user",
      time: {
        created: Date.now(),
      },
      agent: input.agent,
      model: input.model,
    }
    await Session.updateMessage(msg)
    await Session.updatePart({
      id: Identifier.ascending("part"),
      messageID: msg.id,
      sessionID: input.sessionID,
      type: "text",
      text: input.text,
      synthetic: true,
    } satisfies MessageV2.TextPart)
  }

  function prompt(input: { sessionID: string; abort: AbortSignal }) {
    const promise = Question.ask({
      sessionID: input.sessionID,
      questions: [
        {
          question: "Ready to implement?",
          header: "Implement",
          custom: true,
          options: [
            {
              label: ANSWER_NEW_SESSION,
              description: "Implement in a fresh session with a clean context",
            },
            {
              label: ANSWER_CONTINUE,
              description: "Implement the plan in this session",
            },
          ],
        },
      ],
    })

    const listener = () =>
      Question.list().then((qs) => {
        const match = qs.find((q) => q.sessionID === input.sessionID)
        if (match) Question.reject(match.id)
      })
    input.abort.addEventListener("abort", listener, { once: true })

    return promise
      .catch((error) => {
        if (error instanceof Question.RejectedError) return undefined
        throw error
      })
      .finally(() => {
        input.abort.removeEventListener("abort", listener)
      })
  }

  async function startNew(input: { plan: string; messages: MessageV2.WithParts[]; model: MessageV2.User["model"] }) {
    const context = extractContext(input.messages)
    const next = await Session.create({})
    await inject({
      sessionID: next.id,
      agent: "code",
      model: input.model,
      text: `Implement the following plan:\n\n${input.plan}${context ? `\n${context}` : ""}`,
    })
    await Bus.publish(TuiEvent.SessionSelect, { sessionID: next.id })
    void import("@/session/prompt")
      .then((item) => item.SessionPrompt.loop({ sessionID: next.id }))
      .catch((error) => {
        log.error("failed to start follow-up session", { sessionID: next.id, error })
      })
  }

  export async function ask(input: {
    sessionID: string
    messages: MessageV2.WithParts[]
    abort: AbortSignal
  }): Promise<"continue" | "break"> {
    if (input.abort.aborted) return "break"

    const latest = input.messages.slice().reverse()
    const assistant = latest.find((msg) => msg.info.role === "assistant")
    if (!assistant) return "break"

    const plan = toText(assistant)
    if (!plan) return "break"

    const user = latest.find((msg) => msg.info.role === "user")?.info
    if (!user || user.role !== "user" || !user.model) return "break"

    const answers = await prompt({ sessionID: input.sessionID, abort: input.abort })
    if (!answers) return "break"

    const answer = answers[0]?.[0]?.trim()
    if (!answer) return "break"

    if (answer === ANSWER_NEW_SESSION) {
      await startNew({ plan, messages: input.messages, model: user.model })
      return "break"
    }

    if (answer === ANSWER_CONTINUE) {
      await inject({
        sessionID: input.sessionID,
        agent: "code",
        model: user.model,
        text: "Implement the plan above.",
      })
      return "continue"
    }

    await inject({
      sessionID: input.sessionID,
      agent: "plan",
      model: user.model,
      text: answer,
    })
    return "continue"
  }
}
