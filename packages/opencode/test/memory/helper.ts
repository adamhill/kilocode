import path from "path"

const MB = 1024 * 1024

export const PROJECT_ROOT = path.join(__dirname, "../..")

/**
 * Check if a process is alive by sending signal 0.
 * Returns false if the process has already exited.
 */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ESRCH") return false
    if (code === "EPERM") return true
    throw err
  }
}

/**
 * Send a signal to a process, ignoring errors (e.g. process already exited).
 */
function trySendSignal(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(pid, signal)
  } catch (err) {
    // Expected when process already exited before signal delivery
    console.log(`  signal ${signal} to PID ${pid} failed (likely already exited): ${err}`)
  }
}

/**
 * Force GC multiple times and return stable heap usage in MB.
 * Multiple passes + sleeps allow GC to finalize weak refs and sweep.
 */
export async function stableHeapMB(): Promise<number> {
  for (let i = 0; i < 3; i++) {
    Bun.gc(true)
    await Bun.sleep(50)
  }
  return process.memoryUsage().heapUsed / MB
}

/**
 * Measure heap growth over repeated iterations of a function.
 * Includes a warm-up iteration (excluded from measurement) to fill caches/JIT.
 */
export async function measureGrowth(
  iterations: number,
  fn: (i: number) => Promise<void>,
): Promise<{ baseline: number; after: number; growth: number }> {
  // Warm-up
  await fn(-1)

  const baseline = await stableHeapMB()

  for (let i = 0; i < iterations; i++) {
    await fn(i)
  }

  const after = await stableHeapMB()
  const growth = after - baseline

  console.log(`  Baseline: ${baseline.toFixed(2)} MB`)
  console.log(`  After ${iterations} iterations: ${after.toFixed(2)} MB`)
  console.log(`  Growth: ${growth.toFixed(2)} MB`)

  return { baseline, after, growth }
}

/**
 * Recursively find all descendant PIDs of a root PID using pgrep -P.
 * Works on macOS and Linux.
 */
export async function snapshotDescendants(rootPid: number): Promise<Set<number>> {
  const descendants = new Set<number>()
  const queue = [rootPid]

  while (queue.length > 0) {
    const pid = queue.shift()!
    const proc = Bun.spawn(["pgrep", "-P", String(pid)], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const text = await new Response(proc.stdout).text()
    await proc.exited

    for (const line of text.trim().split("\n")) {
      const child = parseInt(line, 10)
      if (!isNaN(child) && !descendants.has(child)) {
        descendants.add(child)
        queue.push(child)
      }
    }
  }

  return descendants
}

/**
 * Compare before/after process snapshots and assert no orphans remain.
 * Logs orphan details via `ps` and force-kills them before throwing.
 */
export async function assertNoOrphans(before: Set<number>, after: Set<number>): Promise<void> {
  const orphans = new Set<number>()
  for (const pid of after) {
    if (!before.has(pid) && isAlive(pid)) {
      orphans.add(pid)
    }
  }

  if (orphans.size === 0) return

  // Log details about orphan processes
  const details: string[] = []
  for (const pid of orphans) {
    try {
      const proc = Bun.spawn(["ps", "-p", String(pid), "-o", "pid,ppid,command"], {
        stdout: "pipe",
        stderr: "pipe",
      })
      const text = await new Response(proc.stdout).text()
      await proc.exited
      const lines = text.trim().split("\n")
      if (lines.length > 1) {
        details.push(lines[1].trim())
      }
    } catch {
      details.push(`PID ${pid} (could not get details)`)
    }
  }

  // Force-kill orphans to prevent cascading test failures
  for (const pid of orphans) {
    trySendSignal(pid, "SIGKILL")
  }

  throw new Error(`Found ${orphans.size} orphan process(es):\n${details.map((d) => `  ${d}`).join("\n")}`)
}

/**
 * Wait for all given PIDs to exit, polling with kill -0.
 * Returns true if all exited within timeout, false otherwise.
 */
export async function waitForExit(pids: number[], timeoutMs = 3000): Promise<boolean> {
  const start = Date.now()
  const remaining = new Set(pids)

  while (remaining.size > 0 && Date.now() - start < timeoutMs) {
    for (const pid of remaining) {
      if (!isAlive(pid)) {
        remaining.delete(pid)
      }
    }
    if (remaining.size > 0) {
      await Bun.sleep(100)
    }
  }

  return remaining.size === 0
}

/**
 * Force-kill a set of PIDs (best-effort, ignores errors).
 */
export function forceKillAll(pids: Set<number> | number[]): void {
  for (const pid of pids) {
    trySendSignal(pid, "SIGKILL")
  }
}
