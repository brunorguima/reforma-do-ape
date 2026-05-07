import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/projects?ids=uuid1,uuid2 — list projects, optionally filtered by IDs
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids')

  let query = supabase
    .from('projects')
    .select('*')
    .eq('is_active', true)
    .order('created_at')

  if (idsParam) {
    const ids = idsParam.split(',').filter(Boolean)
    if (ids.length > 0) {
      query = query.in('id', ids)
    }
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
