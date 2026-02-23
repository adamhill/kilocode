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
  const input: Record<string, unknown> = {
    orderBy: "created_at",
    includeChildren: false,
  }
  if (params?.cursor !== undefined) input.cursor = params.cursor
  if (params?.limit !== undefined) input.limit = params.limit
  if (params?.gitUrl !== undefined) input.gitUrl = params.gitUrl

  const url = `${KILO_API_BASE}/api/trpc/cliSessionsV2.list?input=${encodeURIComponent(JSON.stringify({ json: input }))}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...buildKiloHeaders(),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch cloud sessions: ${response.status} ${text}`)
  }

  const data = (await response.json()) as {
    result: { data: { json: CloudSessionsResponse } }
  }

  return data.result.data.json
}
