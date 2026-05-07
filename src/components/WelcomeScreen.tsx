'use client'
import { useState, useEffect } from 'react'
import { Home, ArrowRight, Sparkles } from 'lucide-react'

interface WelcomeScreenProps {
  userRole: string
  userId: string
  onDismiss: () => void
}

export default function WelcomeScreen({ userRole, userId, onDismiss }: WelcomeScreenProps) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Fade in
    setTimeout(() => setVisible(true), 100)
    // Auto-advance steps
    setTimeout(() => setStep(1), 800)
    setTimeout(() => setStep(2), 1600)
    setTimeout(() => setStep(3), 2400)
  }, [])

  const handleEnter = () => {
    setVisible(false)
    setTimeout(onDismiss, 400)
  }

  if (userRole !== 'designer') return null

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-[linear-gradient(135deg,#1e1b4b_0%,#312e81_30%,#4c1d95_60%,#581c87_100%)] transition-opacity duration-500 ease-in-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.3),transparent)]" />
      <div className="absolute -bottom-[80px] -left-[80px] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.2),transparent)]" />

      <div className="max-w-[440px] w-[90%] text-center text-white px-8 py-10 relative">
        {/* Logo */}
        <div
          className="w-[72px] h-[72px] rounded-xl bg-white/15 backdrop-blur-[10px] flex items-center justify-center mx-auto mb-8 transition-all duration-[600ms] ease-in-out"
          style={{
            opacity: step >= 0 ? 1 : 0,
            transform: step >= 0 ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <Home size={36} color="white" />
        </div>

        {/* Invite text */}
        <div
          className="transition-all duration-[600ms] ease-in-out"
          style={{
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <p className="text-[13px] uppercase tracking-[3px] text-[rgba(196,181,253,0.9)] mb-3 font-semibold">
            Convite exclusivo
          </p>
        </div>

        <div
          className="transition-all duration-[600ms] ease-in-out"
          style={{
            opacity: step >= 2 ? 1 : 0,
            transform: step >= 2 ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <h1 className="text-[28px] font-extrabold leading-[1.3] mb-4">
            Bem-vinda ao Diário de Obra
            <br />
            <span className="text-[#c4b5fd]">Reforma Ap 62</span>
          </h1>

          <p className="text-[15px] text-white/70 leading-[1.6] mb-2">
            Bruno e Graziela te convidaram para
            <br />
            fazer parte dessa jornada!
          </p>

          <p className="text-[13px] text-white/50 mb-8 italic">
            Baggio Primo - Ap 62
          </p>
        </div>

        {/* Features preview */}
        <div
          className="transition-all duration-[600ms] ease-in-out"
          style={{
            opacity: step >= 3 ? 1 : 0,
            transform: step >= 3 ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <div className="flex gap-3 justify-center mb-8 flex-wrap">
            {['Mobília', 'Orçamentos', 'Cômodos'].map((label) => (
              <span key={label} className="px-3.5 py-1.5 rounded-xl bg-white/10 text-xs text-white/80 font-medium">
                {label}
              </span>
            ))}
          </div>

          <button
            onClick={handleEnter}
            className="bg-white text-[#4c1d95] border-none py-3.5 px-8 rounded-[14px] text-base font-bold cursor-pointer inline-flex items-center gap-2 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5"
          >
            <Sparkles size={18} />
            Entrar no Projeto
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Footer */}
        <p
          className="mt-10 text-[11px] text-white/30 transition-opacity duration-[600ms] ease-in-out"
          style={{ opacity: step >= 3 ? 1 : 0 }}
        >
          Seu acesso exclusivo como Designer do projeto
        </p>
      </div>
    </div>
  )
}
