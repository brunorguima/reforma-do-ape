'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/constants'
import {
  ClipboardCheck, Plus, Send, Trash2, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Percent, DollarSign, FileText,
  Loader2, AlertCircle
} from 'lucide-react'

interface MeasurementItem {
  id?: string
  measurement_id?: string
  item_index?: number | null
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
  quote_id?: string | null
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
  updated_at: string
  professional?: { id: string; name: string; phone?: string; specialty?: string }
  quote?: { id: string; description: string; amount: number; status: string }
  items?: MeasurementItem[]
}

interface Props {
  professionalId: string
  projectId: string
}

const STATUS_MAP = {
  rascunho: { label: 'Rascunho', color: '#6B7280', bg: '#F3F4F6', icon: FileText },
  enviada: { label: 'Enviada', color: '#D97706', bg: '#FEF3C7', icon: Send },
  aprovada: { label: 'Aprovada', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  paga: { label: 'Paga', color: '#2563EB', bg: '#DBEAFE', icon: DollarSign },
}

export default function MeasurementPanel({ professionalId, projectId }: Props) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  // New measurement form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newItems, setNewItems] = useState<MeasurementItem[]>([])
  const [newNotes, setNewNotes] = useState('')

  const fetchMeasurements = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/measurements?project_id=${projectId}&professional_id=${professionalId}`
      )
      const data = await res.json()
      setMeasurements(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching measurements:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, professionalId])

  useEffect(() => {
    fetchMeasurements()
  }, [fetchMeasurements])

  // Calculate totals for items
  const calcTotals = (items: MeasurementItem[]) => {
    let total = 0, extras = 0, discounts = 0
    items.forEach(item => {
      const val = item.amount || 0
      if (item.type === 'extra') extras += val
      else if (item.type === 'discount') discounts += val
      else total += val
    })
    return { total, extras, discounts, net: total + extras - discounts }
  }

  // Add new item to form
  const addNewItem = (type: 'original' | 'extra' | 'discount') => {
    setNewItems(prev => [...prev, {
      description: '',
      type,
      completion_pct: type === 'original' ? 100 : 0,
      original_amount: 0,
      amount: 0,
    }])
  }

  const updateNewItem = (index: number, field: string, value: string | number) => {
    setNewItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Auto-calc amount based on completion %
      if (field === 'completion_pct' || field === 'original_amount') {
        const item = updated[index]
        if (item.type === 'original') {
          item.amount = (item.original_amount * item.completion_pct) / 100
        }
      }
      return updated
    })
  }

  const removeNewItem = (index: number) => {
    setNewItems(prev => prev.filter((_, i) => i !== index))
  }

  // Create measurement
  const handleCreate = async () => {
    if (newItems.length === 0) return
    setCreating(true)
    try {
      const totals = calcTotals(newItems)
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          professional_id: professionalId,
          status: 'rascunho',
          total_amount: totals.total,
          extras_amount: totals.extras,
          discounts_amount: totals.discounts,
          net_amount: totals.net,
          notes: newNotes || null,
          items: newItems,
        }),
      })
      if (res.ok) {
        setShowNewForm(false)
        setNewItems([])
        setNewNotes('')
        await fetchMeasurements()
      }
    } catch (err) {
      console.error('Error creating measurement:', err)
    } finally {
      setCreating(false)
    }
  }

  // Submit measurement (rascunho → enviada)
  const handleSubmit = async (id: string) => {
    if (!confirm('Enviar esta medição para o dono aprovar?')) return
    setSubmitting(id)
    try {
      await fetch(`/api/measurements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'enviada' }),
      })
      await fetchMeasurements()
    } catch (err) {
      console.error('Error submitting measurement:', err)
    } finally {
      setSubmitting(null)
    }
  }

  // Delete draft
  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este rascunho?')) return
    try {
      await fetch(`/api/measurements/${id}`, { method: 'DELETE' })
      await fetchMeasurements()
    } catch (err) {
      console.error('Error deleting measurement:', err)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-15 px-5">
        <Loader2 size={32} className="animate-spin text-warning" />
        <p className="text-[#6B7280] mt-3">Carregando medições...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-warning-light rounded-md p-4 text-center">
          <p className="text-2xl font-[800] text-warning">
            {measurements.filter(m => m.status === 'enviada').length}
          </p>
          <p className="text-xs text-[#92400E] font-semibold">Aguardando Aprovação</p>
        </div>
        <div className="bg-success-light rounded-md p-4 text-center">
          <p className="text-2xl font-[800] text-success">
            {formatCurrency(
              measurements.filter(m => m.status === 'paga').reduce((s, m) => s + Number(m.net_amount), 0)
            )}
          </p>
          <p className="text-xs text-[#065F46] font-semibold">Total Recebido</p>
        </div>
      </div>

      {/* New Measurement Button */}
      {!showNewForm && (
        <button
          onClick={() => { setShowNewForm(true); addNewItem('original') }}
          className="w-full p-3.5 mb-5 bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-white border-none rounded-md text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(217,119,6,0.3)]"
        >
          <Plus size={20} /> Nova Medição
        </button>
      )}

      {/* New Measurement Form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl p-5 border-2 border-[#F59E0B] mb-5 shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
          <h3 className="text-base font-bold text-[#1F2937] mb-4 flex items-center gap-2">
            <ClipboardCheck size={20} color="#D97706" /> Nova Medição
          </h3>

          {/* Items */}
          {newItems.map((item, idx) => (
            <div key={idx} className={`rounded-[10px] p-3 mb-2 border ${
              item.type === 'extra'
                ? 'bg-warning-light border-[#FCD34D]'
                : item.type === 'discount'
                  ? 'bg-danger-light border-[#FCA5A5]'
                  : 'bg-[#F9FAFB] border-[#E5E7EB]'
            }`}>
              <div className="flex gap-2 items-center mb-2">
                <span className={`text-[10px] font-bold py-0.5 px-2 rounded ${
                  item.type === 'extra'
                    ? 'bg-[#D97706] text-white'
                    : item.type === 'discount'
                      ? 'bg-danger text-white'
                      : 'bg-[#6B7280] text-white'
                }`}>
                  {item.type === 'extra' ? 'EXTRA' : item.type === 'discount' ? 'DESCONTO' : 'ORIGINAL'}
                </span>
                <button onClick={() => removeNewItem(idx)} className="ml-auto bg-none border-none cursor-pointer text-[#EF4444]">
                  <Trash2 size={14} />
                </button>
              </div>

              <input
                value={item.description}
                onChange={e => updateNewItem(idx, 'description', e.target.value)}
                placeholder="Descrição do serviço..."
                className="w-full mb-2 text-sm py-2 px-3 rounded-sm border border-[#D1D5DB]"
              />

              <div className={`grid gap-2 ${item.type === 'original' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <label className="text-[11px] text-[#6B7280] font-semibold">Valor Original (R$)</label>
                  <input
                    type="number"
                    value={item.original_amount || ''}
                    onChange={e => updateNewItem(idx, 'original_amount', Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full text-sm py-2 px-3 rounded-sm border border-[#D1D5DB]"
                  />
                </div>
                {item.type === 'original' && (
                  <div>
                    <label className="text-[11px] text-[#6B7280] font-semibold">Concluído (%)</label>
                    <input
                      type="number"
                      min={0} max={100}
                      value={item.completion_pct}
                      onChange={e => updateNewItem(idx, 'completion_pct', Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full text-sm py-2 px-3 rounded-sm border border-[#D1D5DB]"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[11px] text-[#6B7280] font-semibold">
                    {item.type === 'original' ? 'Valor Proporcional' : 'Valor'}
                  </label>
                  <input
                    type="number"
                    value={item.amount || ''}
                    onChange={e => updateNewItem(idx, 'amount', Number(e.target.value))}
                    readOnly={item.type === 'original'}
                    className={`w-full text-sm py-2 px-3 rounded-sm border border-[#D1D5DB] font-bold text-success ${
                      item.type === 'original' ? 'bg-[#F3F4F6]' : 'bg-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add item buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => addNewItem('original')} className="py-2 px-3.5 rounded-sm border border-[#D1D5DB] bg-white cursor-pointer text-[13px] font-semibold flex items-center gap-1 text-[#374151]">
              <Plus size={14} /> Item do Orçamento
            </button>
            <button onClick={() => addNewItem('extra')} className="py-2 px-3.5 rounded-sm border border-[#FCD34D] bg-warning-light cursor-pointer text-[13px] font-semibold flex items-center gap-1 text-[#92400E]">
              <Plus size={14} /> Extra
            </button>
            <button onClick={() => addNewItem('discount')} className="py-2 px-3.5 rounded-sm border border-[#FCA5A5] bg-danger-light cursor-pointer text-[13px] font-semibold flex items-center gap-1 text-[#991B1B]">
              <Percent size={14} /> Desconto
            </button>
          </div>

          {/* Notes */}
          <textarea
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            placeholder="Observações (opcional)..."
            rows={2}
            className="w-full mb-4 text-sm py-2.5 px-3 rounded-sm border border-[#D1D5DB] resize-y"
          />

          {/* Totals */}
          {newItems.length > 0 && (() => {
            const t = calcTotals(newItems)
            return (
              <div className="bg-[#F0FDF4] rounded-[10px] py-3 px-4 mb-4">
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[#374151]">Serviços originais:</span>
                  <span className="font-semibold">{formatCurrency(t.total)}</span>
                </div>
                {t.extras > 0 && (
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="text-warning">+ Extras:</span>
                    <span className="font-semibold text-warning">+{formatCurrency(t.extras)}</span>
                  </div>
                )}
                {t.discounts > 0 && (
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="text-danger">- Descontos:</span>
                    <span className="font-semibold text-danger">-{formatCurrency(t.discounts)}</span>
                  </div>
                )}
                <div className="border-t border-[#BBF7D0] pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-[#1F2937] text-[15px]">Total a receber:</span>
                  <span className="font-[800] text-success text-lg">{formatCurrency(t.net)}</span>
                </div>
              </div>
            )
          })()}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNewForm(false); setNewItems([]); setNewNotes('') }}
              className="flex-1 p-3 rounded-[10px] border border-[#D1D5DB] bg-white cursor-pointer text-sm font-semibold text-[#374151]"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || newItems.length === 0 || newItems.some(i => !i.description.trim())}
              className={`flex-[2] p-3 rounded-[10px] border-none text-white text-sm font-bold flex items-center justify-center gap-1.5 ${
                creating ? 'bg-[#9CA3AF] cursor-default' : 'bg-gradient-to-br from-[#D97706] to-[#F59E0B] cursor-pointer'
              }`}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
              Salvar Rascunho
            </button>
          </div>
        </div>
      )}

      {/* Measurements List */}
      {measurements.length === 0 && !showNewForm ? (
        <div className="text-center py-10 px-5">
          <ClipboardCheck size={48} color="#D1D5DB" />
          <h3 className="text-base text-[#6B7280] mt-3">Nenhuma medição ainda</h3>
          <p className="text-[13px] text-[#9CA3AF]">Crie sua primeira medição para registrar o trabalho feito</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {measurements.map(m => {
            const statusConfig = STATUS_MAP[m.status]
            const StatusIcon = statusConfig.icon
            const isExpanded = expandedId === m.id
            const items = m.items || []

            return (
              <div key={m.id} className="bg-white rounded-[14px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                style={{ border: `1px solid ${m.status === 'rascunho' ? '#E5E7EB' : statusConfig.bg}` }}
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className={`py-3.5 px-4 cursor-pointer flex items-center gap-3 ${isExpanded ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                    style={{ background: statusConfig.bg }}
                  >
                    <StatusIcon size={18} style={{ color: statusConfig.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px] text-[#1F2937]">
                        Medição #{m.measurement_number}
                      </span>
                      <span className="text-[11px] font-semibold py-0.5 px-2 rounded-[6px]"
                        style={{ background: statusConfig.bg, color: statusConfig.color }}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {new Date(m.created_at).toLocaleDateString('pt-BR')} — {items.length} ite{items.length === 1 ? 'm' : 'ns'}
                    </p>
                  </div>
                  <span className="font-[800] text-base text-success">
                    {formatCurrency(Number(m.net_amount))}
                  </span>
                  {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#F3F4F6]">
                    {/* Items */}
                    {items.map((item, idx) => (
                      <div key={item.id || idx} className={`flex items-center gap-2.5 py-2.5 ${
                        idx < items.length - 1 ? 'border-b border-[#F3F4F6]' : ''
                      }`}>
                        <span className={`text-[10px] font-bold py-0.5 px-1.5 rounded ${
                          item.type === 'extra'
                            ? 'bg-warning-light text-[#92400E]'
                            : item.type === 'discount'
                              ? 'bg-danger-light text-[#991B1B]'
                              : 'bg-[#F3F4F6] text-[#374151]'
                        }`}>
                          {item.type === 'extra' ? 'EXT' : item.type === 'discount' ? 'DESC' : `${item.completion_pct}%`}
                        </span>
                        <span className="flex-1 text-[13px] text-[#374151]">{item.description}</span>
                        <span className={`font-semibold text-[13px] ${item.type === 'discount' ? 'text-danger' : 'text-success'}`}>
                          {item.type === 'discount' ? '-' : ''}{formatCurrency(Number(item.amount))}
                        </span>
                      </div>
                    ))}

                    {/* Totals */}
                    <div className="bg-[#F0FDF4] rounded-sm py-2.5 px-3 mt-3">
                      <div className="flex justify-between text-[13px]">
                        <span>Serviços: {formatCurrency(Number(m.total_amount))}</span>
                        {Number(m.extras_amount) > 0 && <span className="text-warning">+Extras: {formatCurrency(Number(m.extras_amount))}</span>}
                        {Number(m.discounts_amount) > 0 && <span className="text-danger">-Desc: {formatCurrency(Number(m.discounts_amount))}</span>}
                      </div>
                      <div className="flex justify-between mt-1.5 pt-1.5 border-t border-[#BBF7D0]">
                        <span className="font-bold text-sm">Líquido:</span>
                        <span className="font-[800] text-base text-success">{formatCurrency(Number(m.net_amount))}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {m.notes && (
                      <div className="mt-2.5 py-2 px-3 bg-warning-light rounded-sm text-[13px] text-[#92400E]">
                        <strong>Suas notas:</strong> {m.notes}
                      </div>
                    )}
                    {m.owner_notes && (
                      <div className="mt-1.5 py-2 px-3 bg-[#DBEAFE] rounded-sm text-[13px] text-[#1E40AF]">
                        <strong>Notas do dono:</strong> {m.owner_notes}
                      </div>
                    )}

                    {/* Receipt */}
                    {m.receipt_url && (
                      <div className="mt-2 py-2 px-3 bg-success-light rounded-sm text-[13px] text-[#065F46] flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Comprovante anexado
                      </div>
                    )}

                    {/* Actions */}
                    {m.status === 'rascunho' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="flex-1 p-2.5 rounded-sm border border-[#FCA5A5] bg-[#FEF2F2] cursor-pointer text-[13px] font-semibold text-danger flex items-center justify-center gap-1"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                        <button
                          onClick={() => handleSubmit(m.id)}
                          disabled={submitting === m.id}
                          className="flex-[2] p-2.5 rounded-sm border-none bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-white cursor-pointer text-[13px] font-bold flex items-center justify-center gap-1"
                        >
                          {submitting === m.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Enviar para Aprovação
                        </button>
                      </div>
                    )}

                    {m.status === 'enviada' && (
                      <div className="mt-3 py-2.5 px-3 bg-warning-light rounded-sm text-[13px] text-[#92400E] flex items-center gap-1.5">
                        <Clock size={14} /> Aguardando aprovação do proprietário...
                      </div>
                    )}

                    {m.status === 'aprovada' && (
                      <div className="mt-3 py-2.5 px-3 bg-success-light rounded-sm text-[13px] text-[#065F46] flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Aprovada! Aguardando pagamento...
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
