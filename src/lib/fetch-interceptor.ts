'use client'
import { supabaseBrowser } from './supabase-browser'

/**
 * Global fetch interceptor — automatically attaches auth headers
 * to all internal API calls (/api/*).
 *
 * This avoids rewriting every component that uses raw fetch().
 * Headers added:
 *   - Authorization: Bearer <jwt>  (Supabase Auth users)
 *   - X-Access-Key: <key>          (legacy access key users)
 */

let installed = false

export function installFetchInterceptor() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Only intercept internal API calls
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    const isInternalApi = url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/')

    if (!isInternalApi) {
      return originalFetch(input, init)
    }

    // Build auth headers
    const headers = new Headers(init?.headers)

    // Don't override if Authorization is already set
    if (!headers.has('Authorization') && !headers.has('X-Access-Key')) {
      // 1. Try Supabase JWT
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`)
        }
      } catch { /* fall through */ }

      // 2. Fallback to legacy access key
      if (!headers.has('Authorization')) {
        const legacyKey = localStorage.getItem('reforma-access-key')
        if (legacyKey) {
          headers.set('X-Access-Key', legacyKey)
        }
      }
    }

    return originalFetch(input, { ...init, headers })
  }
}
