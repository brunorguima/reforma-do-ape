import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Default permissions per role
export const ROLE_DEFAULTS: Record<string, Record<string, Record<string, boolean>>> = {
  owner: {
    dashboard: { view: true },
    orcamentos: { view: true, edit: true, create: true, delete: true },
    financeiro: { view: true, edit: true, create: true, delete: true },
    mobilia: { view: true, edit: true, create: true, delete: true },
    medicoes: { view: true, edit: true, approve: true, create: true },
    materiais: { view: true, edit: true, create: true, delete: true },
    documentos: { view: true, edit: true, upload: true, delete: true },
    feed: { view: true, post: true, delete: true },
    equipe: { view: true, invite: true, manage_permissions: true, remove: true },
    configuracoes: { view: true, edit: true },
  },
  admin: {
    dashboard: { view: true },
    orcamentos: { view: true, edit: true, create: true, delete: true },
    financeiro: { view: true, edit: true, create: true, delete: false },    mobilia: { view: true, edit: true, create: true, delete: true },
    medicoes: { view: true, edit: true, approve: true, create: true },
    materiais: { view: true, edit: true, create: true, delete: true },
    documentos: { view: true, edit: true, upload: true, delete: true },
    feed: { view: true, post: true, delete: true },
    equipe: { view: true, invite: true, manage_permissions: false, remove: false },
    configuracoes: { view: true, edit: false },
  },
  designer: {
    dashboard: { view: true },
    orcamentos: { view: true, edit: false, create: false, delete: false },
    financeiro: { view: false, edit: false, create: false, delete: false },
    mobilia: { view: true, edit: true, create: true, delete: false },
    medicoes: { view: true, edit: false, approve: false, create: false },
    materiais: { view: true, edit: false, create: false, delete: false },
    documentos: { view: true, edit: true, upload: true, delete: false },
    feed: { view: true, post: true, delete: false },
    equipe: { view: true, invite: false, manage_permissions: false, remove: false },
    configuracoes: { view: false, edit: false },
  },
  professional: {
    dashboard: { view: true },
    orcamentos: { view: false, edit: false, create: false, delete: false },
    financeiro: { view: false, edit: false, create: false, delete: false },
    mobilia: { view: false, edit: false, create: false, delete: false },
    medicoes: { view: true, edit: true, approve: false, create: true },
    materiais: { view: true, edit: false, create: true, delete: false },
    documentos: { view: true, edit: false, upload: true, delete: false },    feed: { view: true, post: true, delete: false },
    equipe: { view: false, invite: false, manage_permissions: false, remove: false },
    configuracoes: { view: false, edit: false },
  },
  viewer: {
    dashboard: { view: true },
    orcamentos: { view: true, edit: false, create: false, delete: false },
    financeiro: { view: true, edit: false, create: false, delete: false },
    mobilia: { view: true, edit: false, create: false, delete: false },
    medicoes: { view: true, edit: false, approve: false, create: false },
    materiais: { view: true, edit: false, create: false, delete: false },
    documentos: { view: true, edit: false, upload: false, delete: false },
    feed: { view: true, post: false, delete: false },
    equipe: { view: false, invite: false, manage_permissions: false, remove: false },
    configuracoes: { view: false, edit: false },
  },
}

// GET — list members + permissions for a project
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) {
    return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      id, user_id, role, permissions, custom_permissions, is_active, joined_at,
      profile:profiles!user_id(id, name, email, avatar_url, color)
    `)    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('role', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also return role defaults for the UI
  return NextResponse.json({
    members: data || [],
    role_defaults: ROLE_DEFAULTS,
    available_roles: ['owner', 'admin', 'designer', 'professional', 'viewer'],
  })
}

// PATCH — update member role or permissions
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { member_id, project_id, role, permissions, custom_permissions } = body

    if (!member_id || !project_id) {
      return NextResponse.json({ error: 'member_id e project_id são obrigatórios' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const updates: Record<string, unknown> = {}

    if (role !== undefined) {
      updates.role = role
      if (!custom_permissions) {
        updates.permissions = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.viewer
        updates.custom_permissions = false
      }
    }
    if (permissions !== undefined) {
      updates.permissions = permissions
      updates.custom_permissions = true
    }

    if (custom_permissions === false) {
      const currentRole = role || 'viewer'
      updates.permissions = ROLE_DEFAULTS[currentRole] || ROLE_DEFAULTS.viewer
      updates.custom_permissions = false
    }

    const { data, error } = await supabase
      .from('project_members')
      .update(updates)
      .eq('id', member_id)
      .eq('project_id', project_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      event_type: 'permissions_updated',
      actor_id: 'system',
      target_type: 'project_member',
      target_id: member_id,
      project_id,
      metadata: { updates },
    })

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/members error:', err)
    return NextResponse.json({ error: 'Erro ao atualizar membro' }, { status: 500 })
  }
}
// DELETE — deactivate a member (soft delete)
export async function DELETE(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get('member_id')
  const projectId = req.nextUrl.searchParams.get('project_id')

  if (!memberId || !projectId) {
    return NextResponse.json({ error: 'member_id e project_id são obrigatórios' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Don't allow removing the last owner
  const { data: owners } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('role', 'owner')
    .eq('is_active', true)

  if (owners && owners.length <= 1) {
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('id', memberId)
      .single()

    if (member?.role === 'owner') {
      return NextResponse.json({ error: 'Não é possível remover o último proprietário' }, { status: 400 })
    }
  }

  const { error } = await supabase
    .from('project_members')
    .update({ is_active: false })
    .eq('id', memberId)
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    event_type: 'member_removed',
    actor_id: 'system',
    target_type: 'project_member',
    target_id: memberId,
    project_id: projectId,
  })

  return NextResponse.json({ success: true })
}
