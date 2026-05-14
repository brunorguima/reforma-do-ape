'use client'
import { supabaseBrowser } from './supabase-browser'

/**
 * Authenticated API client.
 * Automatically attaches:
 *   - Authorization: Bearer <jwt>  (Supabase Auth users)
 *   - X-Access-Key: <key>          (legacy access key users)
 *   - project_id query param       (multi-project)
 */

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // 1. Try Supabase JWT
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
      return headers
    }
  } catch { /* fall through */ }

  // 2. Fallback to legacy access key
  const legacyKey = typeof window !== 'undefined'
    ? localStorage.getItem('reforma-access-key')
    : null
  if (legacyKey) {
    headers['X-Access-Key'] = legacyKey
  }

  return headers
}

/** Build URL with project_id query param */
function buildUrl(path: string, projectId?: string | null): string {
  if (!projectId) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}project_id=${projectId}`
}

/** Authenticated GET */
export async function apiGet<T = unknown>(path: string, projectId?: string | null): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(buildUrl(path, projectId), { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

/** Authenticated POST */
export async function apiPost<T = unknown>(path: string, body: Record<string, unknown>, projectId?: string | null): Promise<T> {
  const headers = await getAuthHeaders()
  if (projectId) body.project_id = projectId
  const res = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

/** Authenticated PATCH */
export async function apiPatch<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(path, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

/** Authenticated DELETE */
export async function apiDelete<T = unknown>(path: string, body?: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(path, {
    method: 'DELETE',
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

/** Authenticated file upload (FormData — no Content-Type header, browser sets boundary) */
export async function apiUpload<T = unknown>(path: string, formData: FormData, projectId?: string | null): Promise<T> {
  const headers = await getAuthHeaders()
  delete headers['Content-Type'] // Let browser set multipart boundary
  const res = await fetch(buildUrl(path, projectId), {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}
