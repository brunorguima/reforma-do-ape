'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/constants'
import { useToast } from '@/components/Toast'
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

const STATUS_MAP = {
  pendente: { label: 'Pendente', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  aprovado: { label: 'Aprovado', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  comprado: { label: 'Comprado', color: '#2563EB', bg: '#DBEAFE', icon: ShoppingCart },
  recusado: { label: 'Recusado', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  cancelado: { label: 'Cancelado', color: '#6B7280', bg: '#F3F4F6', icon: XCircle },
}

const URGENCY_MAP = {
  baixa: { label: 'Baixa', color: '#6B7280', bg: '#F3F4F6' },
  normal: { label: 'Normal', color: '#2563EB', bg: '#DBEAFE' },
  urgente: { label: 'Urgente', color: '#DC2626', bg: '#FEE2E2' },
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
      toast('Pedido excluído', 'success')
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="spin text-secondary" />
      </div>
    )
  }

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" data-accent="amber">
          <p className="kpi-label">Pendentes</p>
          <p className="kpi-value">{pendentes}</p>
          {urgentes > 0 && <p className="kpi-sub" style={{ color: '#DC2626' }}>{urgentes} urgente{urgentes > 1 ? 's' : ''}</p>}
        </div>
        <div className="kpi-card" data-accent="green">
          <p className="kpi-label">Aprovados</p>
          <p className="kpi-value">{aprovados}</p>
        </div>
        <div className="kpi-card" data-accent="blue">
          <p className="kpi-label">Comprados</p>
          <p className="kpi-value">{comprados}</p>
        </div>
        <div className="kpi-card" data-accent="indigo">
          <p className="kpi-label">Custo Pendente</p>
          <p className="kpi-value">{formatCurrency(totalEstimado)}</p>
          <p className="kpi-sub">a aprovar + aprovado</p>
        </div>
      </div>

      {/* Header with filter + add button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pendente', 'aprovado', 'comprado', 'recusado'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="user-chip"
              style={{
                background: filter === f ? 'var(--color-primary)' : 'var(--color-surface-container)',
                color: filter === f ? 'white' : 'var(--color-on-surface)',
              }}
            >
              {f === 'all' ? 'Todos' : STATUS_MAP[f as keyof typeof STATUS_MAP].label}
              {f !== 'all' && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  ({requests.filter(r => r.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--color-secondary)', width: 'auto',
          }}
        >
          <Plus size={16} /> Novo Pedido
        </button>
      </div>

      {/* Requests List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Package size={48} style={{ margin: '0 auto 12px', color: 'var(--color-outline)' }} />
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 15 }}>
            {filter === 'all' ? 'Nenhum pedido de material ainda' : `Nenhum pedido ${STATUS_MAP[filter as keyof typeof STATUS_MAP]?.label.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(req => {
            const statusInfo = STATUS_MAP[req.status]
            const urgencyInfo = URGENCY_MAP[req.urgency]
            const StatusIcon = statusInfo.icon
            const isExpanded = expandedId === req.id
            const isLoading = actionLoading === req.id

            return (
              <div key={req.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: statusInfo.bg, color: statusInfo.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <StatusIcon size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-on-surface)' }}>
                        #{req.request_number} — {req.title}
                      </span>
                      {req.urgency === 'urgente' && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                          background: urgencyInfo.bg, color: urgencyInfo.color,
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>
                          <AlertTriangle size={10} /> URGENTE
                        </span>
                      )}
                      {req.urgency === 'baixa' && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                          background: urgencyInfo.bg, color: urgencyInfo.color,
                        }}>
                          Baixa
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <User size={11} /> {req.professional?.name || 'Profissional'}
                      </span>
                      <span>{new Date(req.created_at).toLocaleDateString('pt-BR')}</span>
                      <span>{req.items?.length || 0} {(req.items?.length || 0) === 1 ? 'item' : 'itens'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-on-surface)' }}>
                      {formatCurrency(Number(req.total_estimated || 0))}
                    </div>
                    <span className="status-badge" style={{
                      background: statusInfo.bg, color: statusInfo.color, fontSize: 11,
                    }}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--color-outline)' }} /> : <ChevronDown size={18} style={{ color: 'var(--color-outline)' }} />}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-outline-variant)' }}>
                    {/* Items table */}
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Itens do Pedido
                      </p>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-outline-variant)' }}>
                              <th style={{ textAlign: 'left', padding: '8px 8px 8px 0', color: 'var(--color-on-surface-variant)', fontWeight: 600, fontSize: 12 }}>Material</th>
                              <th style={{ textAlign: 'center', padding: 8, color: 'var(--color-on-surface-variant)', fontWeight: 600, fontSize: 12 }}>Qtd</th>
                              <th style={{ textAlign: 'right', padding: '8px 0 8px 8px', color: 'var(--color-on-surface-variant)', fontWeight: 600, fontSize: 12 }}>Estimado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(req.items || []).map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--color-surface-container)' }}>
                                <td style={{ padding: '10px 8px 10px 0' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{item.name}</div>
                                  {item.notes && <div style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{item.notes}</div>}
                                </td>
                                <td style={{ textAlign: 'center', padding: 8, whiteSpace: 'nowrap' }}>
                                  {item.quantity} {item.unit}
                                </td>
                                <td style={{ textAlign: 'right', padding: '10px 0 10px 8px', fontWeight: 600 }}>
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
                      <div style={{ marginTop: 12, padding: 12, background: 'var(--color-surface-container-low)', borderRadius: 10, fontSize: 13 }}>
                        <strong>Obs do profissional:</strong> {req.notes}
                      </div>
                    )}
                    {req.owner_notes && (
                      <div style={{ marginTop: 8, padding: 12, background: 'var(--color-surface-container)', borderRadius: 10, fontSize: 13 }}>
                        <strong>Obs do dono:</strong> {req.owner_notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {req.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(req.id, 'aprovado')}
                            disabled={isLoading}
                            className="btn-primary"
                            style={{ background: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6, width: 'auto' }}
                          >
                            {isLoading ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleStatusChange(req.id, 'recusado')}
                            disabled={isLoading}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <XCircle size={14} /> Recusar
                          </button>
                          <button
                            onClick={() => handleDelete(req.id)}
                            disabled={isLoading}
                            className="btn-ghost"
                            style={{ color: 'var(--color-danger)', padding: '8px 12px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {req.status === 'aprovado' && (
                        <button
                          onClick={() => handleStatusChange(req.id, 'comprado')}
                          disabled={isLoading}
                          className="btn-primary"
                          style={{ background: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: 6, width: 'auto' }}
                        >
                          {isLoading ? <Loader2 size={14} className="spin" /> : <ShoppingCart size={14} />}
                          Marcar como Comprado
                        </button>
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>
            Novo Pedido de Material
          </h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {/* Professional + Urgency */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 4 }}>
              Profissional
            </label>
            <select
              value={professionalId}
              onChange={e => setProfessionalId(e.target.value)}
            >
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` (${p.specialty})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 4 }}>
              Urgência
            </label>
            <select value={urgency} onChange={e => setUrgency(e.target.value as 'baixa' | 'normal' | 'urgente')}>
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 4 }}>
            Título do Pedido
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Material hidráulico para cozinha"
          />
        </div>

        {/* Items */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
              Itens ({items.length})
            </label>
            <button onClick={addItem} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 13, color: 'var(--color-secondary)', fontWeight: 600 }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{
                padding: 12, background: 'var(--color-surface-container-low)',
                borderRadius: 10, position: 'relative',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: 8, marginBottom: 8 }}>
                  <input
                    value={item.name}
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    placeholder="Nome do material"
                    style={{ fontSize: 14, padding: '8px 10px' }}
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="Qtd"
                    style={{ fontSize: 14, padding: '8px 10px', textAlign: 'center' }}
                  />
                  <select
                    value={item.unit}
                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                    style={{ fontSize: 13, padding: '8px 6px' }}
                  >
                    <option value="un">un</option>
                    <option value="m">m</option>
                    <option value="m²">m²</option>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pç">pç</option>
                    <option value="cx">cx</option>
                    <option value="sc">sc</option>
                    <option value="rl">rl</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 32px', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    value={item.estimated_price}
                    onChange={e => updateItem(idx, 'estimated_price', e.target.value)}
                    placeholder="R$ preço"
                    style={{ fontSize: 14, padding: '8px 10px' }}
                  />
                  <input
                    value={item.notes}
                    onChange={e => updateItem(idx, 'notes', e.target.value)}
                    placeholder="Obs (opcional)"
                    style={{ fontSize: 13, padding: '8px 10px' }}
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(idx)}
                      className="btn-ghost"
                      style={{ padding: 4, color: 'var(--color-danger)' }}
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
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 4 }}>
            Observações (opcional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Detalhes adicionais sobre o pedido..."
            rows={2}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Total + Submit */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 0 0', borderTop: '1px solid var(--color-outline-variant)',
        }}>
          <div>
            <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Total estimado: </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-on-surface)' }}>
              {formatCurrency(totalEstimated)}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !professionalId || !items[0]?.name.trim()}
            className="btn-primary"
            style={{
              background: 'var(--color-secondary)', width: 'auto',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: saving || !title.trim() || !professionalId || !items[0]?.name.trim() ? 0.5 : 1,
            }}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            Criar Pedido
          </button>
        </div>
      </div>
    </div>
  )
}
