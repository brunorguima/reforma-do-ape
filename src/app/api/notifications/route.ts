import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-helpers'

// GET /api/notifications?project_id=xxx&recipient_type=owner&unread_only=true&limit=20
export async function GET(req: NextRequest) {
  const { user: _user, error: authError } = await requireAuth(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')
  const recipient_type = searchParams.get('recipient_type')
  const recipient_id = searchParams.get('recipient_id')
  const unread_only = searchParams.get('unread_only') === 'true'
  const limit = parseInt(searchParams.get('limit') || '30')

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (project_id) query = query.eq('project_id', project_id)
  if (recipient_type) query = query.eq('recipient_type', recipient_type)
  if (recipient_id) query = query.eq('recipient_id', recipient_id)
  if (unread_only) query = query.eq('is_read', false)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/notifications - Create a notification
export async function POST(req: NextRequest) {
  const { user: _user2, error: authError2 } = await requireAuth(req)
  if (authError2) return authError2

  const body = await req.json()

  if (!body.project_id || !body.title || !body.body) {
    return NextResponse.json({ error: 'project_id, title, and body are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      project_id: body.project_id,
      recipient_type: body.recipient_type || 'owner',
      recipient_id: body.recipient_id || null,
      title: body.title,
      body: body.body,
      type: body.type || 'info',
      reference_id: body.reference_id || null,
      reference_type: body.reference_type || null,
      url: body.url || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: NextRequest) {
  const { user: _user3, error: authError3 } = await requireAuth(req)
  if (authError3) return authError3

  const body = await req.json()

  if (body.mark_all_read && body.project_id) {
    // Mark all as read for project
    const query: Record<string, unknown> = { is_read: true }
    let update = supabase.from('notifications').update(query).eq('project_id', body.project_id).eq('is_read', false)
    if (body.recipient_type) update = update.eq('recipient_type', body.recipient_type)

    const { error } = await update
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.ids && Array.isArray(body.ids)) {
    // Mark specific IDs as read
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', body.ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Provide mark_all_read+project_id or ids[]' }, { status: 400 })
}
