import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'
import { requireAuth, hasProjectAccess } from '@/lib/auth-helpers'

export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req)
  if (authError) return authError

  const projectId = getProjectId(req)
  if (projectId && !hasProjectAccess(user, projectId)) {
    return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
  }
  let query = supabase
    .from('categories')
    .select('*')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query.order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
