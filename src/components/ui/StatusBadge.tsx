'use client'

interface StatusBadgeProps {
  label: string
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
  size?: 'sm' | 'md'
  dot?: boolean
}

const VARIANTS = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-orange-100 text-orange-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-600',
  primary: 'bg-primary/10 text-primary',
}

const DOT_COLORS = {
  success: 'bg-emerald-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-400',
  primary: 'bg-primary',
}

export default function StatusBadge({ label, variant = 'neutral', size = 'sm', dot = true }: StatusBadgeProps) {
  return (
    <span className={`
      inline-flex items-center gap-1.5 font-bold uppercase tracking-widest rounded-full
      ${VARIANTS[variant]}
      ${size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
    `}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[variant]}`} />}
      {label}
    </span>
  )
}

// Helper to map common status strings to variants
export function getStatusVariant(status: string): StatusBadgeProps['variant'] {
  const map: Record<string, StatusBadgeProps['variant']> = {
    // Measurements
    rascunho: 'neutral',
    enviada: 'warning',
    aprovada: 'info',
    paga: 'success',
    rejeitada: 'danger',
    // Material requests
    pendente: 'warning',
    aprovado: 'info',
    comprado: 'success',
    recusado: 'danger',
    cancelado: 'neutral',
    // Quotes
    pending: 'warning',
    accepted: 'info',
    contracted: 'success',
    rejected: 'danger',
    // General
    ativo: 'success',
    inativo: 'neutral',
    urgente: 'danger',
    normal: 'info',
    baixa: 'neutral',
  }
  return map[status?.toLowerCase()] || 'neutral'
}

// Common status label translations
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    rascunho: 'Rascunho',
    enviada: 'Enviada',
    aprovada: 'Aprovada',
    paga: 'Paga',
    rejeitada: 'Rejeitada',
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    comprado: 'Comprado',
    recusado: 'Recusado',
    cancelado: 'Cancelado',
    pending: 'Pendente',
    accepted: 'Aceito',
    contracted: 'Contratado',
    rejected: 'Rejeitado',
    urgente: 'Urgente',
    normal: 'Normal',
    baixa: 'Baixa',
  }
  return labels[status?.toLowerCase()] || status
}
