'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Users, Shield, UserPlus, ChevronDown, ChevronRight, Check, X, RotateCcw, Copy, Crown, Eye, Pencil, Trash2, Plus, Link2, Mail, Loader2 } from 'lucide-react'

interface Profile {
  id: string
  name: string
  email: string
  avatar_url: string | null
  color: string
}

interface Member {
  id: string
  user_id: string
  role: string
  permissions: Record<string, Record<string, boolean>>
  custom_permissions: boolean
  is_active: boolean
  joined_at: string
  profile: Profile
}

interface TeamPanelProps {
  projectId: string | null
  currentUserRole?: string
}
// Module display config
const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', actions: ['view'] },
  { key: 'orcamentos', label: 'Orçamentos', icon: '🔧', actions: ['view', 'edit', 'create', 'delete'] },
  { key: 'financeiro', label: 'Financeiro', icon: '💰', actions: ['view', 'edit', 'create', 'delete'] },
  { key: 'mobilia', label: 'Mobília', icon: '🛋️', actions: ['view', 'edit', 'create', 'delete'] },
  { key: 'medicoes', label: 'Aprovações', icon: '✅', actions: ['view', 'edit', 'approve', 'create'] },
  { key: 'materiais', label: 'Materiais', icon: '📦', actions: ['view', 'edit', 'create', 'delete'] },
  { key: 'documentos', label: 'Documentos', icon: '📄', actions: ['view', 'edit', 'upload', 'delete'] },
  { key: 'feed', label: 'Diário de Obra', icon: '📸', actions: ['view', 'post', 'delete'] },
  { key: 'equipe', label: 'Equipe', icon: '👥', actions: ['view', 'invite', 'manage_permissions', 'remove'] },
  { key: 'configuracoes', label: 'Configurações', icon: '⚙️', actions: ['view', 'edit'] },
]

const ACTION_LABELS: Record<string, string> = {
  view: 'Visualizar',
  edit: 'Editar',
  create: 'Criar',
  delete: 'Excluir',
  approve: 'Aprovar',
  upload: 'Upload',
  post: 'Publicar',
  invite: 'Convidar',
  manage_permissions: 'Gerenciar permissões',
  remove: 'Remover membros',
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  designer: 'Designer',
  professional: 'Profissional',
  viewer: 'Visualizador',
}
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  designer: 'bg-violet-100 text-violet-800 border-violet-200',
  professional: 'bg-blue-100 text-blue-800 border-blue-200',
  viewer: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function TeamPanel({ projectId, currentUserRole }: TeamPanelProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [roleDefaults, setRoleDefaults] = useState<Record<string, Record<string, Record<string, boolean>>>>({})
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'professional' })
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const isOwner = currentUserRole === 'owner' || currentUserRole === 'admin'

  const fetchMembers = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/members?project_id=${projectId}`)
      const data = await res.json()
      setMembers(data.members || [])
      setRoleDefaults(data.role_defaults || {})
      setAvailableRoles(data.available_roles || [])
    } catch (e) {
      console.error('Error fetching members:', e)
    } finally {
      setLoading(false)
    }
  }, [projectId])
  useEffect(() => { fetchMembers() }, [fetchMembers])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleRoleChange = async (member: Member, newRole: string) => {
    setSaving(member.id)
    try {
      await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          project_id: projectId,
          role: newRole,
          custom_permissions: false,
        }),
      })
      showToast(`Perfil de ${member.profile.name} alterado para ${ROLE_LABELS[newRole]}`)
      fetchMembers()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(null)
    }
  }

  const handlePermissionToggle = async (member: Member, moduleKey: string, action: string) => {
    const currentPerms = { ...member.permissions }
    if (!currentPerms[moduleKey]) currentPerms[moduleKey] = {}
    currentPerms[moduleKey] = { ...currentPerms[moduleKey], [action]: !currentPerms[moduleKey][action] }
    // Optimistic update
    setMembers(prev => prev.map(m =>
      m.id === member.id ? { ...m, permissions: currentPerms, custom_permissions: true } : m
    ))

    setSaving(member.id)
    try {
      await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          project_id: projectId,
          permissions: currentPerms,
        }),
      })
    } catch (e) {
      console.error(e)
      fetchMembers() // Revert on error
    } finally {
      setSaving(null)
    }
  }

  const handleResetToDefaults = async (member: Member) => {
    setSaving(member.id)
    try {
      await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          project_id: projectId,
          role: member.role,
          custom_permissions: false,
        }),
      })
      showToast(`Permissões de ${member.profile.name} restauradas para padrão`)
      fetchMembers()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(null)
    }
  }
  const handleRemoveMember = async (member: Member) => {
    if (!confirm(`Tem certeza que deseja remover ${member.profile.name} do projeto?`)) return
    try {
      await fetch(`/api/members?member_id=${member.id}&project_id=${projectId}`, { method: 'DELETE' })
      showToast(`${member.profile.name} removido do projeto`)
      fetchMembers()
    } catch (e) {
      console.error(e)
    }
  }

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) return
    setInviteLoading(true)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          role: inviteForm.role,
          invitee_name: inviteForm.name,
          invitee_email: inviteForm.email,
          invited_by: members.find(m => m.role === 'owner')?.user_id || 'system',
        }),
      })
      const data = await res.json()
      if (data.link) {
        setInviteLink(data.link)
        showToast('Convite criado com sucesso!')
      } else {
        showToast(data.error || 'Erro ao criar convite')
      }
    } catch (e) {
      console.error(e)
      showToast('Erro ao criar convite')
    } finally {
      setInviteLoading(false)
    }
  }
  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      showToast('Link copiado!')
    }
  }

  const getPermissionCount = (perms: Record<string, Record<string, boolean>>) => {
    let total = 0, enabled = 0
    MODULES.forEach(mod => {
      mod.actions.forEach(action => {
        total++
        if (perms?.[mod.key]?.[action]) enabled++
      })
    })
    return { total, enabled, percent: Math.round((enabled / total) * 100) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users size={22} /> Equipe do Projeto
          </h2>
          <p className="text-sm text-slate-500 mt-1">{members.length} membros ativos</p>
        </div>
        {isOwner && (
          <button
            onClick={() => { setShowInviteForm(!showInviteForm); setInviteLink(null) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold border-none cursor-pointer hover:bg-blue-700 transition-colors shadow-sm"
          >
            <UserPlus size={16} /> Convidar
          </button>
        )}
      </div>
      {/* Invite Form */}
      <AnimatePresence>
        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 rounded-2xl border border-blue-100 p-5 overflow-hidden"
          >
            <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Mail size={16} /> Novo Convite
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                placeholder="Nome"
                value={inviteForm.name}
                onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <select
                value={inviteForm.role}
                onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {availableRoles.filter(r => r !== 'owner').map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>            <div className="flex items-center gap-3">
              <button
                onClick={handleInvite}
                disabled={inviteLoading || !inviteForm.name || !inviteForm.email}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold border-none cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {inviteLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                Gerar Link de Convite
              </button>
              <button
                onClick={() => { setShowInviteForm(false); setInviteLink(null) }}
                className="px-4 py-2.5 text-slate-500 text-sm bg-transparent border-none cursor-pointer hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
            {inviteLink && (
              <div className="mt-4 flex items-center gap-2 bg-white rounded-xl p-3 border border-blue-200">
                <Link2 size={14} className="text-blue-500 shrink-0" />
                <code className="text-xs text-blue-700 flex-1 truncate">{inviteLink}</code>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border-none cursor-pointer hover:bg-blue-200 transition-colors"
                >
                  <Copy size={12} /> Copiar
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Members List */}
      <div className="space-y-3">
        {members.map(member => {
          const isExpanded = expandedMember === member.id
          const permStats = getPermissionCount(member.permissions)
          const isSelf = member.role === 'owner' // Can't edit owners
          const canEdit = isOwner && !isSelf

          return (
            <motion.div
              key={member.id}
              layout
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Member Header */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedMember(isExpanded ? null : member.id)}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                  style={{ backgroundColor: member.profile.color || '#6366f1' }}
                >
                  {member.profile.name?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{member.profile.name}</span>
                    {member.role === 'owner' && <Crown size={14} className="text-amber-500" />}
                    {member.custom_permissions && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold">
                        Personalizado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{member.profile.email}</p>
                </div>
                {/* Role Badge */}
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${ROLE_COLORS[member.role] || ROLE_COLORS.viewer}`}>
                  {ROLE_LABELS[member.role] || member.role}
                </span>

                {/* Permission meter */}
                <div className="hidden md:flex items-center gap-2 w-32">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${permStats.percent}%`,
                        backgroundColor: permStats.percent > 75 ? '#10b981' : permStats.percent > 40 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono w-10 text-right">{permStats.enabled}/{permStats.total}</span>
                </div>

                {/* Expand icon */}
                {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </div>

              {/* Expanded Permissions Grid */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                      {/* Role selector + actions */}
                      {canEdit && (
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                          <label className="text-sm font-bold text-slate-600">Perfil:</label>
                          <select
                            value={member.role}
                            onChange={e => handleRoleChange(member, e.target.value)}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                            disabled={saving === member.id}
                          >
                            {availableRoles.map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>                          {member.custom_permissions && (
                            <button
                              onClick={() => handleResetToDefaults(member)}
                              className="flex items-center gap-1 px-3 py-2 text-xs text-orange-600 bg-orange-50 rounded-xl border border-orange-200 font-bold cursor-pointer hover:bg-orange-100 transition-colors"
                              disabled={saving === member.id}
                            >
                              <RotateCcw size={12} /> Restaurar padrão
                            </button>
                          )}
                          <div className="flex-1" />
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 bg-red-50 rounded-xl border border-red-200 font-bold cursor-pointer hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={12} /> Remover
                          </button>
                        </div>
                      )}

                      {/* Permissions Grid — Checkbox style */}
                      <div className="grid grid-cols-1 gap-2">
                        {MODULES.map(mod => {
                          const modulePerms = member.permissions?.[mod.key] || {}
                          const allEnabled = mod.actions.every(a => modulePerms[a])
                          const someEnabled = mod.actions.some(a => modulePerms[a])

                          return (
                            <div key={mod.key} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                              {/* Module label */}
                              <span className="text-lg">{mod.icon}</span>
                              <span className="text-sm font-bold text-slate-700 w-32 shrink-0">{mod.label}</span>
                              {/* Action checkboxes */}
                              <div className="flex flex-wrap gap-2 flex-1">
                                {mod.actions.map(action => {
                                  const isEnabled = modulePerms[action] || false
                                  return (
                                    <label
                                      key={action}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border select-none ${
                                        isEnabled
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                      } ${!canEdit ? 'pointer-events-none opacity-75' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={() => canEdit && handlePermissionToggle(member, mod.key, action)}
                                        className="sr-only"
                                        disabled={!canEdit || saving === member.id}
                                      />
                                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                        isEnabled ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'
                                      }`}>
                                        {isEnabled && <Check size={10} className="text-white" />}
                                      </div>
                                      {ACTION_LABELS[action] || action}
                                    </label>
                                  )
                                })}
                              </div>
                              {/* Quick toggle all */}
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    const newPerms = { ...member.permissions }
                                    if (!newPerms[mod.key]) newPerms[mod.key] = {}
                                    const toggleTo = !allEnabled
                                    mod.actions.forEach(a => {
                                      newPerms[mod.key] = { ...newPerms[mod.key], [a]: toggleTo }
                                    })
                                    // Optimistic update
                                    setMembers(prev => prev.map(m =>
                                      m.id === member.id ? { ...m, permissions: newPerms, custom_permissions: true } : m
                                    ))
                                    fetch('/api/members', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        member_id: member.id,
                                        project_id: projectId,
                                        permissions: newPerms,
                                      }),
                                    })
                                  }}
                                  className={`shrink-0 w-8 h-5 rounded-full transition-colors relative cursor-pointer border-none ${
                                    allEnabled ? 'bg-emerald-500' : someEnabled ? 'bg-amber-400' : 'bg-slate-300'
                                  }`}
                                  title={allEnabled ? 'Desativar tudo' : 'Ativar tudo'}
                                >
                                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                    allEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                                  }`} />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {saving === member.id && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-blue-500">
                          <Loader2 size={12} className="animate-spin" /> Salvando...
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-lg z-50 flex items-center gap-2"
          >
            <Check size={14} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
