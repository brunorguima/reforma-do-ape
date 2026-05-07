import { NextRequest } from 'next/server'

/**
 * Extract project_id from request.
 * GET: from searchParams
 * POST/PATCH/DELETE: from body (caller passes it) or searchParams fallback
 */
export function getProjectId(req: NextRequest): string | null {
  return req.nextUrl.searchParams.get('project_id')
}

/**
 * Extract project_id from body (for POST/PATCH)
 */
export function getProjectIdFromBody(body: Record<string, unknown>): string | null {
  return (body.project_id as string) || null
}
