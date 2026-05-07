import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const SELECT_WITH_JOINS = `
  *,
  professional:professionals(id, name, phone, specialty),
  items:material_request_items(*)
`

// GET /api/material-requests/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('material_requests')
    .select(SELECT_WITH_JOINS)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/material-requests/[id] - Update request (status, notes, items)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { items, ...updateData } = body

  const updateObj: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  const allowedFields = [
    'status', 'urgency', 'title', 'notes', 'owner_notes',
    'total_estimated', 'approved_at', 'purchased_at'
  ]

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateObj[field] = updateData[field]
    }
  }

  // Auto-set timestamps based on status
  if (updateData.status === 'aprovado' && !updateData.approved_at) {
    updateObj.approved_at = new Date().toISOString()
  }
  if (updateData.status === 'comprado' && !updateData.purchased_at) {
    updateObj.purchased_at = new Date().toISOString()
  }

  const { error: rError } = await supabase
    .from('material_requests')
    .update(updateObj)
    .eq('id', id)

  if (rError) return NextResponse.json({ error: rError.message }, { status: 500 })

  // Replace items if provided
  if (items && Array.isArray(items)) {
    await supabase.from('material_request_items').delete().eq('request_id', id)

    if (items.length > 0) {
      // Recalculate total
      const totalEstimated = items.reduce((sum: number, item: { quantity?: number; estimated_price?: number }) =>
        sum + (item.quantity || 1) * (item.estimated_price || 0), 0)

      await supabase.from('material_requests').update({ total_estimated: totalEstimated }).eq('id', id)

      const itemsToInsert = items.map((item: {
        name: string
        quantity?: number
        unit?: string
        estimated_price?: number
        actual_price?: number
        photo_url?: string
        notes?: string
      }) => ({
        request_id: id,
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'un',
        estimated_price: item.estimated_price || null,
        actual_price: item.actual_price || null,
        photo_url: item.photo_url || null,
        notes: item.notes || null,
      }))

      const { error: iError } = await supabase
        .from('material_request_items')
        .insert(itemsToInsert)

      if (iError) return NextResponse.json({ error: iError.message }, { status: 500 })
    }
  }

  // Return updated request
  const { data: complete, error: fetchError } = await supabase
    .from('material_requests')
    .select(SELECT_WITH_JOINS)
    .eq('id', id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(complete)
}

// DELETE /api/material-requests/[id] - Only pendente requests
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: existing } = await supabase
    .from('material_requests')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.status !== 'pendente') {
    return NextResponse.json(
      { error: 'Só é possível excluir pedidos pendentes' },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('material_requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
