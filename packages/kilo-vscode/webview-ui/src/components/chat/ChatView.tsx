/**
 * ChatView component
 * Main chat container that combines all chat components
 */

import { Component, Show } from "solid-js"
import { TaskHeader } from "./TaskHeader"
import { MessageList } from "./MessageList"
import { PromptInput } from "./PromptInput"
import { PermissionDialog } from "./PermissionDialog"
import { QuestionDock } from "./QuestionDock"
import { useSession } from "../../context/session"

export const ChatView: Component = () => {
  const session = useSession()

  const questionRequest = () => session.questions()[0]
  const blocked = () => session.permissions().length > 0 || session.questions().length > 0

  return (
    <div class="chat-view">
      <TaskHeader />
      <div class="chat-messages">
        <MessageList />
      </div>

      <div class="chat-input">
        <Show when={questionRequest()} keyed>
          {(req) => <QuestionDock request={req} />}
        </Show>
        <Show when={!blocked()}>
          <PromptInput />
        </Show>
      </div>

      <PermissionDialog />
    </div>
  )
}
