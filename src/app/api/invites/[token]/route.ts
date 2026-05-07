import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// GET — validate invite token and return invite data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase
    .from('invites')
    .select(`
      id, token, role, invitee_name, invitee_email, status, expires_at, created_at,
      project:projects!project_id(id, name, slug, description, image_url, location),
      inviter:profiles!invited_by(name, email, avatar_url)
    `)
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    // Mark as expired
    await supabase.from('invites').update({ status: 'expired' }).eq('id', data.id)
    return NextResponse.json({ error: 'Convite expirado' }, { status: 410 })
  }

  if (data.status !== 'pending') {
    return NextResponse.json({ error: `Convite já foi ${data.status === 'accepted' ? 'aceito' : 'cancelado'}` }, { status: 410 })
  }

  return NextResponse.json(data)
}

// POST — accept invite (create account + join project)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await req.json()
  const { password, name } = body

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 1. Get and validate invite
  const { data: invite, error: inviteErr } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteErr || !invite) {
    return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 })
  }

  // 2. Create user via Supabase Auth
  const email = invite.invitee_email
  if (!email) {
    return NextResponse.json({ error: 'Convite sem email configurado' }, { status: 400 })
  }

  const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      data: { name: name || invite.invitee_name },
    }),
  })

  const signupData = await signupRes.json()

  if (!signupRes.ok) {
    // If user already exists, try to sign in instead
    if (signupData.msg?.includes('already been registered') || signupData.error_code === 'user_already_exists') {
      // User exists — sign them in and add to project
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInErr) {
        return NextResponse.json({ error: 'Usuário já existe. Faça login normalmente.' }, { status: 409 })
      }

      const userId = signInData.user.id

      // Add to project (if not already member)
      const { error: memberErr } = await supabase
        .from('project_members')
        .upsert({
          project_id: invite.project_id,
          user_id: userId,
          role: invite.role,
          invited_by: invite.invited_by,
        }, { onConflict: 'project_id,user_id' })

      if (memberErr) {
        console.error('Error adding member:', memberErr)
      }

      // Mark invite as accepted
      await supabase.from('invites').update({
        status: 'accepted',
        accepted_by: userId,
        accepted_at: new Date().toISOString(),
      }).eq('id', invite.id)

      return NextResponse.json({
        success: true,
        session: signInData.session,
        message: 'Conta já existente — adicionado ao projeto',
      })
    }

    return NextResponse.json({ error: signupData.msg || 'Erro ao criar conta' }, { status: 500 })
  }

  const userId = signupData.id

  // 3. Confirm email immediately (skip verification)
  // We use a direct SQL approach since we trust invites
  const { error: confirmErr } = await supabase.rpc('confirm_user_email', { user_id: userId })

  // If RPC doesn't exist, we'll handle it via the admin flow
  if (confirmErr) {
    console.warn('Could not auto-confirm email via RPC:', confirmErr)
  }

  // 4. Add user to project
  const { error: memberErr } = await supabase
    .from('project_members')
    .insert({
      project_id: invite.project_id,
      user_id: userId,
      role: invite.role,
      invited_by: invite.invited_by,
    })

  if (memberErr) {
    console.error('Error adding project member:', memberErr)
  }

  // 5. Update profile with invite name (trigger may have set it already)
  await supabase
    .from('profiles')
    .update({ name: name || invite.invitee_name })
    .eq('id', userId)

  // 6. Mark invite as accepted
  await supabase.from('invites').update({
    status: 'accepted',
    accepted_by: userId,
    accepted_at: new Date().toISOString(),
  }).eq('id', invite.id)

  // 7. Sign in the new user
  const { data: session, error: loginErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (loginErr) {
    return NextResponse.json({
      success: true,
      message: 'Conta criada! Faça login com seu email e senha.',
      needsLogin: true,
    })
  }

  return NextResponse.json({
    success: true,
    session: session.session,
    message: 'Conta criada com sucesso!',
  })
}
