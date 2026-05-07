'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardList, Lock, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Plus, X, LayoutGrid, List, ExternalLink, Trash2, Upload, FileText, Image as ImageIcon, Eye } from 'lucide-react'
import MaterialsPanel from './MaterialsPanel'
import type { UserID } from '@/lib/constants'
import { apiUrl, withProjectId } from '@/lib/project-client'

interface Task {
  id: string
  notion_id: number
  title: string
  description: string | null
  phase: string
  status: string
  priority: string
  assigned_to: string
  sort_order: number
}

interface Document {
  id: string
  title: string
  description: string | null
  doc_type: 'planta' | 'projeto' | 'contrato' | 'nota_fiscal' | 'foto' | 'orcamento' | 'memorial' | 'outro'
  url: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  created_at: string
  created_by: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  em_andamento: { label: 'Em Andamento', icon: Clock, color: '#2563eb', bg: '#EFF6FF', border: '#BFDBFE' },
  a_fazer: { label: 'A Fazer', icon: ClipboardList, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  bloqueada: { label: 'Bloqueada', icon: Lock, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  concluido: { label: 'Concluído', icon: CheckCircle2, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  alta: { label: 'Alta', color: '#DC2626', bg: '#FEE2E2' },
  media: { label: 'Média', color: '#D97706', bg: '#FEF3C7' },
  baixa: { label: 'Baixa', color: '#16A34A', bg: '#DCFCE7' },
}

const ASSIGNEE_CONFIG: Record<string, { emoji: string; color: string }> = {
  'Bruno': { emoji: '🔨', color: '#3B82F6' },
  'Gra': { emoji: '🏠', color: '#EC4899' },
  'Designer': { emoji: '🎨', color: '#8B5CF6' },
  'Pedreiro': { emoji: '👷', color: '#F97316' },
  'Arquiteta': { emoji: '📐', color: '#06B6D4' },
  'Téc. Gás': { emoji: '🔧', color: '#EF4444' },
}

const DOCUMENT_TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  planta: { label: 'Planta', emoji: '📐', color: '#0891B2', bg: '#CFFAFE' },
  projeto: { label: 'Projeto', emoji: '🏗️', color: '#DC2626', bg: '#FEE2E2' },
  contrato: { label: 'Contrato', emoji: '📄', color: '#7C3AED', bg: '#F3E8FF' },
  orcamento: { label: 'Memorial/Orçamento', emoji: '📋', color: '#7C3AED', bg: '#EDE9FE' },
  memorial: { label: 'Memorial/Orçamento', emoji: '📋', color: '#7C3AED', bg: '#EDE9FE' },
  nota_fiscal: { label: 'Nota Fiscal', emoji: '🧾', color: '#059669', bg: '#DBEAFE' },
  foto: { label: 'Foto', emoji: '📸', color: '#EA580C', bg: '#FFEDD5' },
  outro: { label: 'Outro', emoji: '📎', color: '#6B7280', bg: '#F3F4F6' },
}

const PHASE_ORDER = [
  'Fase 1 — Projeto e Planejamento',
  'Fase 2 — Fornecedores e Orçamentos',
  'Fase 3 — Demolição',
  'Fase 4 — Instalações',
]

// Order: active stuff first, then blocked, then done
const STATUS_ORDER = ['em_andamento', 'a_fazer', 'bloqueada', 'concluido']

interface ObraPanelProps {
  currentUser: string
  projectId?: string | null
}

export default function ObraPanel({ currentUser = 'bruno', projectId }: ObraPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'status' | 'fase' | 'responsavel'>('status')
  const [layoutMode, setLayoutMode] = useState<'list' | 'kanban'>('list')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['em_andamento', 'a_fazer']))
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set())
  const [newTask, setNewTask] = useState({ title: '', description: '', phase: PHASE_ORDER[0], priority: 'media', assigned_to: 'Bruno' })
  const [newDocument, setNewDocument] = useState<{ title: string; description: string; type: string; url: string }>({ title: '', description: '', type: 'outro', url: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  // Use our view API for uploaded files to show a clean URL with proper filename
  const getViewUrl = (doc: Document) => {
    if (doc.file_path) {
      return `/api/documents/view?id=${doc.id}`
    }
    return doc.url || '#'
  }

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/tasks', projectId))
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/documents', projectId))
      const data = await res.json()
      setDocuments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching documents:', err)
    }
  }, [projectId])

  useEffect(() => {
    fetchTasks()
    fetchDocuments()
  }, [fetchTasks, fetchDocuments])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId)
    try {
      await fetch(apiUrl(`/api/tasks/${taskId}`, projectId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({ status: newStatus }, projectId)),
      })
      await fetchTasks()
    } catch (err) {
      console.error('Error updating task:', err)
    } finally {
      setUpdatingTask(null)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    try {
      await fetch(apiUrl('/api/tasks', projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({ ...newTask, status: 'a_fazer', sort_order: tasks.length + 1 }, projectId)),
      })
      await fetchTasks()
      setShowAddModal(false)
      setNewTask({ title: '', description: '', phase: PHASE_ORDER[0], priority: 'media', assigned_to: 'Bruno' })
    } catch (err) { console.error(err) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    // Auto-fill title if empty
    if (!newDocument.title.trim()) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      setNewDocument(p => ({ ...p, title: name }))
    }
    // Auto-detect type
    if (file.type.startsWith('image/')) {
      setNewDocument(p => ({ ...p, type: 'foto' as const }))
    } else if (file.type === 'application/pdf') {
      setNewDocument(p => ({ ...p, type: 'contrato' as const }))
    }
    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setUploadPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setUploadPreview(null)
    }
  }

  const handleAddDocument = async () => {
    if (!newDocument.title.trim()) return
    setUploading(true)
    try {
      if (uploadFile) {
        // Upload via file upload API
        const formData = new FormData()
        formData.append('file', uploadFile)
        formData.append('title', newDocument.title.trim())
        formData.append('description', newDocument.description || '')
        formData.append('type', newDocument.type)
        formData.append('created_by', currentUser)
        formData.append('project_id', projectId || '')
        const res = await fetch(apiUrl('/api/documents/upload', projectId), { method: 'POST', body: formData })
        if (!res.ok) {
          const err = await res.json()
          alert('Erro no upload: ' + (err.error || 'Falha'))
          return
        }
      } else {
        // Link-only document
        await fetch(apiUrl('/api/documents', projectId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withProjectId({ ...newDocument, created_by: currentUser }, projectId)),
        })
      }
      await fetchDocuments()
      setShowDocModal(false)
      setNewDocument({ title: '', description: '', type: 'outro', url: '' })
      setUploadFile(null)
      setUploadPreview(null)
    } catch (err) { console.error(err) } finally { setUploading(false) }
  }

  const handleDeleteDocument = async (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    // Mari can only delete her own documents
    if (currentUser === 'mari' && doc?.created_by !== 'mari') {
      alert('Sem permissão para deletar documentos de outros usuários')
      return
    }
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    try {
      await fetch(apiUrl(`/api/documents/${docId}`, projectId), { method: 'DELETE' })
      // Log deletion
      await fetch(apiUrl('/api/audit-log', projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProjectId({
          action: 'delete', entity_type: 'document', entity_id: docId,
          entity_description: `Documento "${doc?.title}" deletado`,
          old_values: doc ? { title: doc.title, doc_type: doc.doc_type, url: doc.url } : null,
          performed_by: currentUser,
        }, projectId)),
      })
      await fetchDocuments()
    } catch (err) { console.error(err) }
  }

  const toggleDocumentExpanded = (docId: string) => {
    setExpandedDocuments(prev => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const groupTasks = (): { key: string; label: string; tasks: Task[] }[] => {
    if (viewMode === 'status') {
      return STATUS_ORDER.map(status => ({
        key: status,
        label: STATUS_CONFIG[status]?.label || status,
        tasks: tasks.filter(t => t.status === status).sort((a, b) => a.sort_order - b.sort_order),
      })).filter(g => g.tasks.length > 0)
    } else if (viewMode === 'fase') {
      return PHASE_ORDER.map(phase => ({
        key: phase,
        label: phase,
        tasks: tasks.filter(t => t.phase === phase).sort((a, b) => a.sort_order - b.sort_order),
      })).filter(g => g.tasks.length > 0)
    } else {
      const assignees = [...new Set(tasks.map(t => t.assigned_to))].sort()
      return assignees.map(assignee => ({
        key: assignee,
        label: `${ASSIGNEE_CONFIG[assignee]?.emoji || '👤'} ${assignee}`,
        tasks: tasks.filter(t => t.assigned_to === assignee).sort((a, b) => a.sort_order - b.sort_order),
      }))
    }
  }

  // Summary stats
  const stats = {
    total: tasks.length,
    concluido: tasks.filter(t => t.status === 'concluido').length,
    em_andamento: tasks.filter(t => t.status === 'em_andamento').length,
    a_fazer: tasks.filter(t => t.status === 'a_fazer').length,
    bloqueada: tasks.filter(t => t.status === 'bloqueada').length,
  }
  const progressPercent = stats.total > 0 ? Math.round((stats.concluido / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="text-center py-[60px] px-5">
        <div className="text-[48px] mb-4">🏗️</div>
        <p className="text-[#6b7280]">Carregando tarefas da obra...</p>
      </div>
    )
  }

  const groups = groupTasks()

  return (
    <div>
      {/* DOCUMENTS SECTION */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white mb-6 overflow-hidden">
        {/* Documents Header */}
        <div className="px-5 py-4 bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex justify-between items-center">
          <h2 className="text-base font-bold m-0">📁 Documentos / Projeto</h2>
          <button
            onClick={() => setShowDocModal(true)}
            className="py-2 px-3.5 bg-white/20 border border-white/30 rounded-lg text-white font-semibold text-[13px] cursor-pointer transition-all duration-200 hover:bg-white/30"
          >
            + Adicionar
          </button>
        </div>

        {/* Documents List */}
        <div className="p-3">
          {documents.length === 0 ? (
            <div className="p-6 text-center text-[#6B7280]">
              <p className="text-sm m-0">Nenhum documento adicionado</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {documents.map(doc => {
                const isExpanded = expandedDocuments.has(doc.id)
                const typeConfig = DOCUMENT_TYPE_CONFIG[doc.doc_type]
                return (
                  <div
                    key={doc.id}
                    className="rounded-[10px] border border-[#E5E7EB] bg-white overflow-hidden"
                  >
                    <button
                      onClick={() => toggleDocumentExpanded(doc.id)}
                      className="w-full py-3 px-3.5 border-none bg-white cursor-pointer flex justify-between items-center gap-3"
                    >
                      <div className="flex items-center gap-2.5 flex-1 text-left">
                        <span
                          className="inline-flex items-center justify-center py-1.5 px-2.5 rounded-md text-xs font-semibold min-w-[80px]"
                          style={{ background: typeConfig.bg, color: typeConfig.color }}
                        >
                          {typeConfig.emoji} {typeConfig.label}
                        </span>
                        {doc.file_type?.startsWith('image/') && doc.url && (
                          <img src={doc.url} alt="" className="w-9 h-9 object-cover rounded-md shrink-0" />
                        )}
                        {doc.file_type === 'application/pdf' && (
                          <div className="w-9 h-9 rounded-md bg-[#FEF3C7] flex items-center justify-center shrink-0">
                            <FileText size={18} color="#D97706" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1F2937] m-0 mb-0.5">
                            {doc.title}
                          </p>
                          {doc.description && (
                            <p className="text-xs text-[#6B7280] m-0">
                              {doc.description.length > 50 ? doc.description.substring(0, 50) + '...' : doc.description}
                            </p>
                          )}
                          {doc.file_name && !doc.description && (
                            <p className="text-[11px] text-[#9CA3AF] m-0">
                              {doc.file_name} {doc.file_size ? `• ${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={18} color="#9CA3AF" />
                      ) : (
                        <ChevronDown size={18} color="#9CA3AF" />
                      )}
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="py-3 px-3.5 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                        {/* File Preview */}
                        {doc.file_type?.startsWith('image/') && doc.url && (
                          <div className="mb-3 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => setPreviewDoc(doc)}
                          >
                            <img
                              src={doc.url}
                              alt={doc.title}
                              className="w-full max-h-[200px] object-cover rounded-lg"
                            />
                          </div>
                        )}
                        {doc.file_type === 'application/pdf' && doc.url && (
                          <div className="mb-3 p-3 rounded-lg bg-[#FEF3C7] flex items-center gap-2.5">
                            <FileText size={24} color="#D97706" />
                            <div className="flex-1">
                              <p className="text-[13px] font-semibold text-[#92400E] m-0">
                                {doc.file_name || 'Documento PDF'}
                              </p>
                              {doc.file_size && (
                                <p className="text-[11px] text-[#B45309] mt-0.5 mb-0">
                                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                            <a href={getViewUrl(doc)}
                              className="py-1.5 px-2.5 rounded-md bg-[#D97706] text-white no-underline text-xs font-semibold"
                            >
                              <Eye size={14} className="inline align-middle mr-1" />
                              Ver
                            </a>
                          </div>
                        )}
                        {doc.description && (
                          <p className="text-[13px] text-[#374151] mt-0 mb-2.5 leading-relaxed">
                            {doc.description}
                          </p>
                        )}
                        <div className="text-xs text-[#6B7280] mb-2.5">
                          <div>Por: <strong>{doc.created_by}</strong></div>
                          <div>Em: {new Date(doc.created_at).toLocaleDateString('pt-BR')}</div>
                          {doc.file_name && <div>Arquivo: {doc.file_name}</div>}
                          {doc.file_size && <div>Tamanho: {(doc.file_size / 1024 / 1024).toFixed(2)} MB</div>}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {doc.url && (
                            <a
                              href={doc.file_path ? getViewUrl(doc) : doc.url}
                              {...(doc.file_path ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                              className="flex items-center gap-1.5 py-2 px-3 rounded-md bg-[#F0FDF4] text-[#059669] no-underline font-semibold text-xs"
                            >
                              <ExternalLink size={14} />
                              {doc.file_name ? 'Abrir arquivo' : 'Abrir link'}
                            </a>
                          )}
                          {doc.file_type?.startsWith('image/') && doc.url && (
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="flex items-center gap-1.5 py-2 px-3 rounded-md bg-[#EFF6FF] text-[#2563EB] border-none font-semibold text-xs cursor-pointer"
                            >
                              <Eye size={14} />
                              Visualizar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="flex items-center gap-1.5 py-2 px-3 rounded-md bg-[#FEF2F2] text-[#DC2626] border-none font-semibold text-xs cursor-pointer transition-all duration-200 hover:bg-danger-light"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Progress Header */}
      <div className="bg-gradient-to-br from-[#1E40AF] to-[#7C3AED] rounded-lg p-5 mb-5 text-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold m-0">Progresso da Obra</h2>
          <span className="text-[28px] font-extrabold">{progressPercent}%</span>
        </div>
        <div className="bg-white/20 rounded-lg h-2.5 overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-[#34D399] to-[#10B981] rounded-lg transition-all duration-500 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Concluídas', value: stats.concluido, color: '#34D399' },
            { label: 'Andamento', value: stats.em_andamento, color: '#60A5FA' },
            { label: 'A Fazer', value: stats.a_fazer, color: '#FBBF24' },
            { label: 'Bloqueadas', value: stats.bloqueada, color: '#F87171' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-extrabold">{s.value}</div>
              <div className="text-[11px] opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-1 mb-4 bg-[#f3f4f6] rounded-[10px] p-[3px]">
        {[
          { key: 'status', label: 'Status' },
          { key: 'fase', label: 'Fase' },
          { key: 'responsavel', label: 'Responsável' },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => {
              setViewMode(v.key as any)
              if (v.key === 'status') setExpandedGroups(new Set(['em_andamento', 'a_fazer']))
              else setExpandedGroups(new Set(PHASE_ORDER.slice(0, 2)))
            }}
            className={`flex-1 py-2.5 px-3 rounded-lg border-none cursor-pointer font-semibold text-[13px] transition-all duration-200 ${
              viewMode === v.key
                ? 'bg-white text-[#1E40AF] shadow-sm'
                : 'bg-transparent text-[#6b7280]'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Layout Toggle */}
      {viewMode === 'status' && (
        <div className="flex justify-end mb-3 gap-1">
          <button onClick={() => setLayoutMode('list')} className={`py-1.5 px-2.5 rounded-lg border border-[#E5E7EB] cursor-pointer ${
            layoutMode === 'list' ? 'bg-[#1E40AF] text-white' : 'bg-white text-[#6B7280]'
          }`}>
            <List size={16} />
          </button>
          <button onClick={() => setLayoutMode('kanban')} className={`py-1.5 px-2.5 rounded-lg border border-[#E5E7EB] cursor-pointer ${
            layoutMode === 'kanban' ? 'bg-[#1E40AF] text-white' : 'bg-white text-[#6B7280]'
          }`}>
            <LayoutGrid size={16} />
          </button>
        </div>
      )}

      {/* KANBAN VIEW (side-by-side columns) */}
      {viewMode === 'status' && layoutMode === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
          {STATUS_ORDER.map(status => {
            const conf = STATUS_CONFIG[status]
            const columnTasks = tasks.filter(t => t.status === status).sort((a, b) => a.sort_order - b.sort_order)
            return (
              <div key={status} className="min-w-[260px] max-w-[300px] flex-[1_0_260px] rounded-xl flex flex-col"
                style={{ border: `1px solid ${conf.border}`, background: conf.bg }}
              >
                <div className="py-3 px-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${conf.border}` }}>
                  <conf.icon size={16} color={conf.color} />
                  <span className="font-bold text-[13px]" style={{ color: conf.color }}>{conf.label}</span>
                  <span className="rounded-[10px] py-px px-2 text-[11px] font-bold ml-auto text-white" style={{ background: conf.color }}>{columnTasks.length}</span>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  {columnTasks.map(task => {
                    const assignee = ASSIGNEE_CONFIG[task.assigned_to]
                    const priority = PRIORITY_CONFIG[task.priority]
                    return (
                      <div key={task.id} className="py-2.5 px-3 rounded-lg mb-1.5 bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <p className="text-[13px] font-semibold text-[#1F2937] mt-0 mb-1.5 leading-tight">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <span
                            className="inline-flex items-center gap-[3px] py-px px-1.5 rounded text-[10px] font-semibold"
                            style={{
                              background: assignee?.color ? `${assignee.color}15` : '#F3F4F6',
                              color: assignee?.color || '#6B7280',
                            }}
                          >{assignee?.emoji || '👤'} {task.assigned_to}</span>
                          {priority && (
                            <span className="py-px px-1.5 rounded text-[10px] font-semibold" style={{ background: priority.bg, color: priority.color }}>
                              {priority.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* LIST VIEW (collapsible groups) */
        <div className="flex flex-col gap-3">
          {groups.map(group => {
            const isExpanded = expandedGroups.has(group.key)
            const statusConf = STATUS_CONFIG[group.key]
            const groupColor = statusConf?.color || '#6B7280'

            return (
              <div key={group.key} className="rounded-xl overflow-hidden bg-white"
                style={{ border: `1px solid ${statusConf?.border || '#E5E7EB'}` }}
              >
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between py-3.5 px-4 border-none cursor-pointer"
                  style={{ background: statusConf?.bg || '#F9FAFB' }}
                >
                  <div className="flex items-center gap-2.5">
                    {statusConf && <statusConf.icon size={18} color={groupColor} />}
                    <span className="font-bold text-sm" style={{ color: groupColor }}>{group.label}</span>
                    <span className="rounded-xl py-0.5 px-2.5 text-xs font-bold text-white" style={{ background: groupColor }}>{group.tasks.length}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                </button>
                {isExpanded && (
                  <div className="p-2">
                    {group.tasks.map(task => (
                      <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} updating={updatingTask === task.id} viewMode={viewMode} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Add Task Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-white border-none cursor-pointer shadow-[0_4px_15px_rgba(217,119,6,0.4)] flex items-center justify-center z-40"
        title="Nova tarefa"
      >
        <Plus size={26} />
      </button>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-overlay fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div className="modal-content bg-white rounded-t-[20px] p-6 px-5 w-full max-w-[500px] max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold m-0">Nova Tarefa</h3>
              <button onClick={() => setShowAddModal(false)} className="bg-transparent border-none cursor-pointer"><X size={20} color="#6B7280" /></button>
            </div>
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-[13px] font-semibold text-[#374151] block mb-1">Titulo *</label>
                <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Comprar argamassa" className="w-full" />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#374151] block mb-1">Descricao</label>
                <input value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes opcionais" className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1">Fase</label>
                  <select value={newTask.phase} onChange={e => setNewTask(p => ({ ...p, phase: e.target.value }))} className="w-full">
                    {PHASE_ORDER.map(ph => <option key={ph} value={ph}>{ph.replace(' — ', ' · ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-[#374151] block mb-1">Prioridade</label>
                  <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} className="w-full">
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Media</option>
                    <option value="baixa">🟢 Baixa</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#374151] block mb-1">Responsavel</label>
                <select value={newTask.assigned_to} onChange={e => setNewTask(p => ({ ...p, assigned_to: e.target.value }))} className="w-full">
                  {Object.entries(ASSIGNEE_CONFIG).map(([name, conf]) => (
                    <option key={name} value={name}>{conf.emoji} {name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleAddTask} disabled={!newTask.title.trim()} className={`py-3.5 rounded-xl border-none text-white font-bold text-[15px] ${
                newTask.title.trim()
                  ? 'bg-gradient-to-br from-[#D97706] to-[#F59E0B] cursor-pointer'
                  : 'bg-[#E5E7EB] cursor-default'
              }`}>
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showDocModal && (
        <div className="modal-overlay fixed inset-0 bg-black/50 flex items-end justify-center z-50 backdrop-blur-sm"
          onClick={() => { if (!uploading) { setShowDocModal(false); setUploadFile(null); setUploadPreview(null) } }}
        >
          <div className="modal-content bg-white rounded-t-[20px] p-6 px-5 w-full max-w-[500px] max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold m-0">Novo Documento</h3>
              <button onClick={() => { if (!uploading) { setShowDocModal(false); setUploadFile(null); setUploadPreview(null) } }} className="bg-transparent border-none cursor-pointer"><X size={20} color="#6B7280" /></button>
            </div>
            <div className="flex flex-col gap-3.5">
              {/* File Upload Area */}
              <div>
                <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">📎 Arquivo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {!uploadFile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] cursor-pointer flex flex-col items-center gap-2 transition-all duration-200 hover:border-[#10B981] hover:bg-[#F0FDF4]"
                  >
                    <Upload size={28} color="#9CA3AF" />
                    <span className="text-sm font-semibold text-[#6B7280]">Toque para selecionar arquivo</span>
                    <span className="text-[11px] text-[#9CA3AF]">Imagens, PDF, Word, Excel, DWG</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-[10px] border border-[#D1FAE5] bg-[#F0FDF4] flex items-center gap-2.5">
                    {uploadPreview ? (
                      <img src={uploadPreview} alt="preview" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#D1FAE5] flex items-center justify-center">
                        <FileText size={24} color="#059669" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1F2937] m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                        {uploadFile.name}
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5 mb-0">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => { setUploadFile(null); setUploadPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="bg-transparent border-none cursor-pointer p-1"
                    >
                      <X size={18} color="#DC2626" />
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E5E7EB]" />
                <span className="text-[11px] text-[#9CA3AF] font-semibold">ou adicione um link</span>
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-[#374151] block mb-1">🔗 Link (opcional)</label>
                <input
                  value={newDocument.url}
                  onChange={e => setNewDocument(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://exemplo.com/documento"
                  className="w-full"
                  disabled={!!uploadFile}
                />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-[#374151] block mb-1">Titulo *</label>
                <input
                  value={newDocument.title}
                  onChange={e => setNewDocument(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Planta do apartamento"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#374151] block mb-1">Tipo *</label>
                <select
                  value={newDocument.type}
                  onChange={e => setNewDocument(p => ({ ...p, type: e.target.value as any }))}
                  className="w-full"
                >
                  {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, conf]) => (
                    <option key={key} value={key}>{conf.emoji} {conf.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#374151] block mb-1">Descricao</label>
                <textarea
                  value={newDocument.description || ''}
                  onChange={e => setNewDocument(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detalhes sobre o documento..."
                  className="w-full min-h-[70px] p-2.5 rounded-lg border-2 border-[#e5e7eb] font-[inherit] text-base"
                />
              </div>
              <button
                onClick={handleAddDocument}
                disabled={!newDocument.title.trim() || uploading}
                className={`py-3.5 rounded-xl border-none text-white font-bold text-[15px] flex items-center justify-center gap-2 ${
                  newDocument.title.trim() && !uploading
                    ? 'bg-gradient-to-br from-[#10B981] to-[#059669] cursor-pointer'
                    : 'bg-[#E5E7EB] cursor-default'
                }`}
              >
                {uploading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    {uploadFile ? <Upload size={18} /> : <Plus size={18} />}
                    {uploadFile ? 'Enviar Arquivo' : 'Adicionar Documento'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Image Preview Modal */}
      {previewDoc && previewDoc.url && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] backdrop-blur-lg cursor-pointer"
          onClick={() => setPreviewDoc(null)}
        >
          <button
            onClick={() => setPreviewDoc(null)}
            className="absolute top-4 right-4 bg-white/20 border-none rounded-full w-10 h-10 cursor-pointer flex items-center justify-center"
          >
            <X size={24} color="white" />
          </button>
          <div className="text-center max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={previewDoc.url}
              alt={previewDoc.title}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-white text-sm mt-3 font-semibold">
              {previewDoc.title}
            </p>
          </div>
        </div>
      )}

      {/* === MATERIAIS COMPRADOS (movido da aba Orcamentos) === */}
      <MaterialsPanel currentUser={currentUser as UserID} projectId={projectId} />
    </div>
  )
}

function TaskCard({ task, onStatusChange, updating, viewMode }: {
  task: Task
  onStatusChange: (id: string, status: string) => void
  updating: boolean
  viewMode: string
}) {
  const [showActions, setShowActions] = useState(false)
  const assignee = ASSIGNEE_CONFIG[task.assigned_to]
  const priority = PRIORITY_CONFIG[task.priority]
  const statusConf = STATUS_CONFIG[task.status]

  const nextStatuses = STATUS_ORDER.filter(s => s !== task.status)

  return (
    <div
      className={`py-3 px-3.5 rounded-[10px] mb-1.5 border border-[#F3F4F6] transition-all duration-200 ${
        updating ? 'bg-[#F9FAFB] opacity-60' : 'bg-white opacity-100'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1F2937] mt-0 mb-1.5 leading-tight">
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-[#6B7280] mt-0 mb-2 leading-snug">
              {task.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 items-center">
            {/* Assignee badge */}
            <span
              className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md text-[11px] font-semibold"
              style={{
                background: assignee?.color ? `${assignee.color}15` : '#F3F4F6',
                color: assignee?.color || '#6B7280',
              }}
            >
              {assignee?.emoji || '👤'} {task.assigned_to}
            </span>

            {/* Priority badge */}
            {priority && (
              <span
                className="py-0.5 px-2 rounded-md text-[11px] font-semibold"
                style={{ background: priority.bg, color: priority.color }}
              >
                {priority.label}
              </span>
            )}

            {/* Phase badge (show when not grouping by fase) */}
            {viewMode !== 'fase' && (
              <span className="py-0.5 px-2 rounded-md text-[11px] font-medium bg-[#F3F4F6] text-[#6B7280]">
                {task.phase.replace(' — ', ' · ')}
              </span>
            )}

            {/* Status badge (show when not grouping by status) */}
            {viewMode !== 'status' && statusConf && (
              <span
                className="py-0.5 px-2 rounded-md text-[11px] font-semibold"
                style={{ background: statusConf.bg, color: statusConf.color }}
              >
                {statusConf.label}
              </span>
            )}
          </div>
        </div>

        {/* Quick action button */}
        <button
          onClick={() => setShowActions(!showActions)}
          className={`p-1.5 rounded-lg border border-[#E5E7EB] cursor-pointer shrink-0 ${
            showActions ? 'bg-[#F3F4F6]' : 'bg-white'
          }`}
        >
          <AlertCircle size={16} color="#9CA3AF" />
        </button>
      </div>

      {/* Status change actions */}
      {showActions && (
        <div className="mt-2.5 pt-2.5 border-t border-[#F3F4F6] flex flex-wrap gap-1.5">
          {nextStatuses.map(status => {
            const conf = STATUS_CONFIG[status]
            return (
              <button
                key={status}
                onClick={() => { onStatusChange(task.id, status); setShowActions(false) }}
                disabled={updating}
                className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  border: `1px solid ${conf.border}`,
                  background: conf.bg,
                  color: conf.color,
                }}
              >
                <conf.icon size={14} />
                {conf.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
