import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const SELECT_WITH_JOINS = `
  *,
  professional:professionals(id, name, phone, specialty),
  items:material_request_items(*)
`

// GET /api/material-requests?project_id=xxx&professional_id=xxx&status=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')
  const professional_id = searchParams.get('professional_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('material_requests')
    .select(SELECT_WITH_JOINS)
    .order('created_at', { ascending: false })

  if (project_id) query = query.eq('project_id', project_id)
  if (professional_id) query = query.eq('professional_id', professional_id)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/material-requests - Create a new material request with items
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { items, ...requestData } = body

  if (!requestData.project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }
  if (!requestData.professional_id) {
    return NextResponse.json({ error: 'professional_id is required' }, { status: 400 })
  }
  if (!requestData.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  // Auto-increment request_number per project+professional
  const { data: existing } = await supabase
    .from('material_requests')
    .select('request_number')
    .eq('project_id', requestData.project_id)
    .eq('professional_id', requestData.professional_id)
    .order('request_number', { ascending: false })
    .limit(1)

  const nextNumber = existing && existing.length > 0
    ? existing[0].request_number + 1
    : 1

  // Calculate total estimated from items
  let totalEstimated = 0
  if (items && items.length > 0) {
    totalEstimated = items.reduce((sum: number, item: { quantity?: number; estimated_price?: number }) =>
      sum + (item.quantity || 1) * (item.estimated_price || 0), 0)
  }

  const { data: request, error: rError } = await supabase
    .from('material_requests')
    .insert({
      project_id: requestData.project_id,
      professional_id: requestData.professional_id,
      request_number: nextNumber,
      status: requestData.status || 'pendente',
      urgency: requestData.urgency || 'normal',
      title: requestData.title,
      notes: requestData.notes || null,
      total_estimated: totalEstimated,
    })
    .select()
    .single()

  if (rError) return NextResponse.json({ error: rError.message }, { status: 500 })

  // Insert items
  if (items && items.length > 0) {
    const itemsToInsert = items.map((item: {
      name: string
      quantity?: number
      unit?: string
      estimated_price?: number
      photo_url?: string
      notes?: string
    }) => ({
      request_id: request.id,
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || 'un',
      estimated_price: item.estimated_price || null,
      photo_url: item.photo_url || null,
      notes: item.notes || null,
    }))

    const { error: iError } = await supabase
      .from('material_request_items')
      .insert(itemsToInsert)

    if (iError) {
      await supabase.from('material_requests').delete().eq('id', request.id)
      return NextResponse.json({ error: iError.message }, { status: 500 })
    }
  }

  // Return complete request with items
  const { data: complete, error: fetchError } = await supabase
    .from('material_requests')
    .select(SELECT_WITH_JOINS)
    .eq('id', request.id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(complete)
}
