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
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #581c87 100%)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.2), transparent)',
      }} />

      <div style={{
        maxWidth: '440px',
        width: '90%',
        textAlign: 'center',
        color: 'white',
        padding: '40px 32px',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 32px',
          opacity: step >= 0 ? 1 : 0,
          transform: step >= 0 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease',
        }}>
          <Home size={36} color="white" />
        </div>

        {/* Invite text */}
        <div style={{
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease',
        }}>
          <p style={{
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            color: 'rgba(196,181,253,0.9)',
            marginBottom: '12px',
            fontWeight: 600,
          }}>
            Convite exclusivo
          </p>
        </div>

        <div style={{
          opacity: step >= 2 ? 1 : 0,
          transform: step >= 2 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease',
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 800,
            lineHeight: 1.3,
            margin: '0 0 16px',
          }}>
            Bem-vinda ao Diário de Obra
            <br />
            <span style={{ color: '#c4b5fd' }}>Reforma Ap 62</span>
          </h1>

          <p style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.6,
            margin: '0 0 8px',
          }}>
            Bruno e Graziela te convidaram para
            <br />
            fazer parte dessa jornada!
          </p>

          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 32px',
            fontStyle: 'italic',
          }}>
            Baggio Primo - Ap 62
          </p>
        </div>

        {/* Features preview */}
        <div style={{
          opacity: step >= 3 ? 1 : 0,
          transform: step >= 3 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease',
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}>
            {['Mobília', 'Orçamentos', 'Cômodos'].map((label) => (
              <span key={label} style={{
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.1)',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 500,
              }}>
                {label}
              </span>
            ))}
          </div>

          <button
            onClick={handleEnter}
            style={{
              background: 'white',
              color: '#4c1d95',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
            onMouseOver={e => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)'
            }}
            onMouseOut={e => {
              (e.target as HTMLElement).style.transform = 'translateY(0)'
            }}
          >
            <Sparkles size={18} />
            Entrar no Projeto
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Footer */}
        <p style={{
          marginTop: '40px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.3)',
          opacity: step >= 3 ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}>
          Seu acesso exclusivo como Designer do projeto
        </p>
      </div>
    </div>
  )
}
