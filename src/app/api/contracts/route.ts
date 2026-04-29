import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'

export async function GET(req: NextRequest) {
  const projectId = getProjectId(req)
  let query = supabase
    .from('contracts')
    .select('*')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query.order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  // Validate numeric fields if being updated
  if (updates.original_total !== undefined) {
    if (updates.original_total === null || isNaN(Number(updates.original_total))) {
      return NextResponse.json({ error: 'Valid original total is required' }, { status: 400 })
    }
    if (Number(updates.original_total) < 0) {
      return NextResponse.json({ error: 'Original total cannot be negative' }, { status: 400 })
    }
  }

  if (updates.negotiated_total !== undefined) {
    if (updates.negotiated_total === null || isNaN(Number(updates.negotiated_total))) {
      return NextResponse.json({ error: 'Valid negotiated total is required' }, { status: 400 })
    }
    if (Number(updates.negotiated_total) < 0) {
      return NextResponse.json({ error: 'Negotiated total cannot be negative' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('contracts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
