import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendNotification } from '@/lib/notify'
import { requireAuth } from '@/lib/auth-helpers'

// GET /api/measurements?project_id=xxx&professional_id=xxx
export async function GET(req: NextRequest) {
  const { user: _user, error: authError } = await requireAuth(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')
  const professional_id = searchParams.get('professional_id')

  let query = supabase
    .from('measurements')
    .select(`
      *,
      professional:professionals(id, name, phone, specialty),
      quote:quotes(id, description, amount, status),
      items:measurement_items(*)
    `)
    .order('created_at', { ascending: false })

  if (project_id) {
    query = query.eq('project_id', project_id)
  }
  if (professional_id) {
    query = query.eq('professional_id', professional_id)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/measurements - Create a new measurement with items
export async function POST(req: NextRequest) {
  const { user: _user2, error: authError2 } = await requireAuth(req)
  if (authError2) return authError2

  const body = await req.json()
  const { items, ...measurementData } = body

  // Validate required fields
  if (!measurementData.project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }
  if (!measurementData.professional_id) {
    return NextResponse.json({ error: 'professional_id is required' }, { status: 400 })
  }

  // Auto-increment measurement_number
  const { data: existing } = await supabase
    .from('measurements')
    .select('measurement_number')
    .eq('project_id', measurementData.project_id)
    .eq('professional_id', measurementData.professional_id)
    .order('measurement_number', { ascending: false })
    .limit(1)

  const nextNumber = existing && existing.length > 0
    ? existing[0].measurement_number + 1
    : 1

  // Create measurement
  const { data: measurement, error: mError } = await supabase
    .from('measurements')
    .insert({
      project_id: measurementData.project_id,
      professional_id: measurementData.professional_id,
      quote_id: measurementData.quote_id || null,
      measurement_number: nextNumber,
      status: measurementData.status || 'rascunho',
      total_amount: measurementData.total_amount || 0,
      extras_amount: measurementData.extras_amount || 0,
      discounts_amount: measurementData.discounts_amount || 0,
      net_amount: measurementData.net_amount || 0,
      notes: measurementData.notes || null,
    })
    .select()
    .single()

  if (mError) return NextResponse.json({ error: mError.message }, { status: 500 })

  // Create items if provided
  if (items && items.length > 0) {
    const itemsToInsert = items.map((item: {
      item_index?: number
      description: string
      type?: string
      completion_pct?: number
      original_amount?: number
      amount?: number
      photo_url?: string
    }) => ({
      measurement_id: measurement.id,
      item_index: item.item_index ?? null,
      description: item.description,
      type: item.type || 'original',
      completion_pct: item.completion_pct || 0,
      original_amount: item.original_amount || 0,
      amount: item.amount || 0,
      photo_url: item.photo_url || null,
    }))

    const { error: iError } = await supabase
      .from('measurement_items')
      .insert(itemsToInsert)

    if (iError) {
      // Rollback measurement if items fail
      await supabase.from('measurements').delete().eq('id', measurement.id)
      return NextResponse.json({ error: iError.message }, { status: 500 })
    }
  }

  // Return complete measurement with items
  const { data: complete, error: fetchError } = await supabase
    .from('measurements')
    .select(`
      *,
      professional:professionals(id, name, phone, specialty),
      quote:quotes(id, description, amount, status),
      items:measurement_items(*)
    `)
    .eq('id', measurement.id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  // Notify owner about new measurement
  const profName = complete?.professional?.name || 'Profissional'
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  sendNotification({
    project_id: measurementData.project_id,
    recipient_type: 'owner',
    title: `Nova medição #${nextNumber}`,
    body: `${profName} enviou medição de ${fmt(complete?.net_amount || 0)}`,
    type: 'measurement',
    reference_id: measurement.id,
    reference_type: 'measurement',
    url: '#medicoes',
  })

  return NextResponse.json(complete)
}
