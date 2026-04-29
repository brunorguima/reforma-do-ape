import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'

export async function GET(req: NextRequest) {
  const projectId = getProjectId(req)
  let query = supabase
    .from('quotes')
    .select('*, professional:professionals(*), service_category:service_categories(*), room:rooms(*)')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    professional_id, service_category_id, room_id,
    description, amount, status, notes, scheduled_date, created_by
  } = body

  // Validate required fields
  if (!professional_id) {
    return NextResponse.json({ error: 'Professional is required' }, { status: 400 })
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
  }
  if (Number(amount) < 0) {
    return NextResponse.json({ error: 'Amount cannot be negative' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      professional_id, service_category_id, room_id,
      description, amount: Number(amount), status: status || 'recebido',
      notes, scheduled_date, created_by,
      project_id: body.project_id || null
    })
    .select('*, professional:professionals(*), service_category:service_categories(*), room:rooms(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
