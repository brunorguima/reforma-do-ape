import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side: validate JWT from Authorization header
// Returns user info if authenticated, null otherwise
// Also supports legacy access key fallback via X-Access-Key header
export async function getAuthUser(req: NextRequest): Promise<{
  userId: string
  email: string | null
  name: string | null
  role: string
  projectIds: string[]
  authMode: 'supabase' | 'legacy'
} | null> {
  // 1. Try Supabase JWT first
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (!error && user) {
      // Get profile and project memberships
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const projectIds = memberships?.map(m => m.project_id) || []
      // Use the first membership role as default, or 'owner'
      const role = memberships?.[0]?.role || 'owner'

      return {
        userId: user.id,
        email: user.email || null,
        name: user.user_metadata?.name || null,
        role,
        projectIds,
        authMode: 'supabase',
      }
    }
  }

  // 2. Fallback to legacy access key
  const accessKey = req.headers.get('x-access-key')
  if (accessKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data } = await supabase
      .from('access_keys')
      .select('*')
      .eq('access_key', accessKey)
      .eq('is_active', true)
      .single()

    if (data) {
      return {
        userId: data.user_id,
        email: null,
        name: null,
        role: data.role,
        projectIds: data.project_ids || [],
        authMode: 'legacy',
      }
    }
  }

  // 3. No auth — return null (API routes can decide whether to allow anonymous)
  return null
}
