import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { ulid } from "ulid"
import { Provider } from "@/provider/provider"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Storage } from "@/storage/storage"
import { Log } from "@/util/log"
import type * as SDK from "@opencode-ai/sdk/v2"

export namespace ShareNext {
  const log = Log.create({ service: "share-next" })

  async function url() {
    return Config.get().then((x) => x.enterprise?.url ?? "http://localhost:8787")
  }

  export async function kilocodeConfig() {
    return Config.get().then((x) => x.provider?.["kilo"])
  }

  export async function kilocodeToken() {
    const cfg = await kilocodeConfig()
    const token = cfg?.options?.kilocodeToken
    if (typeof token === "string" && token.length > 0) return token
    const apiKey = cfg?.options?.apiKey
    if (typeof apiKey === "string" && apiKey.length > 0) return apiKey
    return undefined
  }

  type Client = {
    url: string
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  }

  async function getClient(): Promise<Client | undefined> {
    if (disabled) return undefined
    const token = await kilocodeToken()
    if (!token) return undefined

    const base = await url()
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `bearer ${token}`,
    }

    const withHeaders = (init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      for (const [k, v] of Object.entries(baseHeaders)) headers.set(k, v)
      return {
        ...init,
        headers,
      } satisfies RequestInit
    }

    return {
      url: base,
      fetch: (input, init) => fetch(input, withHeaders(init)),
    }
  }

  const disabled = process.env["OPENCODE_DISABLE_SHARE"] === "true" || process.env["OPENCODE_DISABLE_SHARE"] === "1"

  export async function init() {
    const client = await getClient()
    if (!client) return

    Bus.subscribe(Session.Event.Created, async (evt) => {
      await create(evt.properties.info.id)
    })

    Bus.subscribe(Session.Event.Updated, async (evt) => {
      await sync(evt.properties.info.id, [
        {
          type: "session",
          data: evt.properties.info,
        },
      ])
    })

    Bus.subscribe(MessageV2.Event.Updated, async (evt) => {
      await sync(evt.properties.info.sessionID, [
        {
          type: "message",
          data: evt.properties.info,
        },
      ])

      if (evt.properties.info.role === "user") {
        await sync(evt.properties.info.sessionID, [
          {
            type: "model",
            data: [
              await Provider.getModel(evt.properties.info.model.providerID, evt.properties.info.model.modelID).then(
                (m) => m,
              ),
            ],
          },
        ])
      }
    })

    Bus.subscribe(MessageV2.Event.PartUpdated, async (evt) => {
      await sync(evt.properties.part.sessionID, [
        {
          type: "part",
          data: evt.properties.part,
        },
      ])
    })

    Bus.subscribe(Session.Event.Diff, async (evt) => {
      await sync(evt.properties.sessionID, [
        {
          type: "session_diff",
          data: evt.properties.diff,
        },
      ])
    })
  }

  export async function create(sessionId: string) {
    const client = await getClient()
    if (!client) return { id: "", ingestUrl: "" }

    log.info("creating session", { sessionId })

    const result = await client
      .fetch(`${client.url}/api/session`, {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      })
      .then((x) => x.json())
      .then((x) => x as { id: string; ingestUrl: string })

    await Storage.write(["session_share", sessionId], result)

    fullSync(sessionId)

    return result
  }

  export async function share(sessionId: string) {
    if (disabled) return { url: "" }

    log.info("creating share", { sessionId })

    return { url: "" }
  }

  function get(sessionId: string) {
    return Storage.read<{
      id: string
      url?: string
      ingestUrl: string
    }>(["session_share", sessionId])
  }

  type Data =
    | {
        type: "session"
        data: SDK.Session
      }
    | {
        type: "message"
        data: SDK.Message
      }
    | {
        type: "part"
        data: SDK.Part
      }
    | {
        type: "session_diff"
        data: SDK.FileDiff[]
      }
    | {
        type: "model"
        data: SDK.Model[]
      }

  const queue = new Map<string, { timeout: NodeJS.Timeout; data: Map<string, Data> }>()
  async function sync(sessionId: string, data: Data[]) {
    const client = await getClient()
    if (!client) return

    const existing = queue.get(sessionId)
    if (existing) {
      for (const item of data) {
        existing.data.set("id" in item ? (item.id as string) : ulid(), item)
      }
      return
    }

    const dataMap = new Map<string, Data>()
    for (const item of data) {
      dataMap.set("id" in item ? (item.id as string) : ulid(), item)
    }

    const timeout = setTimeout(async () => {
      const queued = queue.get(sessionId)
      if (!queued) return

      queue.delete(sessionId)

      const share = await get(sessionId).catch(() => undefined)
      if (!share) return

      const client = await getClient()
      if (!client) return

      await client.fetch(share.ingestUrl, {
        method: "POST",
        body: JSON.stringify({
          data: Array.from(queued.data.values()),
        }),
      })
    }, 1000)
    queue.set(sessionId, { timeout, data: dataMap })
  }

  export async function remove(sessionId: string) {
    const client = await getClient()
    if (!client) return

    log.info("removing share", { sessionId })

    const share = await get(sessionId)
    if (!share) return

    await client.fetch(`${client.url}/api/share/${share.id}`, {
      method: "DELETE",
    })

    await Storage.remove(["session_share", sessionId])
  }

  async function fullSync(sessionId: string) {
    log.info("full sync", { sessionId })

    const session = await Session.get(sessionId)
    const diffs = await Session.diff(sessionId)
    const messages = await Array.fromAsync(MessageV2.stream(sessionId))
    const models = await Promise.all(
      messages
        .filter((m) => m.info.role === "user")
        .map((m) => (m.info as SDK.UserMessage).model)
        .map((m) => Provider.getModel(m.providerID, m.modelID).then((m) => m)),
    )

    await sync(sessionId, [
      {
        type: "session",
        data: session,
      },
      ...messages.map((x) => ({
        type: "message" as const,
        data: x.info,
      })),
      ...messages.flatMap((x) => x.parts.map((y) => ({ type: "part" as const, data: y }))),
      {
        type: "session_diff",
        data: diffs,
      },
      {
        type: "model",
        data: models,
      },
    ])
  }
}
