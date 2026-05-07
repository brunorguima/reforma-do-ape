'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/constants'
import { useToast } from '@/components/Toast'
import { KpiCard, KpiGrid } from '@/components/ui'
import { StatusBadge, getStatusVariant, getStatusLabel } from '@/components/ui'
import { EmptyState, PanelSkeleton } from '@/components/ui'
import { Modal, FormField, Button } from '@/components/ui'
import {
  ShoppingCart, Package, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Plus, Trash2, Loader2,
  AlertTriangle, Send, User, X, Camera
} from 'lucide-react'

interface MaterialRequestItem {
  id?: string
  name: string
  quantity: number
  unit: string
  estimated_price: number | null
  actual_price?: number | null
  photo_url?: string | null
  notes?: string | null
}

interface MaterialRequest {
  id: string
  project_id: string
  professional_id: string
  request_number: number
  status: 'pendente' | 'aprovado' | 'comprado' | 'recusado' | 'cancelado'
  urgency: 'baixa' | 'normal' | 'urgente'
  title: string
  notes?: string | null
  owner_notes?: string | null
  total_estimated: number
  requested_at: string
  approved_at?: string | null
  purchased_at?: string | null
  created_at: string
  professional?: { id: string; name: string; phone?: string; specialty?: string }
  items?: MaterialRequestItem[]
}

interface Professional {
  id: string
  name: string
  specialty?: string
}

export default function MaterialRequestPanel({ projectId }: { projectId?: string | null }) {
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { toast } = useToast()

  const fetchRequests = useCallback(async () => {
    try {
      const url = projectId
        ? `/api/material-requests?project_id=${projectId}`
        : '/api/material-requests'
      const res = await fetch(url)
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching material requests:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const fetchProfessionals = useCallback(async () => {
    try {
      const url = projectId
        ? `/api/professionals?project_id=${projectId}`
        : '/api/professionals'
      const res = await fetch(url)
      const data = await res.json()
      setProfessionals(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching professionals:', err)
    }
  }, [projectId])

  useEffect(() => {
    fetchRequests()
    fetchProfessionals()
  }, [fetchRequests, fetchProfessionals])

  const handleStatusChange = async (id: string, newStatus: 'aprovado' | 'comprado' | 'recusado') => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/material-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      await fetchRequests()
      const labels = { aprovado: 'aprovado', comprado: 'marcado como comprado', recusado: 'recusado' }
      toast(`Pedido ${labels[newStatus]}!`, newStatus === 'recusado' ? 'warning' : 'success')
    } catch {
      toast('Erro ao atualizar pedido', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este pedido?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/material-requests/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      await fetchRequests()
      toast('Pedido excluido', 'success')
    } catch {
      toast('Erro ao excluir pedido', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter
  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter)

  // KPIs
  const pendentes = requests.filter(r => r.status === 'pendente').length
  const aprovados = requests.filter(r => r.status === 'aprovado').length
  const comprados = requests.filter(r => r.status === 'comprado').length
  const totalEstimado = requests
    .filter(r => r.status === 'pendente' || r.status === 'aprovado')
    .reduce((s, r) => s + Number(r.total_estimated || 0), 0)
  const urgentes = requests.filter(r => r.urgency === 'urgente' && r.status === 'pendente').length

  if (loading) {
    return <PanelSkeleton />
  }

  return (
    <div>
      {/* KPIs */}
      <KpiGrid cols={4}>
        <KpiCard
          label="Pendentes"
          value={pendentes}
          icon={<Clock size={20} />}
          accent="warning"
          sub={urgentes > 0 ? `${urgentes} urgente${urgentes > 1 ? 's' : ''}` : undefined}
        />
        <KpiCard
          label="Aprovados"
          value={aprovados}
          icon={<CheckCircle2 size={20} />}
          accent="success"
        />
        <KpiCard
          label="Comprados"
          value={comprados}
          icon={<ShoppingCart size={20} />}
          accent="info"
        />
        <KpiCard
          label="Custo Pendente"
          value={formatCurrency(totalEstimado)}
          icon={<Package size={20} />}
          accent="primary"
          sub="a aprovar + aprovado"
        />
      </KpiGrid>

      {/* Header with filter + add button */}
      <div className="flex items-center justify-between mt-5 mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pendente', 'aprovado', 'comprado', 'recusado'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] ${
                filter === f
                  ? 'bg-secondary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {f === 'all' ? 'Todos' : getStatusLabel(f)}
              {f !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({requests.filter(r => r.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
        >
          Novo Pedido
        </Button>
      </div>

      {/* Requests List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title={filter === 'all' ? 'Nenhum pedido de material ainda' : `Nenhum pedido ${getStatusLabel(filter).toLowerCase()}`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(req => {
            const isExpanded = expandedId === req.id
            const isLoading = actionLoading === req.id

            return (
              <div key={req.id} className="bg-surface-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div
                  className={`py-3.5 px-4 cursor-pointer flex items-center gap-3 transition-colors ${
                    isExpanded ? 'bg-surface-container-low' : 'bg-surface-lowest'
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                    {req.status === 'pendente' && <Clock size={20} />}
                    {req.status === 'aprovado' && <CheckCircle2 size={20} />}
                    {req.status === 'comprado' && <ShoppingCart size={20} />}
                    {req.status === 'recusado' && <XCircle size={20} />}
                    {req.status === 'cancelado' && <XCircle size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[15px] text-on-surface">
                        #{req.request_number} — {req.title}
                      </span>
                      {req.urgency === 'urgente' && (
                        <StatusBadge label="Urgente" variant="danger" dot={false} size="sm" />
                      )}
                      {req.urgency === 'baixa' && (
                        <StatusBadge label="Baixa" variant="neutral" dot={false} size="sm" />
                      )}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5 flex gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <User size={11} /> {req.professional?.name || 'Profissional'}
                      </span>
                      <span>{new Date(req.created_at).toLocaleDateString('pt-BR')}</span>
                      <span>{req.items?.length || 0} {(req.items?.length || 0) === 1 ? 'item' : 'itens'}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-[15px] text-on-surface">
                      {formatCurrency(Number(req.total_estimated || 0))}
                    </div>
                    <StatusBadge
                      label={getStatusLabel(req.status)}
                      variant={getStatusVariant(req.status)}
                    />
                  </div>

                  {isExpanded ? <ChevronUp size={18} className="text-outline" /> : <ChevronDown size={18} className="text-outline" />}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-outline-variant">
                    {/* Items table */}
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Itens do Pedido
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b-2 border-outline-variant">
                              <th className="text-left py-2 pr-2 text-on-surface-variant font-semibold text-xs">Material</th>
                              <th className="text-center py-2 px-2 text-on-surface-variant font-semibold text-xs">Qtd</th>
                              <th className="text-right py-2 pl-2 text-on-surface-variant font-semibold text-xs">Estimado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(req.items || []).map((item, idx) => (
                              <tr key={idx} className="border-b border-surface-container">
                                <td className="py-2.5 pr-2">
                                  <div className="font-semibold text-on-surface">{item.name}</div>
                                  {item.notes && <div className="text-xs text-outline mt-0.5">{item.notes}</div>}
                                </td>
                                <td className="text-center py-2.5 px-2 whitespace-nowrap text-on-surface-variant">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="text-right py-2.5 pl-2 font-semibold text-on-surface">
                                  {item.estimated_price ? formatCurrency(Number(item.estimated_price)) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Notes */}
                    {req.notes && (
                      <div className="mt-3 p-3 bg-surface-container-low rounded-xl text-[13px] text-on-surface border border-outline-variant">
                        <strong>Obs do profissional:</strong> {req.notes}
                      </div>
                    )}
                    {req.owner_notes && (
                      <div className="mt-2 p-3 bg-surface-container rounded-xl text-[13px] text-on-surface">
                        <strong>Obs do dono:</strong> {req.owner_notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex gap-2 flex-wrap">
                      {req.status === 'pendente' && (
                        <>
                          <Button
                            onClick={() => handleStatusChange(req.id, 'aprovado')}
                            disabled={isLoading}
                            variant="primary"
                            size="md"
                            icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Aprovar
                          </Button>
                          <Button
                            onClick={() => handleStatusChange(req.id, 'recusado')}
                            disabled={isLoading}
                            variant="secondary"
                            size="md"
                            icon={<XCircle size={14} />}
                          >
                            Recusar
                          </Button>
                          <Button
                            onClick={() => handleDelete(req.id)}
                            disabled={isLoading}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                      {req.status === 'aprovado' && (
                        <Button
                          onClick={() => handleStatusChange(req.id, 'comprado')}
                          disabled={isLoading}
                          variant="primary"
                          size="md"
                          icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                        >
                          Marcar como Comprado
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateMaterialRequestModal
          projectId={projectId}
          professionals={professionals}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            fetchRequests()
            toast('Pedido criado com sucesso!', 'success')
          }}
        />
      )}
    </div>
  )
}

// ============= CREATE MODAL =============
function CreateMaterialRequestModal({
  projectId,
  professionals,
  onClose,
  onCreated,
}: {
  projectId?: string | null
  professionals: Professional[]
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id || '')
  const [urgency, setUrgency] = useState<'baixa' | 'normal' | 'urgente'>('normal')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{ name: string; quantity: number; unit: string; estimated_price: string; notes: string }[]>([
    { name: '', quantity: 1, unit: 'un', estimated_price: '', notes: '' },
  ])
  const [saving, setSaving] = useState(false)

  const addItem = () => {
    setItems(prev => [...prev, { name: '', quantity: 1, unit: 'un', estimated_price: '', notes: '' }])
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const totalEstimated = items.reduce((sum, item) => {
    const price = parseFloat(item.estimated_price) || 0
    return sum + item.quantity * price
  }, 0)

  const handleSubmit = async () => {
    if (!title.trim()) return
    if (!professionalId) return
    if (items.length === 0 || !items[0].name.trim()) return

    setSaving(true)
    try {
      const body = {
        project_id: projectId,
        professional_id: professionalId,
        title: title.trim(),
        urgency,
        notes: notes.trim() || null,
        items: items.filter(i => i.name.trim()).map(i => ({
          name: i.name.trim(),
          quantity: i.quantity,
          unit: i.unit,
          estimated_price: parseFloat(i.estimated_price) || null,
          notes: i.notes.trim() || null,
        })),
      }

      const res = await fetch('/api/material-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erro ao criar pedido')
      onCreated()
    } catch {
      alert('Erro ao criar pedido de material')
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = title.trim() && professionalId && items[0]?.name.trim() && !saving

  return (
    <Modal isOpen={true} onClose={onClose} title="Novo Pedido de Material" size="lg" footer={
      <div className="flex items-center justify-between w-full">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total estimado</span>
          <p className="text-lg font-black text-primary">{formatCurrency(totalEstimated)}</p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant="primary"
          size="lg"
          icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        >
          Criar Pedido
        </Button>
      </div>
    }>
      {/* Professional + Urgency */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Profissional" required>
          <select
            value={professionalId}
            onChange={e => setProfessionalId(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-outline-variant bg-surface-lowest text-sm focus:outline-none focus:border-primary"
          >
            {professionals.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` (${p.specialty})` : ''}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Urgencia" required>
          <select
            value={urgency}
            onChange={e => setUrgency(e.target.value as 'baixa' | 'normal' | 'urgente')}
            className="w-full py-2.5 px-3 rounded-xl border border-outline-variant bg-surface-lowest text-sm focus:outline-none focus:border-primary"
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="urgente">Urgente</option>
          </select>
        </FormField>
      </div>

      {/* Title */}
      <FormField label="Titulo do Pedido" required>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Material hidraulico para cozinha"
          className="w-full py-2.5 px-3 rounded-xl border border-outline-variant bg-surface-lowest text-sm focus:outline-none focus:border-primary"
        />
      </FormField>

      {/* Items */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Itens ({items.length})
          </p>
          <Button onClick={addItem} variant="ghost" size="sm" icon={<Plus size={14} />} className="text-secondary">
            Adicionar
          </Button>
        </div>

        <div className="flex flex-col gap-2.5">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant relative">
              <div className="grid grid-cols-[1fr_80px_60px] gap-2 mb-2">
                <input
                  value={item.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                  placeholder="Nome do material"
                  className="py-2 px-3 rounded-xl border border-outline-variant bg-surface-lowest text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder="Qtd"
                  className="py-2 px-3 rounded-xl border border-outline-variant bg-surface-lowest text-sm text-center focus:outline-none focus:border-primary"
                />
                <select
                  value={item.unit}
                  onChange={e => updateItem(idx, 'unit', e.target.value)}
                  className="py-2 px-1.5 rounded-xl border border-outline-variant bg-surface-lowest text-xs focus:outline-none focus:border-primary"
                >
                  <option value="un">un</option>
                  <option value="m">m</option>
                  <option value="m2">m2</option>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="pc">pc</option>
                  <option value="cx">cx</option>
                  <option value="sc">sc</option>
                  <option value="rl">rl</option>
                </select>
              </div>
              <div className="grid grid-cols-[120px_1fr_32px] gap-2 items-center">
                <input
                  type="number"
                  value={item.estimated_price}
                  onChange={e => updateItem(idx, 'estimated_price', e.target.value)}
                  placeholder="R$ preco"
                  className="py-2 px-3 rounded-xl border border-outline-variant bg-surface-lowest text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={item.notes}
                  onChange={e => updateItem(idx, 'notes', e.target.value)}
                  placeholder="Obs (opcional)"
                  className="py-2 px-3 rounded-xl border border-outline-variant bg-surface-lowest text-xs focus:outline-none focus:border-primary"
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 bg-transparent border-none cursor-pointer text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <FormField label="Observacoes" hint="Opcional">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Detalhes adicionais sobre o pedido..."
          rows={2}
          className="w-full py-2.5 px-3 rounded-xl border border-outline-variant bg-surface-lowest text-sm resize-y focus:outline-none focus:border-primary"
        />
      </FormField>
    </Modal>
  )
}
