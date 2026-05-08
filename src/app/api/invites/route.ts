import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function generateToken(): string {
  return crypto.randomBytes(16).toString('hex').slice(0, 24)
}

// POST — create an invite
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, role, invitee_name, invitee_email, invited_by } = body

    if (!project_id || !invitee_name || !invited_by) {
      return NextResponse.json({ error: 'project_id, invitee_name e invited_by são obrigatórios' }, { status: 400 })
    }

    const token = generateToken()
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Check if there's already a pending invite for this email+project
    if (invitee_email) {
      const { data: existing } = await supabase
        .from('invites')
        .select('id, token')
        .eq('project_id', project_id)
        .eq('invitee_email', invitee_email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single()

      if (existing) {
        // Return existing invite instead of creating duplicate
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://reforma-app.vercel.app'
        return NextResponse.json({
          invite: existing,
          link: `${baseUrl}/convite/${existing.token}`,
          message: 'Convite já existente para este email'
        })
      }
    }

    const { data, error } = await supabase
      .from('invites')
      .insert({
        token,
        project_id,
        role: role || 'professional',
        invitee_name,
        invitee_email: invitee_email || null,
        invited_by,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invite:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://reforma-app.vercel.app'

    // Audit log
    await supabase.from('audit_logs').insert({
      event_type: 'invite_created',
      actor_id: invited_by,
      target_type: 'invite',
      target_id: data.id,
      project_id,
      actor_ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
      actor_user_agent: req.headers.get('user-agent') || '',
      metadata: { invitee_name, invitee_email, role: role || 'professional', token },
    })

    return NextResponse.json({
      invite: data,
      link: `${baseUrl}/convite/${token}`,
    })
  } catch (err) {
    console.error('POST /api/invites error:', err)
    return NextResponse.json({ error: 'Erro ao criar convite' }, { status: 500 })
  }
}

// GET — list invites for a project
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('project_id')

  if (!projectId) {
    return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase
    .from('invites')
    .select(`
      *,
      inviter:profiles!invited_by(name, email),
      project:projects!project_id(name)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
