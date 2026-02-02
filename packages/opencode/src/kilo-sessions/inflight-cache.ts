type Entry<T> = {
  at: number
  value: T | undefined
  has: boolean
  inflight: Promise<T> | undefined
}

const store = new Map<string, Entry<unknown>>()

export function withInFlightCache<T>(key: string, ttlMs: number, cb: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const existing = store.get(key) as Entry<T> | undefined

  if (existing) {
    // If a refresh is in-flight, always await it.
    // This avoids returning a stale cached value while a newer one is being computed.
    if (existing.inflight) return existing.inflight

    // Allow caching `undefined` by tracking presence separately.
    if (existing.has && now - existing.at < ttlMs) return Promise.resolve(existing.value as T)
  }

  const next: Entry<T> = existing
    ? {
        // Keep the original timestamp until the refresh succeeds.
        // Otherwise, a failed refresh could make an old value look "fresh" and suppress retries.
        at: existing.at,
        value: existing.value,
        has: existing.has,
        inflight: undefined,
      }
    : {
        at: now,
        value: undefined,
        has: false,
        inflight: undefined,
      }

  const task = cb().then((value) => {
    next.value = value
    next.has = true
    next.at = Date.now()
    return value
  })

  next.inflight = task.finally(() => {
    next.inflight = undefined
  })

  store.set(key, next as Entry<unknown>)
  return next.inflight
}

export function clearInFlightCache(key: string) {
  store.delete(key)
}
