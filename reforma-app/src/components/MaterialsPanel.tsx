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
      <div className="text-center py-8 text-on-surface-variant">
        <p className="text-[13px]">Carregando materiais...</p>
      </div>
    )
  }

  return (
    <div className="mt-7">
      <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2">
        <h3 className="text-base font-bold text-[#374151] m-0 flex items-center gap-2">
          <ShoppingCart size={18} /> Materiais Comprados
          <span className="text-xs font-medium text-on-surface-variant bg-surface-container-low rounded-xl px-2 py-0.5">
            {materials.length} · {fmtBRL(materialsTotal)}
          </span>
        </h3>
        <button
          onClick={() => { setShowAddMaterial(true); setFormError('') }}
          className="flex items-center gap-1 px-3.5 py-2 bg-success text-white border-none rounded-[10px] text-[13px] font-semibold cursor-pointer">
          <Plus size={14} /> Novo Material
        </button>
      </div>

      {/* Add Material Modal */}
      {showAddMaterial && (
        <div className="bg-surface-lowest rounded-[14px] p-5 mb-4 border-2 border-success shadow-[0_4px_12px_rgba(5,150,105,0.15)]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[15px] font-bold text-success m-0">📦 Novo Material</h4>
            <button onClick={() => { setShowAddMaterial(false); setFormError('') }}
              className="bg-transparent border-none cursor-pointer text-on-surface-variant"><X size={18} /></button>
          </div>
          {formError && <p className="text-danger text-xs mb-3 p-2 bg-danger-light rounded-sm">{formError}</p>}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-full">
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Nome *</label>
              <input value={newMaterial.name} onChange={e => setNewMaterial(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Fio 2.5mm, Cimento, Porcelanato..."
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Categoria</label>
              <select value={newMaterial.category} onChange={e => setNewMaterial(p => ({ ...p, category: e.target.value }))}
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border">
                {MATERIAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Comprado por</label>
              <select value={newMaterial.purchased_by} onChange={e => setNewMaterial(p => ({ ...p, purchased_by: e.target.value }))}
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border">
                <option value="Bruno">Bruno</option>
                <option value="Graziela">Graziela</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Quantidade</label>
              <input type="number" min="1" value={newMaterial.quantity} onChange={e => setNewMaterial(p => ({ ...p, quantity: e.target.value }))}
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Valor Unitário (R$) *</label>
              <input type="number" step="0.01" value={newMaterial.unit_price} onChange={e => setNewMaterial(p => ({ ...p, unit_price: e.target.value }))}
                placeholder="0,00"
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Loja</label>
              <input value={newMaterial.store} onChange={e => setNewMaterial(p => ({ ...p, store: e.target.value }))}
                placeholder="Ex: Leroy Merlin, C&C..."
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Data da Compra</label>
              <input type="date" value={newMaterial.purchase_date} onChange={e => setNewMaterial(p => ({ ...p, purchase_date: e.target.value }))}
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border" />
            </div>
            <div className="col-span-full">
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Link da Compra (opcional)</label>
              <input value={newMaterial.purchase_url} onChange={e => setNewMaterial(p => ({ ...p, purchase_url: e.target.value }))}
                placeholder="https://..."
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border" />
            </div>
            <div className="col-span-full">
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Observações (opcional)</label>
              <textarea value={newMaterial.notes} onChange={e => setNewMaterial(p => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Notas adicionais..."
                className="w-full p-2.5 rounded-sm border border-outline-variant text-sm box-border resize-y" />
            </div>
          </div>
          {newMaterial.unit_price && (
            <div className="mt-2.5 px-3 py-2 bg-[#F0FDF4] rounded-sm text-[13px] text-success font-semibold">
              Total: {fmtBRL((Number(newMaterial.quantity) || 1) * (Number(newMaterial.unit_price) || 0))}
            </div>
          )}
          <div className="flex gap-2 mt-3.5">
            <button onClick={handleAddMaterial} disabled={saving}
              className={`flex-1 p-3 bg-success text-white border-none rounded-[10px] text-sm font-bold ${saving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'}`}>
              {saving ? 'Salvando...' : '✓ Salvar Material'}
            </button>
          </div>
        </div>
      )}

      {/* Filter by category */}
      {materials.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <button onClick={() => setFilterMaterialCategory('')}
            className={`px-2.5 py-1 rounded-sm border-none text-xs font-semibold cursor-pointer ${
              !filterMaterialCategory ? 'bg-success text-white' : 'bg-surface-container-low text-on-surface-variant'
            }`}>Todos</button>
          {[...new Set(materials.map(m => m.category))].map(cat => {
            const catInfo = MATERIAL_CATEGORIES.find(c => c.value === cat)
            return (
              <button key={cat} onClick={() => setFilterMaterialCategory(cat)}
                className={`px-2.5 py-1 rounded-sm border-none text-xs font-semibold cursor-pointer ${
                  filterMaterialCategory === cat ? 'bg-success text-white' : 'bg-surface-container-low text-on-surface-variant'
                }`}>{catInfo?.emoji} {catInfo?.label || cat}</button>
            )
          })}
        </div>
      )}

      {/* Materials List */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-8 text-on-surface-variant">
          <Package size={32} className="mb-2 opacity-50" />
          <p className="text-[13px]">Nenhum material cadastrado ainda</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {Object.entries(materialsByCategory).map(([cat, catMaterials]) => {
            const catInfo = MATERIAL_CATEGORIES.find(c => c.value === cat)
            const catTotal = catMaterials.reduce((s, m) => s + m.total_price, 0)
            return (
              <div key={cat}>
                <div className="text-xs font-bold text-on-surface-variant mb-1.5 flex items-center gap-1">
                  <span>{catInfo?.emoji || '📦'}</span> {catInfo?.label || cat}
                  <span className="font-medium text-[#9CA3AF]">· {fmtBRL(catTotal)}</span>
                </div>
                {catMaterials.map(mat => {
                  const isExpanded = expandedMaterial === mat.id
                  const isEditing = editingMaterial === mat.id
                  return (
                    <div key={mat.id} className="bg-surface-lowest rounded-md px-3.5 py-3 mb-1.5 border border-outline-variant transition-all duration-200">
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-full">
                            <input value={editMaterialForm.name || ''} onChange={e => setEditMaterialForm(p => ({ ...p, name: e.target.value }))}
                              className="w-full p-2 rounded-[6px] border border-outline-variant text-[13px] box-border" />
                          </div>
                          <select value={editMaterialForm.category || 'outro'} onChange={e => setEditMaterialForm(p => ({ ...p, category: e.target.value }))}
                            className="p-2 rounded-[6px] border border-outline-variant text-[13px]">
                            {MATERIAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                          </select>
                          <select value={editMaterialForm.purchased_by || 'Bruno'} onChange={e => setEditMaterialForm(p => ({ ...p, purchased_by: e.target.value }))}
                            className="p-2 rounded-[6px] border border-outline-variant text-[13px]">
                            <option value="Bruno">Bruno</option>
                            <option value="Graziela">Graziela</option>
                          </select>
                          <input type="number" min="1" value={editMaterialForm.quantity || 1}
                            onChange={e => setEditMaterialForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                            placeholder="Qtd" className="p-2 rounded-[6px] border border-outline-variant text-[13px]" />
                          <input type="number" step="0.01" value={editMaterialForm.unit_price || 0}
                            onChange={e => setEditMaterialForm(p => ({ ...p, unit_price: Number(e.target.value) }))}
                            placeholder="Valor un." className="p-2 rounded-[6px] border border-outline-variant text-[13px]" />
                          <input value={editMaterialForm.store || ''} onChange={e => setEditMaterialForm(p => ({ ...p, store: e.target.value }))}
                            placeholder="Loja" className="p-2 rounded-[6px] border border-outline-variant text-[13px]" />
                          <input type="date" value={editMaterialForm.purchase_date || ''} onChange={e => setEditMaterialForm(p => ({ ...p, purchase_date: e.target.value }))}
                            className="p-2 rounded-[6px] border border-outline-variant text-[13px]" />
                          <div className="col-span-full">
                            <input value={editMaterialForm.purchase_url || ''} onChange={e => setEditMaterialForm(p => ({ ...p, purchase_url: e.target.value }))}
                              placeholder="Link da compra" className="w-full p-2 rounded-[6px] border border-outline-variant text-[13px] box-border" />
                          </div>
                          <div className="col-span-full">
                            <textarea value={editMaterialForm.notes || ''} onChange={e => setEditMaterialForm(p => ({ ...p, notes: e.target.value }))}
                              placeholder="Observações" rows={2}
                              className="w-full p-2 rounded-[6px] border border-outline-variant text-[13px] box-border resize-y" />
                          </div>
                          <div className="col-span-full flex gap-2">
                            <button onClick={handleSaveMaterial}
                              className="flex-1 p-2 bg-success text-white border-none rounded-sm text-[13px] font-semibold cursor-pointer">
                              <Check size={14} /> Salvar
                            </button>
                            <button onClick={() => { setEditingMaterial(null); setEditMaterialForm({}) }}
                              className="px-3.5 py-2 bg-surface-container-low text-on-surface-variant border-none rounded-sm text-[13px] font-semibold cursor-pointer">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div onClick={() => setExpandedMaterial(isExpanded ? null : mat.id)}
                            className="flex justify-between items-center cursor-pointer">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-[#1F2937]">{mat.name}</span>
                                {mat.purchase_url && <ExternalLink size={12} color="#3B82F6" />}
                              </div>
                              <div className="text-xs text-on-surface-variant mt-0.5">
                                {mat.quantity > 1 ? `${mat.quantity}x ${fmtBRL(mat.unit_price)} = ` : ''}{fmtBRL(mat.total_price)}
                                {mat.store ? ` · ${mat.store}` : ''}
                                {` · ${mat.purchased_by}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-success">{fmtBRL(mat.total_price)}</span>
                              {isExpanded ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-2.5 pt-2.5 border-t border-surface-container-low">
                              <div className="grid grid-cols-2 gap-1.5 text-xs text-on-surface-variant">
                                <div>📅 {fmtDate(mat.purchase_date)}</div>
                                <div>👤 {mat.purchased_by}</div>
                                {mat.store && <div>🏪 {mat.store}</div>}
                                {mat.description && <div className="col-span-full">📝 {mat.description}</div>}
                                {mat.notes && <div className="col-span-full">💬 {mat.notes}</div>}
                                {mat.purchase_url && (
                                  <div className="col-span-full">
                                    <a href={mat.purchase_url} target="_blank" rel="noopener noreferrer"
                                      className="text-[#3B82F6] underline text-xs">
                                      🔗 Ver na loja
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1.5 mt-2.5">
                                <button onClick={() => handleEditMaterial(mat)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border-none rounded-sm text-xs font-semibold cursor-pointer">
                                  <Edit3 size={12} /> Editar
                                </button>
                                <button onClick={() => handleDeleteMaterial(mat.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-danger-light text-danger border-none rounded-sm text-xs font-semibold cursor-pointer">
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
