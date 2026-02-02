type Entry<T> = {
  at: number
  value: T | undefined
  inflight: Promise<T> | undefined
}

const store = new Map<string, Entry<unknown>>()

export function withInFlightCache<T>(key: string, ttlMs: number, cb: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const existing = store.get(key) as Entry<T> | undefined

  if (existing) {
    if (existing.value !== undefined && now - existing.at < ttlMs) return Promise.resolve(existing.value)
    if (existing.inflight && now - existing.at < ttlMs) return existing.inflight
  }

  const next: Entry<T> = existing
    ? {
        at: now,
        value: existing.value,
        inflight: undefined,
      }
    : {
        at: now,
        value: undefined,
        inflight: undefined,
      }

  const task = cb().then((value) => {
    next.value = value
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
