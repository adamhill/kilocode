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

    // Don't cache transient network failures; allow future calls to retry.
    if (!response) return false

    const valid = response.ok
    authCache.set(token, { valid })
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
    if (ingestDisabled) {
      throw new Error("Session ingest is disabled (KILO_DISABLE_SESSION_INGEST=1)")
    }

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

    const response = await client.fetch(`${client.url}/api/session/${encodeURIComponent(sessionId)}/share`, {
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
    if (ingestDisabled) {
      throw new Error("Session ingest is disabled (KILO_DISABLE_SESSION_INGEST=1)")
    }

    if (shareDisabled) {
      throw new Error("Unshare is disabled (KILO_DISABLE_SHARE=1)")
    }

    const client = await getClient()
    if (!client) {
      throw new Error("Unable to unshare session: no Kilo credentials found. Run `kilo auth login`.")
    }

    log.info("unsharing", { sessionId })

    const response = await client.fetch(`${client.url}/api/session/${encodeURIComponent(sessionId)}/unshare`, {
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

  // Per-session debounce/flush queue.
  //
  // The share ingest endpoint is updated very frequently (streaming message parts, diffs, etc.).
  // To avoid spamming the server, we coalesce updates and flush at most once per ~1s per session.
  //
  // `due` is the earliest time we should flush; it is also used to respect backoff when retries are
  // active. A later `due` always wins over an earlier one.
  const queue = new Map<string, { timeout: NodeJS.Timeout; due: number; data: Map<string, Data> }>()

  // Per-session retry state.
  //
  // We keep retry logic intentionally simple and local:
  // - Only retry a small set of transient errors (network, 429, 5xx, etc.)
  // - Use exponential backoff with a small max budget to prevent infinite loops/log spam
  // - Store `until` so sync() can avoid scheduling a flush before backoff expires
  const retry = new Map<string, { count: number; until: number }>()

  function retryable(status: number) {
    // Retry only statuses that are likely transient.
    if (status === 408) return true
    if (status === 409) return true
    if (status === 425) return true
    if (status === 429) return true
    if (status >= 500) return true
    return false
  }

  function backoff(count: number) {
    // Exponential backoff capped to keep the system responsive.
    const clamped = Math.min(count, 6)
    return Math.min(60_000, 1_000 * 2 ** (clamped - 1))
  }

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

  function schedule(sessionId: string, due: number, data: Map<string, Data>) {
    const existing = queue.get(sessionId)
    if (existing) {
      // Don't reschedule if an earlier flush is already planned.
      // We only move the flush later (e.g., to respect backoff).
      if (existing.due >= due) return
      clearTimeout(existing.timeout)
    }

    const wait = Math.max(0, due - Date.now())
    const timeout = setTimeout(() => flush(sessionId), wait)
    queue.set(sessionId, { timeout, due, data })
  }

  function enqueue(sessionId: string, items: Data[], mode: "overwrite" | "fill", due: number) {
    const existing = queue.get(sessionId)
    if (existing) {
      for (const item of items) {
        const k = key(item)
        // overwrite: normal event updates (newer data should win)
        // fill: retry requeue (never clobber newer updates that arrived while a flush was in-flight)
        if (mode === "fill" && existing.data.has(k)) continue
        existing.data.set(k, item)
      }
      schedule(sessionId, due, existing.data)
      return
    }

    const data = new Map<string, Data>()
    for (const item of items) {
      data.set(key(item), item)
    }

    schedule(sessionId, due, data)
  }

  function flush(sessionId: string) {
    // Flush is scheduled by sync() and sends the currently queued payload.
    //
    // Note: we delete the queue entry before the network call so that new incoming events can start
    // a fresh debounce window immediately.
    void (async () => {
      const queued = queue.get(sessionId)
      if (!queued) return

      clearTimeout(queued.timeout)
      queue.delete(sessionId)

      const items = Array.from(queued.data.values())

      try {
        const share = await get(sessionId).catch(() => undefined)
        if (!share) return

        const client = await getClient()
        if (!client) return

        const response = await client
          .fetch(`${client.url}${share.ingestPath}`, {
            method: "POST",
            body: JSON.stringify({
              data: items,
            }),
          })
          .catch(() => undefined)

        if (!response) {
          // Network failures are assumed transient; retry with backoff and a small budget.
          const count = (retry.get(sessionId)?.count ?? 0) + 1
          if (count > 6) {
            log.error("share sync failed", { sessionId, error: "retry budget exceeded" })
            retry.delete(sessionId)
            return
          }

          const delay = backoff(count)
          retry.set(sessionId, { count, until: Date.now() + delay })
          log.error("share sync failed", { sessionId, error: "network", retryInMs: delay })
          enqueue(sessionId, items, "fill", Date.now() + delay)
          return
        }

        if (response.ok) {
          retry.delete(sessionId)
          return
        }

        if (response.status === 401 || response.status === 403) {
          // Non-retryable until credentials are fixed.
          // Clearing caches prevents repeated use of a now-invalid token/client.
          authCache.clear()
          cache.value = undefined
          cache.inflight = undefined
          cache.at = 0
          log.error("share sync failed", {
            sessionId,
            status: response.status,
            statusText: response.statusText,
          })
          retry.delete(sessionId)
          return
        }

        if (!retryable(response.status)) {
          // Permanent-ish failures (eg. 404 due to bad ingestPath) should not loop forever.
          log.error("share sync failed", {
            sessionId,
            status: response.status,
            statusText: response.statusText,
          })
          retry.delete(sessionId)
          return
        }

        const current = retry.get(sessionId)
        const count = (current?.count ?? 0) + 1
        if (count > 6) {
          log.error("share sync failed", { sessionId, error: "retry budget exceeded" })
          retry.delete(sessionId)
          return
        }

        const delay = backoff(count)
        retry.set(sessionId, { count, until: Date.now() + delay })
        log.error("share sync failed", {
          sessionId,
          status: response.status,
          statusText: response.statusText,
          retryInMs: delay,
        })
        enqueue(sessionId, items, "fill", Date.now() + delay)
      } catch (error) {
        log.error("share sync failed", { sessionId, error })
      }
    })()
  }

  async function sync(sessionId: string, data: Data[]) {
    // sync() is called by event handlers and is intentionally cheap:
    // - If sharing isn't configured (no token / disabled), we skip queueing.
    // - Otherwise, merge into the pending queue entry.
    //   The next flush is scheduled ~1s after the first queued event (throttled), but never earlier
    //   than the current backoff window (if retries are active).
    const client = await getClient()
    if (!client) return

    const until = retry.get(sessionId)?.until ?? 0
    const base = queue.get(sessionId)?.due ?? Date.now() + 1000
    const due = Math.max(base, until)
    enqueue(sessionId, data, "overwrite", due)
  }

  export async function remove(sessionId: string) {
    const client = await getClient()
    if (!client) return

    log.info("removing share", { sessionId })

    const share = await get(sessionId)
    if (!share) return

    const response = await client
      .fetch(`${client.url}/api/session/${encodeURIComponent(share.id)}`, {
        method: "DELETE",
      })
      .catch(() => undefined)

    if (!response) {
      log.error("share remove failed", { sessionId, error: "network" })
      return
    }

    if (!response.ok) {
      log.error("share remove failed", {
        sessionId,
        status: response.status,
        statusText: response.statusText,
      })
      return
    }

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
