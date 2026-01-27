// kilocode_change pretty much completely refactored
import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { ulid } from "ulid"
import { Provider } from "@/provider/provider"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Storage } from "@/storage/storage"
import { Log } from "@/util/log"
import { Auth } from "@/auth"
import type * as SDK from "@opencode-ai/sdk/v2"

export namespace ShareNext {
  const log = Log.create({ service: "share-next" })

  export async function kilocodeToken() {
    const auth = await Auth.get("kilo")
    if (auth?.type === "api" && auth.key.length > 0) return auth.key
    if (auth?.type === "oauth" && auth.access.length > 0) return auth.access
    if (auth?.type === "wellknown" && auth.token.length > 0) return auth.token
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

    const base = await Config.get().then((x) => x.enterprise?.url ?? "http://localhost:8787")
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
    if (!client) return { id: "", ingestPath: "" }

    log.info("creating session", { sessionId })

    const result = await client
      .fetch(`${client.url}/api/session`, {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      })
      .then((x) => x.json())
      .then((x) => x as { id: string; ingestPath: string })

    await Storage.write(["session_share", sessionId], result)

    fullSync(sessionId)

    return result
  }

  export async function share(sessionId: string) {
    if (disabled) return { url: "" }

    const client = await getClient()
    if (!client) return { url: "" }

    log.info("creating share", { sessionId })

    const result = await client
      .fetch(`${client.url}/api/session/${sessionId}/share`, {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      })
      .then((x) => x.json())
      .then((x) => x as { public_id: string })

    const current = (await Storage.read(["session_share", sessionId])) as Awaited<ReturnType<typeof get>>
    const url = `http://localhost:3000/s/${result.public_id}`

    await Storage.write(["session_share", sessionId], {
      ...current,
      url,
    })

    return { url }
  }

  function get(sessionId: string) {
    return Storage.read<{
      id: string
      url?: string
      ingestPath: string
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

      await client.fetch(`${client.url}${share.ingestPath}`, {
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
