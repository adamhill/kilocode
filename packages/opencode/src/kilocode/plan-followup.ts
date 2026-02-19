import { Bus } from "@/bus"
import { TuiEvent } from "@/cli/cmd/tui/event"
import { Identifier } from "@/id/id"
import { Question } from "@/question"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Log } from "@/util/log"

function isUser(item: MessageV2.WithParts): item is MessageV2.WithParts & { info: MessageV2.User } {
  return item.info.role === "user"
}

function isAssistant(item: MessageV2.WithParts): item is MessageV2.WithParts & { info: MessageV2.Assistant } {
  return item.info.role === "assistant"
}

function toText(item: MessageV2.WithParts): string {
  return item.parts
    .filter((part): part is MessageV2.TextPart => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim()
}

export namespace PlanFollowup {
  const log = Log.create({ service: "plan.followup" })

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

  export async function ask(input: {
    sessionID: string
    messages: MessageV2.WithParts[]
    abort: AbortSignal
  }): Promise<"continue" | "break"> {
    if (input.abort.aborted) return "break"

    const latest = input.messages.slice().reverse()
    const assistant = latest.find(isAssistant)
    if (!assistant) return "break"

    const plan = toText(assistant)
    if (!plan) return "break"

    const user = latest.find(isUser)?.info
    if (!user?.model) return "break"

    const answers = await Question.ask({
      sessionID: input.sessionID,
      questions: [
        {
          question: "Ready to implement?",
          header: "Implement",
          custom: true,
          options: [
            {
              label: "Start new session",
              description: "Implement in a fresh session with a clean context",
            },
            {
              label: "Continue here",
              description: "Implement the plan in this session",
            },
          ],
        },
      ],
    }).catch((error) => {
      if (error instanceof Question.RejectedError) return undefined
      throw error
    })
    if (!answers) return "break"

    const answer = answers[0]?.[0]?.trim()
    if (!answer) return "break"

    if (answer === "Start new session") {
      const next = await Session.create({})
      await inject({
        sessionID: next.id,
        agent: "code",
        model: user.model,
        text: `Implement the following plan:\n\n${plan}`,
      })
      await Bus.publish(TuiEvent.SessionSelect, { sessionID: next.id })
      void import("@/session/prompt")
        .then((item) => item.SessionPrompt.loop({ sessionID: next.id }))
        .catch((error) => {
          log.error("failed to start follow-up session", { sessionID: next.id, error })
        })
      return "break"
    }

    if (answer === "Continue here") {
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
