import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('purchase_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }
  if (!body.unit_price || isNaN(Number(body.unit_price)) || Number(body.unit_price) < 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
  }

  const quantity = Number(body.quantity) || 1
  const unitPrice = Number(body.unit_price)
  const totalPrice = body.total_price ? Number(body.total_price) : quantity * unitPrice

  const { data, error } = await supabase
    .from('materials')
    .insert({
      name: body.name.trim(),
      description: body.description || null,
      category: body.category || 'outro',
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      store: body.store || null,
      purchase_url: body.purchase_url || null,
      purchased_by: body.purchased_by || 'Bruno',
      purchase_date: body.purchase_date || new Date().toISOString().split('T')[0],
      receipt_url: body.receipt_url || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
