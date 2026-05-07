import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const projectId = getProjectId(req)
  let query = supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
    .order('kind', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }
  if (!body.kind) {
    return NextResponse.json({ error: 'Tipo é obrigatório' }, { status: 400 })
  }
  if (!body.created_by) {
    return NextResponse.json({ error: 'created_by obrigatório' }, { status: 400 })
  }

  const payload = {
    name: body.name.trim(),
    kind: body.kind,
    closing_day: body.closing_day ?? null,
    due_day: body.due_day ?? null,
    brand: body.brand || null,
    issuer_bank: body.issuer_bank || null,
    last4: body.last4 || null,
    holder: body.holder || null,
    consolidate_monthly: !!body.consolidate_monthly,
    default_due_offset_days: body.default_due_offset_days ?? null,
    is_active: body.is_active !== false,
    notes: body.notes || null,
    created_by: body.created_by,
    project_id: body.project_id || null,
  }

  const { data, error } = await supabase
    .from('payment_methods')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
