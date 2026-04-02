import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const updateData = { ...body, updated_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', id)
    .select('*, professional:professionals(*), service_category:service_categories(*), room:rooms(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, updated_by, payment_method, payment_details, negotiated_amount } = await req.json()

  const updateData: Record<string, unknown> = {
    status,
    updated_by,
    updated_at: new Date().toISOString()
  }

  if (payment_method !== undefined) updateData.payment_method = payment_method
  if (payment_details !== undefined) updateData.payment_details = payment_details
  if (negotiated_amount !== undefined) updateData.negotiated_amount = negotiated_amount

  if (status === 'pago') {
    updateData.paid_date = new Date().toISOString().split('T')[0]
  }

  const { data, error } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', id)
    .select('*, professional:professionals(*), service_category:service_categories(*), room:rooms(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
