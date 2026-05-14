import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-helpers'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: _user, error: authError } = await requireAuth(request)
  if (authError) return authError

  const { id } = await params
  const body = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (body.content !== undefined) updateData.content = body.content
  if (body.tags !== undefined) updateData.tags = body.tags
  if (body.photos !== undefined) updateData.photos = body.photos
  if (body.likes_count !== undefined) updateData.likes_count = body.likes_count

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('feed_posts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: _user2, error: authError2 } = await requireAuth(request)
  if (authError2) return authError2

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
