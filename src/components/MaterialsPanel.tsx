'use client'
import { useState, useEffect, useCallback } from 'react'
import type { UserID } from '@/lib/constants'
import { apiUrl, withProjectId } from '@/lib/project-client'
import {
  Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp,
  ShoppingCart, Package, ExternalLink,
} from 'lucide-react'

interface Material {
  id: string
  name: string
  description?: string
  category: string
  quantity: number
  unit_price: number
  total_price: number
  store?: string
  purchase_url?: string
  purchased_by: string
  purchase_date: string
  receipt_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

const MATERIAL_CATEGORIES = [
  { value: 'eletrica', label: 'Elétrica', emoji: '⚡' },
  { value: 'hidraulica', label: 'Hidráulica', emoji: '🚿' },
  { value: 'acabamento', label: 'Acabamento', emoji: '✨' },
  { value: 'pintura', label: 'Pintura', emoji: '🎨' },
  { value: 'alvenaria', label: 'Alvenaria', emoji: '🧱' },
  { value: 'piso', label: 'Piso/Revestimento', emoji: '🏗️' },
  { value: 'iluminacao', label: 'Iluminação', emoji: '💡' },
  { value: 'marcenaria', label: 'Marcenaria', emoji: '🪚' },
  { value: 'ferragem', label: 'Ferragem', emoji: '🔩' },
  { value: 'limpeza', label: 'Limpeza', emoji: '🧹' },
  { value: 'ferramentas', label: 'Ferramentas', emoji: '🔧' },
  { value: 'outro', label: 'Outro', emoji: '📦' },
]

const fmtBRL = (v: number | null) => v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—'
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

interface Props {
  currentUser: UserID
  projectId?: string | null
}

export default function MaterialsPanel({ currentUser, projectId }: Props) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null)
  const [editMaterialForm, setEditMaterialForm] = useState<Partial<Material>>({})
  const [filterMaterialCategory, setFilterMaterialCategory] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [newMaterial, setNewMaterial] = useState({
    name: '', description: '', category: 'outro', quantity: '1', unit_price: '', store: '',
    purchase_url: '', purchased_by: currentUser === 'graziela' ? 'Graziela' : 'Bruno',
    purchase_date: new Date().toISOString().split('T')[0], notes: ''
  })

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/materials', projectId))
      const data = await res.json()
      setMaterials(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erro ao carregar materiais:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  const materialsTotal = materials.reduce((s, m) => s + m.total_price, 0)
  const filteredMaterials = materials.filter(m => !filterMaterialCategory || m.category === filterMaterialCategory)
  const materialsByCategory = filteredMaterials.reduce<Record<string, Material[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})

  const handleAddMaterial = async () => {
    setFormError('')
    if (!newMaterial.name.trim()) { setFormError('Nome do material é obrigatório'); return }
    if (!newMaterial.unit_price || isNaN(Number(newMaterial.unit_price))) { setFormError('Valor unitário inválido'); return }
    setSaving(true)
    try {
      const res = await fetch(apiUrl('/api/materials', projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          ...newMaterial,
          quantity: Number(newMaterial.quantity) || 1,
          unit_price: Number(newMaterial.unit_price),
        }, projectId)),
      })
      if (!res.ok) { const err = await res.json(); setFormError(err.error || 'Erro ao salvar'); return }
      setNewMaterial({
        name: '', description: '', category: 'outro', quantity: '1', unit_price: '', store: '',
        purchase_url: '', purchased_by: currentUser === 'graziela' ? 'Graziela' : 'Bruno',
        purchase_date: new Date().toISOString().split('T')[0], notes: ''
      })
      setShowAddMaterial(false)
      setFormError('')
      await fetchMaterials()
    } catch { setFormError('Erro de conexão') }
    finally { setSaving(false) }
  }

  const handleEditMaterial = (mat: Material) => {
    setEditingMaterial(mat.id)
    setEditMaterialForm({ ...mat })
  }

  const handleSaveMaterial = async () => {
    if (!editingMaterial) return
    try {
      await fetch(apiUrl(`/api/materials/${editingMaterial}`, projectId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          name: editMaterialForm.name,
          description: editMaterialForm.description,
          category: editMaterialForm.category,
          quantity: Number(editMaterialForm.quantity) || 1,
          unit_price: Number(editMaterialForm.unit_price) || 0,
          total_price: (Number(editMaterialForm.quantity) || 1) * (Number(editMaterialForm.unit_price) || 0),
          store: editMaterialForm.store,
          purchase_url: editMaterialForm.purchase_url,
          purchased_by: editMaterialForm.purchased_by,
          purchase_date: editMaterialForm.purchase_date,
          notes: editMaterialForm.notes,
        }, projectId)),
      })
      setEditingMaterial(null)
      setEditMaterialForm({})
      await fetchMaterials()
    } catch (err) { console.error(err) }
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Excluir este material?')) return
    try {
      await fetch(apiUrl(`/api/materials/${id}`, projectId), { method: 'DELETE' })
      await fetchMaterials()
    } catch (err) { console.error(err) }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>
        <p style={{ fontSize: '13px' }}>Carregando materiais...</p>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={18} /> Materiais Comprados
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280', background: '#F3F4F6', borderRadius: '12px', padding: '2px 8px' }}>
            {materials.length} · {fmtBRL(materialsTotal)}
          </span>
        </h3>
        <button
          onClick={() => { setShowAddMaterial(true); setFormError('') }}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px',
            background: '#059669', color: 'white', border: 'none', borderRadius: '10px',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
          <Plus size={14} /> Novo Material
        </button>
      </div>

      {/* Add Material Modal */}
      {showAddMaterial && (
        <div style={{
          background: 'white', borderRadius: '14px', padding: '20px', marginBottom: '16px',
          border: '2px solid #059669', boxShadow: '0 4px 12px rgba(5,150,105,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#059669', margin: 0 }}>📦 Novo Material</h4>
            <button onClick={() => { setShowAddMaterial(false); setFormError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
          </div>
          {formError && <p style={{ color: '#DC2626', fontSize: '12px', marginBottom: '12px', padding: '8px', background: '#FEF2F2', borderRadius: '8px' }}>{formError}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Nome *</label>
              <input value={newMaterial.name} onChange={e => setNewMaterial(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Fio 2.5mm, Cimento, Porcelanato..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Categoria</label>
              <select value={newMaterial.category} onChange={e => setNewMaterial(p => ({ ...p, category: e.target.value }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}>
                {MATERIAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Comprado por</label>
              <select value={newMaterial.purchased_by} onChange={e => setNewMaterial(p => ({ ...p, purchased_by: e.target.value }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="Bruno">Bruno</option>
                <option value="Graziela">Graziela</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Quantidade</label>
              <input type="number" min="1" value={newMaterial.quantity} onChange={e => setNewMaterial(p => ({ ...p, quantity: e.target.value }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Valor Unitário (R$) *</label>
              <input type="number" step="0.01" value={newMaterial.unit_price} onChange={e => setNewMaterial(p => ({ ...p, unit_price: e.target.value }))}
                placeholder="0,00"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Loja</label>
              <input value={newMaterial.store} onChange={e => setNewMaterial(p => ({ ...p, store: e.target.value }))}
                placeholder="Ex: Leroy Merlin, C&C..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Data da Compra</label>
              <input type="date" value={newMaterial.purchase_date} onChange={e => setNewMaterial(p => ({ ...p, purchase_date: e.target.value }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Link da Compra (opcional)</label>
              <input value={newMaterial.purchase_url} onChange={e => setNewMaterial(p => ({ ...p, purchase_url: e.target.value }))}
                placeholder="https://..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Observações (opcional)</label>
              <textarea value={newMaterial.notes} onChange={e => setNewMaterial(p => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Notas adicionais..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
          </div>
          {newMaterial.unit_price && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: '#F0FDF4', borderRadius: '8px', fontSize: '13px', color: '#059669', fontWeight: 600 }}>
              Total: {fmtBRL((Number(newMaterial.quantity) || 1) * (Number(newMaterial.unit_price) || 0))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button onClick={handleAddMaterial} disabled={saving}
              style={{
                flex: 1, padding: '12px', background: '#059669', color: 'white', border: 'none',
                borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}>
              {saving ? 'Salvando...' : '✓ Salvar Material'}
            </button>
          </div>
        </div>
      )}

      {/* Filter by category */}
      {materials.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => setFilterMaterialCategory('')}
            style={{
              padding: '4px 10px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', background: !filterMaterialCategory ? '#059669' : '#F3F4F6',
              color: !filterMaterialCategory ? 'white' : '#6B7280',
            }}>Todos</button>
          {[...new Set(materials.map(m => m.category))].map(cat => {
            const catInfo = MATERIAL_CATEGORIES.find(c => c.value === cat)
            return (
              <button key={cat} onClick={() => setFilterMaterialCategory(cat)}
                style={{
                  padding: '4px 10px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', background: filterMaterialCategory === cat ? '#059669' : '#F3F4F6',
                  color: filterMaterialCategory === cat ? 'white' : '#6B7280',
                }}>{catInfo?.emoji} {catInfo?.label || cat}</button>
            )
          })}
        </div>
      )}

      {/* Materials List */}
      {filteredMaterials.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>
          <Package size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <p style={{ fontSize: '13px' }}>Nenhum material cadastrado ainda</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(materialsByCategory).map(([cat, catMaterials]) => {
            const catInfo = MATERIAL_CATEGORIES.find(c => c.value === cat)
            const catTotal = catMaterials.reduce((s, m) => s + m.total_price, 0)
            return (
              <div key={cat}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{catInfo?.emoji || '📦'}</span> {catInfo?.label || cat}
                  <span style={{ fontWeight: 500, color: '#9CA3AF' }}>· {fmtBRL(catTotal)}</span>
                </div>
                {catMaterials.map(mat => {
                  const isExpanded = expandedMaterial === mat.id
                  const isEditing = editingMaterial === mat.id
                  return (
                    <div key={mat.id} style={{
                      background: 'white', borderRadius: '12px', padding: '12px 14px', marginBottom: '6px',
                      border: '1px solid #E5E7EB', transition: 'all 0.2s',
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <input value={editMaterialForm.name || ''} onChange={e => setEditMaterialForm(p => ({ ...p, name: e.target.value }))}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                          </div>
                          <select value={editMaterialForm.category || 'outro'} onChange={e => setEditMaterialForm(p => ({ ...p, category: e.target.value }))}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}>
                            {MATERIAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                          </select>
                          <select value={editMaterialForm.purchased_by || 'Bruno'} onChange={e => setEditMaterialForm(p => ({ ...p, purchased_by: e.target.value }))}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}>
                            <option value="Bruno">Bruno</option>
                            <option value="Graziela">Graziela</option>
                          </select>
                          <input type="number" min="1" value={editMaterialForm.quantity || 1}
                            onChange={e => setEditMaterialForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                            placeholder="Qtd" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                          <input type="number" step="0.01" value={editMaterialForm.unit_price || 0}
                            onChange={e => setEditMaterialForm(p => ({ ...p, unit_price: Number(e.target.value) }))}
                            placeholder="Valor un." style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                          <input value={editMaterialForm.store || ''} onChange={e => setEditMaterialForm(p => ({ ...p, store: e.target.value }))}
                            placeholder="Loja" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                          <input type="date" value={editMaterialForm.purchase_date || ''} onChange={e => setEditMaterialForm(p => ({ ...p, purchase_date: e.target.value }))}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }} />
                          <div style={{ gridColumn: '1 / -1' }}>
                            <input value={editMaterialForm.purchase_url || ''} onChange={e => setEditMaterialForm(p => ({ ...p, purchase_url: e.target.value }))}
                              placeholder="Link da compra" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <textarea value={editMaterialForm.notes || ''} onChange={e => setEditMaterialForm(p => ({ ...p, notes: e.target.value }))}
                              placeholder="Observações" rows={2}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
                          </div>
                          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                            <button onClick={handleSaveMaterial}
                              style={{ flex: 1, padding: '8px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                              <Check size={14} /> Salvar
                            </button>
                            <button onClick={() => { setEditingMaterial(null); setEditMaterialForm({}) }}
                              style={{ padding: '8px 14px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div onClick={() => setExpandedMaterial(isExpanded ? null : mat.id)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>{mat.name}</span>
                                {mat.purchase_url && <ExternalLink size={12} color="#3B82F6" />}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                {mat.quantity > 1 ? `${mat.quantity}x ${fmtBRL(mat.unit_price)} = ` : ''}{fmtBRL(mat.total_price)}
                                {mat.store ? ` · ${mat.store}` : ''}
                                {` · ${mat.purchased_by}`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>{fmtBRL(mat.total_price)}</span>
                              {isExpanded ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                                <div>📅 {fmtDate(mat.purchase_date)}</div>
                                <div>👤 {mat.purchased_by}</div>
                                {mat.store && <div>🏪 {mat.store}</div>}
                                {mat.description && <div style={{ gridColumn: '1 / -1' }}>📝 {mat.description}</div>}
                                {mat.notes && <div style={{ gridColumn: '1 / -1' }}>💬 {mat.notes}</div>}
                                {mat.purchase_url && (
                                  <div style={{ gridColumn: '1 / -1' }}>
                                    <a href={mat.purchase_url} target="_blank" rel="noopener noreferrer"
                                      style={{ color: '#3B82F6', textDecoration: 'underline', fontSize: '12px' }}>
                                      🔗 Ver na loja
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                <button onClick={() => handleEditMaterial(mat)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                  <Edit3 size={12} /> Editar
                                </button>
                                <button onClick={() => handleDeleteMaterial(mat.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                  <Trash2 size={12} /> Excluir
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
