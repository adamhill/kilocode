/**
 * ChatView component
 * Main chat container that combines all chat components
 */

import { Component, For, Show, createSignal } from "solid-js"
import { TaskHeader } from "./TaskHeader"
import { MessageList } from "./MessageList"
import { PromptInput } from "./PromptInput"
import { QuestionDock } from "./QuestionDock"
import { useSession } from "../../context/session"
import { useLanguage } from "../../context/language"

interface ChatViewProps {
  onSelectSession?: (id: string) => void
}

export const ChatView: Component<ChatViewProps> = (props) => {
  const session = useSession()
  const language = useLanguage()

  const id = () => session.currentSessionID()
  const sessionQuestions = () => session.questions().filter((q) => q.sessionID === id())
  const sessionPermissions = () => session.permissions().filter((p) => p.sessionID === id())

  const questionRequest = () => sessionQuestions()[0]
  const permissionRequest = () => sessionPermissions()[0]
  const blocked = () => sessionPermissions().length > 0 || sessionQuestions().length > 0

  const [responding, setResponding] = createSignal(false)

  const decide = (response: "once" | "always" | "reject") => {
    const perm = permissionRequest()
    if (!perm || responding()) return
    setResponding(true)
    session.respondToPermission(perm.id, response)
    setResponding(false)
  }

  return (
    <div class="chat-view">
      <TaskHeader />
      <div class="chat-messages">
        <MessageList onSelectSession={props.onSelectSession} />
      </div>

      <div class="chat-input">
        <Show when={questionRequest()} keyed>
          {(req) => <QuestionDock request={req} />}
        </Show>
        <Show when={permissionRequest()} keyed>
          {(perm) => (
            <div class="permission-dock">
              <div class="permission-dock-header">
                <span class="permission-dock-title">{language.t("notification.permission.title")}</span>
                <span class="permission-dock-type">{perm.toolName}</span>
              </div>
              <Show when={perm.patterns.length > 0}>
                <div class="permission-dock-patterns">
                  <For each={perm.patterns}>
                    {(pattern) => <code class="permission-dock-pattern">{pattern}</code>}
                  </For>
                </div>
              </Show>
              <div class="permission-dock-actions">
                <button
                  class="permission-btn permission-btn-deny"
                  onClick={() => decide("reject")}
                  disabled={responding()}
                >
                  {language.t("ui.permission.deny")}
                </button>
                <button
                  class="permission-btn permission-btn-always"
                  onClick={() => decide("always")}
                  disabled={responding()}
                >
                  {language.t("ui.permission.allowAlways")}
                </button>
                <button
                  class="permission-btn permission-btn-allow"
                  onClick={() => decide("once")}
                  disabled={responding()}
                >
                  {language.t("ui.permission.allowOnce")}
                </button>
              </div>
            </div>
          )}
        </Show>
        <Show when={!blocked()}>
          <PromptInput />
        </Show>
      </div>
    </div>
  )
}
