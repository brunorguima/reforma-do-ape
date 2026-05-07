'use client'
import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

// Base card with M3 styling
interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const PADDING_MAP = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 md:p-6',
}

export default function Card({ children, className = '', onClick, hoverable = false, padding = 'md' }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-surface-lowest border border-outline-variant rounded-2xl shadow-sm
        ${PADDING_MAP[padding]}
        ${hoverable ? 'hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer active:scale-[0.98]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

// Expandable card with header + collapsible content
interface ExpandableCardProps {
  header: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  headerRight?: ReactNode
  className?: string
}

export function ExpandableCard({ header, children, defaultOpen = false, headerRight, className = '' }: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`bg-surface-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
          {header}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
          <ChevronDown
            size={18}
            className={`text-outline transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-outline-variant">
          {children}
        </div>
      )}
    </div>
  )
}

// Section header
interface SectionHeaderProps {
  title: string
  action?: ReactNode
  subtitle?: string
}

export function SectionHeader({ title, action, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-bold text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-outline mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// Empty state
interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-12 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-4">
        {icon}
      </div>
      <h4 className="text-base font-bold text-on-surface mb-1">{title}</h4>
      {description && <p className="text-sm text-outline max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
