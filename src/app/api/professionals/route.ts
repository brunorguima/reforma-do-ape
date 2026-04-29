import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getProjectId } from '@/lib/project'

export async function GET(req: NextRequest) {
  const projectId = getProjectId(req)
  let query = supabase
    .from('professionals')
    .select('*, quotes(*)')
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Normalize phone: remove everything except digits, then format
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return null
  // Brazilian mobile: 11 digits (2 DDD + 9 digits) or 10 (2 DDD + 8 digits)
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  // 13 digits with country code 55
  if (digits.length === 13 && digits.startsWith('55')) {
    const local = digits.slice(2)
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  return digits // fallback: just return cleaned digits
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, phone, email, specialty, notes, recommended_by, created_by } = body

  const { data, error } = await supabase
    .from('professionals')
    .insert({ name, phone: normalizePhone(phone), email, specialty, notes, recommended_by, created_by, project_id: body.project_id || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
