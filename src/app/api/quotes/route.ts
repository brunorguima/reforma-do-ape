import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, professional:professionals(*), service_category:service_categories(*), room:rooms(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    professional_id, service_category_id, room_id,
    description, amount, status, notes, scheduled_date, created_by
  } = body

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      professional_id, service_category_id, room_id,
      description, amount: amount || 0, status: status || 'recebido',
      notes, scheduled_date, created_by
    })
    .select('*, professional:professionals(*), service_category:service_categories(*), room:rooms(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
