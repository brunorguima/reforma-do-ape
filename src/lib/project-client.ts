/**
 * Client-side helpers for multi-project support.
 */

/** Build a URL with project_id query param */
export function apiUrl(path: string, projectId?: string | null): string {
  if (!projectId) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}project_id=${projectId}`
}

/** Merge project_id into a JSON body object */
export function withProjectId<T extends Record<string, unknown>>(
  body: T,
  projectId?: string | null
): T & { project_id?: string } {
  if (!projectId) return body
  return { ...body, project_id: projectId }
}
