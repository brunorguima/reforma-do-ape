'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search, FileText, Upload, ExternalLink, Edit3, Trash2, Check, X, Tag as TagIcon,
  User as UserIcon, Home as HomeIcon, Filter as FilterIcon, Calendar, Loader2, Layers,
} from 'lucide-react'
import type { Room } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

type DocumentRow = {
  id: string
  title: string
  description: string | null
  doc_type: string
  url: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  professional_id: string | null
  room_id: string | null
  quote_id: string | null
  file_hash: string | null
  tags: string[] | null
  parsed_data: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type Professional = { id: string; name: string; specialty: string | null }
type QuoteRef = { id: string; description: string | null; professional_id: string | null; amount: number | null }

type DocTypeKey = 'memorial' | 'orcamento' | 'nfe' | 'contrato' | 'planta' | 'foto' | 'outro'

const DOC_TYPES: { key: DocTypeKey; label: string; emoji: string; color: string }[] = [
  { key: 'memorial',  label: 'Memorial',    emoji: '📋', color: '#7c3aed' },
  { key: 'orcamento', label: 'Orçamento',   emoji: '💰', color: '#2563eb' },
  { key: 'nfe',       label: 'NF-e',        emoji: '🧾', color: '#059669' },
  { key: 'contrato',  label: 'Contrato',    emoji: '🤝', color: '#d97706' },
  { key: 'planta',    label: 'Planta',      emoji: '📐', color: '#0891b2' },
  { key: 'foto',      label: 'Foto',        emoji: '📷', color: '#db2777' },
  { key: 'outro',     label: 'Outro',       emoji: '📄', color: '#6b7280' },
]

const docTypeMeta = (type: string) =>
  DOC_TYPES.find(t => t.key === type) || { key: 'outro' as DocTypeKey, label: type || 'Outro', emoji: '📄', color: '#6b7280' }

const fmtFileSize = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fmtMoney = (value: number | null | undefined) =>
  value != null ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

// ============================================================================
// Component
// ============================================================================

export default function DocumentsPanel({
  currentUser,
  rooms,
}: {
  currentUser: string
  rooms: Room[]
}) {
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [pros, setPros] = useState<Professional[]>([])
  const [quotes, setQuotes] = useState<QuoteRef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('') // '' = all
  const [proFilter, setProFilter] = useState<string>('')
  const [roomFilter, setRoomFilter] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<DocumentRow>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState<'tag' | 'move' | null>(null)
  const [bulkValue, setBulkValue] = useState('')

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState<{
    title: string
    description: string
    doc_type: DocTypeKey
    professional_id: string
    room_id: string
    tagsInput: string
    file: File | null
  }>({
    title: '',
    description: '',
    doc_type: 'memorial',
    professional_id: '',
    room_id: '',
    tagsInput: '',
    file: null,
  })
  const [uploading, setUploading] = useState(false)

  // ------------ data load ------------
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [docsRes, prosRes, quotesRes] = await Promise.all([
        fetch('/api/documents').then(r => r.json()),
        fetch('/api/professionals').then(r => r.json()),
        fetch('/api/quotes').then(r => r.json()),
      ])
      setDocs(Array.isArray(docsRes) ? docsRes : [])
      setPros(Array.isArray(prosRes) ? prosRes : [])
      setQuotes(Array.isArray(quotesRes) ? quotesRes : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // ------------ derived state ------------
  const proById = useMemo(() => Object.fromEntries(pros.map(p => [p.id, p])), [pros])
  const roomById = useMemo(() => Object.fromEntries(rooms.map(r => [r.id, r])), [rooms])
  const quoteById = useMemo(() => Object.fromEntries(quotes.map(q => [q.id, q])), [quotes])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    docs.forEach(d => (d.tags || []).forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [docs])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    docs.forEach(d => { counts[d.doc_type] = (counts[d.doc_type] || 0) + 1 })
    return counts
  }, [docs])

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(d => {
      if (typeFilter && d.doc_type !== typeFilter) return false
      if (proFilter === '__none__' ? d.professional_id != null : proFilter && d.professional_id !== proFilter) return false
      if (roomFilter === '__none__' ? d.room_id != null : roomFilter && d.room_id !== roomFilter) return false
      if (tagFilter && !(d.tags || []).includes(tagFilter)) return false
      if (dateFrom && new Date(d.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(d.created_at) > new Date(dateTo + 'T23:59:59')) return false
      if (q) {
        const hay = `${d.title || ''} ${d.description || ''} ${d.file_name || ''} ${(d.tags || []).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [docs, search, typeFilter, proFilter, roomFilter, tagFilter, dateFrom, dateTo])

  const totalFiltered = filteredDocs.length
  const totalSize = filteredDocs.reduce((s, d) => s + (d.file_size || 0), 0)
  const orphanCount = docs.filter(d => !d.professional_id && !d.room_id && !d.quote_id).length
  const untaggedCount = docs.filter(d => !(d.tags && d.tags.length > 0)).length

  const clearFilters = () => {
    setSearch(''); setTypeFilter(''); setProFilter(''); setRoomFilter(''); setTagFilter(''); setDateFrom(''); setDateTo('')
  }

  const anyFilterActive = !!(search || typeFilter || proFilter || roomFilter || tagFilter || dateFrom || dateTo)

  // ------------ edit actions ------------
  const openEdit = (d: DocumentRow) => {
    setEditingId(d.id)
    setEditForm({
      title: d.title,
      description: d.description || '',
      doc_type: d.doc_type,
      professional_id: d.professional_id,
      room_id: d.room_id,
      quote_id: d.quote_id,
      tags: d.tags || [],
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/documents/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Erro ao salvar')
      }
      setEditingId(null)
      setEditForm({})
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSavingEdit(false)
    }
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}) }

  const deleteDoc = async (id: string) => {
    if (!confirm('Excluir este documento? Essa ação não pode ser desfeita.')) return
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao excluir')
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  // ------------ bulk ------------
  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const selectAllFiltered = () => {
    const all = new Set(filteredDocs.map(d => d.id))
    if (all.size === selected.size && filteredDocs.every(d => selected.has(d.id))) setSelected(new Set())
    else setSelected(all)
  }

  const runBulkTag = async () => {
    const tag = bulkValue.trim()
    if (!tag) return
    const ids = Array.from(selected)
    const targets = docs.filter(d => ids.includes(d.id))
    await Promise.all(targets.map(d => {
      const nextTags = Array.from(new Set([...(d.tags || []), tag]))
      return fetch(`/api/documents/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: nextTags }),
      })
    }))
    setBulkMode(null); setBulkValue(''); setSelected(new Set()); reload()
  }

  const runBulkMovePro = async () => {
    const ids = Array.from(selected)
    await Promise.all(ids.map(id =>
      fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professional_id: bulkValue || null }),
      })
    ))
    setBulkMode(null); setBulkValue(''); setSelected(new Set()); reload()
  }

  const runBulkDelete = async () => {
    if (!confirm(`Excluir ${selected.size} documento(s) selecionado(s)?`)) return
    const ids = Array.from(selected)
    await Promise.all(ids.map(id => fetch(`/api/documents/${id}`, { method: 'DELETE' })))
    setSelected(new Set()); reload()
  }

  // ------------ upload ------------
  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title.trim()) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadForm.file)
      fd.append('title', uploadForm.title)
      fd.append('description', uploadForm.description)
      fd.append('type', uploadForm.doc_type)
      fd.append('created_by', currentUser)
      if (uploadForm.professional_id) fd.append('professional_id', uploadForm.professional_id)
      if (uploadForm.room_id) fd.append('room_id', uploadForm.room_id)
      const tags = uploadForm.tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      if (tags.length) fd.append('tags', JSON.stringify(tags))

      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) {
        if (j.duplicate) {
          if (confirm(`Este PDF já foi enviado como "${j.existing?.title}". Subir de novo mesmo assim?`)) {
            fd.append('allow_duplicate', 'true')
            const res2 = await fetch('/api/documents/upload', { method: 'POST', body: fd })
            if (!res2.ok) throw new Error('Falha no upload (duplicado)')
          } else {
            setUploading(false)
            return
          }
        } else {
          throw new Error(j.error || 'Falha no upload')
        }
      }
      setUploadOpen(false)
      setUploadForm({ title: '', description: '', doc_type: 'memorial', professional_id: '', room_id: '', tagsInput: '', file: null })
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📁 Hub de Documentos
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
            Tudo num lugar só: memoriais, orçamentos, NFs, contratos, fotos e plantas
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
            borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
            background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: 'white',
            boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
          }}>
          <Upload size={14} /> Enviar documento
        </button>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <KpiTile label="Total" value={docs.length} color="#111827" />
        {DOC_TYPES.filter(t => (typeCounts[t.key] || 0) > 0).map(t => (
          <KpiTile key={t.key} label={`${t.emoji} ${t.label}`} value={typeCounts[t.key] || 0} color={t.color} />
        ))}
        {orphanCount > 0 && <KpiTile label="⚠️ Sem vínculo" value={orphanCount} color="#d97706" />}
        {untaggedCount > 0 && <KpiTile label="Sem tag" value={untaggedCount} color="#6b7280" />}
      </div>

      {/* Search + quick filters */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '14px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              placeholder="Buscar por título, descrição, arquivo ou tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px',
              border: '1px solid #e5e7eb', background: showAdvanced ? '#eff6ff' : 'white', color: '#2563eb',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}>
            <FilterIcon size={14} /> Filtros{anyFilterActive ? ' ✓' : ''}
          </button>
          {anyFilterActive && (
            <button
              onClick={clearFilters}
              style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Limpar
            </button>
          )}
        </div>

        {/* Type chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <TypeChip label="Todos" active={!typeFilter} onClick={() => setTypeFilter('')} color="#374151" />
          {DOC_TYPES.map(t => (
            <TypeChip
              key={t.key}
              label={`${t.emoji} ${t.label}${typeCounts[t.key] ? ` · ${typeCounts[t.key]}` : ''}`}
              active={typeFilter === t.key}
              onClick={() => setTypeFilter(typeFilter === t.key ? '' : t.key)}
              color={t.color}
            />
          ))}
        </div>

        {showAdvanced && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <FilterSelect label="👷 Profissional" value={proFilter} onChange={setProFilter}
              options={[{ value: '', label: 'Todos' }, { value: '__none__', label: '⚠️ Sem profissional' }, ...pros.map(p => ({ value: p.id, label: p.name }))]} />
            <FilterSelect label="🏠 Cômodo" value={roomFilter} onChange={setRoomFilter}
              options={[{ value: '', label: 'Todos' }, { value: '__none__', label: '⚠️ Sem cômodo' }, ...rooms.map(r => ({ value: r.id, label: `${r.icon || '📍'} ${r.name}` }))]} />
            <FilterSelect label="🏷️ Tag" value={tagFilter} onChange={setTagFilter}
              options={[{ value: '', label: 'Todas' }, ...allTags.map(t => ({ value: t, label: t }))]} />
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>📅 Período</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', boxSizing: 'border-box' }} />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'sticky', top: '8px', zIndex: 20, marginBottom: '12px',
          background: '#1f2937', borderRadius: '12px', padding: '12px 14px', color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          boxShadow: '0 8px 20px rgba(31,41,55,0.35)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 }}>
            <Layers size={16} /> {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => { setBulkMode('tag'); setBulkValue('') }}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#374151', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <TagIcon size={12} /> Adicionar tag
            </button>
            <button onClick={() => { setBulkMode('move'); setBulkValue('') }}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#374151', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <UserIcon size={12} /> Vincular profissional
            </button>
            <button onClick={runBulkDelete}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={12} /> Excluir
            </button>
            <button onClick={() => setSelected(new Set())}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#4b5563', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Bulk input modal */}
      {bulkMode && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setBulkMode(null); setBulkValue('') } }}>
          <div className="modal-content">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
              {bulkMode === 'tag' ? `Adicionar tag a ${selected.size} documento(s)` : `Vincular profissional a ${selected.size} documento(s)`}
            </h3>
            {bulkMode === 'tag' ? (
              <input
                autoFocus
                placeholder="Ex: elétrica, ab2n, urgente"
                value={bulkValue}
                onChange={e => setBulkValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && bulkValue.trim()) runBulkTag() }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
              />
            ) : (
              <select
                value={bulkValue}
                onChange={e => setBulkValue(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="">— Nenhum (remover vínculo) —</option>
                {pros.map(p => <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` (${p.specialty})` : ''}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setBulkMode(null); setBulkValue('') }}
                style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                Cancelar
              </button>
              <button
                onClick={bulkMode === 'tag' ? runBulkTag : runBulkMovePro}
                disabled={bulkMode === 'tag' && !bulkValue.trim()}
                style={{
                  padding: '9px 18px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: 'white',
                  opacity: (bulkMode === 'tag' && !bulkValue.trim()) ? 0.5 : 1,
                }}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px', padding: '0 4px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {totalFiltered} documento{totalFiltered !== 1 ? 's' : ''}{anyFilterActive ? ` · filtrado de ${docs.length}` : ''}
          {totalSize > 0 && ` · ${fmtFileSize(totalSize)}`}
        </div>
        {filteredDocs.length > 0 && (
          <button onClick={selectAllFiltered}
            style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {filteredDocs.every(d => selected.has(d.id)) && filteredDocs.length > 0 ? 'Desmarcar tudo' : 'Selecionar todos'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
          Carregando documentos...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '14px', border: '1px dashed #e5e7eb' }}>
          <FileText size={36} color="#9ca3af" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>
            {anyFilterActive ? 'Nenhum documento bate com esses filtros' : 'Nenhum documento ainda'}
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            {anyFilterActive ? 'Tenta limpar os filtros ou ajustar a busca.' : 'Clica em "Enviar documento" pra subir o primeiro.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {filteredDocs.map(d => {
            const meta = docTypeMeta(d.doc_type)
            const pro = d.professional_id ? proById[d.professional_id] : null
            const room = d.room_id ? roomById[d.room_id] : null
            const quote = d.quote_id ? quoteById[d.quote_id] : null
            const isSelected = selected.has(d.id)
            const isEditing = editingId === d.id
            const parsedTotal = typeof d.parsed_data?.total === 'number' ? (d.parsed_data.total as number) : null
            const parsedItens = Array.isArray((d.parsed_data as { itens?: unknown[] } | null)?.itens)
              ? ((d.parsed_data as { itens: unknown[] }).itens.length)
              : 0

            return (
              <div key={d.id} style={{
                background: 'white', borderRadius: '14px', border: `1px solid ${isSelected ? meta.color : '#e5e7eb'}`,
                padding: '14px', boxShadow: isSelected ? `0 0 0 2px ${meta.color}22` : 'none',
                transition: 'all 0.15s',
              }}>
                {isEditing ? (
                  // --- Edit form ---
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                      <Edit3 size={14} /> Editando documento
                    </div>
                    <input
                      value={editForm.title || ''}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Título"
                      style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', fontWeight: 600 }}
                    />
                    <textarea
                      value={editForm.description || ''}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Descrição"
                      rows={2}
                      style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                      <select value={editForm.doc_type || 'outro'} onChange={e => setEditForm({ ...editForm, doc_type: e.target.value })}
                        style={{ padding: '9px 10px', borderRadius: '9px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                        {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
                      </select>
                      <select value={editForm.professional_id || ''} onChange={e => setEditForm({ ...editForm, professional_id: e.target.value || null })}
                        style={{ padding: '9px 10px', borderRadius: '9px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                        <option value="">— Sem profissional —</option>
                        {pros.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={editForm.room_id || ''} onChange={e => setEditForm({ ...editForm, room_id: e.target.value || null })}
                        style={{ padding: '9px 10px', borderRadius: '9px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                        <option value="">— Todos os cômodos —</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.icon || '📍'} {r.name}</option>)}
                      </select>
                      <select value={editForm.quote_id || ''} onChange={e => setEditForm({ ...editForm, quote_id: e.target.value || null })}
                        style={{ padding: '9px 10px', borderRadius: '9px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                        <option value="">— Sem orçamento —</option>
                        {quotes.map(q => {
                          const proName = q.professional_id ? proById[q.professional_id]?.name : ''
                          return <option key={q.id} value={q.id}>{proName ? `${proName} · ` : ''}{q.description || 'Orçamento'}{q.amount ? ` · ${fmtMoney(q.amount)}` : ''}</option>
                        })}
                      </select>
                    </div>
                    <input
                      value={(editForm.tags || []).join(', ')}
                      onChange={e => setEditForm({ ...editForm, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      placeholder="Tags (separadas por vírgula)"
                      style={{ padding: '9px 12px', borderRadius: '9px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={cancelEdit}
                        style={{ padding: '8px 16px', borderRadius: '9px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        <X size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Cancelar
                      </button>
                      <button onClick={saveEdit} disabled={savingEdit}
                        style={{ padding: '8px 16px', borderRadius: '9px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700, opacity: savingEdit ? 0.6 : 1 }}>
                        <Check size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {savingEdit ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // --- Display ---
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(d.id)}
                      style={{ marginTop: '4px', width: '16px', height: '16px', accentColor: meta.color, cursor: 'pointer', flexShrink: 0 }} />

                    <div style={{ fontSize: '28px', flexShrink: 0, lineHeight: 1 }}>{meta.emoji}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>{d.title}</h4>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: `${meta.color}15`, color: meta.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          {meta.label}
                        </span>
                      </div>
                      {d.description && (
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px' }}>{d.description}</p>
                      )}
                      {parsedTotal != null && (
                        <p style={{ fontSize: '12px', color: '#059669', margin: '0 0 6px', fontWeight: 700 }}>
                          💰 {fmtMoney(parsedTotal)}{parsedItens > 0 ? ` · ${parsedItens} iten${parsedItens !== 1 ? 's' : ''}` : ''}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        {pro && (
                          <Badge color="#2563eb" icon={<UserIcon size={10} />} label={pro.name} />
                        )}
                        {room && (
                          <Badge color="#0891b2" icon={<HomeIcon size={10} />} label={`${room.icon || ''} ${room.name}`.trim()} />
                        )}
                        {quote && (
                          <Badge color="#7c3aed" icon={<FileText size={10} />} label={`Quote ${quote.amount ? fmtMoney(quote.amount) : ''}`.trim()} />
                        )}
                        {(d.tags || []).map(t => (
                          <Badge key={t} color="#6b7280" icon={<TagIcon size={10} />} label={t} />
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {d.file_size ? `${fmtFileSize(d.file_size)} · ` : ''}
                        {d.created_by || '—'} · {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexDirection: 'column' }}>
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '6px 10px', borderRadius: '8px', background: meta.color, color: 'white',
                            textDecoration: 'none', fontSize: '11px', fontWeight: 700,
                          }}>
                          <ExternalLink size={11} /> Abrir
                        </a>
                      )}
                      <button onClick={() => openEdit(d)}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#374151', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Edit3 size={11} /> Editar
                      </button>
                      {(currentUser !== 'mari' || d.created_by === 'mari') && (
                        <button onClick={() => deleteDoc(d.id)}
                          style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Trash2 size={11} /> Excluir
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

      {/* Upload modal */}
      {uploadOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !uploading) setUploadOpen(false) }}>
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>📁 Enviar documento</h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>
              Vincule o documento a um profissional, cômodo ou deixe no hub central.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                placeholder="Título do documento *"
                value={uploadForm.title}
                onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                autoFocus
                style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={uploadForm.description}
                onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={2}
                style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                <select value={uploadForm.doc_type} onChange={e => setUploadForm({ ...uploadForm, doc_type: e.target.value as DocTypeKey })}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }}>
                  {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
                </select>
                <select value={uploadForm.professional_id} onChange={e => setUploadForm({ ...uploadForm, professional_id: e.target.value })}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }}>
                  <option value="">— Sem profissional —</option>
                  {pros.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={uploadForm.room_id} onChange={e => setUploadForm({ ...uploadForm, room_id: e.target.value })}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }}>
                  <option value="">— Todos os cômodos —</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.icon || '📍'} {r.name}</option>)}
                </select>
              </div>
              <input
                placeholder="Tags (separadas por vírgula, ex: elétrica, urgente)"
                value={uploadForm.tagsInput}
                onChange={e => setUploadForm({ ...uploadForm, tagsInput: e.target.value })}
                style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '14px',
                border: '2px dashed #d1d5db', borderRadius: '12px', cursor: 'pointer',
                background: uploadForm.file ? '#f0fdf4' : '#fafafa',
                borderColor: uploadForm.file ? '#10b981' : '#d1d5db',
              }}>
                <Upload size={20} color={uploadForm.file ? '#10b981' : '#6b7280'} />
                <span style={{ fontSize: '13px', color: uploadForm.file ? '#065f46' : '#6b7280', fontWeight: 600, flex: 1 }}>
                  {uploadForm.file ? uploadForm.file.name : 'Selecionar arquivo (PDF, imagem, doc...)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                  onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
                style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.title.trim() || !uploadForm.file || uploading}
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '14px', color: 'white',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                  opacity: (!uploadForm.title.trim() || !uploadForm.file || uploading) ? 0.5 : 1,
                }}>
                {uploading ? 'Enviando...' : 'Enviar documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Small presentational components
// ============================================================================

function KpiTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', gap: '2px',
    }}>
      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
    </div>
  )
}

function TypeChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: '18px', border: `1.5px solid ${active ? color : '#e5e7eb'}`,
        background: active ? `${color}15` : 'white', color: active ? color : '#6b7280',
        fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '9px', border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', background: 'white' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Badge({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      padding: '3px 8px', borderRadius: '8px',
      background: `${color}15`, color, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {icon} {label}
    </span>
  )
}
