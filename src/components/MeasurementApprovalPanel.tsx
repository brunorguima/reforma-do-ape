'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/constants'
import { KpiCard, KpiGrid } from '@/components/ui'
import { StatusBadge, getStatusVariant } from '@/components/ui'
import { EmptyState, PanelSkeleton } from '@/components/ui'
import {
  ClipboardCheck, CheckCircle2, Clock, XCircle, DollarSign,
  ChevronDown, ChevronUp, Send, FileText, Upload, Loader2,
  User, AlertTriangle, Download
} from 'lucide-react'

interface MeasurementItem {
  id?: string
  description: string
  type: 'original' | 'extra' | 'discount'
  completion_pct: number
  original_amount: number
  amount: number
  photo_url?: string | null
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

  if (loading) return <PanelSkeleton />

  return (
    <div>
      {/* KPI Cards - clickable filter */}
      <KpiGrid cols={3}>
        <div onClick={() => setFilter(filter === 'enviada' ? 'all' : 'enviada')} className="cursor-pointer">
          <KpiCard
            label="Aguardando"
            value={counts.enviada}
            icon={<Clock size={20} />}
            accent="warning"
          />
        </div>
        <div onClick={() => setFilter(filter === 'aprovada' ? 'all' : 'aprovada')} className="cursor-pointer">
          <KpiCard
            label="Para Pagar"
            value={counts.aprovada}
            icon={<CheckCircle2 size={20} />}
            accent="success"
          />
        </div>
        <div onClick={() => setFilter(filter === 'paga' ? 'all' : 'paga')} className="cursor-pointer">
          <KpiCard
            label="Total Pago"
            value={formatCurrency(measurements.filter(m => m.status === 'paga').reduce((s, m) => s + Number(m.net_amount), 0))}
            icon={<DollarSign size={20} />}
            accent="info"
          />
        </div>
      </KpiGrid>

      {/* Filter label */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2 mt-4 mb-3">
          <span className="text-[13px] text-on-surface-variant">
            Filtrando: <strong>{filter === 'enviada' ? 'Aguardando' : filter === 'aprovada' ? 'Aprovada' : 'Paga'}</strong>
          </span>
          <button onClick={() => setFilter('all')} className="bg-transparent border-none cursor-pointer text-primary text-[13px] font-semibold hover:underline">
            Ver todas
          </button>
        </div>
      )}

      <div className="mt-5" />

      {/* Measurements List */}
      {filteredMeasurements.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={28} />}
          title={filter !== 'all' ? 'Nenhuma aprovação neste status' : 'Nenhuma aprovação pendente'}
          description="As aprovações aparecem aqui quando o profissional envia o serviço"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredMeasurements.map(m => {
            const isExpanded = expandedId === m.id
            const items = m.items || []
            const profName = m.professional?.name || 'Profissional'

            return (
              <div key={m.id} className={`bg-surface-lowest rounded-2xl overflow-hidden shadow-sm ${
                m.status === 'enviada'
                  ? 'border-2 border-orange-300 shadow-md'
                  : 'border border-outline-variant'
              }`}>
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className={`py-3.5 px-4 cursor-pointer flex items-center gap-3 transition-colors ${
                    m.status === 'enviada' ? 'bg-orange-50/50' : isExpanded ? 'bg-surface-container-low' : 'bg-surface-lowest'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                    {m.status === 'rascunho' && <FileText size={18} />}
                    {m.status === 'enviada' && <Clock size={18} />}
                    {m.status === 'aprovada' && <CheckCircle2 size={18} />}
                    {m.status === 'paga' && <DollarSign size={18} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-on-surface">
                        {profName}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        — Medicao #{m.measurement_number}
                      </span>
                      <StatusBadge
                        label={m.status === 'enviada' ? 'Aguardando' : m.status === 'aprovada' ? 'Aprovada' : m.status === 'paga' ? 'Paga' : 'Rascunho'}
                        variant={getStatusVariant(m.status)}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {m.submitted_at ? `Enviada em ${new Date(m.submitted_at).toLocaleDateString('pt-BR')}` : new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="font-black text-base text-emerald-600">
                    {formatCurrency(Number(m.net_amount))}
                  </span>
                  {isExpanded ? <ChevronUp size={18} className="text-outline" /> : <ChevronDown size={18} className="text-outline" />}
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-outline-variant">
                    {/* Items table */}
                    {items.map((item, idx) => (
                      <div key={item.id || idx} className={`flex items-center gap-2.5 py-2.5 ${
                        idx < items.length - 1 ? 'border-b border-surface-container' : ''
                      }`}>
                        <StatusBadge
                          label={item.type === 'extra' ? 'EXT' : item.type === 'discount' ? 'DESC' : `${item.completion_pct}%`}
                          variant={item.type === 'extra' ? 'warning' : item.type === 'discount' ? 'danger' : 'neutral'}
                          dot={false}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] text-on-surface">{item.description}</span>
                          {item.photo_url && (
                            <div className="mt-1">
                              <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={item.photo_url}
                                  alt="Foto"
                                  className="w-14 h-14 object-cover rounded-xl border border-outline-variant shadow-sm hover:opacity-80 transition-opacity"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                        <span className={`font-semibold text-[13px] flex-shrink-0 ${item.type === 'discount' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {item.type === 'discount' ? '-' : ''}{formatCurrency(Number(item.amount))}
                        </span>
                      </div>
                    ))}

                    {/* Totals */}
                    <div className="bg-emerald-50 rounded-xl px-3 py-2.5 mt-3 border border-emerald-100">
                      <div className="flex justify-between text-[13px]">
                        <span>Servicos: {formatCurrency(Number(m.total_amount))}</span>
                        {Number(m.extras_amount) > 0 && <span className="text-orange-600">+Extras: {formatCurrency(Number(m.extras_amount))}</span>}
                        {Number(m.discounts_amount) > 0 && <span className="text-red-600">-Desc: {formatCurrency(Number(m.discounts_amount))}</span>}
                      </div>
                      <div className="flex justify-between mt-1.5 pt-1.5 border-t border-emerald-200">
                        <span className="font-bold text-sm">Total liquido:</span>
                        <span className="font-black text-base text-emerald-600">{formatCurrency(Number(m.net_amount))}</span>
                      </div>
                    </div>

                    {/* PDF button */}
                    <div className="mt-3">
                      <a
                        href={`/api/measurements/${m.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-[13px] font-semibold transition-colors bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 no-underline active:scale-[0.97]"
                      >
                        <Download size={14} /> Gerar PDF
                      </a>
                    </div>

                    {/* Professional notes */}
                    {m.notes && (
                      <div className="mt-2.5 px-3 py-2 bg-orange-50 rounded-xl text-[13px] text-orange-800 border border-orange-100">
                        <strong>Notas do profissional:</strong> {m.notes}
                      </div>
                    )}

                    {/* Owner actions based on status */}
                    {m.status === 'enviada' && (
                      <div className="mt-4">
                        <textarea
                          value={ownerNotes[m.id] || ''}
                          onChange={e => setOwnerNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="Observacoes (opcional)..."
                          rows={2}
                          className="w-full mb-2.5 text-sm px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-lowest resize-y focus:outline-none focus:border-primary"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(m.id, 'aprovada')}
                            disabled={actionLoading === m.id}
                            className="flex-1 py-3 rounded-xl border-none text-white cursor-pointer text-sm font-semibold flex items-center justify-center gap-1.5 bg-emerald-600 shadow-sm hover:bg-emerald-700 transition-colors active:scale-[0.97]"
                          >
                            {actionLoading === m.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Aprovar Medicao
                          </button>
                        </div>
                      </div>
                    )}

                    {m.status === 'aprovada' && (
                      <div className="mt-4">
                        <div className="mb-2.5 px-3 py-2.5 bg-emerald-50 rounded-xl text-[13px] text-emerald-700 flex items-center gap-1.5 border border-emerald-100">
                          <CheckCircle2 size={14} /> Medicao aprovada! Registre o pagamento abaixo.
                        </div>
                        <input
                          type="text"
                          value={receiptUrl[m.id] || ''}
                          onChange={e => setReceiptUrl(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="URL do comprovante PIX (opcional)..."
                          className="w-full mb-2.5 text-sm px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-lowest focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleAction(m.id, 'paga')}
                          disabled={actionLoading === m.id}
                          className="w-full py-3 rounded-xl border-none text-white cursor-pointer text-sm font-semibold flex items-center justify-center gap-1.5 bg-blue-600 shadow-sm hover:bg-blue-700 transition-colors active:scale-[0.97]"
                        >
                          {actionLoading === m.id ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                          Marcar como Paga
                        </button>
                      </div>
                    )}

                    {m.status === 'paga' && (
                      <div className="mt-3 px-3 py-2.5 bg-blue-50 rounded-xl text-[13px] text-blue-700 flex items-center gap-1.5 border border-blue-100">
                        <DollarSign size={14} /> Pago em {m.paid_at ? new Date(m.paid_at).toLocaleDateString('pt-BR') : '—'}
                        {m.receipt_url && <span> — Comprovante anexado</span>}
                      </div>
                    )}

                    {m.owner_notes && (
                      <div className="mt-1.5 px-3 py-2 bg-blue-50 rounded-xl text-[13px] text-blue-700 border border-blue-100">
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
