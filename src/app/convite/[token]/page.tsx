'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { HardHat, Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle, User } from 'lucide-react'

interface InviteData {
  id: string
  token: string
  role: string
  invitee_name: string
  invitee_email: string | null
  status: string
  expires_at: string
  project: {
    id: string
    name: string
    description: string
    location: string | null
  }
  inviter: {
    name: string
    email: string
  }
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  professional: 'Profissional',
  designer: 'Designer',
  viewer: 'Visualizador',
}

export default function ConvitePage() {
  const params = useParams()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  // Load invite data
  useEffect(() => {
    if (!token) return
    fetch(`/api/invites/${token}`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Convite inválido')
        }
        return res.json()
      })
      .then(data => {
        setInvite(data)
        setName(data.invitee_name || '')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalEmail = invite?.invitee_email || email
    if (!password || !name || !finalEmail) return

    if (password.length < 6) {
      setSubmitError('Senha deve ter no mínimo 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setSubmitError('Senhas não conferem')
      return
    }

    setSubmitError('')
    setSubmitting(true)

    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, name, email: finalEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || 'Erro ao criar conta')
        setSubmitting(false)
        return
      }

      setSuccess(true)

      // If we got a session, store it and redirect
      if (data.session) {
        // Store auth tokens
        localStorage.setItem('sb-auth-token', JSON.stringify(data.session))
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } else if (data.needsLogin) {
        setTimeout(() => {
          window.location.href = '/login'
        }, 3000)
      }
    } catch {
      setSubmitError('Erro de conexão. Tente novamente.')
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-[#03305a] to-secondary-light">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    )
  }

  // Error state (invalid/expired invite)
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-[#03305a] to-secondary-light p-4">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-red-300" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Convite Inválido</h1>
          <p className="text-white/70 mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 transition-colors"
          >
            Ir para login
          </a>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-[#03305a] to-secondary-light p-4">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-300" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Conta criada!</h1>
          <p className="text-white/70 mb-2">
            Você já faz parte do projeto <strong className="text-white">{invite?.project?.name}</strong>
          </p>
          <p className="text-white/50 text-sm">Redirecionando...</p>
        </div>
      </div>
    )
  }

  // Main invite form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-[#03305a] to-secondary-light p-4">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <HardHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Reforma do Apê</h1>
        </div>

        {/* Invite Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Invite context */}
          <div className="bg-primary/5 rounded-xl p-4 mb-5">
            <p className="text-sm text-on-surface-variant">
              <strong className="text-on-surface">{invite?.inviter?.name}</strong> te convidou para o projeto
            </p>
            <h2 className="text-lg font-bold text-primary mt-1">{invite?.project?.name}</h2>
            {invite?.project?.location && (
              <p className="text-xs text-on-surface-variant mt-0.5">{invite.project.location}</p>
            )}
            <div className="mt-2 inline-block px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
              {ROLE_LABELS[invite?.role || 'professional'] || invite?.role}
            </div>
          </div>

          <h3 className="text-base font-bold text-on-surface mb-1">Criar sua conta</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            Preencha seus dados para acessar o projeto
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Email</label>
              {invite?.invitee_email ? (
                <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5">
                  <span className="text-sm text-on-surface-variant">{invite.invitee_email}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                    required
                  />
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Seu nome</label>
              <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                <User size={16} className="text-on-surface-variant shrink-0" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Como quer ser chamado"
                  className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Criar senha</label>
              <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                <Lock size={16} className="text-on-surface-variant shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="bg-transparent border-none cursor-pointer p-0.5 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Confirmar senha</label>
              <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                <Lock size={16} className="text-on-surface-variant shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <div className="text-sm text-danger bg-danger-light px-3 py-2 rounded-lg">
                {submitError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !name || !password || !confirmPassword || (!invite?.invitee_email && !email)}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm border-none cursor-pointer hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-1"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta e entrar'
              )}
            </button>
          </form>

          {/* Already have account */}
          <div className="mt-4 text-center">
            <a
              href="/login"
              className="text-sm text-secondary hover:text-secondary/80 font-semibold transition-colors"
            >
              Já tenho conta — fazer login
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-white/50 mt-6">
          Reforma do Apê v4.0
        </p>
      </div>
    </div>
  )
}
