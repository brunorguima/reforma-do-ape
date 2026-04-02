import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('audit_log')
    .insert({
      action: body.action,
      entity_type: body.entity_type,
      entity_id: body.entity_id || null,
      entity_description: body.entity_description || null,
      old_values: body.old_values || null,
      performed_by: body.performed_by,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
