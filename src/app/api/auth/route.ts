import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/auth - Validate an access key and return user info
export async function POST(req: NextRequest) {
  const { access_key } = await req.json()

  if (!access_key) {
    return NextResponse.json({ error: 'Access key required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('access_keys')
    .select('*')
    .eq('access_key', access_key)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid or inactive access key' }, { status: 401 })
  }

  // Update last_used_at
  await supabase
    .from('access_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return NextResponse.json({
    user_id: data.user_id,
    role: data.role,
    access_key_id: data.id,
  })
}

// GET /api/auth/keys - List all access keys (for admin/owner only in future)
export async function GET() {
  const { data, error } = await supabase
    .from('access_keys')
    .select('user_id, role, is_active, last_used_at, created_at')
    .order('user_id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
