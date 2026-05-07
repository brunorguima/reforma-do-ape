import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Recalculate total_price if quantity or unit_price changed
  const updates = { ...body }
  if (updates.quantity !== undefined || updates.unit_price !== undefined) {
    const qty = Number(updates.quantity) || undefined
    const up = Number(updates.unit_price) || undefined
    if (qty !== undefined && up !== undefined) {
      updates.total_price = qty * up
    }
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
