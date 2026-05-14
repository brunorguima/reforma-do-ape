import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth-helpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// POST — log an audit event
export async function POST(req: NextRequest) {
  const { user: _user, error: authError } = await requireAuth(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { event_type, actor_id, actor_email, target_type, target_id, project_id, metadata } = body

    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Extract IP and User-Agent
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = req.headers.get('user-agent') || ''

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        event_type,
        actor_id: actor_id || null,
        actor_email: actor_email || null,
        actor_ip: ip,
        actor_user_agent: userAgent,
        target_type: target_type || null,
        target_id: target_id || null,
        project_id: project_id || null,
        metadata: metadata || {},
      })

    if (error) {
      console.error('Audit log error:', error)
      // Never fail the main operation because of audit
      return NextResponse.json({ logged: false, error: error.message })
    }

    return NextResponse.json({ logged: true })
  } catch (err) {
    console.error('Audit API error:', err)
    return NextResponse.json({ logged: false })
  }
}

// GET — query audit logs (owners only)
export async function GET(req: NextRequest) {
  const { user: _user2, error: authError2 } = await requireAuth(req)
  if (authError2) return authError2

  const projectId = req.nextUrl.searchParams.get('project_id')
  const eventType = req.nextUrl.searchParams.get('event_type')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')

  if (!projectId) {
    return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
