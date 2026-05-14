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
    .from('audit_log')
    .select('*')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
    .order('performed_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { user: _user2, error: authError2 } = await requireAuth(req)
  if (authError2) return authError2

  const body = await req.json()
  const { data, error } = await supabase
    .from('audit_log')
    .insert({
      action: body.action,
      entity_type: body.entity_type,
      entity_id: body.entity_id || null,
      entity_description: body.entity_description || null,
      old_values: body.old_values || null,
      performed_by: body.performed_by,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
