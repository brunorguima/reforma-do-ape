import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Admin client for privileged operations (user creation, email confirmation)
function getAdminClient() {
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key')
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

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

  const admin = getAdminClient()
  let userId: string

  // Try admin.createUser first (reliable, sets password + confirms email in one step)
  if (supabaseServiceKey) {
    // Check if user already exists by trying to create — if exists, handle gracefully
    const { data: existingList } = await admin.auth.admin.listUsers({ perPage: 50 })
    const existingUser = existingList?.users?.find(u => u.email === email)

    if (existingUser) {
      // User exists — update their password and sign them in
      await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      })
      userId = existingUser.id

      // Sign in with new password
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) {
        return NextResponse.json({ error: 'Erro ao autenticar. Tente fazer login normalmente.' }, { status: 500 })
      }

      // Add to project (if not already member)
      await admin.from('project_members').upsert({
        project_id: invite.project_id,
        user_id: userId,
        role: invite.role,
        invited_by: invite.invited_by,
      }, { onConflict: 'project_id,user_id' })

      // Mark invite as accepted
      await admin.from('invites').update({
        status: 'accepted',
        accepted_by: userId,
        accepted_at: new Date().toISOString(),
      }).eq('id', invite.id)

      // Audit
      await admin.from('audit_logs').insert({
        event_type: 'invite_accepted',
        actor_id: userId,
        actor_email: email,
        target_type: 'invite',
        target_id: invite.id,
        project_id: invite.project_id,        actor_ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        actor_user_agent: req.headers.get('user-agent') || '',
        metadata: { invite_token: token, role: invite.role, existing_user: true },
      })

      return NextResponse.json({
        success: true,
        session: signInData.session,
        message: 'Conta já existente — senha atualizada e adicionado ao projeto',
      })
    }

    // New user — create with admin API (auto-confirms email)
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || invite.invitee_name },
    })

    if (createErr) {
      console.error('Admin createUser error:', createErr)
      return NextResponse.json({ error: 'Erro ao criar conta: ' + createErr.message }, { status: 500 })
    }

    userId = newUser.user.id
  } else {    // Fallback: no service_role key — use client signUp + RPC confirm
    const { data: signupData, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || invite.invitee_name } },
    })

    if (signupErr) {
      // User might already exist
      if (signupErr.message?.includes('already been registered')) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) {
          return NextResponse.json({ error: 'Usuário já existe. Faça login normalmente.' }, { status: 409 })
        }
        userId = signInData.user.id

        await supabase.from('project_members').upsert({
          project_id: invite.project_id, user_id: userId, role: invite.role, invited_by: invite.invited_by,
        }, { onConflict: 'project_id,user_id' })

        await supabase.from('invites').update({
          status: 'accepted', accepted_by: userId, accepted_at: new Date().toISOString(),
        }).eq('id', invite.id)

        return NextResponse.json({ success: true, session: signInData.session, message: 'Conta já existente — adicionado ao projeto' })
      }
      return NextResponse.json({ error: signupErr.message || 'Erro ao criar conta' }, { status: 500 })
    }
    userId = signupData.user!.id

    // Confirm email via SECURITY DEFINER RPC
    const { error: confirmErr } = await supabase.rpc('confirm_user_email', { user_id: userId })
    if (confirmErr) console.warn('Could not auto-confirm email via RPC:', confirmErr)
  }

  // 3. Add user to project
  const dbClient = supabaseServiceKey ? admin : supabase
  const { error: memberErr } = await dbClient.from('project_members').insert({
    project_id: invite.project_id,
    user_id: userId,
    role: invite.role,
    invited_by: invite.invited_by,
  })
  if (memberErr) console.error('Error adding project member:', memberErr)

  // 4. Update profile with invite name + LGPD consent
  await dbClient.from('profiles').update({
    name: name || invite.invitee_name,
    terms_accepted_at: new Date().toISOString(),
    terms_version: '1.0',
    signup_source: 'invite',
  }).eq('id', userId)

  // 5. Audit log
  await dbClient.from('audit_logs').insert({
    event_type: 'invite_accepted',    actor_id: userId,
    actor_email: email,
    target_type: 'invite',
    target_id: invite.id,
    project_id: invite.project_id,
    actor_ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    actor_user_agent: req.headers.get('user-agent') || '',
    metadata: { invite_token: token, role: invite.role },
  })

  // 6. Mark invite as accepted
  await dbClient.from('invites').update({
    status: 'accepted',
    accepted_by: userId,
    accepted_at: new Date().toISOString(),
  }).eq('id', invite.id)

  // 7. Sign in the new user
  const { data: session, error: loginErr } = await supabase.auth.signInWithPassword({ email, password })

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