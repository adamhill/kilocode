// kilocode_change pretty much completely refactored - @iscekic for conflicts
import { Bus } from "@/bus"
import { ulid } from "ulid"
import { Provider } from "@/provider/provider"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Storage } from "@/storage/storage"
import { Log } from "@/util/log"
import { Auth } from "@/auth"
import type * as SDK from "@kilocode/sdk/v2"

/**
 * Even though this is called "share-next", this is where we handle session stuff.
 */
export namespace ShareNext {
  const log = Log.create({ service: "share-next" })

  const authCache = new Map<string, { valid: boolean }>()

  async function authValid(token: string) {
    const cached = authCache.get(token)
    if (cached) return cached.valid

    const response = await fetch("https://app.kilo.ai/api/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => undefined)

    const valid = response ? response.ok : false
    authCache.set(token, { valid: !!response?.ok })
    return valid
  }

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

  const cache = {
    at: 0,
    value: undefined as Client | undefined,
    inflight: undefined as Promise<Client | undefined> | undefined,
  }

  async function getClient(): Promise<Client | undefined> {
    const now = Date.now()
    if (cache.value && now - cache.at < 5_000) return cache.value
    if (cache.inflight && now - cache.at < 5_000) return cache.inflight

    cache.at = now
    cache.inflight = (async () => {
      const token = await kilocodeToken()
      if (!token) return undefined

      const valid = await authValid(token)
      if (!valid) return undefined

      const base = "https://ingest.kilosessions.ai"
      const baseHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
    })()

    try {
      cache.value = await cache.inflight
      return cache.value
    } finally {
      cache.inflight = undefined
    }
  }

  const shareDisabled = process.env["KILO_DISABLE_SHARE"] === "true" || process.env["KILO_DISABLE_SHARE"] === "1"
  const ingestDisabled =
    process.env["KILO_DISABLE_SESSION_INGEST"] === "true" || process.env["KILO_DISABLE_SESSION_INGEST"] === "1"

  export async function init() {
    if (ingestDisabled) return

    Bus.subscribe(Session.Event.Created, (evt) => {
      const sessionId = evt.properties.info.id
      void create(sessionId).catch((error) => log.error("share init create failed", { sessionId, error }))
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

    const response = await client.fetch(`${client.url}/api/session`, {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    })

    if (!response.ok) {
      throw new Error(`Unable to create session ${sessionId}: ${response.status} ${response.statusText}`)
    }

    const result = (await response.json()) as { id: string; ingestPath: string }

    await Storage.write(["session_share", sessionId], result)

    void fullSync(sessionId).catch((error) => log.error("share full sync failed", { sessionId, error }))

    return result
  }

  export async function share(sessionId: string) {
    if (shareDisabled) {
      throw new Error("Sharing is disabled (KILO_DISABLE_SHARE=1)")
    }

    const client = await getClient()
    if (!client) {
      throw new Error("Unable to share session: no Kilo credentials found. Run `kilo auth login`.")
    }

    const current = (await get(sessionId).catch(() => undefined)) ?? (await create(sessionId))
    if (!current.id || !current.ingestPath) {
      throw new Error(`Unable to share session ${sessionId}: failed to initialize session sync.`)
    }

    log.info("sharing", { sessionId })

    const response = await client.fetch(`${client.url}/api/session/${sessionId}/share`, {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    })

    if (!response.ok) {
      throw new Error(`Unable to share session ${sessionId}: ${response.status} ${response.statusText}`)
    }

    const result = (await response.json()) as { public_id?: string }
    if (!result.public_id) {
      throw new Error(`Unable to share session ${sessionId}: server did not return a public id`)
    }

    const url = `https://app.kilo.ai/s/${result.public_id}`

    await Storage.write(["session_share", sessionId], {
      ...current,
      url,
    })

    return { url }
  }

  export async function unshare(sessionId: string) {
    if (shareDisabled) {
      throw new Error("Unshare is disabled (KILO_DISABLE_SHARE=1)")
    }

    const client = await getClient()
    if (!client) {
      throw new Error("Unable to unshare session: no Kilo credentials found. Run `kilo auth login`.")
    }

    log.info("unsharing", { sessionId })

    const response = await client.fetch(`${client.url}/api/session/${sessionId}/unshare`, {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    })

    if (!response.ok) {
      throw new Error(`Unable to unshare session ${sessionId}: ${response.status} ${response.statusText}`)
    }

    const current = await get(sessionId).catch(() => undefined)
    if (!current) return

    const next = {
      ...current,
    }
    delete next.url

    await Storage.write(["session_share", sessionId], next)
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

  // Per-session debounce queue.
  //
  // Events fire frequently (message/part updates during streaming), so we coalesce many updates
  // into at most one POST per ~1s per session.
  //
  // - Outer Map key: local session id
  // - Inner Map key: stable entity key (message:<id>, part:<id>, etc.) so newer updates overwrite older
  //   within the same debounce window.
  const queue = new Map<string, { timeout: NodeJS.Timeout; data: Map<string, Data> }>()

  function id(value: unknown) {
    if (!value) return undefined
    if (typeof value !== "object") return undefined
    if (!("id" in value)) return undefined
    const result = (value as { id?: unknown }).id
    if (typeof result === "string" && result.length > 0) return result
    return undefined
  }

  function key(item: Data) {
    // Stable keys are important so updates for the same entity collapse to a single queued item.
    // If we can't derive a stable key, we fall back to a random key (ulid) so the item is still sent.
    if (item.type === "session") return "session"
    if (item.type === "session_diff") return "session_diff"

    if (item.type === "message") {
      const value = id(item.data)
      return value ? `message:${value}` : ulid()
    }

    if (item.type === "part") {
      const value = id(item.data)
      return value ? `part:${value}` : ulid()
    }

    const models = item.data
      .map((m) => `${m.providerID}:${m.id}`)
      .sort()
      .join(",")
    return models.length > 0 ? `model:${models}` : ulid()
  }

  function flush(sessionId: string, timeout: NodeJS.Timeout) {
    // Flush is scheduled by sync() and sends the currently queued payload.
    //
    // Note: we delete the queue entry before the network call so that new incoming events can start
    // a fresh debounce window immediately.
    void (async () => {
      const queued = queue.get(sessionId)
      if (!queued) return

      clearTimeout(timeout)
      queue.delete(sessionId)

      try {
        const share = await get(sessionId).catch(() => undefined)
        if (!share) return

        const client = await getClient()
        if (!client) return

        const response = await client.fetch(`${client.url}${share.ingestPath}`, {
          method: "POST",
          body: JSON.stringify({
            data: Array.from(queued.data.values()),
          }),
        })

        if (!response.ok) {
          throw new Error(`sync failed: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        log.error("share sync failed", { sessionId, error })
        // Requeue without overwriting newer updates.
        // If a new debounce window is already queued (due to fresh events while this flush was in-flight),
        // only fill missing keys so we don't clobber newer data with stale data from the failed batch.
        requeue(sessionId, Array.from(queued.data.values()))
      }
    })()
  }

  function requeue(sessionId: string, items: Data[]) {
    const existing = queue.get(sessionId)
    if (existing) {
      for (const item of items) {
        const k = key(item)
        if (existing.data.has(k)) continue
        existing.data.set(k, item)
      }
      return
    }

    const dataMap = new Map<string, Data>()
    for (const item of items) {
      dataMap.set(key(item), item)
    }

    const timeout = setTimeout(() => flush(sessionId, timeout), 1000)
    queue.set(sessionId, { timeout, data: dataMap })
  }

  async function sync(sessionId: string, data: Data[]) {
    // sync() is called by event handlers and is intentionally cheap:
    // - If sharing isn't configured (no token / disabled), we skip queueing.
    // - Otherwise, merge into the pending queue entry (if present) or start a new 1s timer.
    const existing = queue.get(sessionId)
    if (existing) {
      for (const item of data) {
        existing.data.set(key(item), item)
      }
      return
    }

    const client = await getClient()
    if (!client) return

    const dataMap = new Map<string, Data>()
    for (const item of data) {
      dataMap.set(key(item), item)
    }

    const timeout = setTimeout(() => flush(sessionId, timeout), 1000)
    queue.set(sessionId, { timeout, data: dataMap })
  }

  export async function remove(sessionId: string) {
    const client = await getClient()
    if (!client) return

    log.info("removing share", { sessionId })

    const share = await get(sessionId)
    if (!share) return

    await client.fetch(`${client.url}/api/session/${share.id}`, {
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
