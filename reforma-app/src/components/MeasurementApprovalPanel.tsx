'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/constants'
import {
  ClipboardCheck, CheckCircle2, Clock, XCircle, DollarSign,
  ChevronDown, ChevronUp, Send, FileText, Upload, Loader2,
  User, AlertTriangle
} from 'lucide-react'

interface MeasurementItem {
  id?: string
  description: string
  type: 'original' | 'extra' | 'discount'
  completion_pct: number
  original_amount: number
  amount: number
}

interface Measurement {
  id: string
  project_id: string
  professional_id: string
  measurement_number: number
  status: 'rascunho' | 'enviada' | 'aprovada' | 'paga'
  total_amount: number
  extras_amount: number
  discounts_amount: number
  net_amount: number
  submitted_at?: string | null
  approved_at?: string | null
  paid_at?: string | null
  receipt_url?: string | null
  notes?: string | null
  owner_notes?: string | null
  created_at: string
  professional?: { id: string; name: string; phone?: string; specialty?: string }
  quote?: { id: string; description: string; amount: number; status: string }
  items?: MeasurementItem[]
}

const STATUS_MAP = {
  rascunho: { label: 'Rascunho', color: '#6B7280', bg: '#F3F4F6', icon: FileText },
  enviada: { label: 'Aguardando', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  aprovada: { label: 'Aprovada', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  paga: { label: 'Paga', color: '#2563EB', bg: '#DBEAFE', icon: DollarSign },
}

export default function MeasurementApprovalPanel({ projectId }: { projectId?: string | null }) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [ownerNotes, setOwnerNotes] = useState<Record<string, string>>({})
  const [receiptUrl, setReceiptUrl] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<string>('all')

  const fetchMeasurements = useCallback(async () => {
    try {
      const url = projectId ? `/api/measurements?project_id=${projectId}` : '/api/measurements'
      const res = await fetch(url)
      const data = await res.json()
      setMeasurements(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching measurements:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeasurements()
  }, [fetchMeasurements])

  const handleAction = async (id: string, action: 'aprovada' | 'paga') => {
    setActionLoading(id)
    try {
      const body: Record<string, unknown> = { status: action }
      if (ownerNotes[id]) body.owner_notes = ownerNotes[id]
      if (action === 'paga' && receiptUrl[id]) body.receipt_url = receiptUrl[id]

      await fetch(`/api/measurements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      await fetchMeasurements()
    } catch (err) {
      console.error('Error updating measurement:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredMeasurements = measurements.filter(m => {
    if (filter === 'all') return true
    return m.status === filter
  })

  // Count by status
  const counts = {
    enviada: measurements.filter(m => m.status === 'enviada').length,
    aprovada: measurements.filter(m => m.status === 'aprovada').length,
    paga: measurements.filter(m => m.status === 'paga').length,
    total: measurements.length,
  }

  if (loading) {
    return (
      <div className="text-center py-15 px-5">
        <Loader2 size={32} className="animate-spin text-[#EA580C]" />
        <p className="text-[#6B7280] mt-3">Carregando medições...</p>
      </div>
    )
  }

  return (
    <div>
      {/* KPI Cards - dynamic bg/border/text based on filter state: must stay inline */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div
          onClick={() => setFilter(filter === 'enviada' ? 'all' : 'enviada')}
          className="rounded-radius-md p-3.5 text-center cursor-pointer transition-all duration-200"
          style={{
            background: filter === 'enviada' ? '#F59E0B' : '#FEF3C7',
            border: filter === 'enviada' ? '2px solid #D97706' : '2px solid transparent',
          }}
        >
          <p className="text-[22px] font-extrabold" style={{ color: filter === 'enviada' ? 'white' : '#D97706' }}>
            {counts.enviada}
          </p>
          <p className="text-[11px] font-semibold" style={{ color: filter === 'enviada' ? 'white' : '#92400E' }}>
            Aguardando
          </p>
        </div>
        <div
          onClick={() => setFilter(filter === 'aprovada' ? 'all' : 'aprovada')}
          className="rounded-radius-md p-3.5 text-center cursor-pointer transition-all duration-200"
          style={{
            background: filter === 'aprovada' ? '#059669' : '#D1FAE5',
            border: filter === 'aprovada' ? '2px solid #047857' : '2px solid transparent',
          }}
        >
          <p className="text-[22px] font-extrabold" style={{ color: filter === 'aprovada' ? 'white' : '#059669' }}>
            {counts.aprovada}
          </p>
          <p className="text-[11px] font-semibold" style={{ color: filter === 'aprovada' ? 'white' : '#065F46' }}>
            Para Pagar
          </p>
        </div>
        <div
          onClick={() => setFilter(filter === 'paga' ? 'all' : 'paga')}
          className="rounded-radius-md p-3.5 text-center cursor-pointer transition-all duration-200"
          style={{
            background: filter === 'paga' ? '#2563EB' : '#DBEAFE',
            border: filter === 'paga' ? '2px solid #1D4ED8' : '2px solid transparent',
          }}
        >
          <p className="text-[22px] font-extrabold" style={{ color: filter === 'paga' ? 'white' : '#2563EB' }}>
            {formatCurrency(measurements.filter(m => m.status === 'paga').reduce((s, m) => s + Number(m.net_amount), 0))}
          </p>
          <p className="text-[11px] font-semibold" style={{ color: filter === 'paga' ? 'white' : '#1E40AF' }}>
            Total Pago
          </p>
        </div>
      </div>

      {/* Filter label */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[13px] text-[#6B7280]">
            Filtrando: <strong>{STATUS_MAP[filter as keyof typeof STATUS_MAP]?.label}</strong>
          </span>
          <button onClick={() => setFilter('all')} className="bg-transparent border-none cursor-pointer text-[#2563EB] text-[13px] font-semibold">
            Ver todas
          </button>
        </div>
      )}

      {/* Measurements List */}
      {filteredMeasurements.length === 0 ? (
        <div className="text-center py-10 px-5">
          <ClipboardCheck size={48} color="#D1D5DB" />
          <h3 className="text-base text-[#6B7280] mt-3">
            {filter !== 'all' ? 'Nenhuma medição neste status' : 'Nenhuma medição recebida'}
          </h3>
          <p className="text-[13px] text-[#9CA3AF]">
            As medições aparecem aqui quando o profissional envia
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredMeasurements.map(m => {
            const statusConfig = STATUS_MAP[m.status]
            const StatusIcon = statusConfig.icon
            const isExpanded = expandedId === m.id
            const items = m.items || []
            const profName = m.professional?.name || 'Profissional'

            return (
              <div key={m.id} className="bg-white rounded-[14px] overflow-hidden" style={{
                border: m.status === 'enviada' ? '2px solid #FCD34D' : `1px solid ${statusConfig.bg}`,
                boxShadow: m.status === 'enviada' ? '0 2px 12px rgba(245,158,11,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="py-3.5 px-4 cursor-pointer flex items-center gap-3"
                  style={{
                    background: m.status === 'enviada' ? '#FFFBEB' : isExpanded ? '#FAFAFA' : 'white',
                  }}
                >
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: statusConfig.bg }}>
                    <StatusIcon size={18} color={statusConfig.color} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#1F2937]">
                        {profName}
                      </span>
                      <span className="text-xs text-[#6B7280]">
                        — Medição #{m.measurement_number}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {m.submitted_at ? `Enviada em ${new Date(m.submitted_at).toLocaleDateString('pt-BR')}` : new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="font-extrabold text-base text-success">
                    {formatCurrency(Number(m.net_amount))}
                  </span>
                  {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#F3F4F6]">
                    {/* Items table */}
                    {items.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center gap-2.5 py-2.5" style={{
                        borderBottom: idx < items.length - 1 ? '1px solid #F3F4F6' : 'none',
                      }}>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded min-w-9 text-center" style={{
                          background: item.type === 'extra' ? '#FEF3C7' : item.type === 'discount' ? '#FEE2E2' : '#F3F4F6',
                          color: item.type === 'extra' ? '#92400E' : item.type === 'discount' ? '#991B1B' : '#374151',
                        }}>
                          {item.type === 'extra' ? 'EXT' : item.type === 'discount' ? 'DESC' : `${item.completion_pct}%`}
                        </span>
                        <span className="flex-1 text-[13px] text-[#374151]">{item.description}</span>
                        <span className="font-semibold text-[13px]" style={{ color: item.type === 'discount' ? '#DC2626' : '#059669' }}>
                          {item.type === 'discount' ? '-' : ''}{formatCurrency(Number(item.amount))}
                        </span>
                      </div>
                    ))}

                    {/* Totals */}
                    <div className="bg-[#F0FDF4] rounded-radius-sm px-3 py-2.5 mt-3">
                      <div className="flex justify-between text-[13px]">
                        <span>Serviços: {formatCurrency(Number(m.total_amount))}</span>
                        {Number(m.extras_amount) > 0 && <span className="text-warning">+Extras: {formatCurrency(Number(m.extras_amount))}</span>}
                        {Number(m.discounts_amount) > 0 && <span className="text-danger">-Desc: {formatCurrency(Number(m.discounts_amount))}</span>}
                      </div>
                      <div className="flex justify-between mt-1.5 pt-1.5 border-t border-[#BBF7D0]">
                        <span className="font-bold text-sm">Total líquido:</span>
                        <span className="font-extrabold text-base text-success">{formatCurrency(Number(m.net_amount))}</span>
                      </div>
                    </div>

                    {/* Professional notes */}
                    {m.notes && (
                      <div className="mt-2.5 px-3 py-2 bg-warning-light rounded-radius-sm text-[13px] text-[#92400E]">
                        <strong>Notas do profissional:</strong> {m.notes}
                      </div>
                    )}

                    {/* Owner actions based on status */}
                    {m.status === 'enviada' && (
                      <div className="mt-4">
                        <textarea
                          value={ownerNotes[m.id] || ''}
                          onChange={e => setOwnerNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="Observações (opcional)..."
                          rows={2}
                          className="w-full mb-2.5 text-sm px-3 py-2.5 rounded-radius-sm border border-[#D1D5DB] resize-y"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(m.id, 'aprovada')}
                            disabled={actionLoading === m.id}
                            className="flex-1 py-3 rounded-[10px] border-none text-white cursor-pointer text-sm font-bold flex items-center justify-center gap-1.5"
                            style={{
                              background: 'linear-gradient(135deg, #059669, #10B981)',
                              boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                            }}
                          >
                            {actionLoading === m.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Aprovar Medição
                          </button>
                        </div>
                      </div>
                    )}

                    {m.status === 'aprovada' && (
                      <div className="mt-4">
                        <div className="mb-2.5 px-3 py-2.5 bg-success-light rounded-radius-sm text-[13px] text-[#065F46] flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Medição aprovada! Registre o pagamento abaixo.
                        </div>
                        <input
                          type="text"
                          value={receiptUrl[m.id] || ''}
                          onChange={e => setReceiptUrl(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="URL do comprovante PIX (opcional)..."
                          className="w-full mb-2.5 text-sm px-3 py-2.5 rounded-radius-sm border border-[#D1D5DB]"
                        />
                        <button
                          onClick={() => handleAction(m.id, 'paga')}
                          disabled={actionLoading === m.id}
                          className="w-full py-3 rounded-[10px] border-none text-white cursor-pointer text-sm font-bold flex items-center justify-center gap-1.5"
                          style={{
                            background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
                            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                          }}
                        >
                          {actionLoading === m.id ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                          Marcar como Paga
                        </button>
                      </div>
                    )}

                    {m.status === 'paga' && (
                      <div className="mt-3 px-3 py-2.5 bg-[#DBEAFE] rounded-radius-sm text-[13px] text-[#1E40AF] flex items-center gap-1.5">
                        <DollarSign size={14} /> Pago em {m.paid_at ? new Date(m.paid_at).toLocaleDateString('pt-BR') : '—'}
                        {m.receipt_url && <span> — Comprovante anexado</span>}
                      </div>
                    )}

                    {m.owner_notes && (
                      <div className="mt-1.5 px-3 py-2 bg-[#DBEAFE] rounded-radius-sm text-[13px] text-[#1E40AF]">
                        <strong>Suas notas:</strong> {m.owner_notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
