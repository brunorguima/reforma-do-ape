'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search, FileText, Upload, ExternalLink, Edit3, Trash2, Check, X, Tag as TagIcon,
  User as UserIcon, Home as HomeIcon, Filter as FilterIcon, Calendar, Loader2, Layers,
} from 'lucide-react'
import type { Room } from '@/lib/supabase'
import { apiUrl, withProjectId } from '@/lib/project-client'

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
  projectId,
}: {
  currentUser: string
  rooms: Room[]
  projectId?: string | null
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
        fetch(apiUrl('/api/documents', projectId)).then(r => r.json()),
        fetch(apiUrl('/api/professionals', projectId)).then(r => r.json()),
        fetch(apiUrl('/api/quotes', projectId)).then(r => r.json()),
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
  }, [projectId])

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
        body: JSON.stringify(withProjectId(editForm as Record<string, unknown>, projectId)),
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
      const res = await fetch(apiUrl(`/api/documents/${id}`, projectId), { method: 'DELETE' })
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
        body: JSON.stringify(withProjectId({ tags: nextTags }, projectId)),
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
        body: JSON.stringify(withProjectId({ professional_id: bulkValue || null }, projectId)),
      })
    ))
    setBulkMode(null); setBulkValue(''); setSelected(new Set()); reload()
  }

  const runBulkDelete = async () => {
    if (!confirm(`Excluir ${selected.size} documento(s) selecionado(s)?`)) return
    const ids = Array.from(selected)
    await Promise.all(ids.map(id => fetch(apiUrl(`/api/documents/${id}`, projectId), { method: 'DELETE' })))
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
      fd.append('project_id', projectId || '')
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
      <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-[22px] font-extrabold m-0 text-[#111827] flex items-center gap-2">
            📁 Hub de Documentos
          </h2>
          <p className="text-[13px] text-on-surface-variant mt-1 mb-0">
            Tudo num lugar só: memoriais, orçamentos, NFs, contratos, fotos e plantas
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border-none cursor-pointer text-[13px] font-bold bg-gradient-to-br from-[#7c3aed] to-[#2563eb] text-white shadow-[0_2px_6px_rgba(124,58,237,0.25)]">
          <Upload size={14} /> Enviar documento
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 mb-4">
        <KpiTile label="Total" value={docs.length} color="#111827" />
        {DOC_TYPES.filter(t => (typeCounts[t.key] || 0) > 0).map(t => (
          <KpiTile key={t.key} label={`${t.emoji} ${t.label}`} value={typeCounts[t.key] || 0} color={t.color} />
        ))}
        {orphanCount > 0 && <KpiTile label="⚠️ Sem vínculo" value={orphanCount} color="#d97706" />}
        {untaggedCount > 0 && <KpiTile label="Sem tag" value={untaggedCount} color="#6b7280" />}
      </div>

      {/* Search + quick filters */}
      <div className="bg-surface-lowest rounded-[14px] p-3.5 border border-outline-variant mb-4">
        <div className="flex gap-2 items-center flex-wrap mb-2.5">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              placeholder="Buscar por título, descrição, arquivo ou tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full py-2.5 pr-3 pl-[38px] rounded-[10px] border border-outline-variant text-sm box-border"
            />
          </div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-outline-variant ${showAdvanced ? 'bg-[#eff6ff]' : 'bg-surface-lowest'} text-secondary cursor-pointer text-[13px] font-semibold`}>
            <FilterIcon size={14} /> Filtros{anyFilterActive ? ' ✓' : ''}
          </button>
          {anyFilterActive && (
            <button
              onClick={clearFilters}
              className="px-3 py-2.5 rounded-[10px] border border-[#fca5a5] bg-danger-light text-danger cursor-pointer text-xs font-semibold">
              Limpar
            </button>
          )}
        </div>

        {/* Type chips */}
        <div className="flex gap-1.5 flex-wrap">
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
          <div className="mt-3 pt-3 border-t border-[#f3f4f6] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
            <FilterSelect label="👷 Profissional" value={proFilter} onChange={setProFilter}
              options={[{ value: '', label: 'Todos' }, { value: '__none__', label: '⚠️ Sem profissional' }, ...pros.map(p => ({ value: p.id, label: p.name }))]} />
            <FilterSelect label="🏠 Cômodo" value={roomFilter} onChange={setRoomFilter}
              options={[{ value: '', label: 'Todos' }, { value: '__none__', label: '⚠️ Sem cômodo' }, ...rooms.map(r => ({ value: r.id, label: `${r.icon || '📍'} ${r.name}` }))]} />
            <FilterSelect label="🏷️ Tag" value={tagFilter} onChange={setTagFilter}
              options={[{ value: '', label: 'Todas' }, ...allTags.map(t => ({ value: t, label: t }))]} />
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">📅 Período</label>
              <div className="flex gap-1.5">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 p-2 rounded-sm border border-outline-variant text-xs box-border" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="flex-1 p-2 rounded-sm border border-outline-variant text-xs box-border" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 bg-[#1f2937] rounded-md px-3.5 py-3 text-white flex justify-between items-center gap-3 flex-wrap shadow-[0_8px_20px_rgba(31,41,55,0.35)]">
          <div className="flex items-center gap-2.5 text-[13px] font-semibold">
            <Layers size={16} /> {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => { setBulkMode('tag'); setBulkValue('') }}
              className="px-3 py-1.5 rounded-sm border-none bg-[#374151] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1">
              <TagIcon size={12} /> Adicionar tag
            </button>
            <button onClick={() => { setBulkMode('move'); setBulkValue('') }}
              className="px-3 py-1.5 rounded-sm border-none bg-[#374151] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1">
              <UserIcon size={12} /> Vincular profissional
            </button>
            <button onClick={runBulkDelete}
              className="px-3 py-1.5 rounded-sm border-none bg-danger text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1">
              <Trash2 size={12} /> Excluir
            </button>
            <button onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-sm border-none bg-[#4b5563] text-white text-xs font-semibold cursor-pointer">
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Bulk input modal */}
      {bulkMode && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setBulkMode(null); setBulkValue('') } }}>
          <div className="modal-content">
            <h3 className="text-base font-bold mb-3">
              {bulkMode === 'tag' ? `Adicionar tag a ${selected.size} documento(s)` : `Vincular profissional a ${selected.size} documento(s)`}
            </h3>
            {bulkMode === 'tag' ? (
              <input
                autoFocus
                placeholder="Ex: elétrica, ab2n, urgente"
                value={bulkValue}
                onChange={e => setBulkValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && bulkValue.trim()) runBulkTag() }}
                className="w-full py-2.5 px-3 rounded-[10px] border border-outline-variant text-sm box-border"
              />
            ) : (
              <select
                value={bulkValue}
                onChange={e => setBulkValue(e.target.value)}
                className="w-full py-2.5 px-3 rounded-[10px] border border-outline-variant text-sm box-border">
                <option value="">— Nenhum (remover vínculo) —</option>
                {pros.map(p => <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` (${p.specialty})` : ''}</option>)}
              </select>
            )}
            <div className="flex gap-2 mt-3.5 justify-end">
              <button onClick={() => { setBulkMode(null); setBulkValue('') }}
                className="px-[18px] py-[9px] border border-outline-variant rounded-[10px] bg-surface-lowest cursor-pointer font-semibold text-[13px]">
                Cancelar
              </button>
              <button
                onClick={bulkMode === 'tag' ? runBulkTag : runBulkMovePro}
                disabled={bulkMode === 'tag' && !bulkValue.trim()}
                className={`px-[18px] py-[9px] border-none rounded-[10px] cursor-pointer font-bold text-[13px] bg-gradient-to-br from-[#7c3aed] to-[#2563eb] text-white ${(bulkMode === 'tag' && !bulkValue.trim()) ? 'opacity-50' : 'opacity-100'}`}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex justify-between items-center mb-2.5 flex-wrap gap-2 px-1">
        <div className="text-xs text-on-surface-variant">
          {totalFiltered} documento{totalFiltered !== 1 ? 's' : ''}{anyFilterActive ? ` · filtrado de ${docs.length}` : ''}
          {totalSize > 0 && ` · ${fmtFileSize(totalSize)}`}
        </div>
        {filteredDocs.length > 0 && (
          <button onClick={selectAllFiltered}
            className="text-xs text-secondary bg-transparent border-none cursor-pointer font-semibold">
            {filteredDocs.every(d => selected.has(d.id)) && filteredDocs.length > 0 ? 'Desmarcar tudo' : 'Selecionar todos'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3.5 py-3 rounded-[10px] bg-danger-light border border-[#fecaca] text-danger text-[13px] mb-3">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center p-10 text-on-surface-variant">
          <Loader2 size={28} className="animate-spin mx-auto mb-2 block" />
          Carregando documentos...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-[60px] px-5 bg-[#f9fafb] rounded-[14px] border border-dashed border-outline-variant">
          <FileText size={36} className="text-[#9ca3af] mx-auto mb-3 block" />
          <p className="text-[15px] font-bold text-[#374151] mb-1 mt-0">
            {anyFilterActive ? 'Nenhum documento bate com esses filtros' : 'Nenhum documento ainda'}
          </p>
          <p className="text-[13px] text-on-surface-variant m-0">
            {anyFilterActive ? 'Tenta limpar os filtros ou ajustar a busca.' : 'Clica em "Enviar documento" pra subir o primeiro.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5">
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
              <div key={d.id}
                className="bg-surface-lowest rounded-[14px] p-3.5 transition-all duration-150"
                style={{
                  border: `1px solid ${isSelected ? meta.color : '#e5e7eb'}`,
                  boxShadow: isSelected ? `0 0 0 2px ${meta.color}22` : 'none',
                }}>
                {isEditing ? (
                  // --- Edit form ---
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant font-semibold">
                      <Edit3 size={14} /> Editando documento
                    </div>
                    <input
                      value={editForm.title || ''}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Título"
                      className="py-2.5 px-3 rounded-[10px] border border-outline-variant text-sm font-semibold"
                    />
                    <textarea
                      value={editForm.description || ''}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Descrição"
                      rows={2}
                      className="py-2.5 px-3 rounded-[10px] border border-outline-variant text-[13px] resize-y font-[inherit]"
                    />
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
                      <select value={editForm.doc_type || 'outro'} onChange={e => setEditForm({ ...editForm, doc_type: e.target.value })}
                        className="py-[9px] px-2.5 rounded-[9px] border border-outline-variant text-[13px]">
                        {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
                      </select>
                      <select value={editForm.professional_id || ''} onChange={e => setEditForm({ ...editForm, professional_id: e.target.value || null })}
                        className="py-[9px] px-2.5 rounded-[9px] border border-outline-variant text-[13px]">
                        <option value="">— Sem profissional —</option>
                        {pros.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={editForm.room_id || ''} onChange={e => setEditForm({ ...editForm, room_id: e.target.value || null })}
                        className="py-[9px] px-2.5 rounded-[9px] border border-outline-variant text-[13px]">
                        <option value="">— Todos os cômodos —</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.icon || '📍'} {r.name}</option>)}
                      </select>
                      <select value={editForm.quote_id || ''} onChange={e => setEditForm({ ...editForm, quote_id: e.target.value || null })}
                        className="py-[9px] px-2.5 rounded-[9px] border border-outline-variant text-[13px]">
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
                      className="py-[9px] px-3 rounded-[9px] border border-outline-variant text-[13px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={cancelEdit}
                        className="px-4 py-2 rounded-[9px] border border-outline-variant bg-surface-lowest cursor-pointer text-[13px] font-semibold">
                        <X size={13} className="inline mr-1 align-middle" /> Cancelar
                      </button>
                      <button onClick={saveEdit} disabled={savingEdit}
                        className={`px-4 py-2 rounded-[9px] border-none bg-success text-white cursor-pointer text-[13px] font-bold ${savingEdit ? 'opacity-60' : 'opacity-100'}`}>
                        <Check size={13} className="inline mr-1 align-middle" />
                        {savingEdit ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // --- Display ---
                  <div className="flex gap-3 items-start">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(d.id)}
                      className="mt-1 w-4 h-4 cursor-pointer shrink-0"
                      style={{ accentColor: meta.color }} />

                    <div className="text-[28px] shrink-0 leading-none">{meta.emoji}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="m-0 text-sm font-bold text-[#111827]">{d.title}</h4>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-[10px] font-bold uppercase tracking-[0.3px]"
                          style={{ background: `${meta.color}15`, color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                      {d.description && (
                        <p className="text-xs text-on-surface-variant mt-0 mb-1.5">{d.description}</p>
                      )}
                      {parsedTotal != null && (
                        <p className="text-xs text-success mt-0 mb-1.5 font-bold">
                          💰 {fmtMoney(parsedTotal)}{parsedItens > 0 ? ` · ${parsedItens} iten${parsedItens !== 1 ? 's' : ''}` : ''}
                        </p>
                      )}
                      <div className="flex gap-1 flex-wrap mb-1.5">
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
                      <div className="text-[11px] text-[#9ca3af]">
                        {d.file_size ? `${fmtFileSize(d.file_size)} · ` : ''}
                        {d.created_by || '—'} · {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0 flex-col">
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-white no-underline text-[11px] font-bold"
                          style={{ background: meta.color }}>
                          <ExternalLink size={11} /> Abrir
                        </a>
                      )}
                      <button onClick={() => openEdit(d)}
                        className="px-2.5 py-1.5 rounded-sm border border-outline-variant bg-surface-lowest text-[#374151] cursor-pointer text-[11px] font-semibold inline-flex items-center gap-1">
                        <Edit3 size={11} /> Editar
                      </button>
                      {(currentUser !== 'mari' || d.created_by === 'mari') && (
                        <button onClick={() => deleteDoc(d.id)}
                          className="px-2.5 py-1.5 rounded-sm border border-[#fecaca] bg-danger-light text-danger cursor-pointer text-[11px] font-semibold inline-flex items-center gap-1">
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
          <div className="modal-content max-w-[560px]">
            <h3 className="text-lg font-bold mb-1">📁 Enviar documento</h3>
            <p className="text-xs text-on-surface-variant mt-0 mb-4">
              Vincule o documento a um profissional, cômodo ou deixe no hub central.
            </p>
            <div className="flex flex-col gap-2.5">
              <input
                placeholder="Título do documento *"
                value={uploadForm.title}
                onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                autoFocus
                className="py-2.5 px-3 rounded-[10px] border border-outline-variant text-sm box-border"
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={uploadForm.description}
                onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={2}
                className="py-2.5 px-3 rounded-[10px] border border-outline-variant text-[13px] font-[inherit] resize-y box-border"
              />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
                <select value={uploadForm.doc_type} onChange={e => setUploadForm({ ...uploadForm, doc_type: e.target.value as DocTypeKey })}
                  className="p-2.5 rounded-[10px] border border-outline-variant text-[13px] box-border">
                  {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
                </select>
                <select value={uploadForm.professional_id} onChange={e => setUploadForm({ ...uploadForm, professional_id: e.target.value })}
                  className="p-2.5 rounded-[10px] border border-outline-variant text-[13px] box-border">
                  <option value="">— Sem profissional —</option>
                  {pros.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={uploadForm.room_id} onChange={e => setUploadForm({ ...uploadForm, room_id: e.target.value })}
                  className="p-2.5 rounded-[10px] border border-outline-variant text-[13px] box-border">
                  <option value="">— Todos os cômodos —</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.icon || '📍'} {r.name}</option>)}
                </select>
              </div>
              <input
                placeholder="Tags (separadas por vírgula, ex: elétrica, urgente)"
                value={uploadForm.tagsInput}
                onChange={e => setUploadForm({ ...uploadForm, tagsInput: e.target.value })}
                className="py-2.5 px-3 rounded-[10px] border border-outline-variant text-[13px] box-border"
              />
              <label className={`flex items-center gap-2.5 p-3.5 border-2 border-dashed rounded-md cursor-pointer ${uploadForm.file ? 'bg-[#f0fdf4] border-success' : 'bg-[#fafafa] border-[#d1d5db]'}`}>
                <Upload size={20} className={uploadForm.file ? 'text-success' : 'text-on-surface-variant'} />
                <span className={`text-[13px] font-semibold flex-1 ${uploadForm.file ? 'text-[#065f46]' : 'text-on-surface-variant'}`}>
                  {uploadForm.file ? uploadForm.file.name : 'Selecionar arquivo (PDF, imagem, doc...)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                  onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-[18px] justify-end">
              <button
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
                className="px-5 py-2.5 border border-outline-variant rounded-[10px] bg-surface-lowest cursor-pointer font-semibold text-sm">
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.title.trim() || !uploadForm.file || uploading}
                className={`px-6 py-2.5 rounded-[10px] border-none cursor-pointer font-bold text-sm text-white bg-gradient-to-br from-[#7c3aed] to-[#2563eb] ${(!uploadForm.title.trim() || !uploadForm.file || uploading) ? 'opacity-50' : 'opacity-100'}`}>
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
    <div className="bg-surface-lowest rounded-md px-3.5 py-3 border border-outline-variant flex flex-col gap-0.5">
      <span className="text-[11px] text-on-surface-variant font-semibold">{label}</span>
      <span className="text-[22px] font-extrabold leading-none" style={{ color }}>{value}</span>
    </div>
  )
}

function TypeChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-[18px] text-xs font-bold cursor-pointer whitespace-nowrap"
      style={{
        border: `1.5px solid ${active ? color : '#e5e7eb'}`,
        background: active ? `${color}15` : 'white',
        color: active ? color : '#6b7280',
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
      <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full py-[9px] px-2.5 rounded-[9px] border border-outline-variant text-[13px] box-border bg-surface-lowest">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Badge({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-[3px] px-2 py-[3px] rounded-sm text-[10px] font-bold whitespace-nowrap"
      style={{ background: `${color}15`, color }}>
      {icon} {label}
    </span>
  )
}
