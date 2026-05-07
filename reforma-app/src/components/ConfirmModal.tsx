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
      <div className="modal-content max-w-[380px] text-center">
        <div className={`w-12 h-12 rounded-full ${danger ? 'bg-danger-light' : 'bg-warning-light'} flex items-center justify-center mx-auto mb-4`}>
          <AlertTriangle size={24} className={danger ? 'text-danger' : 'text-warning'} />
        </div>

        <h3 className="text-base font-bold text-on-surface mb-2">{title}</h3>
        <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">{message}</p>

        <div className="flex gap-2.5">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn-primary flex-1 justify-center ${danger ? 'bg-danger hover:bg-danger/90' : 'bg-warning hover:bg-warning/90'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
