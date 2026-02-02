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
    // Allow caching `undefined` by tracking presence separately.
    if (existing.has && now - existing.at < ttlMs) return Promise.resolve(existing.value as T)
    if (existing.inflight && now - existing.at < ttlMs) return existing.inflight
  }

  const next: Entry<T> = existing
    ? {
        at: now,
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
