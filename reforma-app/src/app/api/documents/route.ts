import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'

export async function GET(req: NextRequest) {
  const projectId = getProjectId(req)
  let query = supabase
    .from('documents')
    .select('*')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Validate required fields
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (!body.type) {
    return NextResponse.json({ error: 'Document type is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: body.title,
      description: body.description || null,
      doc_type: body.type,
      url: body.url || null,
      created_by: body.created_by,
      project_id: body.project_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
