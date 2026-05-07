'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/constants'
import { KpiCard, KpiGrid } from '@/components/ui'
import { StatusBadge, getStatusVariant } from '@/components/ui'
import { EmptyState } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  ClipboardCheck, Plus, Send, Trash2, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Percent, DollarSign, FileText,
  Loader2, AlertCircle, Camera, X, Image
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
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

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

  // Upload photo for item
  const handlePhotoUpload = async (index: number, file: File) => {
    setUploadingIdx(index)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'medicoes')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      updateNewItem(index, 'photo_url', data.url)
    } catch (err) {
      console.error('Photo upload error:', err)
      alert('Erro ao enviar foto')
    } finally {
      setUploadingIdx(null)
    }
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

  // Submit measurement (rascunho -> enviada)
  const handleSubmit = async (id: string) => {
    if (!confirm('Enviar esta medicao para o dono aprovar?')) return
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
        <Loader2 size={32} className="animate-spin text-warning mx-auto" />
        <p className="text-on-surface-variant mt-3">Carregando medicoes...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header Stats */}
      <KpiGrid cols={2}>
        <KpiCard
          label="Aguardando Aprovacao"
          value={measurements.filter(m => m.status === 'enviada').length}
          icon={<Clock size={20} />}
          accent="warning"
        />
        <KpiCard
          label="Total Recebido"
          value={formatCurrency(
            measurements.filter(m => m.status === 'paga').reduce((s, m) => s + Number(m.net_amount), 0)
          )}
          icon={<DollarSign size={20} />}
          accent="success"
        />
      </KpiGrid>

      <div className="mt-6" />

      {/* New Measurement Button */}
      {!showNewForm && (
        <button
          onClick={() => { setShowNewForm(true); addNewItem('original') }}
          className="w-full p-3.5 mb-5 bg-secondary text-white border-none rounded-xl text-[15px] font-semibold cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-[0.97] transition-transform"
        >
          <Plus size={20} /> Nova Medicao
        </button>
      )}

      {/* New Measurement Form */}
      {showNewForm && (
        <div className="bg-surface-lowest rounded-2xl p-5 border-2 border-secondary mb-5 shadow-sm">
          <h3 className="text-base font-bold text-primary mb-4 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-secondary" /> Nova Medicao
          </h3>

          {/* Items */}
          {newItems.map((item, idx) => (
            <div key={idx} className={`rounded-xl p-3 mb-2 border ${
              item.type === 'extra'
                ? 'bg-orange-50 border-orange-200'
                : item.type === 'discount'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-surface-container-low border-outline-variant'
            }`}>
              <div className="flex gap-2 items-center mb-2">
                <StatusBadge
                  label={item.type === 'extra' ? 'Extra' : item.type === 'discount' ? 'Desconto' : 'Original'}
                  variant={item.type === 'extra' ? 'warning' : item.type === 'discount' ? 'danger' : 'neutral'}
                  dot={false}
                  size="sm"
                />
                <button onClick={() => removeNewItem(idx)} className="ml-auto bg-transparent border-none cursor-pointer text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              <input
                value={item.description}
                onChange={e => updateNewItem(idx, 'description', e.target.value)}
                placeholder="Descricao do servico..."
                className="w-full mb-2 text-sm py-2.5 px-3 rounded-xl border border-outline-variant bg-surface-lowest focus:outline-none focus:border-primary"
              />

              <div className={`grid gap-2 ${item.type === 'original' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Valor Original (R$)</label>
                  <input
                    type="number"
                    value={item.original_amount || ''}
                    onChange={e => updateNewItem(idx, 'original_amount', Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full text-sm py-2 px-3 rounded-xl border border-outline-variant bg-surface-lowest focus:outline-none focus:border-primary"
                  />
                </div>
                {item.type === 'original' && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Concluido (%)</label>
                    <input
                      type="number"
                      min={0} max={100}
                      value={item.completion_pct}
                      onChange={e => updateNewItem(idx, 'completion_pct', Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full text-sm py-2 px-3 rounded-xl border border-outline-variant bg-surface-lowest focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {item.type === 'original' ? 'Valor Proporcional' : 'Valor'}
                  </label>
                  <input
                    type="number"
                    value={item.amount || ''}
                    onChange={e => updateNewItem(idx, 'amount', Number(e.target.value))}
                    readOnly={item.type === 'original'}
                    className={`w-full text-sm py-2 px-3 rounded-xl border border-outline-variant font-bold text-emerald-600 focus:outline-none focus:border-primary ${
                      item.type === 'original' ? 'bg-surface-container-low' : 'bg-surface-lowest'
                    }`}
                  />
                </div>
              </div>

              {/* Photo upload */}
              <div className="mt-2">
                {item.photo_url ? (
                  <div className="relative inline-block">
                    <img
                      src={item.photo_url}
                      alt="Foto do item"
                      className="w-20 h-20 object-cover rounded-xl border border-outline-variant shadow-sm"
                    />
                    <button
                      onClick={() => updateNewItem(idx, 'photo_url', '')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center border-none cursor-pointer p-0"
                      style={{ fontSize: 10 }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-dashed border-outline cursor-pointer text-[12px] text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
                    {uploadingIdx === idx ? (
                      <><Loader2 size={12} className="animate-spin" /> Enviando...</>
                    ) : (
                      <><Camera size={12} /> Adicionar foto</>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(idx, file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}

          {/* Add item buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => addNewItem('original')} className="py-2 px-3.5 rounded-xl border border-outline-variant bg-surface-lowest cursor-pointer text-[13px] font-semibold flex items-center gap-1 text-on-surface hover:bg-surface-container-low transition-colors active:scale-[0.97]">
              <Plus size={14} /> Item do Orcamento
            </button>
            <button onClick={() => addNewItem('extra')} className="py-2 px-3.5 rounded-xl border border-orange-200 bg-orange-50 cursor-pointer text-[13px] font-semibold flex items-center gap-1 text-orange-800 hover:bg-orange-100 transition-colors active:scale-[0.97]">
              <Plus size={14} /> Extra
            </button>
            <button onClick={() => addNewItem('discount')} className="py-2 px-3.5 rounded-xl border border-red-200 bg-red-50 cursor-pointer text-[13px] font-semibold flex items-center gap-1 text-red-800 hover:bg-red-100 transition-colors active:scale-[0.97]">
              <Percent size={14} /> Desconto
            </button>
          </div>

          {/* Notes */}
          <textarea
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            placeholder="Observacoes (opcional)..."
            rows={2}
            className="w-full mb-4 text-sm py-2.5 px-3 rounded-xl border border-outline-variant bg-surface-lowest resize-y focus:outline-none focus:border-primary"
          />

          {/* Totals */}
          {newItems.length > 0 && (() => {
            const t = calcTotals(newItems)
            return (
              <div className="bg-emerald-50 rounded-xl py-3 px-4 mb-4 border border-emerald-100">
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-on-surface">Servicos originais:</span>
                  <span className="font-semibold">{formatCurrency(t.total)}</span>
                </div>
                {t.extras > 0 && (
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="text-orange-600">+ Extras:</span>
                    <span className="font-semibold text-orange-600">+{formatCurrency(t.extras)}</span>
                  </div>
                )}
                {t.discounts > 0 && (
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="text-red-600">- Descontos:</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(t.discounts)}</span>
                  </div>
                )}
                <div className="border-t border-emerald-200 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-on-surface text-[15px]">Total a receber:</span>
                  <span className="font-black text-emerald-600 text-lg">{formatCurrency(t.net)}</span>
                </div>
              </div>
            )
          })()}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNewForm(false); setNewItems([]); setNewNotes('') }}
              className="flex-1 p-3 rounded-xl border border-outline-variant bg-surface-lowest cursor-pointer text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors active:scale-[0.97]"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || newItems.length === 0 || newItems.some(i => !i.description.trim())}
              className={`flex-[2] p-3 rounded-xl border-none text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all ${
                creating ? 'bg-outline cursor-default' : 'bg-secondary cursor-pointer shadow-sm'
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
        <EmptyState
          icon={<ClipboardCheck size={28} />}
          title="Nenhuma medicao ainda"
          description="Crie sua primeira medicao para registrar o trabalho feito"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {measurements.map(m => {
            const isExpanded = expandedId === m.id
            const items = m.items || []

            return (
              <div key={m.id} className="bg-surface-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className={`py-3.5 px-4 cursor-pointer flex items-center gap-3 transition-colors ${isExpanded ? 'bg-surface-container-low' : 'bg-surface-lowest'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                    {m.status === 'rascunho' && <FileText size={18} />}
                    {m.status === 'enviada' && <Send size={18} />}
                    {m.status === 'aprovada' && <CheckCircle2 size={18} />}
                    {m.status === 'paga' && <DollarSign size={18} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px] text-on-surface">
                        Medicao #{m.measurement_number}
                      </span>
                      <StatusBadge
                        label={m.status === 'rascunho' ? 'Rascunho' : m.status === 'enviada' ? 'Enviada' : m.status === 'aprovada' ? 'Aprovada' : 'Paga'}
                        variant={getStatusVariant(m.status)}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {new Date(m.created_at).toLocaleDateString('pt-BR')} — {items.length} ite{items.length === 1 ? 'm' : 'ns'}
                    </p>
                  </div>
                  <span className="font-black text-base text-emerald-600">
                    {formatCurrency(Number(m.net_amount))}
                  </span>
                  {isExpanded ? <ChevronUp size={18} className="text-outline" /> : <ChevronDown size={18} className="text-outline" />}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-outline-variant">
                    {/* Items */}
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
                    <div className="bg-emerald-50 rounded-xl py-2.5 px-3 mt-3 border border-emerald-100">
                      <div className="flex justify-between text-[13px]">
                        <span>Servicos: {formatCurrency(Number(m.total_amount))}</span>
                        {Number(m.extras_amount) > 0 && <span className="text-orange-600">+Extras: {formatCurrency(Number(m.extras_amount))}</span>}
                        {Number(m.discounts_amount) > 0 && <span className="text-red-600">-Desc: {formatCurrency(Number(m.discounts_amount))}</span>}
                      </div>
                      <div className="flex justify-between mt-1.5 pt-1.5 border-t border-emerald-200">
                        <span className="font-bold text-sm">Liquido:</span>
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
                        <FileText size={14} /> Ver PDF
                      </a>
                    </div>

                    {/* Notes */}
                    {m.notes && (
                      <div className="mt-2.5 py-2 px-3 bg-orange-50 rounded-xl text-[13px] text-orange-800 border border-orange-100">
                        <strong>Suas notas:</strong> {m.notes}
                      </div>
                    )}
                    {m.owner_notes && (
                      <div className="mt-1.5 py-2 px-3 bg-blue-50 rounded-xl text-[13px] text-blue-700 border border-blue-100">
                        <strong>Notas do dono:</strong> {m.owner_notes}
                      </div>
                    )}

                    {/* Receipt */}
                    {m.receipt_url && (
                      <div className="mt-2 py-2 px-3 bg-emerald-50 rounded-xl text-[13px] text-emerald-700 flex items-center gap-1.5 border border-emerald-100">
                        <CheckCircle2 size={14} /> Comprovante anexado
                      </div>
                    )}

                    {/* Actions */}
                    {m.status === 'rascunho' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="flex-1 p-2.5 rounded-xl border border-red-200 bg-red-50 cursor-pointer text-[13px] font-semibold text-red-600 flex items-center justify-center gap-1 hover:bg-red-100 transition-colors active:scale-[0.97]"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                        <button
                          onClick={() => handleSubmit(m.id)}
                          disabled={submitting === m.id}
                          className="flex-[2] p-2.5 rounded-xl border-none bg-secondary text-white cursor-pointer text-[13px] font-semibold flex items-center justify-center gap-1 shadow-sm active:scale-[0.97] transition-all"
                        >
                          {submitting === m.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Enviar para Aprovacao
                        </button>
                      </div>
                    )}

                    {m.status === 'enviada' && (
                      <div className="mt-3 py-2.5 px-3 bg-orange-50 rounded-xl text-[13px] text-orange-800 flex items-center gap-1.5 border border-orange-100">
                        <Clock size={14} /> Aguardando aprovacao do proprietario...
                      </div>
                    )}

                    {m.status === 'aprovada' && (
                      <div className="mt-3 py-2.5 px-3 bg-emerald-50 rounded-xl text-[13px] text-emerald-700 flex items-center gap-1.5 border border-emerald-100">
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
