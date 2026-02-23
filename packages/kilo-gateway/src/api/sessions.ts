import { KILO_API_BASE } from "./constants.js"
import { buildKiloHeaders } from "../headers.js"

export interface CloudSession {
  session_id: string
  title: string | null
  cloud_agent_session_id: string | null
  created_at: string
  updated_at: string
  version: number
}

export interface CloudSessionsResponse {
  cliSessions: CloudSession[]
  nextCursor: string | null
}

export async function fetchCloudSessions(
  token: string,
  params?: {
    cursor?: string
    limit?: number
    gitUrl?: string
  },
): Promise<CloudSessionsResponse> {
  const input: Record<string, unknown> = {}
  if (params?.cursor !== undefined) input.cursor = params.cursor
  if (params?.limit !== undefined) input.limit = params.limit
  if (params?.gitUrl !== undefined) input.gitUrl = params.gitUrl

  const query = new URLSearchParams({
    batch: "1",
    input: JSON.stringify({ "0": input }),
  })

  const response = await fetch(`${KILO_API_BASE}/api/trpc/cliSessionsV2.list?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...buildKiloHeaders(),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch cloud sessions: ${response.status} ${text}`)
  }

  const json = (await response.json()) as unknown[]
  const data = (json[0] as any)?.result?.data
  const result = data?.json ?? data

  if (!result) return { cliSessions: [], nextCursor: null }

  const sessions = (result.cliSessions ?? []).map((s: any) => ({
    session_id: s.session_id,
    title: s.title ?? null,
    cloud_agent_session_id: s.cloud_agent_session_id ?? null,
    created_at: typeof s.created_at === "string" ? s.created_at : new Date(s.created_at).toISOString(),
    updated_at: typeof s.updated_at === "string" ? s.updated_at : new Date(s.updated_at).toISOString(),
    version: s.version ?? 0,
  }))

  return { cliSessions: sessions, nextCursor: result.nextCursor ?? null }
}
