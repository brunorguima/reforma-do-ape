import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  const allowed = [
    'name', 'kind', 'closing_day', 'due_day', 'brand', 'issuer_bank', 'last4', 'holder',
    'consolidate_monthly', 'default_due_offset_days', 'is_active', 'notes',
  ]
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('payment_methods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  // Soft delete via is_active=false to preserve history
  const { error } = await supabase
    .from('payment_methods')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
