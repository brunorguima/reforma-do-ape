'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  HardHat, Home, ChevronRight, Loader2, Plus, Trash2,
  Utensils, Building2, Store, Warehouse, Check, Sparkles
} from 'lucide-react'

type Step = 'welcome' | 'project' | 'rooms' | 'invite' | 'done'

const PROJECT_TYPES = [
  { value: 'apartamento', label: 'Apartamento', icon: <Building2 size={28} />, desc: 'Reforma residencial' },
  { value: 'casa', label: 'Casa', icon: <Home size={28} />, desc: 'Construção ou reforma' },
  { value: 'restaurante', label: 'Restaurante', icon: <Utensils size={28} />, desc: 'Ponto comercial' },
  { value: 'loja', label: 'Loja/Escritório', icon: <Store size={28} />, desc: 'Espaço comercial' },
  { value: 'outro', label: 'Outro', icon: <Warehouse size={28} />, desc: 'Qualquer tipo de obra' },
]

const DEFAULT_ROOMS: Record<string, { name: string; icon: string }[]> = {
  apartamento: [
    { name: 'Sala', icon: '🛋️' },
    { name: 'Cozinha', icon: '🍳' },
    { name: 'Quarto Principal', icon: '🛏️' },
    { name: 'Banheiro Social', icon: '🚿' },
    { name: 'Banheiro Suíte', icon: '🛁' },
    { name: 'Lavanderia', icon: '🧺' },
    { name: 'Varanda', icon: '🌿' },
  ],
  casa: [
    { name: 'Sala de Estar', icon: '🛋️' },
    { name: 'Cozinha', icon: '🍳' },
    { name: 'Suíte Master', icon: '🛏️' },
    { name: 'Quarto 2', icon: '🛏️' },
    { name: 'Banheiro Social', icon: '🚿' },
    { name: 'Área de Serviço', icon: '🧺' },
    { name: 'Garagem', icon: '🚗' },
    { name: 'Quintal', icon: '🌳' },
  ],
  restaurante: [
    { name: 'Salão Principal', icon: '🍽️' },
    { name: 'Cozinha', icon: '👨‍🍳' },
    { name: 'Bar', icon: '🍷' },
    { name: 'Banheiro Clientes', icon: '🚿' },
    { name: 'Banheiro Funcionários', icon: '🚻' },
    { name: 'Estoque', icon: '📦' },
    { name: 'Fachada', icon: '🏪' },
  ],
  loja: [
    { name: 'Área de Vendas', icon: '🏪' },
    { name: 'Escritório', icon: '💼' },
    { name: 'Estoque', icon: '📦' },
    { name: 'Banheiro', icon: '🚿' },
    { name: 'Copa', icon: '☕' },
    { name: 'Fachada', icon: '🏢' },
  ],
  outro: [
    { name: 'Área Principal', icon: '🏠' },
    { name: 'Banheiro', icon: '🚿' },
  ],
}

export default function OnboardingPage() {
  const auth = useAuth()
  const [step, setStep] = useState<Step>('welcome')
  const [loading, setLoading] = useState(false)

  // Step 2: Project
  const [projectName, setProjectName] = useState('')
  const [projectType, setProjectType] = useState('')
  const [projectLocation, setProjectLocation] = useState('')

  // Step 3: Rooms
  const [rooms, setRooms] = useState<{ name: string; icon: string }[]>([])
  const [newRoomName, setNewRoomName] = useState('')

  // Step 4: Invite
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('owner')
  const [invites, setInvites] = useState<{ name: string; email: string; role: string }[]>([])
  const [inviteSent, setInviteSent] = useState(false)

  // Created project
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!auth.loading && !auth.session) {
      window.location.href = '/login'
    }
  }, [auth.loading, auth.session])

  // If user already has projects, redirect to home
  useEffect(() => {
    if (!auth.loading && auth.memberships.length > 0) {
      window.location.href = '/'
    }
  }, [auth.loading, auth.memberships])

  // Pre-fill rooms when project type changes
  useEffect(() => {
    if (projectType && DEFAULT_ROOMS[projectType]) {
      setRooms([...DEFAULT_ROOMS[projectType]])
    }
  }, [projectType])

  const handleCreateProject = async () => {
    if (!projectName.trim() || !projectType) return
    setLoading(true)

    try {
      // Create project
      const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const { data: project, error: projErr } = await supabaseBrowser
        .from('projects')
        .insert({
          name: projectName.trim(),
          slug: slug || 'meu-projeto',
          description: `${PROJECT_TYPES.find(t => t.value === projectType)?.label || 'Obra'} - ${projectName.trim()}`,
          project_type: projectType,
          location: projectLocation.trim() || null,
          is_active: true,
        })
        .select()
        .single()

      if (projErr) throw projErr

      // Add current user as owner
      const { error: memberErr } = await supabaseBrowser
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: auth.user!.id,
          role: 'owner',
          is_active: true,
        })

      if (memberErr) throw memberErr

      setCreatedProjectId(project.id)
      setStep('rooms')
    } catch (err) {
      console.error('Error creating project:', err)
      alert('Erro ao criar projeto. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRooms = async () => {
    if (!createdProjectId || rooms.length === 0) return
    setLoading(true)

    try {
      const roomInserts = rooms.map((r, i) => ({
        name: r.name,
        icon: r.icon,
        order_index: i,
        project_id: createdProjectId,
      }))

      const { error } = await supabaseBrowser
        .from('rooms')
        .insert(roomInserts)

      if (error) throw error

      // Also create default service categories
      const defaultCategories = [
        { name: 'Elétrica', icon: '⚡', order_index: 0 },
        { name: 'Hidráulica', icon: '🔧', order_index: 1 },
        { name: 'Alvenaria', icon: '🧱', order_index: 2 },
        { name: 'Pintura', icon: '🎨', order_index: 3 },
        { name: 'Gesso', icon: '📐', order_index: 4 },
        { name: 'Marcenaria', icon: '🪵', order_index: 5 },
        { name: 'Piso', icon: '🏗️', order_index: 6 },
        { name: 'Ar Condicionado', icon: '❄️', order_index: 7 },
      ].map(c => ({ ...c, project_id: createdProjectId }))

      await supabaseBrowser.from('service_categories').insert(defaultCategories)

      setStep('invite')
    } catch (err) {
      console.error('Error creating rooms:', err)
      alert('Erro ao criar cômodos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddInvite = () => {
    if (!inviteName.trim()) return
    const emailVal = inviteEmail.trim()
    if (emailVal && invites.some(i => i.email === emailVal)) return
    setInvites([...invites, { name: inviteName.trim(), email: emailVal, role: inviteRole }])
    setInviteName('')
    setInviteEmail('')
  }

  const handleSendInvites = async () => {
    if (invites.length === 0) {
      setStep('done')
      return
    }

    setLoading(true)
    try {
      for (const inv of invites) {
        await fetch('/api/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invitee_name: inv.name,
            invitee_email: inv.email || null,
            role: inv.role,
            project_id: createdProjectId,
            invited_by: auth.user?.id,
          }),
        })
      }
      setInviteSent(true)
      setTimeout(() => setStep('done'), 1500)
    } catch (err) {
      console.error('Error sending invites:', err)
      alert('Erro ao enviar convites. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    window.location.href = '/'
  }

  const addRoom = () => {
    if (!newRoomName.trim()) return
    setRooms([...rooms, { name: newRoomName.trim(), icon: '🏠' }])
    setNewRoomName('')
  }

  const removeRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index))
  }

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-[#03305a] to-secondary-light flex items-center justify-center p-4">
      <div className="w-full max-w-[520px]">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['welcome', 'project', 'rooms', 'invite', 'done'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= ['welcome', 'project', 'rooms', 'invite', 'done'].indexOf(step)
                  ? 'bg-white w-10'
                  : 'bg-white/20 w-6'
              }`}
            />
          ))}
        </div>

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
              <HardHat size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-3">
              Bem-vindo{auth.profile?.name ? `, ${auth.profile.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-white/70 text-lg mb-8 max-w-sm mx-auto">
              Vamos configurar tudo para você ter controle total da sua obra em minutos.
            </p>
            <button
              onClick={() => setStep('project')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-primary font-bold text-base border-none cursor-pointer hover:bg-white/90 transition-all shadow-lg"
            >
              Começar <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step: Create Project */}
        {step === 'project' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-on-surface">Crie seu projeto</h2>
                <p className="text-xs text-on-surface-variant">Qual obra você vai acompanhar?</p>
              </div>
            </div>

            {/* Project Name */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Nome do projeto</label>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Ex: Reforma do Apê 62, Casa Nova..."
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white text-sm text-on-surface outline-none transition-all"
                autoFocus
              />
            </div>

            {/* Project Type */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-on-surface-variant mb-2 block">Tipo de obra</label>
              <div className="grid grid-cols-3 gap-2">
                {PROJECT_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setProjectType(type.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      projectType === type.value
                        ? 'border-secondary bg-secondary/5 text-secondary'
                        : 'border-outline-variant/30 bg-white text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    {type.icon}
                    <span className="text-xs font-semibold">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Localização (opcional)</label>
              <input
                value={projectLocation}
                onChange={e => setProjectLocation(e.target.value)}
                placeholder="Ex: Rua das Flores 123, São Paulo"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white text-sm text-on-surface outline-none transition-all"
              />
            </div>

            <button
              onClick={handleCreateProject}
              disabled={loading || !projectName.trim() || !projectType}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm border-none cursor-pointer hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
              {loading ? 'Criando...' : 'Criar projeto e continuar'}
            </button>
          </div>
        )}

        {/* Step: Define Rooms */}
        {step === 'rooms' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Home size={20} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-on-surface">Defina os cômodos</h2>
                <p className="text-xs text-on-surface-variant">Sugerimos alguns — edite à vontade!</p>
              </div>
            </div>

            {/* Room list */}
            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
              {rooms.map((room, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low">
                  <span className="text-lg">{room.icon}</span>
                  <span className="flex-1 text-sm font-semibold text-on-surface">{room.name}</span>
                  <button
                    onClick={() => removeRoom(i)}
                    className="p-1 rounded-lg bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add room */}
            <div className="flex gap-2 mb-6">
              <input
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRoom() } }}
                placeholder="Adicionar cômodo..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white text-sm text-on-surface outline-none transition-all"
              />
              <button
                onClick={addRoom}
                disabled={!newRoomName.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white border-none cursor-pointer hover:bg-emerald-600 disabled:opacity-40 transition-all flex items-center gap-1.5 text-sm font-semibold"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>

            <button
              onClick={handleCreateRooms}
              disabled={loading || rooms.length === 0}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm border-none cursor-pointer hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
              {loading ? 'Criando cômodos...' : `Salvar ${rooms.length} cômodos e continuar`}
            </button>
          </div>
        )}

        {/* Step: Invite People */}
        {step === 'invite' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Plus size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-on-surface">Convide sua equipe</h2>
                <p className="text-xs text-on-surface-variant">Cônjuge, arquiteto, mestre de obras...</p>
              </div>
            </div>

            {/* Invite form */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex gap-2">
                <input
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Nome da pessoa"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white text-sm text-on-surface outline-none transition-all"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-surface-container-low border-2 border-transparent text-sm text-on-surface outline-none cursor-pointer"
                >
                  <option value="owner">Dono</option>
                  <option value="designer">Designer</option>
                  <option value="professional">Profissional</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInvite() } }}
                  placeholder="Email (opcional)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white text-sm text-on-surface outline-none transition-all"
                  type="email"
                />
                <button
                  onClick={handleAddInvite}
                  disabled={!inviteName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-500 text-white border-none cursor-pointer hover:bg-blue-600 disabled:opacity-40 transition-all text-sm font-semibold"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Invite list */}
            {invites.length > 0 && (
              <div className="space-y-2 mb-4">
                {invites.map((inv, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low">
                    <span className="flex-1 text-sm text-on-surface">
                      <strong>{inv.name}</strong>
                      {inv.email && <span className="text-on-surface-variant ml-1">({inv.email})</span>}
                    </span>
                    <span className="text-xs font-semibold text-on-surface-variant bg-white px-2 py-0.5 rounded">{inv.role}</span>
                    <button
                      onClick={() => setInvites(invites.filter((_, idx) => idx !== i))}
                      className="p-1 rounded-lg bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {inviteSent && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold mb-4">
                <Check size={16} /> Convites enviados!
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('done')}
                className="flex-1 py-3.5 rounded-xl bg-surface-container-low text-on-surface-variant font-bold text-sm border-none cursor-pointer hover:bg-surface-container transition-all"
              >
                Pular por agora
              </button>
              <button
                onClick={handleSendInvites}
                disabled={loading || invites.length === 0}
                className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold text-sm border-none cursor-pointer hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                {loading ? 'Enviando...' : 'Enviar convites'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
              <Sparkles size={40} className="text-emerald-300" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-3">Tudo pronto!</h1>
            <p className="text-white/70 text-lg mb-8 max-w-sm mx-auto">
              Seu projeto está configurado. Agora é só começar a cadastrar orçamentos, profissionais e acompanhar sua obra.
            </p>
            <button
              onClick={handleFinish}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-primary font-bold text-base border-none cursor-pointer hover:bg-white/90 transition-all shadow-lg"
            >
              Ir para o app <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-white/40 mt-8">
          Reforma do Apê v4.3 — Controle completo da sua obra
        </p>
      </div>
    </div>
  )
}
