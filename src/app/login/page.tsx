'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { HardHat, Mail, Lock, Eye, EyeOff, Loader2, User, Shield } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const { signIn, session, loading: authLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && session) {
      window.location.href = '/'
    }
  }, [session, authLoading])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setError('')
    setLoading(true)

    const { error: err } = await signIn(email, password)
    if (err) {
      if (err.includes('Invalid login')) {
        setError('Email ou senha incorretos')
      } else if (err.includes('Email not confirmed')) {
        setError('Email não confirmado. Verifique sua caixa de entrada.')
      } else {
        setError(err)
      }
      setLoading(false)
    } else {
      // Log login event
      try {
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'login', actor_email: email }),
        })
      } catch { /* non-blocking */ }
      window.location.href = '/'
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !name) return

    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Senhas não conferem')
      return
    }
    if (!acceptedTerms) {
      setError('Você precisa aceitar os termos para continuar')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { data, error: signupErr } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })

      if (signupErr) {
        if (signupErr.message.includes('already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.')
        } else {
          setError(signupErr.message)
        }
        setLoading(false)
        return
      }

      // Update profile with LGPD consent
      if (data.user) {
        await supabaseBrowser
          .from('profiles')
          .update({
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
            consent_analytics: true,
            signup_source: 'email',
          })
          .eq('id', data.user.id)

        // Confirm email immediately (self-service signup)
        await supabaseBrowser.rpc('confirm_user_email', { user_id: data.user.id })

        // Log signup
        try {
          await fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'signup',
              actor_email: email,
              actor_id: data.user.id,
              metadata: { name, source: 'email', terms_version: '1.0' },
            }),
          })
        } catch { /* non-blocking */ }
      }

      // Auto-login after signup
      const { error: loginErr } = await signIn(email, password)
      if (loginErr) {
        setSignupSuccess(true)
        setLoading(false)
      } else {
        window.location.href = '/'
      }
    } catch {
      setError('Erro ao criar conta. Tente novamente.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) {
        setError('Erro ao conectar com Google. Tente novamente.')
        setLoading(false)
      }
      // Redirect happens automatically
    } catch {
      setError('Erro ao conectar com Google')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-[#03305a] to-secondary-light p-4">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-green-300" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Conta criada!</h1>
          <p className="text-white/70 mb-6">Faça login com seu email e senha.</p>
          <button
            onClick={() => { setSignupSuccess(false); setMode('login') }}
            className="inline-block px-6 py-3 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 transition-colors border-none cursor-pointer"
          >
            Fazer login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-[#03305a] to-secondary-light p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <HardHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Reforma do Apê</h1>
          <p className="text-sm text-white/70 mt-1">Controle completo da sua obra</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Tab Toggle */}
          <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 mb-5">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer transition-all ${
                mode === 'login'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('signup'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer transition-all ${
                mode === 'signup'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Criar conta
            </button>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-white border-2 border-outline-variant/30 text-on-surface font-semibold text-sm cursor-pointer hover:bg-surface-container-low transition-all flex items-center justify-center gap-3 mb-4 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {mode === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-outline-variant/30" />
            <span className="text-xs text-on-surface-variant">ou</span>
            <div className="flex-1 h-px bg-outline-variant/30" />
          </div>

          <form onSubmit={mode === 'login' ? handleEmailLogin : handleSignup} className="flex flex-col gap-3.5">
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Nome</label>
                <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                  <User size={16} className="text-on-surface-variant shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                    required={mode === 'signup'}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Email</label>
              <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                <Mail size={16} className="text-on-surface-variant shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Senha</label>
              <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                <Lock size={16} className="text-on-surface-variant shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                  className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
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

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
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
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {/* LGPD Terms (signup only) */}
            {mode === 'signup' && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <span className="text-xs text-on-surface-variant leading-relaxed">
                  Aceito os{' '}
                  <a href="/termos" className="text-secondary font-semibold hover:underline">
                    Termos de Uso
                  </a>{' '}
                  e a{' '}
                  <a href="/privacidade" className="text-secondary font-semibold hover:underline">
                    Política de Privacidade
                  </a>
                  . Seus dados são protegidos conforme a LGPD.
                </span>
              </label>
            )}

            {/* Error */}
            {error && (
              <div className="text-sm text-danger bg-danger-light px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={
                loading ||
                !email ||
                !password ||
                (mode === 'signup' && (!name || !confirmPassword || !acceptedTerms))
              }
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm border-none cursor-pointer hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </>
              ) : (
                mode === 'login' ? 'Entrar' : 'Criar conta'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/50 mt-6">
          Reforma do Apê v4.2 — Seus dados protegidos pela LGPD
        </p>
      </div>
    </div>
  )
}
