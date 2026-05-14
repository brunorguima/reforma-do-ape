import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth, hasProjectAccess } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  if (!projectId) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }
  if (!hasProjectAccess(user, projectId)) {
    return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const { user: _user2, error: authError2 } = await requireAuth(request)
  if (authError2) return authError2

  const body = await request.json()
  const { project_id, author_name, author_role, content, post_type, tags, photos } = body

  if (!project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('feed_posts')
    .insert({
      project_id,
      author_name,
      author_role,
      content,
      post_type: post_type || 'update',
      tags: tags || [],
      photos: photos || [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
