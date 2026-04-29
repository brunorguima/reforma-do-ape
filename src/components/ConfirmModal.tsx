'use client'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal-content" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-full)',
          background: danger ? 'var(--danger-light)' : 'var(--warning-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <AlertTriangle size={24} color={danger ? 'var(--danger)' : 'var(--warning)'} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>{message}</p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary"
            style={{
              flex: 1, justifyContent: 'center',
              background: danger ? 'var(--danger)' : 'var(--accent)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
