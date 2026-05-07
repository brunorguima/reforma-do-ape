'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { HardHat, Mail, Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react'

export default function LoginPage() {
  const { signIn, session, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAccessKey, setShowAccessKey] = useState(false)
  const [accessKey, setAccessKey] = useState('')

  // Redirect if already logged in
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
      } else {
        setError(err)
      }
      setLoading(false)
    } else {
      // signIn succeeded — onAuthStateChange will handle redirect
      window.location.href = '/'
    }
  }

  const handleAccessKeyLogin = () => {
    if (!accessKey.trim()) return
    window.location.href = `/?key=${encodeURIComponent(accessKey.trim())}`
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-[#03305a] to-secondary-light p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <HardHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Reforma do Apê</h1>
          <p className="text-sm text-white/70 mt-1">Controle completo da sua obra</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {!showAccessKey ? (
            <>
              <h2 className="text-lg font-bold text-on-surface mb-1">Entrar</h2>
              <p className="text-sm text-on-surface-variant mb-5">Use seu email e senha</p>

              <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
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
                      placeholder="Sua senha"
                      className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                      autoComplete="current-password"
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

                {/* Error */}
                {error && (
                  <div className="text-sm text-danger bg-danger-light px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm border-none cursor-pointer hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-outline-variant/30" />
                <span className="text-xs text-on-surface-variant">ou</span>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>

              {/* Access Key fallback */}
              <button
                onClick={() => setShowAccessKey(true)}
                className="w-full py-2.5 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold text-sm border-none cursor-pointer hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
              >
                <KeyRound size={16} />
                Entrar com chave de acesso
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-on-surface mb-1">Chave de Acesso</h2>
              <p className="text-sm text-on-surface-variant mb-5">Use a chave que você recebeu</p>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3.5 py-2.5 border-2 border-transparent focus-within:border-secondary focus-within:bg-white transition-all">
                  <KeyRound size={16} className="text-on-surface-variant shrink-0" />
                  <input
                    type="text"
                    value={accessKey}
                    onChange={e => setAccessKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAccessKeyLogin()}
                    placeholder="Sua chave de acesso"
                    className="flex-1 border-none bg-transparent outline-none text-sm text-on-surface p-0"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleAccessKeyLogin}
                  disabled={!accessKey.trim()}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm border-none cursor-pointer hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Entrar
                </button>

                <button
                  onClick={() => setShowAccessKey(false)}
                  className="w-full py-2.5 rounded-xl bg-transparent text-on-surface-variant font-semibold text-sm border-none cursor-pointer hover:bg-surface-container-low transition-colors"
                >
                  Voltar para login com email
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/50 mt-6">
          Reforma do Apê v4.0 — Auth Real
        </p>
      </div>
    </div>
  )
}
