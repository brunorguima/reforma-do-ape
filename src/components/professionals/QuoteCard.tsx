'use client'
import { useState } from 'react'
import { USERS, formatCurrency } from '@/lib/constants'
import type { UserID } from '@/lib/constants'
import { User, Phone, Mail, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { Quote, ServiceCategory } from './types'
import { PAYMENT_METHODS, STATUS_CONFIG } from './types'

interface QuoteCardProps {
  quote: Quote
  currentUser: UserID
  expandedQuote: string | null
  onToggleExpand: (id: string | null) => void
  onStatusChange: (quoteId: string, newStatus: string) => void
  onDeleteQuote: (quoteId: string) => void
}

export default function QuoteCard({
  quote,
  currentUser,
  expandedQuote,
  onToggleExpand,
  onStatusChange,
  onDeleteQuote,
}: QuoteCardProps) {
  const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.recebido
  const isExpanded = expandedQuote === quote.id
  const userColor = USERS.find(u => u.id === quote.created_by)?.color || '#6b7280'

  return (
    <div className="card p-4 transition-all">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-xl text-xs font-semibold" style={{
              background: statusCfg.bg, color: statusCfg.color
            }}>
              {statusCfg.emoji} {statusCfg.label}
            </span>
            {quote.service_category && (
              <span className="text-xs text-[#6b7280]">
                {quote.service_category.icon} {quote.service_category.name}
              </span>
            )}
            {quote.room && (
              <span className="text-xs text-[#6b7280]">
                📍 {quote.room.name}
              </span>
            )}
          </div>
          <h4 className="text-[15px] font-semibold mb-1 mt-0 text-[#1f2937]">
            {quote.description}
          </h4>
          <p className="text-[13px] text-[#6b7280] m-0">
            <User size={12} className="inline align-middle mr-1" />
            {quote.professional?.name || 'Profissional'}
            {quote.professional?.phone && (
              <span className="ml-2">
                <Phone size={12} className="inline align-middle mr-0.5" />
                {quote.professional.phone}
              </span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[15px] font-extrabold text-[#1f2937] mt-0 mb-1">
            {formatCurrency(Number(quote.amount))}
          </p>
          <div className="flex gap-1 justify-end items-center flex-wrap">
            <select
              value={quote.status}
              onChange={e => onStatusChange(quote.id, e.target.value)}
              className="px-2 py-[5px] rounded-lg border border-[#E5E7EB] cursor-pointer text-xs font-semibold appearance-auto"
              style={{
                background: statusCfg.bg, color: statusCfg.color,
              }}
            >
              {Object.entries(STATUS_CONFIG)
                .filter(([key]) => key !== 'pago')
                .map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
            <button onClick={() => onToggleExpand(isExpanded ? null : quote.id)}
              className="px-2 py-1 rounded-lg border-none cursor-pointer bg-[#f3f4f6]">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#f3f4f6] text-[13px] text-[#6b7280]">
          {quote.payment_method && (
            <p className="mt-0 mb-2">
              {PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.emoji || '💳'}{' '}
              Pagamento: <strong className="text-[#1F2937]">{PAYMENT_METHODS.find(m => m.value === quote.payment_method)?.label || quote.payment_method}</strong>
              {quote.payment_details && <span> — {quote.payment_details}</span>}
            </p>
          )}
          {quote.negotiated_amount && quote.negotiated_amount !== Number(quote.amount) && (
            <p className="mt-0 mb-2 text-success">
              💰 Valor negociado: <strong>{formatCurrency(quote.negotiated_amount)}</strong>
              <span className="text-[11px] ml-1.5 line-through text-[#9CA3AF]">{formatCurrency(Number(quote.amount))}</span>
            </p>
          )}
          {quote.notes && <p className="mt-0 mb-2">📝 {quote.notes}</p>}
          {quote.scheduled_date && <p className="mt-0 mb-2">📅 Previsão: {new Date(quote.scheduled_date).toLocaleDateString('pt-BR')}</p>}
          {quote.paid_date && <p className="mt-0 mb-2">💰 Pago em: {new Date(quote.paid_date).toLocaleDateString('pt-BR')}</p>}
          {quote.professional?.email && <p className="mt-0 mb-2"><Mail size={12} className="inline align-middle" /> {quote.professional.email}</p>}
          {quote.professional?.recommended_by && <p className="mt-0 mb-2">👤 Indicado por: {quote.professional.recommended_by}</p>}
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px]">
              Adicionado por <span style={{ color: userColor }} className="font-semibold">{USERS.find(u => u.id === quote.created_by)?.name || quote.created_by}</span>
              {' em '}{new Date(quote.created_at).toLocaleDateString('pt-BR')}
            </span>
            <button onClick={() => onDeleteQuote(quote.id)}
              className="px-2 py-1 rounded-md border-none cursor-pointer bg-danger-light text-danger text-xs">
              <Trash2 size={12} className="inline align-middle mr-1" />
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
