import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'

export async function GET(req: NextRequest) {
  const projectId = getProjectId(req)
  let query = supabase
    .from('payments')
    .select('*')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query.order('due_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Validate required fields
  if (!body.professional?.trim()) {
    return NextResponse.json({ error: 'Professional name is required' }, { status: 400 })
  }
  if (body.amount === null || body.amount === undefined || isNaN(Number(body.amount))) {
    return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
  }
  if (!body.due_date?.trim()) {
    return NextResponse.json({ error: 'Due date is required' }, { status: 400 })
  }

  const amount = Number(body.amount)
  if (amount < 0) {
    return NextResponse.json({ error: 'Amount cannot be negative' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      professional: body.professional,
      installment_number: body.installment_number || 1,
      amount,
      due_date: body.due_date,
      status: body.status || 'pendente',
      notes: body.notes || null,
      quote_id: body.quote_id || null,
      contract_id: body.contract_id || null,
      source: body.source || 'manual',
      project_id: body.project_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id, ...body } = await req.json()

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  // Validate amount if being updated
  if (body.amount !== undefined) {
    if (body.amount === null || isNaN(Number(body.amount))) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }
    if (Number(body.amount) < 0) {
      return NextResponse.json({ error: 'Amount cannot be negative' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
