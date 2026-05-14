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
  let query = supabase.from('rooms').select('*')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query.order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { user: _user2, error: authError2 } = await requireAuth(req)
  if (authError2) return authError2

  const body = await req.json()
  const { name, icon, order_index, project_id } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({ name, icon: icon || '🏠', order_index: order_index || 99, project_id: project_id || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { user: _user3, error: authError3 } = await requireAuth(req)
  if (authError3) return authError3

  const body = await req.json()
  const { id, name, icon, order_index } = body

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (icon !== undefined) updates.icon = icon
  if (order_index !== undefined) updates.order_index = order_index

  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { user: _user4, error: authError4 } = await requireAuth(req)
  if (authError4) return authError4

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
