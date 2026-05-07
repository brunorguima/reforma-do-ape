'use client'
import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  span?: 1 | 2
  large?: boolean
}

const ACCENT_MAP = {
  primary: { border: 'border-l-primary', iconBg: 'bg-primary/5', iconBorder: 'border-primary/10', iconText: 'text-primary' },
  success: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconBorder: 'border-emerald-100', iconText: 'text-emerald-600' },
  warning: { border: 'border-l-orange-500', iconBg: 'bg-orange-50', iconBorder: 'border-orange-100', iconText: 'text-orange-600' },
  danger: { border: 'border-l-red-500', iconBg: 'bg-red-50', iconBorder: 'border-red-100', iconText: 'text-red-600' },
  info: { border: 'border-l-blue-500', iconBg: 'bg-blue-50', iconBorder: 'border-blue-100', iconText: 'text-blue-600' },
}

export default function KpiCard({ label, value, sub, icon, accent = 'primary', span = 1, large = false }: KpiCardProps) {
  const colors = ACCENT_MAP[accent]

  return (
    <div className={`
      bg-surface-lowest border border-outline-variant rounded-2xl shadow-sm
      border-l-4 ${colors.border}
      ${span === 2 ? 'col-span-2' : ''}
      ${large ? 'p-5' : 'p-4'}
      flex items-start justify-between gap-3
    `}>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className={`font-black text-primary ${large ? 'text-3xl' : 'text-xl'} font-mono`}>
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-outline mt-1">{sub}</p>
        )}
      </div>
      {icon && (
        <div className={`p-2.5 rounded-xl ${colors.iconBg} border ${colors.iconBorder} ${colors.iconText} shrink-0`}>
          {icon}
        </div>
      )}
    </div>
  )
}

// Grid wrapper for consistent KPI layout
export function KpiGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div className={`grid gap-4 ${
      cols === 2 ? 'grid-cols-2' :
      cols === 3 ? 'grid-cols-2 md:grid-cols-3' :
      'grid-cols-2 md:grid-cols-4'
    }`}>
      {children}
    </div>
  )
}
