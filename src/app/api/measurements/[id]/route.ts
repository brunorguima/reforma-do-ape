import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendNotification } from '@/lib/notify'

// GET /api/measurements/[id] - Get a single measurement with items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('measurements')
    .select(`
      *,
      professional:professionals(id, name, phone, specialty),
      quote:quotes(id, description, amount, status),
      items:measurement_items(*)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/measurements/[id] - Update measurement (status, amounts, receipt, items)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { items, ...updateData } = body

  // Build update object
  const updateObj: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  // Allowed fields to update
  const allowedFields = [
    'status', 'total_amount', 'extras_amount', 'discounts_amount',
    'net_amount', 'receipt_url', 'notes', 'owner_notes',
    'submitted_at', 'approved_at', 'paid_at', 'quote_id'
  ]

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateObj[field] = updateData[field]
    }
  }

  // Auto-set timestamps based on status transitions
  if (updateData.status === 'enviada' && !updateData.submitted_at) {
    updateObj.submitted_at = new Date().toISOString()
  }
  if (updateData.status === 'aprovada' && !updateData.approved_at) {
    updateObj.approved_at = new Date().toISOString()
  }
  if (updateData.status === 'paga' && !updateData.paid_at) {
    updateObj.paid_at = new Date().toISOString()
  }

  // Update measurement
  const { data: measurement, error: mError } = await supabase
    .from('measurements')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single()

  if (mError) return NextResponse.json({ error: mError.message }, { status: 500 })

  // Update items if provided (replace strategy: delete old, insert new)
  if (items && Array.isArray(items)) {
    // Delete existing items
    await supabase.from('measurement_items').delete().eq('measurement_id', id)

    // Insert new items
    if (items.length > 0) {
      const itemsToInsert = items.map((item: {
        item_index?: number
        description: string
        type?: string
        completion_pct?: number
        original_amount?: number
        amount?: number
        photo_url?: string
      }) => ({
        measurement_id: id,
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

      if (iError) return NextResponse.json({ error: iError.message }, { status: 500 })
    }
  }

  // Return complete updated measurement
  const { data: complete, error: fetchError } = await supabase
    .from('measurements')
    .select(`
      *,
      professional:professionals(id, name, phone, specialty),
      quote:quotes(id, description, amount, status),
      items:measurement_items(*)
    `)
    .eq('id', id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  // Send notifications on status transitions
  const profName = complete?.professional?.name || 'Profissional'
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  if (updateData.status === 'enviada') {
    sendNotification({
      project_id: complete.project_id,
      recipient_type: 'owner',
      title: `Medição enviada para aprovação`,
      body: `${profName} enviou medição #${complete.measurement_number} — ${fmt(complete.net_amount || 0)}`,
      type: 'measurement',
      reference_id: id,
      reference_type: 'measurement',
      url: '#medicoes',
    })
  } else if (updateData.status === 'aprovada') {
    sendNotification({
      project_id: complete.project_id,
      recipient_type: 'professional',
      recipient_id: complete.professional_id,
      title: `Medição #${complete.measurement_number} aprovada`,
      body: `Sua medição foi aprovada — ${fmt(complete.net_amount || 0)}`,
      type: 'payment',
      reference_id: id,
      reference_type: 'measurement',
      url: '#medicoes',
    })
  } else if (updateData.status === 'paga') {
    sendNotification({
      project_id: complete.project_id,
      recipient_type: 'professional',
      recipient_id: complete.professional_id,
      title: `Pagamento realizado`,
      body: `Medição #${complete.measurement_number} paga — ${fmt(complete.net_amount || 0)}`,
      type: 'payment',
      reference_id: id,
      reference_type: 'measurement',
      url: '#medicoes',
    })
  }

  return NextResponse.json(complete)
}

// DELETE /api/measurements/[id] - Delete a measurement (only if rascunho)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Only allow deleting draft measurements
  const { data: existing } = await supabase
    .from('measurements')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
  }
  if (existing.status !== 'rascunho') {
    return NextResponse.json(
      { error: 'Só é possível excluir medições em rascunho' },
      { status: 400 }
    )
  }

  // Items are deleted via CASCADE
  const { error } = await supabase
    .from('measurements')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
